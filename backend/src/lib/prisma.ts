import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { env, isProduction } from '../config/env.js'

// Prisma 7 exige driver adapter para providers SQL.
const adapter = new PrismaPg({ connectionString: env.databaseUrl })

export const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ['error'] : ['warn', 'error'],
})

/**
 * Aceita tanto o client raiz quanto o client de uma transação interativa,
 * permitindo que os Models sejam reaproveitados dentro de $transaction (RNF02).
 */
export type Db = PrismaClient | Prisma.TransactionClient
