import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { BetModel } from '../models/BetModel.js'
import { BetView } from '../views/BetView.js'
import { NotFoundError } from '../lib/errors.js'
import { idParamSchema, parseOrThrow } from '../lib/validation.js'

const placeBetSchema = z.object({
  userId: z.uuid(),
  fightId: z.uuid(),
  chosenWinnerId: z.uuid(),
  amount: z
    .number('Informe o valor da aposta em moedas.')
    .int('A aposta deve ser em moedas inteiras.')
    .min(1, 'A aposta mínima é de 1 moeda.')
    .max(1_000_000),
})

const userParamSchema = z.object({ userId: z.uuid('Identificador inválido.') })

/** RF05 — efetivação e consulta de apostas. */
export class BetController {
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const body = parseOrThrow(placeBetSchema, request.body)
    const { bet, balance } = await BetModel.place(body)
    return reply.status(201).send(BetView.renderPlacement(bet, balance))
  }

  static async show(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const bet = await BetModel.findById(id)
    if (!bet) throw new NotFoundError('Aposta')
    return reply.send(BetView.render(bet))
  }

  static async listByUser(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = parseOrThrow(userParamSchema, request.params)
    const bets = await BetModel.listByUser(userId)

    return reply.send({
      total: bets.length,
      bets: BetView.renderMany(bets),
    })
  }
}
