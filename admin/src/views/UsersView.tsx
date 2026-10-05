import { useState } from 'react'
import { Coins, Search } from 'lucide-react'
import { Empty } from '../components/ui'
import { formatCoins, formatDate } from '../services/api'
import type { User } from '../types'

export function UsersView({
  users,
  onAdjustCoins,
}: {
  users: User[]
  onAdjustCoins: (user: User) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = users.filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CONTROLE DE USUÁRIOS</p>
          <h3>{users.length} usuários registrados</h3>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>USUÁRIO</th>
              <th>PAPEL</th>
              <th>SALDO</th>
              <th>APOSTAS</th>
              <th>CADASTRO</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                      {user.name.slice(0, 1)}
                    </div>
                    <div>
                      <strong>{user.name}</strong>
                      <span className="table-sub">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-tag ${user.role === 'ADMIN' ? 'admin' : 'player'}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <strong className="coins">{formatCoins(user.virtualCoins)}</strong>
                </td>
                <td>
                  <span className="mono">{user.totalBets ?? 0}</span>
                </td>
                <td className="muted">{formatDate(user.createdAt)}</td>
                <td>
                  <button
                    className="small-button"
                    onClick={() => onAdjustCoins(user)}
                    title="Ajustar saldo em moedas"
                  >
                    <Coins size={12} /> Saldo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <Empty text="Nenhum usuário corresponde ao filtro." />}
      </div>
    </section>
  )
}
