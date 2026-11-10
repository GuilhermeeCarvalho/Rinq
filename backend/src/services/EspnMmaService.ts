import { z } from 'zod'
import { SeasonType } from '../../generated/prisma/enums.js'
import { AppError, NotFoundError } from '../lib/errors.js'
import { CompetitorView } from '../views/CompetitorView.js'
import type { FightDTO } from '../views/FightView.js'
import { HOUSE_MARGIN, OddsService } from './OddsService.js'

const SITE = 'https://site.api.espn.com'
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma'
const SCOREBOARD = SITE + '/apis/site/v2/sports/mma/all/scoreboard'
const ATHLETES = SITE + '/apis/common/v3/sports/mma/all/athletes'
const DAY = 86_400_000
const CACHE_TTL = 60_000

export const espnAthleteId = /^espn-\d{1,12}$/
export const espnFightId = /^espn-(\d{1,12})-(\d{1,12})$/

const id = z.string().regex(/^\d{1,12}$/)
const date = z.string().refine((value) => Number.isFinite(Date.parse(value)))
const name = z.object({ fullName: z.string().min(1) })
const status = z.object({
  type: z.object({ name: z.string(), state: z.string(), completed: z.boolean() }),
  result: z.object({ name: z.string() }).nullish(),
})
const corner = z.object({
  id,
  winner: z.boolean().optional(),
  athlete: name,
  records: z.array(z.object({ type: z.string(), summary: z.string() })).optional(),
})
const bout = z.object({
  id,
  date,
  timeValid: z.boolean().optional(),
  type: z.object({ abbreviation: z.string().optional() }).optional(),
  status,
  competitors: z.tuple([corner, corner]),
})
const scoreboard = z.object({
  events: z.array(z.object({
    id,
    name: z.string(),
    competitions: z.array(z.unknown()),
  })),
})
const stat = z.object({ name: z.string(), displayName: z.string(), displayValue: z.string() })
const historyEntry = z.object({
  name: z.string(),
  gameDate: date,
  gameResult: z.string().nullish(),
  opponent: z.object({ id, displayName: z.string() }).nullish(),
  status: z.object({
    displayClock: z.string().optional(),
    period: z.number().optional(),
    result: z.object({ displayName: z.string() }).nullish(),
  }).optional(),
})
const profile = z.object({
  athlete: z.object({
    id,
    displayName: z.string(),
    association: z.object({ name: z.string() }).nullish(),
    weightClass: z.object({ text: z.string() }).nullish(),
    displayFightingStyle: z.string().nullish(),
    statsSummary: z.object({ statistics: z.array(stat).optional() }).optional(),
  }),
  events: z.array(z.string()).optional(),
  eventsMap: z.record(z.string(), z.unknown()).optional(),
})
const careerStats = z.object({
  splits: z.object({
    categories: z.array(z.object({ displayName: z.string(), stats: z.array(stat) })),
  }),
})
const coreBout = z.object({ competitors: z.array(z.object({ id, winner: z.boolean().optional() })) })

type Bout = z.infer<typeof bout>
type Status = z.infer<typeof status>
type Outcome = 'WINNER' | 'DRAW' | 'NO_CONTEST' | 'CANCELLED'
type Result = { outcome: Outcome; winnerId: string | null }
type ScoreboardFight = { id: string; eventName: string; bout: Bout }

const cache = new Map<string, { expiresAt: number; data: Promise<unknown> }>()

function espnError(cause: unknown) {
  const error = new AppError('ESPN_UNAVAILABLE', 'A ESPN está indisponível. Tente novamente em instantes.', 503)
  error.cause = cause
  return error
}

async function fetchJson<T>(url: string, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`ESPN HTTP ${response.status}`)
    return schema.parse(await response.json())
  } catch (cause) {
    throw espnError(cause)
  }
}

function cached<T>(url: string, schema: z.ZodType<T>): Promise<T | null> {
  const now = Date.now()
  const entry = cache.get(url)
  if (entry && entry.expiresAt > now) return entry.data as Promise<T | null>
  const oldest = cache.keys().next().value
  if (cache.size >= 256 && oldest !== undefined) cache.delete(oldest)
  const data = fetchJson(url, schema).catch((error: unknown) => {
    if (cache.get(url)?.data === data) cache.delete(url)
    throw error
  })
  cache.set(url, { expiresAt: now + CACHE_TTL, data })
  return data
}

