import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

/**
 * Fetches active DB reports and subscribes to Realtime updates.
 * Demo report merging happens in App.jsx.
 * Returns { reports, loading, error }
 */
export function useReports() {
  const [dbReports, setDbReports] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const timers                    = useRef({})   // id → timeoutId

  // ── Expiry timer management ───────────────────────────────────────────────
  const scheduleExpiry = useCallback((report) => {
    const ms = new Date(report.expires_at).getTime() - Date.now()
    if (ms <= 0) return
    timers.current[report.id] = setTimeout(() => {
      setDbReports(prev => prev.filter(r => r.id !== report.id))
      delete timers.current[report.id]
    }, ms)
  }, [])

  const cancelExpiry = useCallback((id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  // ── Helper: should this report be shown? ─────────────────────────────────
  function isVisible(r) {
    if (r.status === 'rejected') return false
    if (new Date(r.expires_at).getTime() <= Date.now()) return false
    return true
  }

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function fetchReports() {
      setLoading(true)
      try {
        const { data, error: err } = await supabase
          .from('reports')
          .select('*')
          .gt('expires_at', new Date().toISOString())
          .neq('status', 'rejected')
          .order('created_at', { ascending: false })

        if (!mounted) return
        if (err) {
          // Network/auth error — log but don't crash; demo mode still works
          console.warn('useReports fetch error (non-fatal):', err.message)
          setError(err.message)
          setLoading(false)
          return
        }
        setDbReports(data)
        data.forEach(scheduleExpiry)
      } catch (e) {
        if (!mounted) return
        console.warn('useReports fetch exception (non-fatal):', e)
        setError(e.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchReports()
    return () => { mounted = false }
  }, [scheduleExpiry])

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    let channel
    try {
      channel = supabase
        .channel('reports-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reports' },
          (payload) => {
            const { eventType, new: newRow, old: oldRow } = payload

            if (eventType === 'INSERT') {
              if (!isVisible(newRow)) return
              setDbReports(prev => {
                if (prev.some(r => r.id === newRow.id)) return prev
                return [newRow, ...prev]
              })
              scheduleExpiry(newRow)
            }

            if (eventType === 'UPDATE') {
              if (!isVisible(newRow)) {
                setDbReports(prev => prev.filter(r => r.id !== newRow.id))
                cancelExpiry(newRow.id)
              } else {
                setDbReports(prev =>
                  prev.map(r => r.id === newRow.id ? newRow : r)
                )
                cancelExpiry(newRow.id)
                scheduleExpiry(newRow)
              }
            }

            if (eventType === 'DELETE') {
              setDbReports(prev => prev.filter(r => r.id !== oldRow.id))
              cancelExpiry(oldRow.id)
            }
          }
        )
        .subscribe((status, err) => {
          if (err) console.warn('Realtime subscription error (non-fatal):', err)
        })
    } catch (e) {
      console.warn('Realtime setup failed (non-fatal):', e)
    }

    return () => {
      if (channel) supabase.removeChannel(channel).catch(() => {})
    }
  }, [scheduleExpiry, cancelExpiry])

  // ── Cleanup all timers on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [])

  return { reports: dbReports, loading, error }
}
