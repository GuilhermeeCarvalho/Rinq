import '@fastify/jwt'
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify'
import { UserRole } from '../../generated/prisma/enums.js'
import { ForbiddenError, UnauthorizedError } from './errors.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: UserRole }
    user: { sub: string; role: UserRole }
  }
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    throw new UnauthorizedError('Token ausente ou inválido.')
  }
}

export function requireRole(...roles: UserRole[]): preHandlerHookHandler {
  return async (request, _reply) => {
    await requireAuth(request, _reply)
    if (!roles.includes(request.user.role)) throw new ForbiddenError()
  }
}