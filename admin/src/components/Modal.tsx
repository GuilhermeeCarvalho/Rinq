import { useId, useState, useEffect, type FormEvent, type ReactNode } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { request } from '../services/api'
import type { Season, Competitor, Fight, User } from '../types'
import { THEMES } from '../theme'

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  /** Sugestões nativas de autocomplete (datalist); o campo continua aceitando texto livre. */
  options?: string[]
}) {
  const listId = useId()
  return (
    <label>
      {label}
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        list={options ? listId : undefined}
        autoComplete={options ? 'off' : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {options && (
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </label>
  )
}

export function Modal({
  title,
  eyebrow = 'AÇÃO ADMINISTRATIVA',
  onClose,
  children,
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h3>{title}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onClose,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {danger && <AlertTriangle size={20} color="var(--danger)" />}
            <h3>{title}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, margin: '8px 0 20px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="small-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`button ${danger ? 'button-danger' : 'button-primary'}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

type CompetitorForm = { name: string; team: string; specWeight: string; specStyle: string }

function CompetitorFormModal({
  season,
  title,
  submitLabel,
  initial,
  onClose,
  onSubmit,
}: {
  season: Season
  title: string
  submitLabel: string
  initial: CompetitorForm
  onClose: () => void
  onSubmit: (form: CompetitorForm) => Promise<void>
}) {
  const { dictionary } = THEMES[season]
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title={title} eyebrow={dictionary.seasonBadge} onClose={onClose}>
      <form onSubmit={submit} className="modal-form competitor-form">
        <div className="competitor-preview">
          <div className="competitor-preview-avatar">{initialsOf(form.name) || '?'}</div>
          <div className="competitor-preview-info">
            <strong>{form.name || `Nome do ${dictionary.competitor.toLowerCase()}`}</strong>
            <span>{form.team || dictionary.team}</span>
            <div className="competitor-preview-specs">
              <em>{form.specWeight || dictionary.weightSpec}</em>
              <em>{form.specStyle || dictionary.styleSpec}</em>
            </div>
          </div>
        </div>
        <Field
          label={`Nome do ${dictionary.competitor.toLowerCase()}`}
          value={form.name}
          placeholder={dictionary.placeholders.name}
          onChange={(value) => setForm({ ...form, name: value })}
        />
        <Field
          label={dictionary.team}
          value={form.team}
          placeholder={dictionary.placeholders.team}
          onChange={(value) => setForm({ ...form, team: value })}
        />
        <div className="form-row">
          <Field
            label={dictionary.weightSpec}
            value={form.specWeight}
            placeholder={dictionary.placeholders.weight}
            {...(dictionary.weightOptions ? { options: dictionary.weightOptions } : {})}
            onChange={(value) => setForm({ ...form, specWeight: value })}
          />
          <Field
            label={dictionary.styleSpec}
            value={form.specStyle}
            placeholder={dictionary.placeholders.style}
            onChange={(value) => setForm({ ...form, specStyle: value })}
          />
        </div>
        {error && <div className="error-box">{error}</div>}
        <button className="button button-primary button-wide button-display" disabled={isSaving}>
          {isSaving ? 'Salvando...' : submitLabel}
        </button>
        <button className="button-text" type="button" onClick={onClose}>
          Cancelar
        </button>
      </form>
    </Modal>
  )
}

export function CompetitorModal({
  season,
  onClose,
  onSaved,
}: {
  season: Season
  onClose: () => void
  onSaved: () => void
}) {
  const { competitor } = THEMES[season].dictionary
  return (
    <CompetitorFormModal
      season={season}
      title={`Novo ${competitor.toLowerCase()}`}
      submitLabel={`Cadastrar ${competitor.toLowerCase()}`}
      initial={{ name: '', team: '', specWeight: '', specStyle: '' }}
      onClose={onClose}
      onSubmit={async (form) => {
        await request('/competitors', {
          method: 'POST',
          body: JSON.stringify({ ...form, seasonType: season }),
        })
        onSaved()
      }}
    />
  )
}

export function EditCompetitorModal({
  competitor,
  onClose,
  onSaved,
}: {
  competitor: Competitor
  onClose: () => void
  onSaved: () => void
}) {
  return (
    <CompetitorFormModal
      season={competitor.seasonType}
      title={`Editar: ${competitor.name}`}
      submitLabel="Salvar alterações"
      initial={{
        name: competitor.name,
        team: competitor.team,
        specWeight: competitor.spec.weight,
        specStyle: competitor.spec.style,
      }}
      onClose={onClose}
      onSubmit={async (form) => {
        await request(`/competitors/${competitor.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
        onSaved()
      }}
    />
  )
}

export function FightModal({
  season,
  competitors,
  onClose,
  onSaved,
}: {
  season: Season
  competitors: Competitor[]
  onClose: () => void
  onSaved: () => void
}) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const [oddsPreview, setOddsPreview] = useState<{ oddA: number; oddB: number } | null>(null)

  useEffect(() => {
    if (a && b && a !== b) {
      request<{ oddA: number; oddB: number }>(
        `/fights/odds/preview?competitorAId=${a}&competitorBId=${b}`,
      )
        .then(setOddsPreview)
        .catch(() => setOddsPreview(null))
    } else {
      setOddsPreview(null)
    }
  }, [a, b])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (a === b || !a || !b) {
      setError('Escolha dois competidores diferentes.')
      return
    }
    try {
      await request('/fights', {
        method: 'POST',
        body: JSON.stringify({
          competitorAId: a,
          competitorBId: b,
          seasonType: season,
          scheduledAt: date ? new Date(date).toISOString() : undefined,
        }),
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao criar luta.')
    }
  }

  const compA = competitors.find((c) => c.id === a)
  const compB = competitors.find((c) => c.id === b)

  return (
    <Modal title="Nova luta" onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label>
          Competidor A
          <select value={a} onChange={(event) => setA(event.target.value)}>
            <option value="">Selecionar...</option>
            {competitors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.team})
              </option>
            ))}
          </select>
        </label>
        <label>
          Competidor B
          <select value={b} onChange={(event) => setB(event.target.value)}>
            <option value="">Selecionar...</option>
            {competitors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.team})
              </option>
            ))}
          </select>
        </label>

        {oddsPreview && compA && compB && (
          <div className="odds-preview">
            <span>
              {compA.name} <b>{oddsPreview.oddA.toFixed(2)}</b>
            </span>
            <em>vs</em>
            <span>
              <b>{oddsPreview.oddB.toFixed(2)}</b> {compB.name}
            </span>
          </div>
        )}

        <label>
          Data e hora
          <input
            type="datetime-local"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="button button-primary button-wide">Criar confronto</button>
      </form>
    </Modal>
  )
}

export function RescheduleFightModal({
  fight,
  onClose,
  onSaved,
}: {
  fight: Fight
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!date) {
      setError('Selecione uma data e hora válidas.')
      return
    }
    try {
      await request(`/fights/${fight.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduledAt: new Date(date).toISOString() }),
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao remarcar luta.')
    }
  }

  return (
    <Modal
      title={`Remarcar: ${fight.competitorA.name} vs ${fight.competitorB.name}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="modal-form">
        <label>
          Nova data e hora
          <input
            type="datetime-local"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="button button-primary button-wide">Salvar novo horário</button>
      </form>
    </Modal>
  )
}

export function AdjustCoinsModal({
  user,
  onClose,
  onSaved,
}: {
  user: User
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState('500')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseInt(amount, 10)
    if (isNaN(parsed) || parsed === 0) {
      setError('Insira um valor inteiro diferente de zero.')
      return
    }
    try {
      await request(`/admin/users/${user.id}/coins`, {
        method: 'POST',
        body: JSON.stringify({ amount: parsed }),
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao ajustar moedas.')
    }
  }

  return (
    <Modal title={`Ajustar Moedas: ${user.name}`} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
          Saldo atual: <strong>{user.virtualCoins}</strong> moedas. Valores negativos debitam.
        </p>
        <Field
          label="Quantidade de moedas (+ para adicionar, - para debitar)"
          value={amount}
          onChange={setAmount}
          type="number"
        />
        {error && <div className="error-box">{error}</div>}
        <button className="button button-primary button-wide">Aplicar ajuste de saldo</button>
      </form>
    </Modal>
  )
}
