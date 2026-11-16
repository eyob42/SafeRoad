import { CircleMarker, Tooltip } from 'react-leaflet'

export default function UserLocationMarker({ position }) {
  if (!position) return null
  return (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={8}
      pathOptions={{
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.9,
        weight: 2,
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} permanent={false}>
        አሁን ያሉበት ቦታ
      </Tooltip>
    </CircleMarker>
  )
}
