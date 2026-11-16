import { useState } from 'react'
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
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <div className="flex-1 relative overflow-hidden">
        <LeafletMap
          reports={reports}
          position={position}
          simPosition={simPosition}
          onSelectReport={r => { setSelectedReport(r); setTab('map') }}
        />

        {/* Demo banner + toast — rendered over the map */}
        {demoMode && (
          <DemoModeOverlay
            simPosition={simPosition}
            lastAlert={lastAlert}
            onStop={onStopDemo}
          />
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000]
                          bg-slate-800/90 text-white text-xs px-3 py-1.5
                          rounded-full flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-white/30 border-t-white
                             rounded-full animate-spin inline-block" />
            ሪፖርቶችን በመጫን ላይ...
          </div>
        )}

        {/* Report submit panel */}
        {tab === 'report' && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000]">
            {displayName ? (
              <ReportPanel
                position={position}
                onClose={() => setTab('map')}
                onSubmitted={() => setTab('map')}
              />
            ) : (
              <div className="bg-slate-800 rounded-t-3xl px-4 pt-4 pb-8 shadow-2xl">
                <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
                <p className="text-slate-300 text-sm text-center mb-3">
                  ሪፖርት ለማቅረብ መግባት ያስፈልጋል
                </p>
                <button onClick={() => handleTab('map')}
                  className="w-full text-blue-400 text-sm py-2">ዝጋ</button>
              </div>
            )}
          </div>
        )}

        {/* Report detail / vote sheet */}
        {selectedReport && tab === 'map' && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000]">
            <ReportBottomSheet
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
            />
          </div>
        )}
      </div>

      <BottomNav active={tab} onTab={handleTab} />
    </div>
  )
}
