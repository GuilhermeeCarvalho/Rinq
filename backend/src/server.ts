import Fastify from 'fastify'
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { Prisma } from '../generated/prisma/client.js'
import { env, isProduction } from './config/env.js'
import { getActiveSeason } from './config/runtime.js'
import { prisma } from './lib/prisma.js'
import { AppError } from './lib/errors.js'
import { SeasonController } from './controllers/SeasonController.js'
import { CompetitorController } from './controllers/CompetitorController.js'
import { FightController } from './controllers/FightController.js'
import { BetController } from './controllers/BetController.js'
import { AuthController } from './controllers/AuthController.js'
import { UserController } from './controllers/UserController.js'
import { requireAuth, requireRole } from './lib/auth.js'
import { UserRole } from '../generated/prisma/enums.js'

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: isProduction
      ? true
      : { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } },
  })

  app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
  app.register(jwt, { secret: env.jwtSecret })

  app.get('/health', async () => ({ status: 'ok', season: getActiveSeason() }))

  app.get('/season', SeasonController.show)
  app.put('/season', { preHandler: requireRole(UserRole.ADMIN) }, SeasonController.update)

  app.post('/auth/register', AuthController.register)
  app.post('/auth/login', AuthController.login)
  app.get('/auth/me', { preHandler: requireAuth }, AuthController.me)
  app.patch('/users/me', { preHandler: requireAuth }, UserController.updateMe)
  app.get('/users/me/bets', { preHandler: requireAuth }, BetController.listByUser)
  app.post('/users/me/daily-bonus', { preHandler: requireAuth }, UserController.claimDailyBonus)

  app.get('/admin/bets', { preHandler: requireRole(UserRole.ADMIN) }, BetController.listAll)
  app.get('/admin/users', { preHandler: requireRole(UserRole.ADMIN) }, UserController.listAdmin)
  app.post('/admin/users/:id/coins', { preHandler: requireRole(UserRole.ADMIN) }, UserController.adjustCoins)

  app.get('/competitors', CompetitorController.list)
  app.get('/competitors/:id', CompetitorController.show)
  app.post('/competitors', { preHandler: requireRole(UserRole.ADMIN) }, CompetitorController.create)
  app.put('/competitors/:id', { preHandler: requireRole(UserRole.ADMIN) }, CompetitorController.update)
  app.delete('/competitors/:id', { preHandler: requireRole(UserRole.ADMIN) }, CompetitorController.delete)

  app.get('/fights', FightController.list)
  app.get('/fights/odds/preview', FightController.oddsPreview)
  app.get('/fights/:id', FightController.show)
  app.post('/fights', { preHandler: requireRole(UserRole.ADMIN) }, FightController.create)
  app.patch('/fights/:id', { preHandler: requireRole(UserRole.ADMIN) }, FightController.update)
  app.delete('/fights/:id', { preHandler: requireRole(UserRole.ADMIN) }, FightController.delete)
  app.post('/fights/:id/finish', { preHandler: requireRole(UserRole.ADMIN) }, FightController.finish)

  app.post('/bets', { preHandler: requireRole(UserRole.PLAYER) }, BetController.create)
  app.get('/bets/:id', BetController.show)

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: { code: 'ROUTE_NOT_FOUND', message: `Rota ${request.method} ${request.url} não existe.` },
    }),
  )

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details ?? null },
      })
    }

    const isDatabaseUnavailable =
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      ['PrismaClientInitializationError', 'PrismaClientUnknownRequestError', 'PrismaClientRustPanicError'].includes(error.name)

    if (isDatabaseUnavailable) {
      request.log.error(error)
      return reply.status(503).send({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'O banco de dados está indisponível no momento. Inicie o banco e tente novamente.',
        },
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'ECONNREFUSED' || error.code === 'P2024') {
        request.log.error(error)
        return reply.status(503).send({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: error.code === 'ECONNREFUSED'
              ? 'O banco de dados está indisponível. Inicie o banco e tente novamente.'
              : 'O banco de dados está demorando para responder. Tente novamente em instantes.',
          },
        })
      }
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: { code: 'UNIQUE_CONSTRAINT', message: 'Registro duplicado.' },
        })
      }
      if (error.code === 'P2025' || error.code === 'P2003') {
        return reply.status(404).send({
          error: { code: 'RELATION_NOT_FOUND', message: 'Registro relacionado não encontrado.' },
        })
      }
    }

    if (error && 'issues' in error && Array.isArray((error as { issues: unknown }).issues)) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Dados enviados são inválidos.',
          details: (error as { issues: unknown }).issues,
        },
      })
    }

    request.log.error(error)
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro interno. Tente novamente em instantes.',
      },
    })
  })

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })

  return app
}

async function main(): Promise<void> {
  const app = buildServer()

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Recebido ${signal}, encerrando...`)
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  try {
    await app.listen({ port: env.port, host: env.host })
    app.log.info(`Rinq API no ar — temporada ativa: ${getActiveSeason()}`)
  } catch (error) {
    app.log.error(error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

void main()
