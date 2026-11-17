import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { REPORT_META } from '../../constants/reportMeta.js'

const STATUS_DOT = {
  pending:    '#94a3b8',
  suspicious: '#eab308',
  confirmed:  '#22c55e',
  rejected:   null,
}

function buildIcon(type, status) {
  const meta = REPORT_META[type] ?? REPORT_META.accident
  const Icon = meta.Icon
  const dotColor = STATUS_DOT[status] ?? STATUS_DOT.pending

  const iconSvg = renderToStaticMarkup(<Icon size={22} strokeWidth={2.7} />)

  const badge = dotColor ? `
    <span style="
      position: absolute;
      top: -5px; right: -5px;
      width: 14px; height: 14px;
      background: ${dotColor};
      border: 2px solid #fff;
      border-radius: 50%;
      transform: rotate(45deg);
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    "></span>
  ` : ''

  return L.divIcon({
    className: '',
    html: `<div class="report-marker" style="--marker:${meta.color}">${iconSvg}${badge}</div>`,
    iconSize:  [44, 50],
    iconAnchor: [22, 46],
    popupAnchor: [0, -46],
  })
}

export default function ReportMarker({ report, onSelect }) {
  const icon = buildIcon(report.type, report.status)
  const meta = REPORT_META[report.type] ?? REPORT_META.accident

  return (
    <Marker
      position={[report.lat, report.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(report) }}
    >
      <Tooltip direction="top" offset={[0, -48]} className="place-label">
        {meta.label}
      </Tooltip>
    </Marker>
  )
}
