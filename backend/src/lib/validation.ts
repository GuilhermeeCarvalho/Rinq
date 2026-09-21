import { z } from 'zod'
import { SeasonType } from '../../generated/prisma/enums.js'
import { env } from '../config/env.js'
import { ValidationError } from './errors.js'

/** RNF05 — nada entra nos Models sem passar por um schema. */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(raiz)',
      message: issue.message,
    }))
    throw new ValidationError('Dados inválidos na requisição.', details)
  }
  return result.data
}

export const seasonTypeSchema = z.enum([SeasonType.HUMAN_MMA, SeasonType.ROBOT_ROOSTER])

export const idParamSchema = z.object({ id: z.uuid('Identificador inválido.') })

/** `?season=` é opcional: sem ele, vale a temporada ativa do servidor. */
export const seasonQuerySchema = z.object({
  season: seasonTypeSchema.default(env.activeSeason),
})

export const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1')
