import { STATUS_META } from '../../constants/reportMeta.js'

export default function StatusBadge({ status, small = false }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending
  const size = small ? 'text-xs px-1.5 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-extrabold
                      ${meta.className} ${size}`}>
      {meta.label}
    </span>
  )
}
