const TABS = [
  { id: 'map',      label: 'ካርታ',    icon: '🗺️'  },
  { id: 'report',   label: 'ሪፖርት',   icon: '📢'  },
  { id: 'settings', label: 'ቅንብሮች',  icon: '⚙️'  },
]

export default function BottomNav({ active, onTab }) {
  return (
    <nav className="flex border-t border-slate-700 bg-slate-900">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTab(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5
                      text-xs font-medium transition
                      ${active === tab.id
                        ? 'text-blue-400'
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
