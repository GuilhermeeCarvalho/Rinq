import Fastify from 'fastify'
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import { Prisma } from '../generated/prisma/client.js'
import { env, isProduction } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { AppError } from './lib/errors.js'
import { SeasonController } from './controllers/SeasonController.js'
import { UserController } from './controllers/UserController.js'
import { CompetitorController } from './controllers/CompetitorController.js'
import { FightController } from './controllers/FightController.js'
import { BetController } from './controllers/BetController.js'

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: isProduction
      ? true
      : { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } },
  })

  app.register(cors, { origin: true })

  // ---------------------------------------------------------------- rotas
  app.get('/health', async () => ({ status: 'ok', season: env.activeSeason }))

  // RF06 — temporada ativa (dirige o tema OTA no app)
  app.get('/season', SeasonController.show)

  // RF01 — apostadores
  app.post('/users', UserController.create)
  app.get('/users/me', UserController.me)
  app.get('/users/:id', UserController.show)
  app.get('/users/:userId/bets', BetController.listByUser)

  // RF02 — catálogo unificado de competidores
  app.get('/competitors', CompetitorController.list)
  app.get('/competitors/:id', CompetitorController.show)

  // RF03/RF04 — cards de luta e odds
  app.get('/fights', FightController.list)
  app.get('/fights/odds/preview', FightController.oddsPreview)
  app.get('/fights/:id', FightController.show)
  app.post('/fights', FightController.create)
  app.post('/fights/:id/finish', FightController.finish)

  // RF05 — apostas
  app.post('/bets', BetController.create)
  app.get('/bets/:id', BetController.show)

  // ------------------------------------------------------- tratamento de erro
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

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
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

    if (error.validation) {
      return reply.status(422).send({
        error: { code: 'VALIDATION_ERROR', message: error.message },
      })
    }

    request.log.error(error)
    return reply.status(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: isProduction ? 'Erro interno do servidor.' : error.message,
      },
    })
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
    app.log.info(`Rinq API no ar — temporada ativa: ${env.activeSeason}`)
  } catch (error) {
    app.log.error(error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

void main()
