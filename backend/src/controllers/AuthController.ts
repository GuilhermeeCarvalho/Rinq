import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { UserRole } from '../../generated/prisma/enums.js'
import { ConflictError, UnauthorizedError } from '../lib/errors.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { parseOrThrow } from '../lib/validation.js'
import { UserModel } from '../models/UserModel.js'
import { UserView } from '../views/UserView.js'

const credentialsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.email('E-mail inválido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128),
})

export class AuthController {
  static async register(request: FastifyRequest, reply: FastifyReply) {
    const body = parseOrThrow(credentialsSchema.required({ name: true }), request.body)
    const existing = await UserModel.findByEmail(body.email)
    if (existing) throw new ConflictError('EMAIL_ALREADY_USED', 'Este e-mail já está cadastrado.')

    const user = await UserModel.create({
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role: UserRole.PLAYER,
    })

    return reply.status(201).send({ token: await reply.jwtSign({ sub: user.id, role: user.role }), user: UserView.render(user) })
  }

  static async login(request: FastifyRequest, reply: FastifyReply) {
    const body = parseOrThrow(credentialsSchema.omit({ name: true }), request.body)
    const user = await UserModel.findByEmail(body.email)
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new UnauthorizedError('E-mail ou senha inválidos.')
    }

    return reply.send({ token: await reply.jwtSign({ sub: user.id, role: user.role }), user: UserView.render(user) })
  }

  static async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await UserModel.findById(request.user.sub)
    if (!user) throw new UnauthorizedError('Usuário do token não existe mais.')
    return reply.send(UserView.render(user))
  }
}