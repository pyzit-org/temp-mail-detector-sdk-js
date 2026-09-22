// ─────────────────────────────────────────────────────────────────
// src/errors.ts — all custom error classes
// ─────────────────────────────────────────────────────────────────

export class PyzitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PyzitError"
    // Required in TypeScript when extending Error — fixes instanceof
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AuthenticationError extends PyzitError {
  readonly statusCode = 401
  constructor(message = "Invalid or inactive API key.") {
    super(message)
    this.name = "AuthenticationError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class InsufficientScopeError extends PyzitError {
  readonly statusCode = 403
  requiredScope: string
  constructor(message: string, requiredScope: string) {
    super(message)
    this.name = "InsufficientScopeError"
    this.requiredScope = requiredScope
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class QuotaExceededError extends PyzitError {
  readonly statusCode = 402
  quotaType: "simple" | "detailed"
  constructor(message: string, quotaType: "simple" | "detailed" = "simple") {
    super(message)
    this.name = "QuotaExceededError"
    this.quotaType = quotaType
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class BatchLimitExceededError extends PyzitError {
  readonly statusCode = 400
  maxAllowed: number
  attempted?: number
  constructor(message: string, maxAllowed: number, attempted?: number) {
    super(message)
    this.name = "BatchLimitExceededError"
    this.maxAllowed = maxAllowed
    this.attempted = attempted
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class RateLimitError extends PyzitError {
  readonly statusCode = 429
  retryAfter: number
  constructor(message: string, retryAfter: number = 1.0) {
    super(message)
    this.name = "RateLimitError"
    this.retryAfter = retryAfter
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends PyzitError {
  readonly statusCode = 400
  fieldErrors?: Record<string, any>
  constructor(message: string, fieldErrors?: Record<string, any>) {
    super(message)
    this.name = "ValidationError"
    this.fieldErrors = fieldErrors
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class APIError extends PyzitError {
  statusCode: number
  responseBody?: string
  constructor(message: string, statusCode: number, responseBody?: string) {
    super(`${message} (HTTP ${statusCode})`)
    this.name = "APIError"
    this.statusCode = statusCode
    this.responseBody = responseBody
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class TimeoutError extends PyzitError {
  constructor(message = "Request timed out.") {
    super(message)
    this.name = "TimeoutError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}