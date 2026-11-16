import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'

// ── Type config ────────────────────────────────────────────────────────────
export const REPORT_CONFIG = {
  security: { label: 'ደህንነት ስጋት',  color: '#DC2626', bg: '#FEE2E2', shape: '🛡️' },
  blocked:  { label: 'መንገድ ታግዷል',  color: '#EA580C', bg: '#FFEDD5', shape: '🚧' },
  accident: { label: 'የትራፊክ አደጋ', color: '#CA8A04', bg: '#FEF9C3', shape: '⚠️' },
  safe:     { label: 'መንገዱ ደህና ነው', color: '#16A34A', bg: '#DCFCE7', shape: '✅' },
}

const STATUS_BADGE = {
  pending:    { text: '●', color: '#94a3b8' },
  suspicious: { text: '!', color: '#eab308' },
  confirmed:  { text: '✓', color: '#22c55e' },
  rejected:   null,
}

function buildIcon(type, status) {
  const cfg   = REPORT_CONFIG[type] ?? REPORT_CONFIG.accident
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending

  const html = `
    <div style="
      position: relative;
      width: 36px; height: 36px;
      background: ${cfg.bg};
      border: 2.5px solid ${cfg.color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    ">
      <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">
        ${cfg.shape}
      </span>
      ${badge ? `
        <span style="
          position: absolute;
          top: -6px; right: -6px;
          transform: rotate(45deg);
          background: ${badge.color};
          color: #fff;
          border-radius: 50%;
          width: 14px; height: 14px;
          font-size: 9px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid #fff;
        ">${badge.text}</span>
      ` : ''}
    </div>
  `

  return L.divIcon({
    html,
    className: '',
    iconSize:  [36, 36],
    iconAnchor:[18, 36],
    popupAnchor:[0, -36],
  })
}

export default function ReportMarker({ report, onSelect }) {
  const icon = buildIcon(report.type, report.status)
  const cfg  = REPORT_CONFIG[report.type] ?? REPORT_CONFIG.accident

  return (
    <Marker
      position={[report.lat, report.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(report) }}
    >
      <Tooltip direction="top" offset={[0, -38]}>
        {cfg.label}
      </Tooltip>
    </Marker>
  )
}