function athleteId(value: string) {
  return `espn-${value}`
}

function record(summary?: string | null) {
  const match = summary?.match(/^(\d+)-(\d+)-(\d+)(?:\s|$)/)
  return {
    wins: Number(match?.[1] ?? 0),
    losses: Number(match?.[2] ?? 0),
    draws: Number(match?.[3] ?? 0),
    recordAvailable: Boolean(match),
  }
}

function readOutcome(value: Status, competitors: z.infer<typeof coreBout>['competitors']): Result | null {
  if (/CANCEL|ABANDON/.test(value.type.name)) return { outcome: 'CANCELLED', winnerId: null }
  if (!value.type.completed) return null
  const method = value.result?.name ?? ''
  if (/no[- _]?contest|^nc$/i.test(method)) return { outcome: 'NO_CONTEST', winnerId: null }
  if (/draw/i.test(method)) return { outcome: 'DRAW', winnerId: null }
  const winners = competitors.filter((competitor) => competitor.winner)
  const winner = winners.length === 1 ? winners[0] : undefined
  return winner ? { outcome: 'WINNER', winnerId: athleteId(winner.id) } : null
}

function renderCorner(value: Bout['competitors'][number], weight: string) {
  return CompetitorView.render({
    id: athleteId(value.id),
    name: value.athlete.fullName,
    team: '—',
    specWeight: weight,
    specStyle: '—',
    seasonType: SeasonType.HUMAN_MMA,
    ...record(value.records?.find((entry) => entry.type === 'total')?.summary),
  })
}

function renderFight(entry: ScoreboardFight): FightDTO {
  const { bout: match } = entry
  const weight = match.type?.abbreviation ?? '—'
  const competitorA = renderCorner(match.competitors[0], weight)
  const competitorB = renderCorner(match.competitors[1], weight)
  const { oddA, oddB } = OddsService.buildOdds(competitorA.record, competitorB.record)
  const result = readOutcome(match.status, match.competitors)
  const scheduledAt = new Date(match.date).toISOString()
  return {
    id: entry.id,
    eventName: entry.eventName,
    seasonType: SeasonType.HUMAN_MMA,
    scheduledAt,
    isFinished: match.status.type.completed || result?.outcome === 'CANCELLED',
    finishedAt: null,
    winnerId: result?.winnerId ?? null,
    isDraw: result?.outcome === 'DRAW',
    bettingOpen: match.status.type.name === 'STATUS_SCHEDULED' && match.timeValid !== false &&
      Date.parse(scheduledAt) > Date.now() && competitorA.recordAvailable === true &&
      competitorB.recordAvailable === true,
    competitorA,
    competitorB,
    odds: {
      a: oddA,
      b: oddB,
      houseMargin: HOUSE_MARGIN,
      impliedMargin: OddsService.impliedMargin(oddA, oddB),
    },
  }
}

function dateKey(time: number) {
  return new Date(time).toISOString().slice(0, 10).replaceAll('-', '')
}

async function readScoreboard(from: number, to: number, fresh = false): Promise<ScoreboardFight[]> {
  const url = `${SCOREBOARD}?dates=${dateKey(from)}-${dateKey(to)}&limit=200`
  const data = await (fresh ? fetchJson(url, scoreboard) : cached(url, scoreboard))
  if (!data) throw espnError(new Error('Scoreboard ausente'))
  return data.events.flatMap((event) => {
    return event.competitions.flatMap((entry) => {
      const match = bout.safeParse(entry)
      if (!match.success || match.data.competitors[0].id === match.data.competitors[1].id) return []
      return [{ id: `espn-${event.id}-${match.data.id}`, eventName: event.name, bout: match.data }]
    })
  })
}

function upcoming() {
  const now = Date.now()
  return readScoreboard(now, now + 120 * DAY)
}

function corePaths(fightId: string) {
  const match = fightId.match(espnFightId)
  if (!match) throw new NotFoundError('Luta')
  const event = `${CORE}/leagues/all/events/${match[1]}`
  return { event, bout: `${event}/competitions/${match[2]}` }
}

