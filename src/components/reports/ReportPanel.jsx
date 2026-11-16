import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import ReportTypeButton from './ReportTypeButton.jsx'

const TYPES = ['security', 'blocked', 'accident', 'safe']

export default function ReportPanel({ position, onClose, onSubmitted }) {
  const [busy, setBusy]     = useState(false)
  const [toast, setToast]   = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleReport(type) {
    if (!position) return
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('submit_report', {
        p_type:         type,
        p_lat:          position.lat,
        p_lng:          position.lng,
        p_reporter_lat: position.lat,
        p_reporter_lng: position.lng,
      })
      if (error) throw error

      // Track own reports in localStorage
      const owned = JSON.parse(localStorage.getItem('sr_ownReportIds') || '[]')
      owned.push(data.id)
      localStorage.setItem('sr_ownReportIds', JSON.stringify(owned))

      onSubmitted?.()
      showToast('ሪፖርቱ ተልኳል ✓')
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      console.error(err)
      showToast('ስህተት ተከስቷል። እንደገና ይሞክሩ።')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-slate-800 rounded-t-3xl px-4 pt-4 pb-6 shadow-2xl">
      {/* Handle bar */}
      <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-base">ሪፖርት አቅርብ</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xl leading-none"
          aria-label="ዝጋ"
        >✕</button>
      </div>

      {!position ? (
        <div className="bg-orange-900/40 border border-orange-700 rounded-xl p-3 text-orange-300 text-sm">
          ሪፖርት ለማቅረብ የቦታ ፈቃድ ያስፈልጋል።
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map(t => (
              <ReportTypeButton
                key={t}
                type={t}
                onClick={handleReport}
                disabled={busy}
              />
            ))}
          </div>

          {busy && (
            <div className="mt-3 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <span className="w-4 h-4 border-2 border-slate-500 border-t-blue-400
                               rounded-full animate-spin inline-block" />
              <span>በመላክ ላይ...</span>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="mt-3 bg-slate-700 rounded-xl px-4 py-2 text-center text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
