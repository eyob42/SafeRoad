import { useCallback, useEffect, useRef, useState } from 'react'
import { WAYPOINTS, ROUTE_POLYLINE } from '../constants/route.js'
import { haversineKm } from '../lib/geo.js'
import { unlockAudio, playAlert } from '../lib/audio.js'

const STEP_KM        = 1       // km advanced per tick
const TICK_MS        = 2000    // ms per tick
const ALERT_RADIUS   = 2       // km — fire alert within this distance

/**
 * Walk the ROUTE_POLYLINE by `distKm` km from `current` position.
 * Returns the new { lat, lng } and whether the route was completed.
 */
function advanceAlongRoute(current, distKm) {
  let remaining = distKm
  let pos = { ...current }

  for (let i = 0; i < ROUTE_POLYLINE.length - 1; i++) {
    const [aLat, aLng] = ROUTE_POLYLINE[i]
    const [bLat, bLng] = ROUTE_POLYLINE[i + 1]

    // Are we past this segment?
    const segDist = haversineKm(aLat, aLng, bLat, bLng)
    const dFromA  = haversineKm(pos.lat, pos.lng, aLat, aLng)
    const dFromB  = haversineKm(pos.lat, pos.lng, bLat, bLng)

    // Skip segments we have already passed
    if (dFromA > segDist + 0.1) continue

    // How far is left in this segment from current position?
    const leftInSeg = dFromB

    if (remaining <= leftInSeg) {
      // Interpolate within this segment
      const t = remaining / leftInSeg
      return {
        pos: {
          lat: pos.lat + (bLat - pos.lat) * t,
          lng: pos.lng + (bLng - pos.lng) * t,
        },
        done: false,
      }
    }

    remaining -= leftInSeg
    pos = { lat: bLat, lng: bLng }
  }

  // Reached Ambo — signal loop reset
  return { pos: { lat: ROUTE_POLYLINE.at(-1)[0], lng: ROUTE_POLYLINE.at(-1)[1] }, done: true }
}

/**
 * Demo mode simulation hook.
 *
 * Returns { active, simPosition, lastAlert, start, stop }
 *
 * The consumer passes `reports` on each render so the alert check always
 * uses the freshest list (both DB reports and hardcoded demo reports).
 */
export function useDemoMode(reports = []) {
  const [active, setActive]           = useState(false)
  const [simPosition, setSimPosition] = useState(null)
  const [lastAlert, setLastAlert]     = useState(null)  // { type, text } for toast

  const intervalRef  = useRef(null)
  const alertedRef   = useRef(new Set())
  const posRef       = useRef(null)   // mutable copy so interval closure sees latest
  const reportsRef   = useRef(reports)

  // Keep reportsRef current without restarting the interval
  useEffect(() => { reportsRef.current = reports }, [reports])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setActive(false)
    setSimPosition(null)
    setLastAlert(null)
    posRef.current   = null
    alertedRef.current.clear()
  }, [])

  const start = useCallback(async () => {
    // Unlock audio on this user gesture
    await unlockAudio()

    // Reset to Addis Ababa
    const startPos = { lat: WAYPOINTS[0].lat, lng: WAYPOINTS[0].lng }
    posRef.current = startPos
    alertedRef.current.clear()
    setSimPosition(startPos)
    setLastAlert(null)
    setActive(true)

    intervalRef.current = setInterval(() => {
      // Advance position
      const { pos, done } = advanceAlongRoute(posRef.current, STEP_KM)

      if (done) {
        // Loop back to Addis Ababa
        const reset = { lat: WAYPOINTS[0].lat, lng: WAYPOINTS[0].lng }
        posRef.current = reset
        alertedRef.current.clear()
        setSimPosition(reset)
        return
      }

      posRef.current = pos
      setSimPosition({ ...pos })

      // Check for nearby reports
      const current = reportsRef.current
      for (const report of current) {
        if (alertedRef.current.has(report.id)) continue
        if (report.status === 'suspicious' || report.status === 'rejected') continue

        const dist = haversineKm(pos.lat, pos.lng, report.lat, report.lng)
        if (dist <= ALERT_RADIUS) {
          alertedRef.current.add(report.id)
          playAlert(report.type)
          setLastAlert({ type: report.type, reportId: report.id })
          // Auto-clear toast after 4 s
          setTimeout(() => setLastAlert(null), 4000)
          break  // one alert per tick
        }
      }
    }, TICK_MS)
  }, [])

  // Clean up on unmount
  useEffect(() => () => stop(), [stop])

  return { active, simPosition, lastAlert, start, stop }
}
