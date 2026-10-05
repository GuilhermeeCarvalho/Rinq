import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import "./App.css";

type Role = "PLAYER" | "ADMIN";
type Season = "HUMAN_MMA" | "ROBOT_ROOSTER";
type BetStatus = "PENDING" | "WON" | "LOST" | "VOID";
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
interface Competitor {
  id: string;
  name: string;
  team: string;
  seasonType: Season;
  spec: { weight: string; style: string };
  record: {
    wins: number;
    losses: number;
    draws: number;
    total: number;
    summary: string;
  };
}
interface Fight {
  id: string;
  seasonType: Season;
  scheduledAt: string;
  isFinished: boolean;
  finishedAt: string | null;
  winnerId: string | null;
  competitorA: Competitor;
  competitorB: Competitor;
  odds: { a: number; b: number };
}
interface Bet {
  id: string;
  amount: number;
  oddAtPlacement: number;
  potentialPayout: number;
  status: BetStatus;
  createdAt: string;
  chosenWinner: Competitor;
  fight: Fight;
}
interface AuthResponse {
  token: string;
  user: User;
}
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const tokenKey = "rinq.admin.token";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem(tokenKey) ?? ""}`,
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      payload?.error?.message ?? "Não foi possível concluir a operação.",
    );
  return payload as T;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(".", "");
}
function formatCoins(value: number) {
  return `${new Intl.NumberFormat("pt-BR").format(value)} COINS`;
}

function Login({ onLogin }: { onLogin: (response: AuthResponse) => void }) {
  const [email, setEmail] = useState("admin@rinq.app");
  const [password, setPassword] = useState("admin12345");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.user.role !== "ADMIN")
        throw new Error("Esta área é exclusiva para administradores.");
      localStorage.setItem(tokenKey, result.token);
      onLogin(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="login-shell">
      <div className="login-art">
        <div className="brand-mark">R</div>
        <div>
          <p className="eyebrow">RINQ / OPERATIONS</p>
          <h1>
            O ringue por
            <br />
            <em>trás do show.</em>
          </h1>
          <p className="login-copy">
            Controle cards, resultados e a economia da temporada em um único
            centro operacional.
          </p>
        </div>
        <div className="login-signal">
          <Activity size={16} /> SISTEMA ONLINE <span>●</span> API 3333
        </div>
      </div>
      <form className="login-form" onSubmit={submit}>
        <div>
          <p className="eyebrow">Acesso restrito</p>
          <h2>Entrar no painel</h2>
          <p className="muted">
            Use suas credenciais administrativas para continuar.
          </p>
        </div>
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Senha
          <span className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar senha" : "Revelar senha"}
              title={showPassword ? "Ocultar senha" : "Revelar senha"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
        </label>
        {error && <div className="error-box">{error}</div>}
        <button
          className="button button-primary button-wide"
          disabled={loading}
        >
          {loading ? (
            "Autenticando..."
          ) : (
            <>
              Acessar operações <ArrowUpRight size={17} />
            </>
          )}
        </button>
        <p className="login-foot">
          <ShieldCheck size={15} /> Ambiente protegido por autenticação JWT
        </p>
      </form>
    </main>
  );
}

function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (token)
      request<User>("/auth/me")
        .then((user) => user.role === "ADMIN" && setSession({ token, user }))
        .catch(() => localStorage.removeItem(tokenKey))
        .finally(() => setChecking(false));
    else setChecking(false);
  }, []);
  if (checking)
    return (
      <div className="boot-screen">
        <span className="loader" /> Carregando operações
      </div>
    );
  if (!session) return <Login onLogin={setSession} />;
  return (
    <Dashboard
      user={session.user}
      onLogout={() => {
        localStorage.removeItem(tokenKey);
        setSession(null);
      }}
    />
  );
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [active, setActive] = useState("overview");
  const [season, setSeason] = useState<Season>("HUMAN_MMA");
  const [fights, setFights] = useState<Fight[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [showCompetitor, setShowCompetitor] = useState(false);
  const [showFight, setShowFight] = useState(false);
  const [search, setSearch] = useState("");
  async function load() {
    setLoading(true);
    try {
      const [fightResponse, competitorResponse, betResponse] =
        await Promise.all([
          request<{ fights: Fight[] }>("/fights?includeFinished=true&take=100"),
          request<{ competitors: Competitor[] }>(
            `/competitors?season=${season}`,
          ),
          request<{ bets: Bet[] }>("/admin/bets"),
        ]);
      setFights(fightResponse.fights);
      setCompetitors(competitorResponse.competitors);
      setBets(betResponse.bets);
    } catch (cause) {
      setNotice(
        cause instanceof Error ? cause.message : "Falha ao carregar dados.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [season]);
  const activeFights = fights.filter(
    (fight) => fight.seasonType === season && !fight.isFinished,
  );
  const finishedFights = fights.filter(
    (fight) => fight.seasonType === season && fight.isFinished,
  );
  const seasonBets = bets.filter((bet) => bet.fight.seasonType === season);
  const pendingBets = seasonBets.filter((bet) => bet.status === "PENDING");
  const filteredBets = seasonBets.filter((bet) =>
    `${bet.id} ${bet.chosenWinner.name} ${bet.fight.competitorA.name} ${bet.fight.competitorB.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function finishFight(fight: Fight, winnerId: string | null) {
    if (
      !window.confirm(
        winnerId
          ? "Encerrar esta luta e liquidar as apostas?"
          : "Marcar como empate e estornar as apostas?",
      )
    )
      return;
    try {
      await request(`/fights/${fight.id}/finish`, {
        method: "POST",
        body: JSON.stringify({ winnerId }),
      });
      setNotice("Resultado registrado e apostas liquidadas.");
      void load();
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : "Não foi possível encerrar a luta.",
      );
    }
  }
  const title =
    active === "overview"
      ? "Visão geral"
      : active === "bets"
        ? "Apostas"
        : active === "fights"
          ? "Lutas"
          : "Competidores";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-brand">
          <span>R</span>
          <div>
            RINQ <small>OPERATIONS</small>
          </div>
        </div>
        <div className="season-switch">
          <span>Temporada ativa</span>
          <select
            value={season}
            onChange={(event) => setSeason(event.target.value as Season)}
          >
            <option value="HUMAN_MMA">MMA HUMANO</option>
            <option value="ROBOT_ROOSTER">GALOS-ROBÔ</option>
          </select>
        </div>
        <nav>
          <NavButton
            icon={<Activity size={18} />}
            label="Visão geral"
            active={active === "overview"}
            onClick={() => setActive("overview")}
          />
          <NavButton
            icon={<CircleDollarSign size={18} />}
            label="Apostas"
            count={pendingBets.length}
            active={active === "bets"}
            onClick={() => setActive("bets")}
          />
          <NavButton
            icon={<Swords size={18} />}
            label="Lutas"
            active={active === "fights"}
            onClick={() => setActive("fights")}
          />
          <NavButton
            icon={<Users size={18} />}
            label="Competidores"
            active={active === "competitors"}
            onClick={() => setActive("competitors")}
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
            <button
              className="icon-button"
              title="Atualizar dados"
              onClick={() => void load()}
            >
              <Activity size={18} />
            </button>
          </div>
        </header>
        {notice && (
          <div className="notice">
            {notice}
            <button onClick={() => setNotice("")}>
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
            {active === "overview" && (
              <Overview
                activeFights={activeFights}
                finishedFights={finishedFights}
                bets={seasonBets}
                pendingBets={pendingBets}
                setActive={setActive}
                finishFight={finishFight}
              />
            )}
            {active === "bets" && (
              <BetsView
                bets={filteredBets}
                search={search}
                setSearch={setSearch}
              />
            )}
            {active === "fights" && (
              <FightsView
                fights={[...activeFights, ...finishedFights]}
                onFinish={finishFight}
                onCreate={() => setShowFight(true)}
              />
            )}
            {active === "competitors" && (
              <CompetitorsView
                competitors={competitors}
                onCreate={() => setShowCompetitor(true)}
              />
            )}
          </>
        )}
      </main>
      {showCompetitor && (
        <CompetitorModal
          season={season}
          onClose={() => setShowCompetitor(false)}
          onSaved={() => {
            setShowCompetitor(false);
            void load();
          }}
        />
      )}
      {showFight && (
        <FightModal
          season={season}
          competitors={competitors}
          onClose={() => setShowFight(false)}
          onSaved={() => {
            setShowFight(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function NavButton({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {count ? <b>{count}</b> : null}
    </button>
  );
}
function Overview({
  activeFights,
  finishedFights,
  bets,
  pendingBets,
  setActive,
  finishFight,
}: {
  activeFights: Fight[];
  finishedFights: Fight[];
  bets: Bet[];
  pendingBets: Bet[];
  setActive: (value: string) => void;
  finishFight: (fight: Fight, winnerId: string | null) => void;
}) {
  const volume = bets.reduce((sum, bet) => sum + bet.amount, 0);
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
            <button className="text-button" onClick={() => setActive("fights")}>
              Ver todas <ArrowUpRight size={15} />
            </button>
          </div>
          {activeFights.slice(0, 3).map((fight) => (
            <FightRow key={fight.id} fight={fight} onFinish={finishFight} />
          ))}
          {activeFights.length === 0 && (
            <Empty text="Nenhuma luta aberta nesta temporada." />
          )}
        </div>
        <div className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">FLUXO RECENTE</p>
              <h3>Últimas apostas</h3>
            </div>
            <button className="text-button" onClick={() => setActive("bets")}>
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
                  {formatDate(bet.createdAt)} ·{" "}
                  {bet.status === "PENDING" ? "Pendente" : bet.status}
                </span>
              </div>
              <b>{formatCoins(bet.amount)}</b>
            </div>
          ))}
          {bets.length === 0 && <Empty text="Ainda não há apostas." />}
        </div>
      </section>
    </>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  accent: string;
}) {
  return (
    <div className="metric">
      <div className={`metric-icon ${accent}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function FightRow({
  fight,
  onFinish,
}: {
  fight: Fight;
  onFinish: (fight: Fight, winnerId: string | null) => void;
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
      <button
        className="small-button"
        onClick={() => onFinish(fight, fight.competitorA.id)}
      >
        Resultado <ChevronDown size={14} />
      </button>
    </div>
  );
}
function BetsView({
  bets,
  search,
  setSearch,
}: {
  bets: Bet[];
  search: string;
  setSearch: (value: string) => void;
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
                  <span className="table-sub">
                    vs {bet.fight.competitorB.name}
                  </span>
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
        {bets.length === 0 && (
          <Empty text="Nenhuma aposta corresponde ao filtro." />
        )}
      </div>
    </section>
  );
}
function Status({ status }: { status: BetStatus }) {
  const labels = {
    PENDING: "Pendente",
    WON: "Ganha",
    LOST: "Perdida",
    VOID: "Estornada",
  };
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <i />
      {labels[status]}
    </span>
  );
}
function FightsView({
  fights,
  onFinish,
  onCreate,
}: {
  fights: Fight[];
  onFinish: (fight: Fight, winnerId: string | null) => void;
  onCreate: () => void;
}) {
  return (
    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">GESTÃO DO CARD</p>
          <h3>{fights.length} confrontos na temporada</h3>
        </div>
        <button className="button button-primary" onClick={onCreate}>
          <Plus size={17} /> Nova luta
        </button>
      </div>
      <div className="fight-list">
        {fights.map((fight) => (
          <div
            className={`fight-card ${fight.isFinished ? "finished" : ""}`}
            key={fight.id}
          >
            <div className="fight-card-top">
              <span className="date-label">
                <CalendarDays size={15} /> {formatDate(fight.scheduledAt)}
              </span>
              <span
                className={`status ${fight.isFinished ? "won" : "pending"}`}
              >
                <i />
                {fight.isFinished ? "Encerrada" : "Aberta"}
              </span>
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
                ODDS <b>{fight.odds.a.toFixed(2)}</b> /{" "}
                <b>{fight.odds.b.toFixed(2)}</b>
              </span>
              {!fight.isFinished && (
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
  );
}
function CompetitorsView({
  competitors,
  onCreate,
}: {
  competitors: Competitor[];
  onCreate: () => void;
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
            <div className="competitor-avatar">
              {competitor.name.slice(0, 1)}
            </div>
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
          </div>
        ))}
      </div>
    </section>
  );
}
function CompetitorModal({
  season,
  onClose,
  onSaved,
}: {
  season: Season;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    team: "",
    specWeight: "",
    specStyle: "",
  });
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await request("/competitors", {
        method: "POST",
        body: JSON.stringify({ ...form, seasonType: season }),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao cadastrar.");
    }
  }
  return (
    <Modal title="Novo competidor" onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <Field
          label="Nome"
          value={form.name}
          onChange={(value) => setForm({ ...form, name: value })}
        />
        <Field
          label="Equipe / laboratório"
          value={form.team}
          onChange={(value) => setForm({ ...form, team: value })}
        />
        <div className="form-row">
          <Field
            label="Categoria"
            value={form.specWeight}
            onChange={(value) => setForm({ ...form, specWeight: value })}
          />
          <Field
            label="Estilo / armamento"
            value={form.specStyle}
            onChange={(value) => setForm({ ...form, specStyle: value })}
          />
        </div>
        {error && <div className="error-box">{error}</div>}
        <button className="button button-primary button-wide">
          Cadastrar competidor
        </button>
      </form>
    </Modal>
  );
}
function FightModal({
  season,
  competitors,
  onClose,
  onSaved,
}: {
  season: Season;
  competitors: Competitor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (a === b || !a || !b) {
      setError("Escolha dois competidores diferentes.");
      return;
    }
    try {
      await request("/fights", {
        method: "POST",
        body: JSON.stringify({
          competitorAId: a,
          competitorBId: b,
          seasonType: season,
          scheduledAt: date ? new Date(date).toISOString() : undefined,
        }),
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar luta.");
    }
  }
  return (
    <Modal title="Nova luta" onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label>
          Competidor A
          <select value={a} onChange={(event) => setA(event.target.value)}>
            <option value="">Selecionar...</option>
            {competitors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
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
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data e hora
          <input
            type="datetime-local"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="button button-primary button-wide">
          Criar confronto
        </button>
      </form>
    </Modal>
  );
}
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">AÇÃO ADMINISTRATIVA</p>
            <h3>{title}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <ClipboardList size={20} />
      {text}
    </div>
  );
}
export default App;
