import { CalendarDays, Clock, Plus, Trash2 } from 'lucide-react'
import { formatDate } from '../services/api'
import type { Fight } from '../types'

export function FightsView({
  fights,
  readOnly,
  onFinish,
  onCreate,
  onReschedule,
  onCancel,
}: {
  fights: Fight[]
  readOnly: boolean
  onFinish: (fight: Fight, winnerId: string | null) => void
  onCreate: () => void
  onReschedule: (fight: Fight) => void
  onCancel: (fight: Fight) => void
}) {
  return (
    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">GESTÃO DO CARD</p>
          <h3>{fights.length} confrontos na temporada</h3>
        </div>
        {readOnly ? <span>Card e resultados da ESPN</span> : (
          <button className="button button-primary" onClick={onCreate}>
            <Plus size={17} /> Nova luta
          </button>
        )}
      </div>
      <div className="fight-list">
        {fights.map((fight) => (
          <div className={`fight-card ${fight.isFinished ? 'finished' : ''}`} key={fight.id}>
            <div className="fight-card-top">
              <span className="date-label">
                <CalendarDays size={15} /> {formatDate(fight.scheduledAt)}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!readOnly && !fight.isFinished && (
                  <>
                    <button
                      className="small-button"
                      style={{ padding: '3px 8px', fontSize: 10 }}
                      onClick={() => onReschedule(fight)}
                      title="Remarcar horário"
                    >
                      <Clock size={12} /> Remarcar
                    </button>
                    <button
                      className="small-button"
                      style={{
                        padding: '3px 8px',
                        fontSize: 10,
                        color: 'var(--danger)',
                        borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)',
                      }}
                      onClick={() => onCancel(fight)}
                      title="Cancelar luta e estornar apostas"
                    >
                      <Trash2 size={12} /> Cancelar
                    </button>
                  </>
                )}
                <span className={`status ${fight.isFinished ? 'won' : 'pending'}`}>
                  <i />
                  {fight.isFinished ? 'Encerrada' : fight.bettingOpen === false ? 'Apostas fechadas' : 'Aberta'}
                </span>
              </div>
            </div>
            <div className="fight-versus">
              <div>
                <strong>{fight.competitorA.name}</strong>
                <span>{fight.competitorA.team}</span>
              </div>
              <em>VS</em>
              <div>
                <strong>{fight.competitorB.name}</strong>
                <span>{fight.competitorB.team}</span>
              </div>
            </div>
            <div className="fight-card-bottom">
              <span>
                ODDS <b>{fight.odds.a.toFixed(2)}</b> / <b>{fight.odds.b.toFixed(2)}</b>
              </span>
              {!readOnly && !fight.isFinished && (
                <div className="finish-actions">
                  <button onClick={() => onFinish(fight, fight.competitorA.id)}>
                    {fight.competitorA.name} venceu
                  </button>
                  <button onClick={() => onFinish(fight, fight.competitorB.id)}>
                    {fight.competitorB.name} venceu
                  </button>
                  <button onClick={() => onFinish(fight, null)}>Empate</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
