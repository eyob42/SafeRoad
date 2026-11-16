import { useEffect, useRef, useState } from 'react'

/**
 * Returns the current GPS position, or `override` when demo mode is active.
 *
 * @param {{ lat: number, lng: number } | null} override
 *   Pass the simulated position from useDemoMode when demo is active.
 *   Pass null/undefined to use real GPS.
 *
 * @returns {{ position: {lat,lng}|null, error: string|null }}
 */
export function useLocation(override = null) {
  const [gps, setGps]     = useState(null)
  const [error, setError] = useState(null)
  const watchId           = useRef(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('የቦታ አገልግሎት አይደገፍም')
      return
    }

    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setError(null)
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('የቦታ ፈቃድ ተከልክሏል')
        } else {
          setError('ቦታ ማግኘት አልተቻለም')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [])

  return {
    position: override ?? gps,
    gpsPosition: gps,   // always the real GPS, used by far-away test
    error: override ? null : error,
  }
}
