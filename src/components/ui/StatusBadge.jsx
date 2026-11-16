const CONFIG = {
  pending:    { label: 'በመጠበቅ',  bg: 'bg-slate-500',  dot: '●' },
  suspicious: { label: 'አጠራጣሪ',  bg: 'bg-yellow-500', dot: '!' },
  confirmed:  { label: 'ተረጋግጧል', bg: 'bg-green-600',  dot: '✓' },
  rejected:   { label: 'ተቀባይነት የለም', bg: 'bg-red-700', dot: '✕' },
}

export default function StatusBadge({ status, small = false }) {
  const cfg = CONFIG[status] ?? CONFIG.pending
  const size = small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold
                      text-white ${cfg.bg} ${size}`}>
      <span>{cfg.dot}</span>
      <span>{cfg.label}</span>
    </span>
  )
}
