import { useState } from 'react'
import StatusBadge from '../ui/StatusBadge.jsx'
import VoteButtons from '../voting/VoteButtons.jsx'
import { REPORT_CONFIG } from '../map/ReportMarker.jsx'

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
  const cfg    = REPORT_CONFIG[localReport.type] ?? REPORT_CONFIG.accident

  function handleVoted(updated) {
    setLocalReport(updated)
  }

  return (
    <div className="bg-slate-800 rounded-t-3xl px-4 pt-4 pb-8 shadow-2xl">
      {/* Handle */}
      <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cfg.shape}</span>
          <div>
            <p className="text-white font-bold text-base">{cfg.label}</p>
            <p className="text-slate-400 text-xs">{timeAgo(localReport.created_at)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xl leading-none"
          aria-label="ዝጋ"
        >✕</button>
      </div>

      {/* Status */}
      <StatusBadge status={localReport.status} />

      {/* Vote counts */}
      <div className="mt-3 flex gap-4 text-sm">
        <span className="text-green-400">👍 {localReport.yes_count} አዎ</span>
        <span className="text-red-400">👎 {localReport.no_count} አይደለም</span>
      </div>

      {/* Voting */}
      {isDemo ? (
        <p className="mt-3 text-slate-500 text-xs italic">ዴሞ ሪፖርት — ድምፅ አይሰጥም</p>
      ) : isOwn ? (
        <p className="mt-3 text-slate-500 text-xs italic">ይህ የእርስዎ ሪፖርት ነው</p>
      ) : (
        <VoteButtons report={localReport} onVoted={handleVoted} />
      )}
    </div>
  )
}
