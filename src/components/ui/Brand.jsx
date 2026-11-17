import { ShieldCheck } from 'lucide-react'

export default function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`${compact ? 'size-10' : 'size-14'} grid place-items-center rounded-2xl
                   bg-brand text-white shadow-sm`}
      >
        <ShieldCheck size={compact ? 23 : 31} strokeWidth={2.4} />
      </span>
      <div>
        <p
          className={`${compact ? 'text-xl' : 'text-3xl'} font-bold tracking-tight
                      text-slate-950 dark:text-white`}
        >
          SafeRoad
        </p>
        {!compact && (
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            ደህንነቱ የተጠበቀ ጉዞ
          </p>
        )}
      </div>
    </div>
  )
}
