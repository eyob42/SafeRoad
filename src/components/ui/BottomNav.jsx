import { Map, Settings, Siren } from 'lucide-react'

const TABS = [
  { id: 'map',      label: 'ካርታ',    Icon: Map      },
  { id: 'report',   label: 'ሪፖርት',   Icon: Siren     },
  { id: 'settings', label: 'ቅንብሮች',  Icon: Settings  },
]

export default function BottomNav({ active, onTab }) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-[1000]
                    border-t border-slate-200/90 bg-white/95 px-3
                    pb-[max(10px,env(safe-area-inset-bottom))] pt-2
                    shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur
                    dark:border-slate-700 dark:bg-slate-950/95">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {TABS.map(({ id, label, Icon }) => {
          const selected = active === id
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`min-h-14 rounded-xl px-2 text-xs font-bold transition active:scale-[.97]
                ${selected
                  ? 'bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand'
                  : 'text-slate-600 dark:text-slate-300'
                }`}
              aria-current={selected ? 'page' : undefined}
            >
              <Icon className="mx-auto mb-1" size={22} strokeWidth={selected ? 2.7 : 2.2} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
