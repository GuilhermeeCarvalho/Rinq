import 'dotenv/config'
import { SeasonType } from '../../generated/prisma/enums.js'

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${key}`)
  return value
}

function parseSeason(raw: string | undefined): SeasonType {
  if (raw === SeasonType.HUMAN_MMA || raw === SeasonType.ROBOT_ROOSTER) return raw
  if (raw) {
    console.warn(`[env] ACTIVE_SEASON inválida ("${raw}"). Usando HUMAN_MMA.`)
  }
  return SeasonType.HUMAN_MMA
}

/**
 * RF06: a temporada ativa é configuração de servidor, não de schema.
 * Trocar ACTIVE_SEASON + publicar o bundle OTA vira uma nova temporada.
 */
export const env = {
  databaseUrl: requireEnv('DATABASE_URL'),
  port: Number(process.env['PORT'] ?? 3333),
  host: process.env['HOST'] ?? '0.0.0.0',
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  activeSeason: parseSeason(process.env['ACTIVE_SEASON']),
  seasonLabel: process.env['SEASON_LABEL'] ?? null,
  seasonEndsAt: process.env['SEASON_ENDS_AT'] ?? null,
  easChannel: process.env['EAS_CHANNEL'] ?? null,
  demoUserEmail: process.env['DEMO_USER_EMAIL'] ?? 'demo@rinq.app',
  jwtSecret: process.env['JWT_SECRET'] ?? 'rinq-development-secret-change-me',
} as const

export const isProduction = env.nodeEnv === 'production'
