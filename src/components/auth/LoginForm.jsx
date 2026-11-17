import { ArrowRight, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '../../hooks/useSession.jsx'
import Brand from '../ui/Brand.jsx'

export default function LoginForm({ onDemoMode }) {
  const { login, isLoading } = useSession()
  const [name, setName]       = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('ስም ያስፈልጋል'); return }
    setBusy(true)
    setError('')
    try {
      await login(name)
    } catch (err) {
      console.error('login error:', err)
      if (err.message === 'no session') {
        setError('ወደ አገልግሎቱ መገናኘት አልተቻለም። ድረ-ገጹን ዳግም ይጫኑ።')
      } else if (err.message === 'empty name') {
        setError('ስም ያስፈልጋል')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-dvh bg-brand-light px-5 py-8 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-sm flex-col">
        <div className="pt-[8vh]">
          <Brand />
        </div>
        <div className="mt-12">
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white">
            ወደ መንገድዎ ይግቡ
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            ሌሎች አሽከርካሪዎችን ያስጠንቅቁ፣ እርስዎም ይጠንቀቁ።
          </p>

          <label
            htmlFor="name"
            className="mt-7 block text-sm font-bold text-slate-800 dark:text-slate-200"
          >
            የሚታይ ስም
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="ለምሳሌ፦ አሽከርካሪ"
            className="mt-2 min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white
                       px-4 text-base text-slate-950 outline-none transition
                       placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10
                       dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            disabled={busy || isLoading}
            autoComplete="off"
          />

          {error && (
            <p className="mt-2 text-red-500 text-xs font-bold">{error}</p>
          )}

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={busy || isLoading}
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2
                       rounded-xl bg-brand px-5 font-extrabold text-white shadow-sm
                       transition hover:bg-brand-dark active:scale-[.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin inline-block" />
                <span>በመግባት ላይ...</span>
              </>
            ) : (
              <>ግባ <ArrowRight size={20} /></>
            )}
          </button>

          <button
            onClick={onDemoMode}
            className="mt-3 min-h-14 w-full rounded-xl border-2 border-brand bg-transparent
                       px-5 font-bold text-brand transition active:scale-[.98]
                       dark:border-brand dark:text-brand"
          >
            ዴሞ ሁናቴ ጀምር
          </button>
        </div>

        <div className="mt-auto flex items-center justify-center gap-2 pt-8
                        text-sm font-medium text-slate-500 dark:text-slate-400">
          <LockKeyhole size={17} /> ሪፖርቶችዎ ስም-አልባ ናቸው
        </div>
      </div>
    </main>
  )
}
