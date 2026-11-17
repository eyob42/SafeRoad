import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { Navigation } from 'lucide-react'
import { useEffect } from 'react'
import { MAP_CENTER, MAP_ZOOM, ROUTE_POLYLINE, PLACE_LABELS } from '../../constants/route.js'
import UserLocationMarker from './UserLocationMarker.jsx'
import ReportMarker from './ReportMarker.jsx'

// Fix Leaflet default icon URLs
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Car marker for demo mode
const carIcon = L.divIcon({
  className: '',
  html: `<div class="car-marker">${renderToStaticMarkup(<Navigation size={22} fill="currentColor" />)}</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
})

/** Auto-pan to simulated driver position */
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
      zoomControl={false}
      attributionControl={false}
      preferCanvas
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />

      {/* Route — solid green line + dashed lighter overlay */}
      <Polyline
        positions={ROUTE_POLYLINE}
        pathOptions={{ color: '#176B45', weight: 6, opacity: 0.85 }}
      />
      <Polyline
        positions={ROUTE_POLYLINE}
        pathOptions={{ color: '#a7e8c8', weight: 2, opacity: 0.9, dashArray: '5 9' }}
      />

      {/* Place labels at each waypoint */}
      {PLACE_LABELS.map((place) => (
        <CircleMarker
          key={place.name}
          center={place.position}
          radius={4}
          pathOptions={{ color: '#334155', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
        >
          <Tooltip permanent direction="top" offset={[0, -6]} className="place-label">
            {place.name}
          </Tooltip>
        </CircleMarker>
      ))}

      {/* User / simulated location dot */}
      <UserLocationMarker position={simPosition ?? position} />

      {/* Simulated car marker */}
      {simPosition && (
        <Marker position={[simPosition.lat, simPosition.lng]} icon={carIcon} zIndexOffset={1000} />
      )}

      {/* Report pins */}
      {reports.map(r => (
        <ReportMarker key={r.id} report={r} onSelect={onSelectReport} />
      ))}

      {/* Auto-pan in demo */}
      {simPosition && <DemoPan simPosition={simPosition} />}
    </MapContainer>
  )
}
