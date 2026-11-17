import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import LeafletMap from './LeafletMap.jsx'
import ReportPanel from '../reports/ReportPanel.jsx'
import ReportBottomSheet from '../reports/ReportBottomSheet.jsx'
import BottomNav from '../ui/BottomNav.jsx'
import DemoModeOverlay from '../demo/DemoModeOverlay.jsx'
import { useLocation } from '../../hooks/useLocation.js'
import { useSession } from '../../hooks/useSession.jsx'

export default function MapScreen({
  demoMode    = false,
  simPosition = null,
  lastAlert   = null,
  reports     = [],
  loading     = false,
  onStopDemo,
  onTab,
}) {
  const { position } = useLocation(simPosition)
  const { displayName } = useSession()

  const [tab, setTab]                   = useState('map')
  const [selectedReport, setSelectedReport] = useState(null)

  function handleTab(t) {
    setTab(t)
    onTab?.(t)
    setSelectedReport(null)
  }

  return (
    <div className="relative mx-auto h-dvh max-w-lg overflow-hidden
                    bg-slate-100 dark:bg-slate-950">
      {/* Map fills screen */}
      <main className="absolute inset-0 bg-slate-200 dark:bg-slate-900">
        <LeafletMap
          reports={reports}
          position={position}
          simPosition={simPosition}
          onSelectReport={r => { setSelectedReport(r); setTab('map') }}
        />

        {/* OSM attribution */}
        <div className="absolute bottom-24 left-3 z-[900] rounded-lg bg-white/90 px-2 py-1
                        text-[10px] font-bold text-slate-600 shadow
                        dark:bg-slate-900/90 dark:text-slate-300">
          © OpenStreetMap
        </div>

        {/* Demo banner */}
        {demoMode && (
          <DemoModeOverlay
            simPosition={simPosition}
            lastAlert={lastAlert}
            onStop={onStopDemo}
          />
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-[1200] grid place-items-center
                          bg-slate-100/90 dark:bg-slate-950/90">
            <div className="text-center font-bold text-slate-700 dark:text-slate-200">
              <LoaderCircle className="mx-auto mb-3 animate-spin text-brand" size={32} />
              ሪፖርቶችን በመጫን ላይ...
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && reports.length === 0 && !demoMode && (
          <div className="absolute left-1/2 top-24 z-[900] w-[calc(100%-2rem)]
                          -translate-x-1/2 rounded-xl bg-white/95 p-4 text-center
                          font-bold text-slate-700 shadow
                          dark:bg-slate-900/95 dark:text-slate-200">
            በዚህ መንገድ ላይ አዲስ ሪፖርት የለም
          </div>
        )}

        {/* Report submit panel */}
        {tab === 'report' && (
          displayName ? (
            <ReportPanel
              position={position}
              onClose={() => setTab('map')}
              onSubmitted={() => setTab('map')}
            />
          ) : (
            <section className="sheet">
              <div className="sheet-handle" />
              <p className="text-slate-400 text-sm text-center mb-3">
                ሪፖርት ለማቅረብ መግባት ያስፈልጋል
              </p>
              <button onClick={() => handleTab('map')}
                className="w-full text-brand text-sm py-2 font-bold">ዝጋ</button>
            </section>
          )
        )}

        {/* Report detail sheet */}
        {selectedReport && tab === 'map' && (
          <ReportBottomSheet
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
          />
        )}
      </main>

      <BottomNav active={tab} onTab={handleTab} />
    </div>
  )
}
