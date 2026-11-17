import { Navigation } from 'lucide-react'
import AlertToast from './AlertToast.jsx'

export default function DemoModeOverlay({ simPosition, lastAlert, onStop }) {
  return (
    <>
      {/* Top banner */}
      <div className="absolute inset-x-3 top-3 z-[1000] flex min-h-14
                      items-center justify-between rounded-2xl border border-brand/30
                      bg-brand-dark px-4 text-white shadow-lg">
        <div className="flex items-center gap-2 font-bold">
          <Navigation size={20} /> ዴሞ ሁናቴ
        </div>
        <button
          onClick={onStop}
          className="min-h-10 rounded-xl bg-white px-4 text-sm font-bold text-brand-dark
                     transition active:scale-[.97]"
        >
          ዴሞ ቁም
        </button>
      </div>

      {/* Alert toast */}
      <AlertToast alert={lastAlert} />
    </>
  )
}
