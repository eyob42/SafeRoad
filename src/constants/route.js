export const WAYPOINTS = [
  { name: 'አዲስ አበባ',  lat: 8.9806, lng: 38.7578 },
  { name: 'ሆለታ',      lat: 9.0500, lng: 38.5100 },
  { name: 'አዲስ አለም',  lat: 9.0333, lng: 38.3833 },
  { name: 'ጊንቺ',      lat: 9.0167, lng: 38.1333 },
  { name: 'አምቦ',      lat: 8.9833, lng: 37.8500 },
]

/** Array of [lat, lng] for use as a Leaflet Polyline */
export const ROUTE_POLYLINE = WAYPOINTS.map(w => [w.lat, w.lng])

/** Place labels for the map — { name, position: [lat, lng] } */
export const PLACE_LABELS = WAYPOINTS.map(w => ({ name: w.name, position: [w.lat, w.lng] }))

/** Map centre — midpoint near Addis Alem */
export const MAP_CENTER = [9.0167, 38.3000]
export const MAP_ZOOM   = 9
