import { useState } from 'react'
import { SessionProvider, useSession } from './hooks/useSession.jsx'
import { useDemoMode } from './hooks/useDemoMode.js'
import { useReports } from './hooks/useReports.js'
import { useDarkMode } from './hooks/useDarkMode.js'
import { DEMO_REPORTS } from './constants/demoReports.js'
import LoginForm from './components/auth/LoginForm.jsx'
import MapScreen from './components/map/MapScreen.jsx'
import SettingsScreen from './components/SettingsScreen.jsx'
import BottomNav from './components/ui/BottomNav.jsx'

function InnerApp() {
  const { isLoading, displayName } = useSession()
  const [tab, setTab] = useState('map')

  const { reports: dbReports, loading } = useReports()
  const { active: demoActive, simPosition, lastAlert, start: startDemo, stop: stopDemo }
    = useDemoMode(dbReports)
  const { dark, toggle: toggleTheme } = useDarkMode()

  const reports = demoActive
    ? [...dbReports, ...DEMO_REPORTS.filter(d => !dbReports.some(r => r.id === d.id))]
    : dbReports

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-light dark:bg-slate-950 flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-300 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (!displayName && !demoActive) {
    return <LoginForm onDemoMode={async () => { await startDemo() }} />
  }

  if (tab === 'settings') {
    return (
      <div className="relative mx-auto h-dvh max-w-lg overflow-hidden bg-brand-light dark:bg-slate-950">
        <SettingsScreen
          onStartDemo={async () => { await startDemo(); setTab('map') }}
          onLogout={() => setTab('map')}
          dark={dark}
          onToggleTheme={toggleTheme}
        />
        <BottomNav active={tab} onTab={setTab} />
      </div>
    )
  }

  return (
    <MapScreen
      demoMode={demoActive}
      simPosition={simPosition}
      lastAlert={lastAlert}
      reports={reports}
      loading={loading}
      onStopDemo={stopDemo}
      onTab={(t) => setTab(t)}
    />
  )
}

export default function App() {
  return (
    <SessionProvider>
      <InnerApp />
    </SessionProvider>
  )
}
