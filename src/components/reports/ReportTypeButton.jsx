import { REPORT_CONFIG } from '../map/ReportMarker.jsx'

export default function ReportTypeButton({ type, onClick, disabled }) {
  const cfg = REPORT_CONFIG[type]
  return (
    <button
      onClick={() => onClick(type)}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3
                 border-2 transition active:scale-95 disabled:opacity-40
                 disabled:cursor-not-allowed"
      style={{
        borderColor: cfg.color,
        background:  cfg.bg,
      }}
    >
      <span className="text-2xl">{cfg.shape}</span>
      <span className="text-xs font-semibold text-slate-800 leading-tight text-center">
        {cfg.label}
      </span>
    </button>
  )
}
