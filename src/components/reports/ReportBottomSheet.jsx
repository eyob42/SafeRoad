import { useState } from 'react'
import { ThumbsDown, ThumbsUp, X, Check } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge.jsx'
import VoteButtons from '../voting/VoteButtons.jsx'
import { REPORT_META } from '../../constants/reportMeta.js'

function timeAgo(isoStr) {
  const mins = Math.round((Date.now() - new Date(isoStr).getTime()) / 60000)
  if (mins < 1)  return 'አሁን'
  if (mins === 1) return '1 ደቂቃ በፊት'
  if (mins < 60)  return `${mins} ደቂቃ በፊት`
  const hrs = Math.round(mins / 60)
  return `${hrs} ሰዓት በፊት`
}

export default function ReportBottomSheet({ report, onClose }) {
  const [localReport, setLocalReport] = useState(report)
  const ownIds = JSON.parse(localStorage.getItem('sr_ownReportIds') || '[]')
  const isOwn  = ownIds.includes(localReport.id)
  const isDemo = String(localReport.id).startsWith('demo-')
  const meta   = REPORT_META[localReport.type] ?? REPORT_META.accident
  const Icon   = meta.Icon

  function handleVoted(updated) {
    setLocalReport(updated)
  }

  return (
    <section className="sheet">
      <div className="sheet-handle" />

      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl"
          style={{ background: meta.bg, color: meta.color }}
        >
          <Icon size={30} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">{meta.label}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {timeAgo(localReport.created_at)}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="ዝጋ"
          className="grid size-12 place-items-center rounded-xl text-slate-600 dark:text-slate-300"
        >
          <X />
        </button>
      </div>

      {/* Status + vote counts */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
        <StatusBadge status={localReport.status} />
        <div className="flex gap-4 text-sm font-bold text-slate-700 dark:text-slate-200">
          <span className="flex items-center gap-1">
            <ThumbsUp size={17} /> {localReport.yes_count}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown size={17} /> {localReport.no_count}
          </span>
        </div>
      </div>

      {/* Voting section */}
      {isDemo ? (
        <p className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-xl
                      bg-slate-100 px-4 text-center text-sm font-bold text-slate-600
                      dark:bg-slate-800 dark:text-slate-300">
          ዴሞ ሪፖርት — ድምፅ አይሰጥም
        </p>
      ) : isOwn ? (
        <p className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-xl
                      bg-slate-100 px-4 text-center text-sm font-bold text-slate-600
                      dark:bg-slate-800 dark:text-slate-300">
          <Check size={19} /> ይህ የእርስዎ ሪፖርት ነው — ድምፅ መስጠት አይችሉም
        </p>
      ) : (
        <VoteButtons report={localReport} onVoted={handleVoted} />
      )}

      {/* Rules explanation */}
      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
        2 የ"አዎ" ድምፅ ሲያገኝ ይረጋገጣል። "አይደለም" በ2 ከበለጠ ይደበቃል። ሪፖርቶች ከ30 ደቂቃ በኋላ ይጠፋሉ።
      </p>
    </section>
  )
}
