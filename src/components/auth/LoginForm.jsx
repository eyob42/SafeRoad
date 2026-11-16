import { useState } from 'react'
import { useSession } from '../../hooks/useSession.jsx'

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
      // login() sets displayName → App re-renders to MapScreen automatically
    } catch (err) {
      // Only block the user for auth-level failures (no session)
      console.error('login error:', err)
      if (err.message === 'no session') {
        setError('ወደ አገልግሎቱ መገናኘት አልተቻለም። ድረ-ገጹን ዳግም ይጫኑ።')
      } else if (err.message === 'empty name') {
        setError('ስም ያስፈልጋል')
      }
      // For any other error (DB-level), login() doesn't throw — so this won't fire
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      {/* Logo / title */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🛣️</div>
        <h1 className="text-3xl font-bold text-white tracking-wide">SafeRoad</h1>
        <p className="text-slate-400 mt-1 text-sm">አዲስ አበባ — አምቦ</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-white text-lg font-semibold mb-4">ወደ መለያዎ ይግቡ</h2>

        <form onSubmit={handleSubmit} noValidate>
          <label className="block text-slate-300 text-sm mb-1" htmlFor="name">
            ስም ወይም ስልክ ቁጥር
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="ስምዎን ወይም ስልክ ቁጥርዎን ያስገቡ"
            className="w-full bg-slate-700 text-white placeholder-slate-500 border border-slate-600
                       rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500
                       focus:ring-1 focus:ring-blue-500 transition"
            disabled={busy || isLoading}
            autoComplete="off"
          />

          {error && (
            <p className="mt-2 text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || isLoading}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600
                       disabled:cursor-not-allowed text-white font-semibold rounded-xl
                       py-3 text-sm transition flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin inline-block" />
                <span>በመግባት ላይ...</span>
              </>
            ) : 'ግባ'}
          </button>
        </form>

        {/* Demo mode — available without login */}
        <div className="mt-4 border-t border-slate-700 pt-4">
          <button
            onClick={onDemoMode}
            className="w-full text-blue-400 hover:text-blue-300 text-sm py-2
                       rounded-xl hover:bg-slate-700 transition"
          >
            ዴሞ ሁናቴ ጀምር →
          </button>
        </div>
      </div>
    </div>
  )
}
