import type { CompetitorModel as CompetitorRow } from '../../generated/prisma/models.js'
import type { SeasonType } from '../../generated/prisma/enums.js'

export interface CompetitorDTO {
  id: string
  recordAvailable?: boolean
  name: string
  team: string
  seasonType: SeasonType
  /** MMA: peso/estilo | Galos-Robô: chassi/armamento. O rótulo é do app. */
  spec: { weight: string; style: string }
  record: { wins: number; losses: number; draws: number; total: number; summary: string }
}

type CompetitorData = Pick<CompetitorRow, 'id' | 'name' | 'team' | 'seasonType' |
  'specWeight' | 'specStyle' | 'wins' | 'losses' | 'draws'> & { recordAvailable?: boolean }

/** RF02 — serialização agnóstica de competidores. */
export class CompetitorView {
  static render(competitor: CompetitorData): CompetitorDTO {
    const total = competitor.wins + competitor.losses + competitor.draws

    return {
      id: competitor.id,
      ...(competitor.recordAvailable === undefined ? {} : { recordAvailable: competitor.recordAvailable }),
      name: competitor.name,
      team: competitor.team,
      seasonType: competitor.seasonType,
      spec: {
        weight: competitor.specWeight,
        style: competitor.specStyle,
      },
      record: {
        wins: competitor.wins,
        losses: competitor.losses,
        draws: competitor.draws,
        total,
        summary: `${competitor.wins}-${competitor.losses}-${competitor.draws}`,
      },
    }
  }

  static renderMany(competitors: CompetitorRow[]): CompetitorDTO[] {
    return competitors.map(CompetitorView.render)
  }
}
