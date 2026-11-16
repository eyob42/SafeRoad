import { useState } from 'react'
import { SessionProvider, useSession } from './hooks/useSession.jsx'
import { useDemoMode } from './hooks/useDemoMode.js'
import { useReports } from './hooks/useReports.js'
import { DEMO_REPORTS } from './constants/demoReports.js'
import LoginForm from './components/auth/LoginForm.jsx'
import MapScreen from './components/map/MapScreen.jsx'
import SettingsScreen from './components/SettingsScreen.jsx'
import BottomNav from './components/ui/BottomNav.jsx'

function InnerApp() {
  const { isLoading, displayName } = useSession()
  const [tab, setTab] = useState('map')

  // Single source of truth for DB reports — one subscription, owned here
  const { reports: dbReports, loading } = useReports()

  const { active: demoActive, simPosition, lastAlert, start: startDemo, stop: stopDemo }
    = useDemoMode(dbReports)

  // Merge hardcoded demo reports when demo is active
  const reports = demoActive
    ? [...dbReports, ...DEMO_REPORTS.filter(d => !dbReports.some(r => r.id === d.id))]
    : dbReports

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-slate-600 border-t-blue-400
                         rounded-full animate-spin" />
      </div>
    )
  }

  if (!displayName && !demoActive) {
    return <LoginForm onDemoMode={async () => { await startDemo() }} />
  }

  if (tab === 'settings') {
    return (
      <div className="flex flex-col h-screen bg-slate-900">
        <div className="flex-1 overflow-hidden">
          <SettingsScreen
            onStartDemo={async () => { await startDemo(); setTab('map') }}
            onLogout={() => setTab('map')}
          />
        </div>
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
