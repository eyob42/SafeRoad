import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSession]       = useState(undefined) // undefined = still loading
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('sr_displayName') || '')

  // Bootstrap: restore existing session or create a new anonymous one
  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      // Check for an existing session first
      const { data: { session: existing } } = await supabase.auth.getSession()
      if (existing) {
        if (mounted) setSession(existing)
        return
      }
      // No session — sign in anonymously
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) console.error('anon sign-in error:', error)
      if (mounted) setSession(data?.session ?? null)
    }

    bootstrap()

    // Keep session in sync across tabs / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (name) => {
    if (!session?.user?.id) throw new Error('no session')
    const trimmed = name.trim()
    if (!trimmed) throw new Error('empty name')

    // Insert the driver row. If it already exists (returning user) ignore the
    // duplicate-key error — the display name from localStorage is the real gate.
    const { error } = await supabase.from('drivers').insert({
      id: session.user.id,
      display_name: trimmed,
    })

    if (error) {
      // 23505 = unique_violation (row already exists) → fine, treat as success
      if (error.code !== '23505') {
        console.warn('drivers insert warning (non-fatal):', error.code, error.message)
      }
    }

    localStorage.setItem('sr_displayName', trimmed)
    setDisplayName(trimmed)
  }, [session])

  // logout: sign out and clear local state
  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('sr_displayName')
    localStorage.removeItem('sr_ownReportIds')
    setDisplayName('')
  }, [])

  const value = {
    session,          // null | Session object  (undefined while loading)
    displayName,      // '' means user hasn't entered their name yet
    isLoading: session === undefined,
    isNewUser: session !== undefined && session !== null && !displayName,
    login,
    logout,
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
