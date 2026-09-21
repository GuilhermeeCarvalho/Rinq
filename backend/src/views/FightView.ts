import type { FightWithCompetitors } from '../models/FightModel.js'
import type { SeasonType } from '../../generated/prisma/enums.js'
import { HOUSE_MARGIN, OddsService } from '../services/OddsService.js'
import { CompetitorView } from './CompetitorView.js'
import type { CompetitorDTO } from './CompetitorView.js'

export interface FightDTO {
  id: string
  seasonType: SeasonType
  scheduledAt: string
  isFinished: boolean
  finishedAt: string | null
  winnerId: string | null
  isDraw: boolean
  competitorA: CompetitorDTO
  competitorB: CompetitorDTO
  odds: {
    a: number
    b: number
    houseMargin: number
    impliedMargin: number
  }
}

/** RF03 — DTO do card de luta consumido pelo FightCard do app. */
export class FightView {
  static render(fight: FightWithCompetitors): FightDTO {
    return {
      id: fight.id,
      seasonType: fight.seasonType,
      scheduledAt: fight.scheduledAt.toISOString(),
      isFinished: fight.isFinished,
      finishedAt: fight.finishedAt?.toISOString() ?? null,
      winnerId: fight.winnerId,
      isDraw: fight.isFinished && fight.winnerId === null,
      competitorA: CompetitorView.render(fight.competitorA),
      competitorB: CompetitorView.render(fight.competitorB),
      odds: {
        a: fight.oddA,
        b: fight.oddB,
        houseMargin: HOUSE_MARGIN,
        impliedMargin: OddsService.impliedMargin(fight.oddA, fight.oddB),
      },
    }
  }

  static renderMany(fights: FightWithCompetitors[]): FightDTO[] {
    return fights.map(FightView.render)
  }

  static renderList(fights: FightWithCompetitors[], seasonType: SeasonType) {
    return {
      seasonType,
      total: fights.length,
      fights: FightView.renderMany(fights),
    }
  }
}
