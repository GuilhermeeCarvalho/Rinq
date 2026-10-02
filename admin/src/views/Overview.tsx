import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Swords,
  Trophy,
} from 'lucide-react'
import { Metric, FightRow, Empty } from '../components/ui'
import { formatCoins, formatDate } from '../services/api'
import type { Fight, Bet } from '../types'

export function Overview({
  activeFights,
  finishedFights,
  bets,
  pendingBets,
  setActive,
  finishFight,
}: {
  activeFights: Fight[]
  finishedFights: Fight[]
  bets: Bet[]
  pendingBets: Bet[]
  setActive: (value: string) => void
  finishFight: (fight: Fight, winnerId: string | null) => void
}) {
  const volume = bets.reduce((sum, bet) => sum + bet.amount, 0)
  return (
    <>
      <section className="hero-strip">
        <div>
          <p className="eyebrow">PAINEL DE CONTROLE</p>
          <h2>O turno começa agora.</h2>
          <p>Acompanhe o pulso das apostas e mantenha o card em movimento.</p>
        </div>
        <div className="hero-badge">
          <Trophy size={28} />
          <span>
            <strong>{activeFights.length}</strong> lutas abertas
          </span>
        </div>
      </section>
      <section className="metric-grid">
        <Metric
          icon={<Swords />}
          label="Lutas abertas"
          value={activeFights.length}
          detail="nesta temporada"
          accent="red"
        />
        <Metric
          icon={<CircleDollarSign />}
          label="Volume apostado"
          value={formatCoins(volume)}
          detail={`${bets.length} bilhetes registrados`}
          accent="gold"
        />
        <Metric
          icon={<ClipboardList />}
          label="Apostas pendentes"
          value={pendingBets.length}
          detail="aguardando resultado"
          accent="blue"
        />
        <Metric
          icon={<CheckCircle2 />}
          label="Lutas encerradas"
          value={finishedFights.length}
          detail="resultados liquidados"
          accent="green"
        />
      </section>
      <section className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PRÓXIMOS EVENTOS</p>
              <h3>Card em aberto</h3>
            </div>
            <button className="text-button" onClick={() => setActive('fights')}>
              Ver todas <ArrowUpRight size={15} />
            </button>
          </div>
          {activeFights.slice(0, 3).map((fight) => (
            <FightRow key={fight.id} fight={fight} onFinish={finishFight} />
          ))}
          {activeFights.length === 0 && <Empty text="Nenhuma luta aberta nesta temporada." />}
        </div>
        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">FLUXO RECENTE</p>
              <h3>Últimas apostas</h3>
            </div>
            <button className="text-button" onClick={() => setActive('bets')}>
              Abrir livro <ArrowUpRight size={15} />
            </button>
          </div>
          {bets.slice(0, 5).map((bet) => (
            <div className="activity-row" key={bet.id}>
              <div className="activity-icon">
                <CircleDollarSign size={16} />
              </div>
              <div>
                <strong>{bet.chosenWinner.name}</strong>
                <span>
                  {formatDate(bet.createdAt)} · {bet.status === 'PENDING' ? 'Pendente' : bet.status}
                </span>
              </div>
              <b>{formatCoins(bet.amount)}</b>
            </div>
          ))}
          {bets.length === 0 && <Empty text="Ainda não há apostas." />}
        </div>
      </section>
    </>
  )
}
