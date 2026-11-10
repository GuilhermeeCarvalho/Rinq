import { z } from 'zod'
import type { FightDTO } from '../views/FightView.js'

const fighter = z.object({ id: z.string(), name: z.string() })

export const mmaTicketSchema = z.object({
  fightId: z.string(),
  scheduledAt: z.iso.datetime(),
  competitorA: fighter,
  competitorB: fighter,
  chosenWinnerId: z.string(),
  oddA: z.number(),
  oddB: z.number(),
  outcome: z.enum(['WINNER', 'DRAW', 'NO_CONTEST', 'CANCELLED']).nullable(),
  winnerId: z.string().nullable(),
})

export type MmaTicket = z.infer<typeof mmaTicketSchema>

export function makeMmaTicket(fight: FightDTO, chosenWinnerId: string): MmaTicket {
  return {
    fightId: fight.id,
    scheduledAt: fight.scheduledAt,
    competitorA: { id: fight.competitorA.id, name: fight.competitorA.name },
    competitorB: { id: fight.competitorB.id, name: fight.competitorB.name },
    chosenWinnerId,
    oddA: fight.odds.a,
    oddB: fight.odds.b,
    outcome: null,
    winnerId: null,
  }
}
