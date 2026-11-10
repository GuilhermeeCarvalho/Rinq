import { useEffect, useState } from 'react'
import {
  Activity,
  ChevronDown,
  CircleDollarSign,
  LogOut,
  Swords,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import { request, tokenKey } from './services/api'
import type { AuthResponse, User, Season, Fight, Competitor, Bet } from './types'
import { Login } from './components/Login'
import { NavButton } from './components/ui'
import {
  AdjustCoinsModal,
  CompetitorModal,
  ConfirmModal,
  EditCompetitorModal,
  FightModal,
  RescheduleFightModal,
} from './components/Modal'
import { Overview } from './views/Overview'
import { BetsView } from './views/BetsView'
import { FightsView } from './views/FightsView'
import { CompetitorsView } from './views/CompetitorsView'
import { UsersView } from './views/UsersView'
import { applyTheme, THEMES } from './theme'

function App() {
  const [session, setSession] = useState<AuthResponse | null>(null)
  const [checking, setChecking] = useState(true)
  const [season, setSeason] = useState<Season>('HUMAN_MMA')

  useEffect(() => {
    request<{ seasonType: Season }>('/season')
      .then((response) => setSeason(response.seasonType))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    applyTheme(season)
  }, [season])

  useEffect(() => {
    const token = localStorage.getItem(tokenKey)
    if (token)
      request<User>('/auth/me')
        .then((user) => user.role === 'ADMIN' && setSession({ token, user }))
        .catch(() => localStorage.removeItem(tokenKey))
        .finally(() => setChecking(false))
    else setChecking(false)
  }, [])
  if (checking)
    return (
      <div className="boot-screen">
        <span className="loader" /> Carregando operações
      </div>
    )
  if (!session) return <Login season={season} onLogin={setSession} />
  return (
    <Dashboard
      user={session.user}
      season={season}
      onSeasonChanged={setSeason}
      onLogout={() => {
        localStorage.removeItem(tokenKey)
        setSession(null)
      }}
    />
  )
}

function Dashboard({
  user,
  season,
  onSeasonChanged,
  onLogout,
}: {
  user: User
  season: Season
  onSeasonChanged: (season: Season) => void
  onLogout: () => void
}) {
  const [active, setActive] = useState('overview')
  const [fights, setFights] = useState<Fight[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [bets, setBets] = useState<Bet[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [showCompetitor, setShowCompetitor] = useState(false)
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null)
  const [showFight, setShowFight] = useState(false)
  const [reschedulingFight, setReschedulingFight] = useState<Fight | null>(null)
  const [adjustingUser, setAdjustingUser] = useState<User | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    title: string
    message: string
    danger?: boolean
    confirmLabel?: string
    action: () => Promise<void>
  } | null>(null)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [fightResponse, competitorResponse, betResponse, userResponse] = await Promise.allSettled([
        request<{ fights: Fight[] }>(`/fights?includeFinished=true&take=100&season=${season}`),
        request<{ competitors: Competitor[] }>(`/competitors?season=${season}`),
        request<{ bets: Bet[] }>(`/admin/bets?season=${season}`),
        request<{ users: User[] }>('/admin/users'),
      ])
      setFights(fightResponse.status === 'fulfilled' ? fightResponse.value.fights : [])
      setCompetitors(competitorResponse.status === 'fulfilled' ? competitorResponse.value.competitors : [])
      if (betResponse.status === 'fulfilled') setBets(betResponse.value.bets)
      if (userResponse.status === 'fulfilled') setUsers(userResponse.value.users)
      const failure = [fightResponse, competitorResponse, betResponse, userResponse]
        .find((response) => response.status === 'rejected')
      if (failure) {
        const cause: unknown = failure.reason
        setNotice(cause instanceof Error ? cause.message : 'Falha ao carregar dados.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [season])

  async function handleSeasonChange(newSeason: Season) {
    try {
      await request('/season', {
        method: 'PUT',
        body: JSON.stringify({ seasonType: newSeason }),
      })
      onSeasonChanged(newSeason)
      setNotice('Temporada alterada com sucesso.')
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Falha ao alterar temporada.')
    }
  }

  const activeFights = fights.filter((fight) => fight.seasonType === season && !fight.isFinished)
  const finishedFights = fights.filter((fight) => fight.seasonType === season && fight.isFinished)
  const seasonBets = bets.filter((bet) => bet.fight.seasonType === season)
  const pendingBets = seasonBets.filter((bet) => bet.status === 'PENDING')
  const filteredBets = seasonBets.filter((bet) =>
    `${bet.id} ${bet.chosenWinner.name} ${bet.fight.competitorA.name} ${bet.fight.competitorB.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  function finishFight(fight: Fight, winnerId: string | null) {
    setConfirmAction({
      title: winnerId ? 'Encerrar Confronto' : 'Declarar Empate',
      message: winnerId
        ? `Confirmar encerramento e liquidar apostas com vitória para ${winnerId === fight.competitorA.id ? fight.competitorA.name : fight.competitorB.name}?`
        : 'Confirmar encerramento como empate? Todas as apostas serão integralmente estornadas para as carteiras dos jogadores.',
      confirmLabel: 'Liquidar apostas',
      action: async () => {
        try {
          await request(`/fights/${fight.id}/finish`, {
            method: 'POST',
            body: JSON.stringify({ winnerId }),
          })
          setNotice('Resultado registrado e apostas liquidadas.')
          void load()
        } catch (cause) {
          setNotice(cause instanceof Error ? cause.message : 'Não foi possível encerrar a luta.')
        }
      },
    })
  }

  function handleCancelFight(fight: Fight) {
    setConfirmAction({
      title: 'Cancelar Confronto',
      message: `Tem certeza que deseja cancelar a luta entre ${fight.competitorA.name} e ${fight.competitorB.name}? Todas as apostas pendentes serão reembolsadas imediatamente.`,
      danger: true,
      confirmLabel: 'Cancelar luta',
      action: async () => {
        try {
          await request(`/fights/${fight.id}`, { method: 'DELETE' })
          setNotice('Luta cancelada e apostas reembolsadas.')
          void load()
        } catch (cause) {
          setNotice(cause instanceof Error ? cause.message : 'Falha ao cancelar a luta.')
        }
      },
    })
  }

  function handleDeleteCompetitor(competitor: Competitor) {
    setConfirmAction({
      title: 'Excluir Competidor',
      message: `Deseja remover ${competitor.name} do catálogo? A exclusão só é permitida se o competidor não possuir confrontos vinculados.`,
      danger: true,
      confirmLabel: 'Excluir competidor',
      action: async () => {
        try {
          await request(`/competitors/${competitor.id}`, { method: 'DELETE' })
          setNotice('Competidor removido com sucesso.')
          void load()
        } catch (cause) {
          setNotice(cause instanceof Error ? cause.message : 'Falha ao excluir competidor.')
        }
      },
    })
  }

  const title =
    active === 'overview'
      ? 'Visão geral'
      : active === 'bets'
        ? 'Apostas'
        : active === 'fights'
          ? 'Lutas'
          : active === 'competitors'
            ? 'Competidores'
            : 'Usuários'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-brand">
          <img src={THEMES[season].logo} alt={THEMES[season].name} />
          <small>OPERATIONS</small>
        </div>
        <div className="season-switch">
          <span>Temporada ativa</span>
          <select
            value={season}
            onChange={(event) => handleSeasonChange(event.target.value as Season)}
          >
            <option value="HUMAN_MMA">MMA HUMANO</option>
            <option value="ROBOT_ROOSTER">GALOS</option>
          </select>
        </div>
        <nav>
          <NavButton
            icon={<Activity size={18} />}
            label="Visão geral"
            active={active === 'overview'}
            onClick={() => setActive('overview')}
          />
          <NavButton
            icon={<CircleDollarSign size={18} />}
            label="Apostas"
            count={pendingBets.length}
            active={active === 'bets'}
            onClick={() => setActive('bets')}
          />
          <NavButton
            icon={<Swords size={18} />}
            label="Lutas"
            active={active === 'fights'}
            onClick={() => setActive('fights')}
          />
          <NavButton
            icon={<Users size={18} />}
            label="Competidores"
            active={active === 'competitors'}
            onClick={() => setActive('competitors')}
          />
          <NavButton
            icon={<UserCheck size={18} />}
            label="Usuários"
            count={users.length}
            active={active === 'users'}
            onClick={() => setActive('users')}
          />
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-chip">
            <div className="avatar">{user.name.slice(0, 1)}</div>
            <div>
              <strong>{user.name}</strong>
              <span>Administrador</span>
            </div>
            <ChevronDown size={15} />
          </div>
          <button className="logout" onClick={onLogout}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              RINQ / <span>OPERATIONS</span>
            </p>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            <span className="live-dot">
              <i /> API ONLINE
            </span>
            <button className="icon-button" title="Atualizar dados" onClick={() => void load()}>
              <Activity size={18} />
            </button>
          </div>
        </header>
        {notice && (
          <div className="notice">
            {notice}
            <button onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {loading ? (
          <div className="loading-panel">
            <span className="loader" /> Sincronizando dados...
          </div>
        ) : (
          <>
            {active === 'overview' && (
              <Overview
                activeFights={activeFights}
                finishedFights={finishedFights}
                bets={seasonBets}
                pendingBets={pendingBets}
                setActive={setActive}
                finishFight={finishFight}
              />
            )}
            {active === 'bets' && (
              <BetsView bets={filteredBets} search={search} setSearch={setSearch} />
            )}
            {active === 'fights' && (
              <FightsView
                fights={[...activeFights, ...finishedFights]}
                readOnly={season === 'HUMAN_MMA'}
                onFinish={finishFight}
                onCreate={() => setShowFight(true)}
                onReschedule={(f) => setReschedulingFight(f)}
                onCancel={handleCancelFight}
              />
            )}
            {active === 'competitors' && (
              <CompetitorsView
                competitors={competitors}
                readOnly={season === 'HUMAN_MMA'}
                onCreate={() => setShowCompetitor(true)}
                onEdit={(c) => setEditingCompetitor(c)}
                onDelete={handleDeleteCompetitor}
              />
            )}
            {active === 'users' && (
              <UsersView users={users} onAdjustCoins={(u) => setAdjustingUser(u)} />
            )}
          </>
        )}
      </main>
      {showCompetitor && (
        <CompetitorModal
          season={season}
          onClose={() => setShowCompetitor(false)}
          onSaved={() => {
            setShowCompetitor(false)
            void load()
          }}
        />
      )}
      {editingCompetitor && (
        <EditCompetitorModal
          competitor={editingCompetitor}
          onClose={() => setEditingCompetitor(null)}
          onSaved={() => {
            setEditingCompetitor(null)
            void load()
          }}
        />
      )}
      {showFight && (
        <FightModal
          season={season}
          competitors={competitors}
          onClose={() => setShowFight(false)}
          onSaved={() => {
            setShowFight(false)
            void load()
          }}
        />
      )}
      {reschedulingFight && (
        <RescheduleFightModal
          fight={reschedulingFight}
          onClose={() => setReschedulingFight(null)}
          onSaved={() => {
            setReschedulingFight(null)
            void load()
          }}
        />
      )}
      {adjustingUser && (
        <AdjustCoinsModal
          user={adjustingUser}
          onClose={() => setAdjustingUser(null)}
          onSaved={() => {
            setAdjustingUser(null)
            void load()
          }}
        />
      )}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          danger={confirmAction.danger}
          confirmLabel={confirmAction.confirmLabel}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            const action = confirmAction.action
            setConfirmAction(null)
            void action()
          }}
        />
      )}
    </div>
  )
}

export default App
