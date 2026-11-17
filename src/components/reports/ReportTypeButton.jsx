import { REPORT_META } from '../../constants/reportMeta.js'

export default function ReportTypeButton({ type, onClick, disabled }) {
  const meta = REPORT_META[type]
  const Icon = meta.Icon
  return (
    <button
      onClick={() => onClick(type)}
      disabled={disabled}
      className="min-h-28 rounded-2xl border-2 bg-white p-3 text-left
                 font-extrabold shadow-sm transition active:scale-[.97]
                 disabled:opacity-40 disabled:cursor-not-allowed
                 dark:bg-slate-900"
      style={{ borderColor: meta.color, color: meta.color }}
    >
      <Icon size={30} strokeWidth={2.5} />
      <span className="mt-3 block leading-6">{meta.label}</span>
    </button>
  )
}
