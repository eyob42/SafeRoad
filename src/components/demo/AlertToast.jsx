import { ALERT_STRINGS } from '../../lib/audio.js'
import { REPORT_CONFIG } from '../map/ReportMarker.jsx'

export default function AlertToast({ alert }) {
  if (!alert) return null
  const cfg  = REPORT_CONFIG[alert.type] ?? REPORT_CONFIG.accident
  const text = ALERT_STRINGS[alert.type] ?? ''

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100]
                    max-w-xs w-[90vw] pointer-events-none">
      <div className="rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3
                      animate-bounce-in"
           style={{ background: cfg.color }}>
        <span className="text-2xl flex-shrink-0">{cfg.shape}</span>
        <div>
          <p className="text-white font-bold text-sm leading-snug">{cfg.label}</p>
          <p className="text-white/80 text-xs mt-0.5">{text}</p>
        </div>
      </div>
    </div>
  )
}
