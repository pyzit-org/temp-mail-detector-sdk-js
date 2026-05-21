// ─────────────────────────────────────────────────────────────────
// tests/errors.test.ts — error class unit tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest"
import {
  PyzitError,
  AuthenticationError,
  ScopeError,
  PlanRequiredError,
  RateLimitError,
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
    ScopeError,
    PlanRequiredError,
    RateLimitError,
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

  it("uses default message when none given", () => {
    expect(new AuthenticationError().message).toContain("Invalid or missing")
  })

  it("accepts a custom message", () => {
    const err = new AuthenticationError("Access denied (403).")
    expect(err.message).toBe("Access denied (403).")
  })
})

describe("ScopeError", () => {
  it("has correct name", () => {
    expect(new ScopeError().name).toBe("ScopeError")
  })

  it("stores requiredScope", () => {
    const err = new ScopeError("detailed:tempemail_check")
    expect(err.requiredScope).toBe("detailed:tempemail_check")
  })

  it("includes requiredScope in message", () => {
    const err = new ScopeError("bulk:validate")
    expect(err.message).toContain("bulk:validate")
  })

  it("defaults requiredScope to empty string", () => {
    expect(new ScopeError().requiredScope).toBe("")
  })
})

describe("PlanRequiredError", () => {
  it("has correct name", () => {
    expect(new PlanRequiredError().name).toBe("PlanRequiredError")
  })

  it("stores requiredPlan", () => {
    expect(new PlanRequiredError("business").requiredPlan).toBe("business")
  })

  it("includes requiredPlan in message", () => {
    expect(new PlanRequiredError("pro").message).toContain("pro")
  })

  it("defaults to pro plan", () => {
    expect(new PlanRequiredError().requiredPlan).toBe("pro")
  })
})

describe("RateLimitError", () => {
  it("has correct name", () => {
    expect(new RateLimitError().name).toBe("RateLimitError")
  })

  it("stores retryAfter", () => {
    expect(new RateLimitError(42).retryAfter).toBe(42)
  })

  it("includes retryAfter seconds in message", () => {
    expect(new RateLimitError(30).message).toContain("30")
  })

  it("defaults retryAfter to 60", () => {
    expect(new RateLimitError().retryAfter).toBe(60)
  })
})

describe("APIError", () => {
  it("has correct name", () => {
    expect(new APIError(500).name).toBe("APIError")
  })

  it("stores statusCode", () => {
    expect(new APIError(503).statusCode).toBe(503)
  })

  it("stores full responseBody", () => {
    expect(new APIError(500, "Internal Server Error").responseBody)
      .toBe("Internal Server Error")
  })

  it("includes statusCode in message", () => {
    expect(new APIError(503, "down").message).toContain("503")
  })

  it("truncates long body in message but keeps full body in responseBody", () => {
    const longBody = "x".repeat(500)
    const err = new APIError(500, longBody)
    expect(err.message.length).toBeLessThan(400)
    expect(err.responseBody.length).toBe(500)
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
      new ScopeError("x:y"),
      new PlanRequiredError("pro"),
      new RateLimitError(10),
      new APIError(500, "err"),
      new TimeoutError(),
    ]
    for (const err of errors) {
      expect(() => { throw err }).toThrow(PyzitError)
    }
  })
})