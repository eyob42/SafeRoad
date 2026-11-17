import { X } from 'lucide-react'
import { ALERT_STRINGS } from '../../lib/audio.js'
import { REPORT_META } from '../../constants/reportMeta.js'

export default function AlertToast({ alert, onClose }) {
  if (!alert) return null
  const meta = REPORT_META[alert.type] ?? REPORT_META.accident
  const Icon = meta.Icon
  const text = ALERT_STRINGS[alert.type] ?? ''

  return (
    <div
      role="alert"
      className="absolute inset-x-3 top-20 z-[1100] rounded-2xl border-2
                 bg-white p-4 shadow-2xl dark:bg-slate-900"
      style={{ borderColor: meta.color }}
    >
      <div className="flex gap-3">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl"
          style={{ background: meta.bg, color: meta.color }}
        >
          <Icon size={28} strokeWidth={2.5} />
        </span>
        <div className="flex-1">
          <p className="font-extrabold" style={{ color: meta.color }}>ጥንቃቄ!</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
            ከፊት ለፊትዎ {meta.label} ሪፖርት ተደርጓል
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="ዝጋ"
            className="grid size-12 shrink-0 place-items-center rounded-xl text-slate-600 dark:text-slate-300"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
