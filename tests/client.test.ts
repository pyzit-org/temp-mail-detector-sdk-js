// ─────────────────────────────────────────────────────────────────
// tests/client.test.ts — check(), error handling, client config
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  TempMailClient,
  AuthenticationError,
  InsufficientScopeError,
  QuotaExceededError,
  BatchLimitExceededError,
  RateLimitError,
  ValidationError,
  APIError,
  TimeoutError,
} from "../src/index.js"
import {
  FAKE_TOKEN,
  CHECK_URL,
  CLEAN_PAYLOAD,
  DISPOSABLE_PAYLOAD,
  PRIVACY_RELAY_PAYLOAD,
  makeResponse,
  makeTextResponse,
} from "./fixtures.js"

// ── mock global fetch — zero real HTTP calls ──────────────────────
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)
beforeEach(() => mockFetch.mockReset())

const client = new TempMailClient({ apiKey: FAKE_TOKEN, maxRetries: 0 })

// ── check() happy paths ───────────────────────────────────────────

describe("check() — happy paths", () => {
  it("returns CheckResult for a clean email", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    const r = await client.check("hi@pyzit.com")
    expect(r.email).toBe("hi@pyzit.com")
    expect(r.is_disposable).toBe(false)
    expect(r.status).toBe("clean")
  })

  it("returns is_disposable=true for a throwaway email", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DISPOSABLE_PAYLOAD))
    const r = await client.check("user@mailnator.com")
    expect(r.is_disposable).toBe(true)
    expect(r.status).toBe("disposable")
  })

  it("handles privacy relay response correctly", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(PRIVACY_RELAY_PAYLOAD))
    const r = await client.check("user@privaterelay.appleid.com")
    expect(r.is_disposable).toBe(false)
    expect(r.is_privacy_relay).toBe(true)
    expect(r.is_clean).toBe(true)
    expect(r.status).toBe("privacy_relay")
    expect(r.relay_provider).toBe("apple")
    expect(r.provider_name).toBe("Apple Private Relay")
  })

  it("POSTs to the correct URL", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await client.check("hi@pyzit.com")
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe(CHECK_URL)
  })

  it("sends email in POST body", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await client.check("hi@pyzit.com")
    const [, opts] = mockFetch.mock.calls[0]
    expect(JSON.parse(opts.body)).toEqual({ email: "hi@pyzit.com" })
  })

  it("sends correct Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await client.check("hi@pyzit.com")
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers["Authorization"]).toBe(`Bearer ${FAKE_TOKEN}`)
  })

  it("sends Content-Type: application/json", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await client.check("hi@pyzit.com")
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers["Content-Type"]).toBe("application/json")
  })

  it("sends Accept: application/json", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await client.check("hi@pyzit.com")
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers["Accept"]).toBe("application/json")
  })
})

// ── check() error handling ────────────────────────────────────────

describe("check() — error handling", () => {
  it("HTTP 401 → AuthenticationError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 401))
    await expect(client.check("x@y.com")).rejects.toThrow(AuthenticationError)
  })

  it("HTTP 403 with scope detail → InsufficientScopeError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "API key lacks required scope: 'tmd:basic'." }, 403
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(InsufficientScopeError)
    expect(err.requiredScope).toBe("tmd:basic")
  })

  it("HTTP 402 with quota_exceeded → QuotaExceededError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "You have exceeded your monthly simple check quota. Please upgrade your plan.", code: "quota_exceeded" }, 402
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(QuotaExceededError)
    expect(err.quotaType).toBe("simple")
  })

  it("HTTP 402 with detailed quota → QuotaExceededError with detailed type", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "You have exceeded your monthly detailed check quota. Please upgrade your plan.", code: "quota_exceeded" }, 402
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(QuotaExceededError)
    expect(err.quotaType).toBe("detailed")
  })

  it("HTTP 400 with batch limit → BatchLimitExceededError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "Your plan allows a maximum of 10 emails per bulk request. Upgrade your plan for higher limits." }, 400
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(BatchLimitExceededError)
    expect(err.maxAllowed).toBe(10)
  })

  it("HTTP 400 with validation error → ValidationError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { email: ["Enter a valid email address."] }, 400
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(ValidationError)
    expect(err.fieldErrors).toEqual({ email: ["Enter a valid email address."] })
  })

  it("HTTP 429 → RateLimitError with retryAfter from header", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      {}, 429, { "Retry-After": "45" }
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err.retryAfter).toBe(45)
  })

  it("HTTP 429 with no Retry-After → RateLimitError defaults to 1.0", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 429))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err.retryAfter).toBe(1.0)
  })

  it("HTTP 500 → APIError with correct statusCode", async () => {
    mockFetch.mockResolvedValueOnce(makeTextResponse("Internal Server Error", 500))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect(err.statusCode).toBe(500)
  })

  it("HTTP 503 → APIError with responseBody", async () => {
    mockFetch.mockResolvedValueOnce(makeTextResponse("Service Unavailable", 503))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect(err.responseBody).toContain("Service Unavailable")
  })

  it("AbortError (timeout) → TimeoutError", async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
    )
    await expect(client.check("x@y.com")).rejects.toThrow(TimeoutError)
  })

  it("all thrown errors are instanceof PyzitError", async () => {
    const cases = [
      makeResponse({}, 401),
      makeResponse({ detail: "API key lacks required scope: 'tmd:basic'." }, 403),
      makeResponse({ detail: "You have exceeded your monthly simple check quota.", code: "quota_exceeded" }, 402),
      makeResponse({}, 429),
      makeTextResponse("error", 500),
    ]
    for (const mockRes of cases) {
      mockFetch.mockResolvedValueOnce(mockRes)
      const err = await client.check("x@y.com").catch(e => e)
      expect(err).toBeInstanceOf(
        (await import("../src/errors.js")).PyzitError
      )
    }
  })
})

// ── client config ─────────────────────────────────────────────────

describe("TempMailClient config", () => {
  it("accepts plain token string", async () => {
    const c = new TempMailClient("my-token")
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await c.check("hi@pyzit.com")
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers["Authorization"]).toBe("Bearer my-token")
  })

  it("accepts options object with apiKey", async () => {
    const c = new TempMailClient({ apiKey: "opt-token", timeout: 5 })
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await c.check("hi@pyzit.com")
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers["Authorization"]).toBe("Bearer opt-token")
  })

  it("baseUrl override is used in request URL", async () => {
    const c = new TempMailClient({
      apiKey: "tok",
      baseUrl: "https://mock.local",
    })
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await c.check("hi@pyzit.com")
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain("mock.local")
    expect(url).toContain("/v1/tmd/check/")
  })

  it("trailing slash in baseUrl is stripped", async () => {
    const c = new TempMailClient({
      apiKey: "tok",
      baseUrl: "https://mock.local/",
    })
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await c.check("hi@pyzit.com")
    const [url] = mockFetch.mock.calls[0]
    expect(url).not.toContain("//v1")
  })

  it("supports maxRetries option", async () => {
    const c = new TempMailClient({
      apiKey: "tok",
      maxRetries: 5,
    })
    expect(c).toBeDefined()
  })

  it("supports failOpen option", async () => {
    const c = new TempMailClient({
      apiKey: "tok",
      failOpen: true,
    })
    expect(c).toBeDefined()
  })

  it("throws error when apiKey is missing", async () => {
    expect(() => new TempMailClient({ apiKey: "" })).toThrow("apiKey is required")
  })
})