import { ShieldAlert, Construction, TriangleAlert, CheckCircle2 } from 'lucide-react'

/**
 * Central report type configuration.
 * Used by markers, buttons, sheets, and alerts across the entire app.
 */
export const REPORT_META = {
  security: {
    label: 'ደህንነት ስጋት',
    color: '#DC3535',
    bg: '#FEF2F2',
    Icon: ShieldAlert,
  },
  blocked: {
    label: 'መንገድ ታግዷል',
    color: '#E88725',
    bg: '#FFF7ED',
    Icon: Construction,
  },
  accident: {
    label: 'የትራፊክ አደጋ',
    color: '#E6B82E',
    bg: '#FEFCE8',
    Icon: TriangleAlert,
  },
  safe: {
    label: 'መንገዱ ደህና ነው',
    color: '#239B63',
    bg: '#ECFDF3',
    Icon: CheckCircle2,
  },
}

export const REPORT_TYPES = ['security', 'blocked', 'accident', 'safe']

/**
 * Status metadata for badges and markers.
 */
export const STATUS_META = {
  pending:    { label: 'አዲስ',     className: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100' },
  suspicious: { label: 'አጠራጣሪ',   className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  confirmed:  { label: 'ተረጋግጧል',  className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  rejected:   { label: 'ተቀባይነት የለም', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
}
