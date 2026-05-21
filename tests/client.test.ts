// ─────────────────────────────────────────────────────────────────
// tests/client.test.ts — check(), error handling, client config
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  TempMailClient,
  AuthenticationError,
  ScopeError,
  PlanRequiredError,
  RateLimitError,
  APIError,
  TimeoutError,
} from "../src/index.js"
import {
  FAKE_TOKEN,
  CHECK_URL,
  CLEAN_PAYLOAD,
  DISPOSABLE_PAYLOAD,
  makeResponse,
  makeTextResponse,
} from "./fixtures.js"

// ── mock global fetch — zero real HTTP calls ──────────────────────
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)
beforeEach(() => mockFetch.mockReset())

const client = new TempMailClient(FAKE_TOKEN)

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

  it("HTTP 403 with scope detail → ScopeError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "Token missing required scope: check:tempemail_check" }, 403
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(ScopeError)
    expect(err.requiredScope).toBe("check:tempemail_check")
  })

  it("HTTP 403 with required_plan → PlanRequiredError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { required_plan: "pro" }, 403
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(PlanRequiredError)
    expect(err.requiredPlan).toBe("pro")
  })

  it("HTTP 403 with no body → AuthenticationError fallback", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 403))
    await expect(client.check("x@y.com")).rejects.toThrow(AuthenticationError)
  })

  it("HTTP 402 → PlanRequiredError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { required_plan: "pro" }, 402
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(PlanRequiredError)
    expect(err.requiredPlan).toBe("pro")
  })

  it("HTTP 429 → RateLimitError with retryAfter from header", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      {}, 429, { "Retry-After": "45" }
    ))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err.retryAfter).toBe(45)
  })

  it("HTTP 429 with no Retry-After → RateLimitError defaults to 60", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({}, 429))
    const err = await client.check("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err.retryAfter).toBe(60)
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
      makeResponse({ detail: "Token missing required scope: x" }, 403),
      makeResponse({ required_plan: "pro" }, 402),
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

  it("accepts options object with apiToken", async () => {
    const c = new TempMailClient({ apiToken: "opt-token", timeout: 5_000 })
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await c.check("hi@pyzit.com")
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers["Authorization"]).toBe("Bearer opt-token")
  })

  it("baseUrl override is used in request URL", async () => {
    const c = new TempMailClient({
      apiToken: "tok",
      baseUrl: "https://mock.local/v1",
    })
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await c.check("hi@pyzit.com")
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain("mock.local")
    expect(url).toContain("/validate/check/")
  })

  it("trailing slash in baseUrl is stripped", async () => {
    const c = new TempMailClient({
      apiToken: "tok",
      baseUrl: "https://mock.local/v1/",
    })
    mockFetch.mockResolvedValueOnce(makeResponse(CLEAN_PAYLOAD))
    await c.check("hi@pyzit.com")
    const [url] = mockFetch.mock.calls[0]
    expect(url).not.toContain("//validate")
  })
})