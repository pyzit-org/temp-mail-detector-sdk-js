// ─────────────────────────────────────────────────────────────────
// tests/errors.test.ts — error class unit tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest"
import {
  PyzitError,
  AuthenticationError,
  InsufficientScopeError,
  QuotaExceededError,
  BatchLimitExceededError,
  RateLimitError,
  ValidationError,
  APIError,
  TimeoutError,
} from "../src/index.js"

describe("PyzitError base class", () => {
  it("is an instance of Error", () => {
    expect(new PyzitError("test")).toBeInstanceOf(Error)
  })

  it("has correct name", () => {
    expect(new PyzitError("test").name).toBe("PyzitError")
  })

  it("stores message", () => {
    expect(new PyzitError("something went wrong").message).toBe("something went wrong")
  })
})

describe("all errors extend PyzitError", () => {
  const classes = [
    AuthenticationError,
    InsufficientScopeError,
    QuotaExceededError,
    BatchLimitExceededError,
    RateLimitError,
    ValidationError,
    APIError,
    TimeoutError,
  ]

  it("every error class is instanceof PyzitError", () => {
    for (const Cls of classes) {
      expect(new Cls()).toBeInstanceOf(PyzitError)
    }
  })

  it("every error class is instanceof Error", () => {
    for (const Cls of classes) {
      expect(new Cls()).toBeInstanceOf(Error)
    }
  })

  it("instanceof works correctly — TypeScript extends Error fix applied", () => {
    const err = new AuthenticationError()
    expect(err instanceof AuthenticationError).toBe(true)
    expect(err instanceof PyzitError).toBe(true)
    expect(err instanceof Error).toBe(true)
  })
})

describe("AuthenticationError", () => {
  it("has correct name", () => {
    expect(new AuthenticationError().name).toBe("AuthenticationError")
  })

  it("has statusCode 401", () => {
    expect(new AuthenticationError().statusCode).toBe(401)
  })

  it("uses default message when none given", () => {
    expect(new AuthenticationError().message).toContain("Invalid or inactive")
  })

  it("accepts a custom message", () => {
    const err = new AuthenticationError("Access denied (403).")
    expect(err.message).toBe("Access denied (403).")
  })
})

describe("InsufficientScopeError", () => {
  it("has correct name", () => {
    expect(new InsufficientScopeError("msg", "tmd:detailed").name).toBe("InsufficientScopeError")
  })

  it("has statusCode 403", () => {
    expect(new InsufficientScopeError("msg", "tmd:detailed").statusCode).toBe(403)
  })

  it("stores requiredScope", () => {
    const err = new InsufficientScopeError("msg", "tmd:detailed")
    expect(err.requiredScope).toBe("tmd:detailed")
  })

  it("accepts tmd:basic scope", () => {
    const err = new InsufficientScopeError("msg", "tmd:basic")
    expect(err.requiredScope).toBe("tmd:basic")
  })
})

describe("QuotaExceededError", () => {
  it("has correct name", () => {
    expect(new QuotaExceededError("msg", "simple").name).toBe("QuotaExceededError")
  })

  it("has statusCode 402", () => {
    expect(new QuotaExceededError("msg", "simple").statusCode).toBe(402)
  })

  it("stores quotaType", () => {
    expect(new QuotaExceededError("msg", "simple").quotaType).toBe("simple")
    expect(new QuotaExceededError("msg", "detailed").quotaType).toBe("detailed")
  })

  it("defaults to simple quota", () => {
    expect(new QuotaExceededError("msg").quotaType).toBe("simple")
  })
})

describe("BatchLimitExceededError", () => {
  it("has correct name", () => {
    expect(new BatchLimitExceededError("msg", 10).name).toBe("BatchLimitExceededError")
  })

  it("has statusCode 400", () => {
    expect(new BatchLimitExceededError("msg", 10).statusCode).toBe(400)
  })

  it("stores maxAllowed", () => {
    expect(new BatchLimitExceededError("msg", 50).maxAllowed).toBe(50)
  })

  it("stores attempted when provided", () => {
    expect(new BatchLimitExceededError("msg", 10, 15).attempted).toBe(15)
  })
})

describe("RateLimitError", () => {
  it("has correct name", () => {
    expect(new RateLimitError("msg", 42).name).toBe("RateLimitError")
  })

  it("has statusCode 429", () => {
    expect(new RateLimitError("msg", 42).statusCode).toBe(429)
  })

  it("stores retryAfter", () => {
    expect(new RateLimitError("msg", 42).retryAfter).toBe(42)
  })

  it("defaults retryAfter to 1.0", () => {
    expect(new RateLimitError("msg").retryAfter).toBe(1.0)
  })
})

describe("ValidationError", () => {
  it("has correct name", () => {
    expect(new ValidationError("msg").name).toBe("ValidationError")
  })

  it("has statusCode 400", () => {
    expect(new ValidationError("msg").statusCode).toBe(400)
  })

  it("stores fieldErrors when provided", () => {
    const fieldErrors = { email: ["Invalid email"] }
    const err = new ValidationError("msg", fieldErrors)
    expect(err.fieldErrors).toEqual(fieldErrors)
  })
})

describe("APIError", () => {
  it("has correct name", () => {
    expect(new APIError("msg", 500).name).toBe("APIError")
  })

  it("stores statusCode", () => {
    expect(new APIError("msg", 503).statusCode).toBe(503)
  })

  it("stores full responseBody", () => {
    expect(new APIError("msg", 500, "Internal Server Error").responseBody)
      .toBe("Internal Server Error")
  })

  it("includes statusCode in message", () => {
    expect(new APIError("msg", 503).message).toContain("503")
  })
})

describe("TimeoutError", () => {
  it("has correct name", () => {
    expect(new TimeoutError().name).toBe("TimeoutError")
  })

  it("has a default message mentioning timeout", () => {
    expect(new TimeoutError().message.toLowerCase()).toContain("timed out")
  })
})

describe("catch-all pattern", () => {
  it("catching PyzitError catches all SDK errors", () => {
    const errors = [
      new AuthenticationError(),
      new InsufficientScopeError("msg", "tmd:detailed"),
      new QuotaExceededError("msg", "simple"),
      new BatchLimitExceededError("msg", 10),
      new RateLimitError("msg", 10),
      new ValidationError("msg"),
      new APIError("msg", 500, "err"),
      new TimeoutError(),
    ]
    for (const err of errors) {
      expect(() => { throw err }).toThrow(PyzitError)
    }
  })
})