import { prisma } from '../lib/prisma.js'
import type { Db } from '../lib/prisma.js'
import type { UserModel as UserRow } from '../../generated/prisma/models.js'

export interface CreateUserInput {
  name: string
  email: string
  virtualCoins?: number
}

/** RF01 — persistência de apostadores e da carteira virtual. */
export class UserModel {
  static async create(input: CreateUserInput, db: Db = prisma): Promise<UserRow> {
    return db.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        // O default de 1500 moedas vive no schema; só sobrescrevemos quando pedido.
        ...(input.virtualCoins === undefined ? {} : { virtualCoins: input.virtualCoins }),
      },
    })
  }

  static async findById(id: string, db: Db = prisma): Promise<UserRow | null> {
    return db.user.findUnique({ where: { id } })
  }

  static async findByEmail(email: string, db: Db = prisma): Promise<UserRow | null> {
    return db.user.findUnique({ where: { email: email.toLowerCase() } })
  }

  /** MVP sem autenticação: usuário de demonstração usado por GET /users/me. */
  static async findDemo(email: string, db: Db = prisma): Promise<UserRow | null> {
    const byEmail = await UserModel.findByEmail(email, db)
    if (byEmail) return byEmail
    return db.user.findFirst({ orderBy: { createdAt: 'asc' } })
  }

  static async getBalance(id: string, db: Db = prisma): Promise<number> {
    const user = await db.user.findUniqueOrThrow({ where: { id }, select: { virtualCoins: true } })
    return user.virtualCoins
  }

  static async creditCoins(id: string, coins: number, db: Db = prisma): Promise<void> {
    await db.user.update({ where: { id }, data: { virtualCoins: { increment: coins } } })
  }
}
