import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function VoteButtons({ report, onVoted }) {
  const [currentVote, setCurrentVote] = useState(null) // true | false | null
  const [busy, setBusy]               = useState(false)
  const [err, setErr]                 = useState('')

  async function vote(value) {
    if (busy) return
    // Same vote again → no-op
    if (currentVote === value) return

    setBusy(true)
    setErr('')
    const prev = currentVote
    setCurrentVote(value) // optimistic

    try {
      const { data, error } = await supabase.rpc('cast_vote', {
        p_report_id: report.id,
        p_value:     value,
      })
      if (error) throw error
      onVoted?.(data) // bubble updated report row up
    } catch (e) {
      setCurrentVote(prev) // roll back
      setErr('ድምፅ አልተሰጠም')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3">
      <p className="text-slate-400 text-xs mb-2">ይህ ሪፖርት ትክክል ነው?</p>
      <div className="flex gap-3">
        <button
          onClick={() => vote(true)}
          disabled={busy}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition
            ${currentVote === true
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-200 hover:bg-green-700 hover:text-white'
            } disabled:opacity-50`}
        >
          👍 አዎ
        </button>
        <button
          onClick={() => vote(false)}
          disabled={busy}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition
            ${currentVote === false
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-slate-200 hover:bg-red-700 hover:text-white'
            } disabled:opacity-50`}
        >
          👎 አይደለም
        </button>
      </div>
      {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
    </div>
  )
}
