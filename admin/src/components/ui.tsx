import type { ReactNode } from 'react'
import { CalendarDays, ClipboardList } from 'lucide-react'
import { formatDate } from '../services/api'
import type { Fight, BetStatus } from '../types'

export function NavButton({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ReactNode
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {count ? <b>{count}</b> : null}
    </button>
  )
}

export function Metric({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string | number
  detail: string
  accent: string
}) {
  return (
    <div className="metric">
      <div className={`metric-icon ${accent}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

export function FightRow({
  fight,
  onFinish,
}: {
  fight: Fight
  onFinish: (fight: Fight, winnerId: string | null) => void
}) {
  return (
    <div className="fight-row">
      <div className="fight-date">
        <CalendarDays size={16} />
        <span>{formatDate(fight.scheduledAt)}</span>
      </div>
      <div className="fighters">
        <strong>{fight.competitorA.name}</strong>
        <em>VS</em>
        <strong>{fight.competitorB.name}</strong>
      </div>
      <div className="fight-odds">
        <span>{fight.odds.a.toFixed(2)}</span>
        <span>{fight.odds.b.toFixed(2)}</span>
      </div>
      {fight.seasonType === 'ROBOT_ROOSTER' && <div className="finish-actions">
        <button
          onClick={() => onFinish(fight, fight.competitorA.id)}
          title={`Vitória: ${fight.competitorA.name}`}
        >
          {fight.competitorA.name.split(' ')[0]}
        </button>
        <button
          onClick={() => onFinish(fight, fight.competitorB.id)}
          title={`Vitória: ${fight.competitorB.name}`}
        >
          {fight.competitorB.name.split(' ')[0]}
        </button>
        <button onClick={() => onFinish(fight, null)} title="Empate">
          Empate
        </button>
      </div>}
    </div>
  )
}

export function Status({ status }: { status: BetStatus }) {
  const labels = { PENDING: 'Pendente', WON: 'Ganha', LOST: 'Perdida', VOID: 'Estornada' }
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <i />
      {labels[status]}
    </span>
  )
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <ClipboardList size={20} />
      {text}
    </div>
  )
}
