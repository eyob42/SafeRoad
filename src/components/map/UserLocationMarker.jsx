import { CircleMarker, Tooltip } from 'react-leaflet'

export default function UserLocationMarker({ position }) {
  if (!position) return null
  return (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={9}
      pathOptions={{
        color: '#fff',
        fillColor: '#176B45',
        fillOpacity: 1,
        weight: 4,
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} permanent={false}>
        አሁን ያሉበት ቦታ
      </Tooltip>
    </CircleMarker>
  )
}
