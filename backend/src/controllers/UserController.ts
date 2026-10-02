import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { UserModel } from '../models/UserModel.js'
import { UserView } from '../views/UserView.js'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'
import { idParamSchema, parseOrThrow } from '../lib/validation.js'
import { hashPassword, verifyPassword } from '../lib/password.js'
import { UserRole } from '../../generated/prisma/enums.js'

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto.').max(80),
  email: z.email('E-mail inválido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(128),
})

const updateMeSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome muito curto.').max(80).optional(),
    email: z.email('E-mail inválido.').optional(),
    currentPassword: z.string().min(1).max(128).optional(),
    newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres.').max(128).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para atualizar.',
  })

const adjustCoinsSchema = z.object({
  amount: z.number().int(),
})

export class UserController {
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const body = parseOrThrow(createUserSchema, request.body)

    const existing = await UserModel.findByEmail(body.email)
    if (existing) {
      throw new ConflictError('EMAIL_ALREADY_USED', 'Este e-mail já está cadastrado.')
    }

    const user = await UserModel.create({
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role: UserRole.PLAYER,
    })
    return reply.status(201).send(UserView.render(user))
  }

  static async show(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const user = await UserModel.findById(id)
    if (!user) throw new NotFoundError('Usuário')
    return reply.send(UserView.render(user))
  }

  /** Edição do próprio perfil. Trocar e-mail ou senha exige a senha atual. */
  static async updateMe(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub
    const body = parseOrThrow(updateMeSchema, request.body)

    const user = await UserModel.findById(userId)
    if (!user) throw new NotFoundError('Usuário')

    const emailChanged = body.email !== undefined && body.email.toLowerCase() !== user.email
    if (emailChanged || body.newPassword !== undefined) {
      const valid =
        body.currentPassword !== undefined && (await verifyPassword(body.currentPassword, user.passwordHash))
      if (!valid) throw new ValidationError('Senha atual incorreta.')
    }

    if (emailChanged && body.email !== undefined) {
      const existing = await UserModel.findByEmail(body.email)
      if (existing) throw new ConflictError('EMAIL_ALREADY_USED', 'Este e-mail já está cadastrado.')
    }

    const updated = await UserModel.update(userId, {
      ...(body.name === undefined ? {} : { name: body.name }),
      ...(emailChanged && body.email !== undefined ? { email: body.email } : {}),
      ...(body.newPassword === undefined ? {} : { passwordHash: await hashPassword(body.newPassword) }),
    })
    return reply.send(UserView.render(updated))
  }

  static async listAdmin(_request: FastifyRequest, reply: FastifyReply) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        virtualCoins: true,
        createdAt: true,
        _count: { select: { bets: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return reply.send({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        virtualCoins: u.virtualCoins,
        createdAt: u.createdAt.toISOString(),
        totalBets: u._count.bets,
      })),
    })
  }

  static async adjustCoins(request: FastifyRequest, reply: FastifyReply) {
    const { id } = parseOrThrow(idParamSchema, request.params)
    const { amount } = parseOrThrow(adjustCoinsSchema, request.body)

    const user = await UserModel.findById(id)
    if (!user) throw new NotFoundError('Usuário')

    const updated = await prisma.user.update({
      where: { id },
      data: { virtualCoins: { increment: amount } },
      select: { id: true, name: true, email: true, virtualCoins: true },
    })

    return reply.send(updated)
  }

  static async claimDailyBonus(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user.sub
    const user = await UserModel.findById(userId)
    if (!user) throw new NotFoundError('Usuário')

    const BONUS = 500
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { virtualCoins: { increment: BONUS } },
      select: { id: true, name: true, email: true, virtualCoins: true },
    })

    return reply.send({
      success: true,
      bonusAdded: BONUS,
      virtualCoins: updated.virtualCoins,
    })
  }
}
