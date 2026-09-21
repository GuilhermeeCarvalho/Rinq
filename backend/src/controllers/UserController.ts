import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { UserModel } from '../models/UserModel.js'
import { UserView } from '../views/UserView.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { idParamSchema, parseOrThrow } from '../lib/validation.js'

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto.').max(80),
  email: z.email('E-mail inválido.'),
})

/** RF01 — cadastro de apostadores e consulta de carteira. */
export class UserController {
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const body = parseOrThrow(createUserSchema, request.body)

    const existing = await UserModel.findByEmail(body.email)
    if (existing) {
      throw new ConflictError('EMAIL_ALREADY_USED', 'Este e-mail já está cadastrado.')
    }

    // O saldo inicial de 1500 moedas é aplicado pelo default do schema.
    const user = await UserModel.create(body)
    return reply.status(201).send(UserView.render(user))
  }

  static async show(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const user = await UserModel.findById(id)
    if (!user) throw new NotFoundError('Usuário')
    return reply.send(UserView.render(user))
  }

  /** MVP sem autenticação: devolve o apostador de demonstração. */
  static async me(_request: FastifyRequest, reply: FastifyReply) {
    const user = await UserModel.findDemo(env.demoUserEmail)
    if (!user) throw new NotFoundError('Usuário demo (rode o seed)')
    return reply.send(UserView.render(user))
  }
}
