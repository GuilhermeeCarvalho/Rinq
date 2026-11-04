import { createRequire } from 'node:module'
import { basename, extname, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import swaggerJSDoc from 'swagger-jsdoc'
import { env } from './env.js'

const require = createRequire(import.meta.url)
const swaggerUiPath = (require('swagger-ui-dist/absolute-path') as () => string)()

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Rinq API',
    version: '1.0.0',
    description: 'API REST da plataforma Rinq de apostas com moeda virtual.',
  },
  servers: [{ url: `http://localhost:${env.port}`, description: 'Servidor local' }],
  tags: [
    { name: 'Health', description: 'Status da API' },
    { name: 'Auth', description: 'Autenticação e sessão' },
    { name: 'Season', description: 'Temporada ativa' },
    { name: 'Competitors', description: 'Competidores' },
    { name: 'Fights', description: 'Lutas e odds' },
    { name: 'Bets', description: 'Apostas' },
    { name: 'Users', description: 'Perfil e administração de usuários' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Credentials: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Maria Silva' },
          email: { type: 'string', format: 'email', example: 'maria@rinq.app' },
          password: { type: 'string', minLength: 8, example: 'player123' },
        },
      },
      LoginCredentials: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'maria@rinq.app' },
          password: { type: 'string', example: 'player123' },
        },
      },
      IdParam: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { nullable: true },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Verifica se a API está disponível', responses: { 200: { description: 'API disponível' } } },
    },
    '/season': {
      get: { tags: ['Season'], summary: 'Consulta a temporada ativa', responses: { 200: { description: 'Temporada ativa' } } },
      put: {
        tags: ['Season'],
        summary: 'Altera a temporada ativa',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['seasonType'], properties: { seasonType: { type: 'string', enum: ['HUMAN_MMA', 'ROBOT_ROOSTER'] } } } } } },
        responses: { 200: { description: 'Temporada alterada' }, 401: { description: 'Não autenticado' }, 403: { description: 'Apenas administradores' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Cria uma conta de jogador',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } } },
        responses: { 201: { description: 'Conta criada' }, 409: { description: 'E-mail já cadastrado' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Autentica um usuário',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginCredentials' } } } },
        responses: { 200: { description: 'Token JWT' }, 401: { description: 'Credenciais inválidas' } },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Consulta o usuário autenticado', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Usuário autenticado' }, 401: { description: 'Não autenticado' } } },
    },
    '/users/me': {
      patch: { tags: ['Users'], summary: 'Atualiza o próprio perfil', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Perfil atualizado' }, 422: { description: 'Dados inválidos' } } },
    },
    '/users/me/bets': {
      get: { tags: ['Bets'], summary: 'Lista as apostas do usuário autenticado', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Lista de apostas' } } },
    },
    '/users/me/daily-bonus': {
      post: { tags: ['Users'], summary: 'Resgata o bônus diário', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Bônus resgatado' } } },
    },
    '/admin/bets': {
      get: { tags: ['Bets'], summary: 'Lista todas as apostas', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Lista de apostas' }, 403: { description: 'Apenas administradores' } } },
    },
    '/admin/users': {
      get: { tags: ['Users'], summary: 'Lista os usuários', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Lista de usuários' }, 403: { description: 'Apenas administradores' } } },
    },
    '/admin/users/{id}/coins': {
      post: { tags: ['Users'], summary: 'Ajusta as moedas de um usuário', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'integer' } } } } } }, responses: { 200: { description: 'Saldo atualizado' } } },
    },
    '/competitors': {
      get: { tags: ['Competitors'], summary: 'Lista os competidores', parameters: [{ name: 'season', in: 'query', schema: { type: 'string', enum: ['HUMAN_MMA', 'ROBOT_ROOSTER'] } }], responses: { 200: { description: 'Lista de competidores' } } },
      post: { tags: ['Competitors'], summary: 'Cria um competidor', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'team', 'specWeight', 'specStyle'], properties: { name: { type: 'string' }, team: { type: 'string' }, specWeight: { type: 'string' }, specStyle: { type: 'string' }, seasonType: { type: 'string' } } } } } }, responses: { 201: { description: 'Competidor criado' } } },
    },
    '/competitors/{id}': {
      get: { tags: ['Competitors'], summary: 'Consulta um competidor', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Competidor' }, 404: { description: 'Não encontrado' } } },
      put: { tags: ['Competitors'], summary: 'Atualiza um competidor', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Competidor atualizado' } } },
      delete: { tags: ['Competitors'], summary: 'Exclui um competidor', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 204: { description: 'Competidor excluído' } } },
    },
    '/fights': {
      get: { tags: ['Fights'], summary: 'Lista as lutas', parameters: [{ name: 'season', in: 'query', schema: { type: 'string' } }, { name: 'includeFinished', in: 'query', schema: { type: 'boolean' } }, { name: 'take', in: 'query', schema: { type: 'integer', maximum: 100 } }], responses: { 200: { description: 'Lista de lutas' } } },
      post: { tags: ['Fights'], summary: 'Cria uma luta', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['competitorAId', 'competitorBId'], properties: { competitorAId: { type: 'string', format: 'uuid' }, competitorBId: { type: 'string', format: 'uuid' }, seasonType: { type: 'string' }, scheduledAt: { type: 'string', format: 'date-time' } } } } } }, responses: { 201: { description: 'Luta criada' } } },
    },
    '/fights/odds/preview': {
      get: { tags: ['Fights'], summary: 'Pré-visualiza as odds', parameters: [{ name: 'competitorAId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }, { name: 'competitorBId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Odds calculadas' } } },
    },
    '/fights/{id}': {
      get: { tags: ['Fights'], summary: 'Consulta uma luta', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Luta' } } },
      patch: { tags: ['Fights'], summary: 'Atualiza uma luta', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { scheduledAt: { type: 'string', format: 'date-time' } } } } } }, responses: { 200: { description: 'Luta atualizada' } } },
      delete: { tags: ['Fights'], summary: 'Cancela uma luta', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Luta cancelada' } } },
    },
    '/fights/{id}/finish': {
      post: { tags: ['Fights'], summary: 'Finaliza uma luta e liquida apostas', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { winnerId: { type: 'string', format: 'uuid', nullable: true } } } } } }, responses: { 200: { description: 'Luta finalizada' } } },
    },
    '/bets': {
      post: { tags: ['Bets'], summary: 'Registra uma aposta', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['fightId', 'chosenWinnerId', 'amount'], properties: { fightId: { type: 'string', format: 'uuid' }, chosenWinnerId: { type: 'string', format: 'uuid' }, amount: { type: 'integer', minimum: 1 } } } } } }, responses: { 201: { description: 'Aposta registrada' } } },
    },
    '/bets/{id}': {
      get: { tags: ['Bets'], summary: 'Consulta uma aposta', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Aposta' } } },
    },
  },
}

export const swaggerSpec = swaggerJSDoc({ definition, apis: [] })

export const swaggerHtml = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Rinq API - Swagger UI</title><link rel="stylesheet" href="/docs/swagger-ui.css"></head>
<body><div id="swagger-ui"></div>
<script src="/docs/swagger-ui-bundle.js"></script>
<script>window.onload = () => SwaggerUIBundle({ url: '/docs.json', dom_id: '#swagger-ui', deepLinking: true, presets: [SwaggerUIBundle.presets.apis], layout: 'BaseLayout' });</script>
</body>
</html>`

export async function readSwaggerAsset(asset: string): Promise<{ content: Buffer; type: string } | null> {
  const safeAsset = basename(asset)
  if (safeAsset !== asset) return null

  const file = join(swaggerUiPath, safeAsset)
  try {
    const content = await readFile(file)
    const types: Record<string, string> = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
    }
    return { content, type: types[extname(safeAsset)] ?? 'application/octet-stream' }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    throw error
  }
}
