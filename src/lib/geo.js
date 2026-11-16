/**
 * Haversine distance between two points.
 * Returns distance in kilometres.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371 // Earth radius km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}
