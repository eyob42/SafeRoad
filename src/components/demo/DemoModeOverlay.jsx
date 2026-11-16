import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import AlertToast from './AlertToast.jsx'

// Simulated driver icon — distinctive car shape
function carIcon() {
  return L.divIcon({
    html: `<div style="
      width:32px;height:32px;
      background:#1d4ed8;
      border:3px solid #fff;
      border-radius:6px;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    ">🚗</div>`,
    className: '',
    iconSize:  [32, 32],
    iconAnchor:[16, 16],
  })
}

export default function DemoModeOverlay({ simPosition, lastAlert, onStop }) {
  return (
    <>
      {/* Top banner */}
      <div className="absolute top-0 left-0 right-0 z-[1050]
                      bg-blue-700/95 backdrop-blur-sm
                      flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" />
          <span className="text-white text-sm font-semibold">ዴሞ ሁናቴ</span>
        </div>
        <button
          onClick={onStop}
          className="bg-white/20 hover:bg-white/30 text-white text-xs
                     font-semibold px-3 py-1 rounded-full transition"
        >
          ዴሞ ቁም ✕
        </button>
      </div>

      {/* Alert toast — rendered inside the map's relative container */}
      <AlertToast alert={lastAlert} />

      {/* Simulated car marker — rendered as a Leaflet layer by the parent MapContainer */}
      {simPosition && (
        <SimCarMarker position={simPosition} />
      )}
    </>
  )
}

// Separate component so it renders inside MapContainer's React tree
export function SimCarMarker({ position }) {
  if (!position) return null
  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={carIcon()}
      zIndexOffset={1000}
    >
      <Tooltip direction="top" offset={[0, -16]} permanent={false}>
        ሲሙሌሽን አሽከርካሪ
      </Tooltip>
    </Marker>
  )
}
