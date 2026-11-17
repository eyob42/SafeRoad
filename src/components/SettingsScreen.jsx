import { useState } from 'react'
import { LogOut, Moon, Navigation, Radio, Sun } from 'lucide-react'
import { useSession } from '../hooks/useSession.jsx'
import { supabase } from '../lib/supabase.js'

const GINCHI = { lat: 9.0167, lng: 38.1333 }

export default function SettingsScreen({ onStartDemo, onLogout, dark, onToggleTheme }) {
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
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error } = await supabase.rpc('submit_report', {
            p_type:         'security',
            p_lat:          GINCHI.lat,
            p_lng:          GINCHI.lng,
            p_reporter_lat: pos.coords.latitude,
            p_reporter_lng: pos.coords.longitude,
          })
          if (error) throw error
          const owned = JSON.parse(localStorage.getItem('sr_ownReportIds') || '[]')
          owned.push(data.id)
          localStorage.setItem('sr_ownReportIds', JSON.stringify(owned))
          setFarMsg(data.status === 'suspicious'
            ? '✓ ሪፖርቱ ተልኳል — ጥርጣሬ ሁናቴ'
            : `✓ ሪፖርቱ ተልኳል (${data.status})`)
        } catch (err) {
          setFarMsg('ስህተት: ' + (err.message || 'እንደገና ይሞክሩ'))
        } finally {
          setFarBusy(false)
        }
      },
      (err) => {
        setFarMsg('ቦታ ማግኘት አልተቻለም')
        setFarBusy(false)
      },
      { timeout: 8000, maximumAge: 30000 }
    )
  }

  return (
    <main className="min-h-dvh bg-brand-light px-5 pb-28 pt-7 dark:bg-slate-950">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white">ቅንብሮች</h1>

        {/* Profile */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5
                            dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">የሚታይ ስም</p>
          <p className="mt-1 text-lg font-extrabold text-slate-950 dark:text-white">
            {displayName || '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            ለሌሎች አሽከርካሪዎች አይታይም
          </p>
        </section>

        <div className="mt-4 space-y-3">
          {/* Theme toggle */}
          <button onClick={onToggleTheme} className="setting-button">
            {dark ? <Sun /> : <Moon />}
            <span>{dark ? 'ብርሃን ገጽታ' : 'ጨለማ ገጽታ'}</span>
          </button>

          {/* Demo mode */}
          <button onClick={onStartDemo} className="setting-button">
            <Navigation />
            <span>ዴሞ ሁናቴ ጀምር</span>
          </button>

          {/* Far-away test */}
          {displayName && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4
                            dark:border-slate-800 dark:bg-slate-900">
              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">🔬 ሩቅ ሪፖርት ሙከራ</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ፒንን ጊንቺ ላይ ያስቀምጣል፤ ከ10 ኪሜ በለጠ "አጠራጣሪ" ይሆናል።
              </p>
              <button
                onClick={handleFarAwayTest}
                disabled={farBusy}
                className="mt-3 w-full min-h-12 rounded-xl bg-orange-700 font-bold text-white
                           transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {farBusy ? 'በመላክ ላይ...' : 'ሩቅ ሪፖርት ላክ'}
              </button>
              {farMsg && (
                <p className={`mt-2 text-xs font-bold ${farMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
                  {farMsg}
                </p>
              )}
            </div>
          )}

          {/* Logout */}
          {displayName && (
            <button
              onClick={handleLogout}
              className="setting-button border-red-200 text-red-700
                         dark:border-red-900 dark:text-red-300"
            >
              <LogOut /> <span>ውጣ</span>
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
