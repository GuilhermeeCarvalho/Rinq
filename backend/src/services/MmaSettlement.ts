import type { FastifyInstance } from 'fastify'
import { BetStatus } from '../../generated/prisma/enums.js'
import { prisma } from '../lib/prisma.js'
import { BetModel } from '../models/BetModel.js'
import { EspnMmaService } from './EspnMmaService.js'

export function startMmaSettlement(app: FastifyInstance) {
  let timer: NodeJS.Timeout | undefined
  let stopped = false
  async function settle() {
    const fights = await prisma.bet.groupBy({
      by: ['mmaFightId'],
      where: { status: BetStatus.PENDING, mmaFightId: { not: null } },
    })
    for (const { mmaFightId } of fights) {
      if (stopped) return
      if (!mmaFightId) continue
      try {
        const official = await EspnMmaService.readResult(mmaFightId)
        if (official) await BetModel.settleMmaFight(mmaFightId, official)
      } catch (err) {
        app.log.warn({ err, fightId: mmaFightId }, 'Falha ao verificar resultado de MMA na ESPN')
      }
    }
  }
  function run(): Promise<void> {
    return settle().catch((err: unknown) => {
      app.log.warn({ err }, 'Falha ao verificar apostas de MMA pendentes')
    }).finally(() => {
      if (!stopped) timer = setTimeout(() => { pending = run() }, 60_000).unref()
    })
  }
  let pending: Promise<void> | undefined
  app.addHook('onListen', async () => { pending = run() })
  app.addHook('preClose', async () => {
    stopped = true
    clearTimeout(timer)
    await pending
  })
}
