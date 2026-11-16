import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import { MAP_CENTER, MAP_ZOOM, ROUTE_POLYLINE } from '../../constants/route.js'
import UserLocationMarker from './UserLocationMarker.jsx'
import ReportMarker from './ReportMarker.jsx'
import { SimCarMarker } from '../demo/DemoModeOverlay.jsx'

// Fix Leaflet default icon URLs broken by Vite's asset hashing
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/** Flies to simPosition when demo mode is active */
function DemoPan({ simPosition }) {
  const map = useMap()
  useEffect(() => {
    if (simPosition) {
      map.panTo([simPosition.lat, simPosition.lng], { animate: true, duration: 1 })
    }
  }, [simPosition, map])
  return null
}

export default function LeafletMap({
  reports = [],
  position,
  simPosition,
  onSelectReport,
}) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Route polyline */}
      <Polyline
        positions={ROUTE_POLYLINE}
        pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '8 4' }}
      />

      {/* User / simulated location dot */}
      <UserLocationMarker position={simPosition ?? position} />

      {/* Simulated driver car marker (demo mode) */}
      {simPosition && <SimCarMarker position={simPosition} />}

      {/* Report pins */}
      {reports.map(r => (
        <ReportMarker key={r.id} report={r} onSelect={onSelectReport} />
      ))}

      {/* Keep map centred on simulated driver */}
      {simPosition && <DemoPan simPosition={simPosition} />}
    </MapContainer>
  )
}
