import { Edit2, Plus, Trash2 } from 'lucide-react'
import type { Competitor } from '../types'

export function CompetitorsView({
  competitors,
  onCreate,
  onEdit,
  onDelete,
}: {
  competitors: Competitor[]
  onCreate: () => void
  onEdit: (competitor: Competitor) => void
  onDelete: (competitor: Competitor) => void
}) {
  return (
    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ROSTER DA TEMPORADA</p>
          <h3>{competitors.length} competidores ativos</h3>
        </div>
        <button className="button button-primary" onClick={onCreate}>
          <Plus size={17} /> Novo competidor
        </button>
      </div>
      <div className="competitor-grid">
        {competitors.map((competitor) => (
          <div className="competitor-card" key={competitor.id}>
            <div className="competitor-avatar">{competitor.name.slice(0, 1)}</div>
            <div>
              <strong>{competitor.name}</strong>
              <span>{competitor.team}</span>
              <small>
                {competitor.spec.weight} · {competitor.spec.style}
              </small>
            </div>
            <div className="record">
              <b>{competitor.record.wins}</b>
              <span>VITÓRIAS</span>
              <b>{competitor.record.losses}</b>
              <span>DERROTAS</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button
                className="small-button"
                style={{ flex: 1 }}
                onClick={() => onEdit(competitor)}
                title="Editar competidor"
              >
                <Edit2 size={13} /> Editar
              </button>
              <button
                className="small-button"
                style={{
                  color: 'var(--danger)',
                  borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)',
                }}
                onClick={() => onDelete(competitor)}
                title="Excluir competidor"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
