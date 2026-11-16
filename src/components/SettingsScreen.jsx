import { useState } from 'react'
import { useSession } from '../hooks/useSession.jsx'
import { supabase } from '../lib/supabase.js'

// Ginchi waypoint — fixed pin for the far-away test
const GINCHI = { lat: 9.0167, lng: 38.1333 }

export default function SettingsScreen({ onStartDemo, onLogout }) {
  const { displayName, logout } = useSession()
  const [farBusy, setFarBusy]   = useState(false)
  const [farMsg, setFarMsg]     = useState('')

  async function handleLogout() {
    await logout()
    onLogout?.()
  }

  async function handleFarAwayTest() {
    setFarBusy(true)
    setFarMsg('')

    // Always use the real GPS, not demo override
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const reporterLat = pos.coords.latitude
        const reporterLng = pos.coords.longitude

        try {
          const { data, error } = await supabase.rpc('submit_report', {
            p_type:         'security',
            p_lat:          GINCHI.lat,
            p_lng:          GINCHI.lng,
            p_reporter_lat: reporterLat,
            p_reporter_lng: reporterLng,
          })

          if (error) throw error

          const owned = JSON.parse(localStorage.getItem('sr_ownReportIds') || '[]')
          owned.push(data.id)
          localStorage.setItem('sr_ownReportIds', JSON.stringify(owned))

          if (data.status === 'suspicious') {
            setFarMsg('✓ ሪፖርቱ ተልኳል — ጥርጣሬ ሁናቴ')
          } else {
            setFarMsg(`✓ ሪፖርቱ ተልኳል (${data.status})`)
          }
        } catch (err) {
          console.error(err)
          setFarMsg('ስህተት: ' + (err.message || 'እንደገና ይሞክሩ'))
        } finally {
          setFarBusy(false)
        }
      },
      (err) => {
        setFarMsg('ቦታ ማግኘት አልተቻለም: ' + err.message)
        setFarBusy(false)
      },
      { timeout: 8000, maximumAge: 30000 }
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white overflow-y-auto">
      <div className="px-4 py-6">
        <h1 className="text-lg font-bold mb-6">ቅንብሮች</h1>

        {/* Profile */}
        <div className="bg-slate-800 rounded-2xl p-4 mb-4">
          <p className="text-slate-400 text-xs mb-1">ስም</p>
          <p className="text-white font-medium">{displayName || '—'}</p>
        </div>

        {/* Demo mode */}
        <button
          onClick={onStartDemo}
          className="w-full bg-blue-700 hover:bg-blue-600 active:bg-blue-800
                     rounded-2xl p-4 mb-3 text-left transition"
        >
          <p className="font-semibold">🎬 ዴሞ ሁናቴ ጀምር</p>
          <p className="text-blue-200 text-xs mt-0.5">
            የሚንቀሳቀስ አሽከርካሪ ሲሙሌሽን — ያለ ምዝገባ ይሠራል
          </p>
        </button>

        {/* Far-away report test */}
        {displayName && (
          <div className="bg-slate-800 rounded-2xl p-4 mb-3">
            <p className="font-semibold text-sm mb-1">🔬 ሩቅ ሪፖርት ሙከራ</p>
            <p className="text-slate-400 text-xs mb-3">
              ፒንን ጊንቺ ላይ ያስቀምጣል፤ ሪፖርተሩ አሁን ያሉበት ቦታ ርቀቱ
              10 ኪሜ ከበለጠ "አጠራጣሪ" ይሆናል።
            </p>
            <button
              onClick={handleFarAwayTest}
              disabled={farBusy}
              className="w-full bg-orange-700 hover:bg-orange-600 disabled:bg-slate-600
                         disabled:cursor-not-allowed rounded-xl py-2.5 text-sm
                         font-semibold transition flex items-center justify-center gap-2"
            >
              {farBusy ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                   rounded-full animate-spin inline-block" />
                  <span>በመላክ ላይ...</span>
                </>
              ) : 'ሩቅ ሪፖርት ላክ'}
            </button>
            {farMsg && (
              <p className={`mt-2 text-xs ${farMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {farMsg}
              </p>
            )}
          </div>
        )}

        {/* Logout */}
        {displayName && (
          <button
            onClick={handleLogout}
            className="w-full bg-slate-700 hover:bg-slate-600 active:bg-slate-800
                       rounded-2xl p-4 text-left transition"
          >
            <p className="font-semibold text-red-400">↩ ውጣ</p>
          </button>
        )}
      </div>
    </div>
  )
}
