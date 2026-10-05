import { Search } from 'lucide-react'
import { Empty, Status } from '../components/ui'
import { formatCoins, formatDate } from '../services/api'
import type { Bet } from '../types'

export function BetsView({
  bets,
  search,
  setSearch,
}: {
  bets: Bet[]
  search: string
  setSearch: (value: string) => void
}) {
  return (
    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">LIVRO DE APOSTAS</p>
          <h3>{bets.length} registros encontrados</h3>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            placeholder="Buscar por competidor..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>APOSTA</th>
              <th>CONFRONTO</th>
              <th>ESCOLHA</th>
              <th>VALOR</th>
              <th>RETORNO</th>
              <th>STATUS</th>
              <th>DATA</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((bet) => (
              <tr key={bet.id}>
                <td>
                  <span className="mono">#{bet.id.slice(0, 7)}</span>
                </td>
                <td>
                  <strong>{bet.fight.competitorA.name}</strong>
                  <span className="table-sub">vs {bet.fight.competitorB.name}</span>
                </td>
                <td>
                  <span className="choice">{bet.chosenWinner.name}</span>
                </td>
                <td>{formatCoins(bet.amount)}</td>
                <td>{formatCoins(Math.round(bet.potentialPayout))}</td>
                <td>
                  <Status status={bet.status} />
                </td>
                <td className="muted">{formatDate(bet.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bets.length === 0 && <Empty text="Nenhuma aposta corresponde ao filtro." />}
      </div>
    </section>
  )
}
