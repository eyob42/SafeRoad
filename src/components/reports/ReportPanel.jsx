import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import ReportTypeButton from './ReportTypeButton.jsx'
import { REPORT_TYPES } from '../../constants/reportMeta.js'

export default function ReportPanel({ position, onClose, onSubmitted }) {
  const [busy, setBusy]   = useState(false)
  const [toast, setToast] = useState('')

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
    <section className="sheet">
      <div className="sheet-handle" />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">ምን ተመለከቱ?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">አንድ ጊዜ ይንኩ — ወዲያው ይላካል</p>
        </div>
        <button
          onClick={onClose}
          aria-label="ዝጋ"
          className="grid size-12 place-items-center rounded-xl text-slate-600 dark:text-slate-300"
        >
          <X />
        </button>
      </div>

      {!position ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4
                     font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          ሪፖርት ለማቅረብ የቦታ ፈቃድ ያስፈልጋል።
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {REPORT_TYPES.map(t => (
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
              <span className="w-4 h-4 border-2 border-slate-500 border-t-brand
                               rounded-full animate-spin inline-block" />
              <span>በመላክ ላይ...</span>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="mt-3 bg-slate-700 rounded-xl px-4 py-2 text-center text-sm text-white dark:bg-slate-800">
          {toast}
        </div>
      )}
    </section>
  )
}
