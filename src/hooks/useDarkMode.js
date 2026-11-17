import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sr_darkMode'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
    return false // default to light mode
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(STORAGE_KEY, String(dark))
  }, [dark])

  function toggle() { setDark(d => !d) }

  return { dark, toggle }
}
