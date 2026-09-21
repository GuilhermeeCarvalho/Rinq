/** Erro de domínio com código estável para o cliente mobile. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number = 400,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} não encontrado(a).`, 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 422, details)
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409)
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409)
  }
}
