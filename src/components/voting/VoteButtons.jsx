import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

export default function VoteButtons({ report, onVoted }) {
  const [currentVote, setCurrentVote] = useState(null)
  const [busy, setBusy]               = useState(false)
  const [err, setErr]                 = useState('')

  async function vote(value) {
    if (busy) return
    if (currentVote === value) return

    setBusy(true)
    setErr('')
    const prev = currentVote
    setCurrentVote(value)

    try {
      const { data, error } = await supabase.rpc('cast_vote', {
        p_report_id: report.id,
        p_value:     value,
      })
      if (error) throw error
      onVoted?.(data)
    } catch (e) {
      setCurrentVote(prev)
      setErr('ድምፅ አልተሰጠም')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5">
      <p className="text-slate-500 text-xs mb-2 dark:text-slate-400">ይህ ሪፖርት ትክክል ነው?</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => vote(true)}
          disabled={busy}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-xl
                      font-extrabold transition active:scale-[.98] disabled:opacity-50
            ${currentVote === true
              ? 'bg-emerald-700 text-white'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
        >
          <ThumbsUp size={20} /> አዎ
        </button>
        <button
          onClick={() => vote(false)}
          disabled={busy}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-xl
                      border-2 font-extrabold transition active:scale-[.98] disabled:opacity-50
            ${currentVote === false
              ? 'border-red-600 bg-red-600 text-white'
              : 'border-slate-400 text-slate-800 dark:text-white hover:border-red-500 hover:text-red-600'
            }`}
        >
          <ThumbsDown size={20} /> አይደለም
        </button>
      </div>
      {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
    </div>
  )
}
