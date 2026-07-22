import { Check, X, Clock } from 'lucide-react'

const CONFIG = {
  taken: { label: 'Taken', icon: Check, className: 'status-pill--taken' },
  missed: { label: 'Missed', icon: X, className: 'status-pill--missed' },
  upcoming: { label: 'Upcoming', icon: Clock, className: 'status-pill--upcoming' },
}

export default function StatusPill({ status }) {
  const { label, icon: Icon, className } = CONFIG[status] ?? CONFIG.upcoming
  return (
    <span className={`status-pill ${className}`}>
      <Icon size={12} strokeWidth={3} />
      {label}
    </span>
  )
}