export class EspnMmaService {
  static async listFights(includeFinished: boolean, take: number) {
    const now = Date.now()
    const entries = await (includeFinished ? readScoreboard(now - 90 * DAY, now + 120 * DAY) : upcoming())
    return entries.map(renderFight)
      .filter((fight) => includeFinished || (!fight.isFinished && Date.parse(fight.scheduledAt) > now))
      .sort((a, b) => Number(a.isFinished) - Number(b.isFinished) ||
        (a.isFinished ? b.scheduledAt.localeCompare(a.scheduledAt) : a.scheduledAt.localeCompare(b.scheduledAt)))
      .slice(0, take)
  }

  static async findFight(fightId: string, fresh = false) {
    const path = corePaths(fightId)
    const schema = z.object({ date })
    const event = await (fresh ? fetchJson(path.event, schema) : cached(path.event, schema))
    if (!event) throw new NotFoundError('Luta')
    const time = Date.parse(event.date)
    const entries = await readScoreboard(time - DAY, time + DAY, fresh)
    const entry = entries.find(({ id }) => id === fightId)
    if (!entry) throw new NotFoundError('Luta')
    const fight = renderFight(entry)
    if (!fresh && fight.isFinished && !fight.winnerId) {
      const official = await EspnMmaService.readResult(fightId)
      fight.isDraw = official?.result?.outcome === 'DRAW'
    }
    return fight
  }

  static async listCompetitors() {
    const fighters = new Map<string, ReturnType<typeof renderCorner>>()
    for (const { bout: match } of await upcoming()) {
      if (match.status.type.state !== 'pre' || Date.parse(match.date) <= Date.now()) continue
      for (const competitor of match.competitors) {
        const fighter = renderCorner(competitor, match.type?.abbreviation ?? '—')
        fighters.set(fighter.id, fighter)
      }
    }
    return [...fighters.values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  static async findCompetitor(fighterId: string) {
    const data = await cached(`${ATHLETES}/${fighterId.slice(5)}`, profile)
    if (!data || athleteId(data.athlete.id) !== fighterId) throw new NotFoundError('Competidor')
    const { athlete } = data
    const summary = athlete.statsSummary?.statistics ?? []
    return {
      data,
      summary,
      competitor: CompetitorView.render({
        id: fighterId,
        name: athlete.displayName,
        team: athlete.association?.name ?? '—',
        specWeight: athlete.weightClass?.text ?? '—',
        specStyle: athlete.displayFightingStyle ?? '—',
        seasonType: SeasonType.HUMAN_MMA,
        ...record(summary.find((entry) => entry.name === 'wins-losses-draws')?.displayValue),
      }),
    }
  }

  static async fighterDetails(fighterId: string) {
    const { data, competitor, summary } = await EspnMmaService.findCompetitor(fighterId)
    const [stats, schedule] = await Promise.all([
      cached(`${CORE}/athletes/${data.athlete.id}/statistics`, careerStats),
      upcoming(),
    ])
    const history = (data.events ?? []).flatMap((key) => {
      const entry = historyEntry.safeParse(data.eventsMap?.[key])
      if (!entry.success) return []
      const { name, gameDate, gameResult, opponent, status } = entry.data
      return [{
        id: key,
        eventName: name,
        date: new Date(gameDate).toISOString(),
        result: gameResult ?? null,
        opponent: opponent ? { id: athleteId(opponent.id), name: opponent.displayName } : null,
        method: status?.result?.displayName ?? null,
        round: status?.period ?? null,
        time: status?.displayClock ?? null,
      }]
    })
    const upcomingFights = schedule
      .filter(({ bout }) => bout.status.type.state === 'pre' && Date.parse(bout.date) > Date.now() &&
        bout.competitors.some((corner) => corner.id === data.athlete.id))
      .map(renderFight)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    return { ...competitor, statistics: { summary, categories: stats?.splits.categories ?? [] }, history, upcomingFights }
  }

  static async readResult(fightId: string) {
    const path = corePaths(fightId)
    const [match, resultStatus] = await Promise.all([
      fetchJson(path.bout, coreBout),
      fetchJson(`${path.bout}/status`, status),
    ])
    if (!match || !resultStatus) return null
    return {
      fighterIds: match.competitors.map(({ id }) => athleteId(id)),
      result: readOutcome(resultStatus, match.competitors),
    }
  }
}
