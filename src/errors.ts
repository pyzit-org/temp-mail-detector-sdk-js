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
  constructor(message = "Invalid or missing API token.") {
    super(message)
    this.name = "AuthenticationError"
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ScopeError extends PyzitError {
  requiredScope: string
  constructor(requiredScope = "") {
    super(
      `Token missing required scope: '${requiredScope}'. ` +
      `Enable it in your Pyzit dashboard under API Tokens.`
    )
    this.name = "ScopeError"
    this.requiredScope = requiredScope
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class PlanRequiredError extends PyzitError {
  requiredPlan: string
  constructor(requiredPlan = "pro") {
    super(`This endpoint requires the '${requiredPlan}' plan or higher.`)
    this.name = "PlanRequiredError"
    this.requiredPlan = requiredPlan
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class RateLimitError extends PyzitError {
  retryAfter: number
  constructor(retryAfter = 60) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds.`)
    this.name = "RateLimitError"
    this.retryAfter = retryAfter
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class APIError extends PyzitError {
  statusCode:   number
  responseBody: string
  constructor(statusCode: number, responseBody = "") {
    super(`API returned HTTP ${statusCode}: ${responseBody.slice(0, 200)}`)
    this.name = "APIError"
    this.statusCode   = statusCode
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