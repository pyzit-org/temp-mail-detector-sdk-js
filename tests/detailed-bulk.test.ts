// ─────────────────────────────────────────────────────────────────
// tests/detailed-bulk.test.ts — detailed() and bulk() full coverage
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  TempMailClient,
  InsufficientScopeError,
  QuotaExceededError,
  BatchLimitExceededError,
  RateLimitError,
  APIError,
  TimeoutError,
} from "../src/index.js"
import {
  FAKE_TOKEN,
  DETAILED_URL,
  BULK_URL,
  DETAILED_PAYLOAD,
  DETAILED_WITH_MX,
  BULK_PAYLOAD,
  makeResponse,
  makeTextResponse,
} from "./fixtures.js"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)
beforeEach(() => mockFetch.mockReset())

const client = new TempMailClient({ apiKey: FAKE_TOKEN, maxRetries: 0 })

// ── detailed() happy paths ────────────────────────────────────────

describe("detailed() — happy paths", () => {
  it("returns full DetailedResult", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_PAYLOAD))
    const r = await client.detailed("x@new-domain.io")
    expect(r.email).toBe("x@new-domain.io")
    expect(r.domain).toBe("new-domain.io")
    expect(r.is_disposable).toBe(true)
    expect(r.risk_level).toBe("high")
    expect(r.reputation_score).toBe(0)
  })

  it("POSTs to correct URL with email in body", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_PAYLOAD))
    await client.detailed("x@new-domain.io")
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(DETAILED_URL)
    expect(JSON.parse(opts.body)).toEqual({ email: "x@new-domain.io" })
  })

  it("parses dns_intelligence — no MX records", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_PAYLOAD))
    const r = await client.detailed("x@new-domain.io")
    expect(r.has_mx).toBe(false)
    expect(r.mx_hostnames()).toHaveLength(0)
    expect(r.details.has_spf).toBe(false)
    expect(r.details.has_dmarc).toBe(false)
  })

  it("parses mx_records as string array", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_WITH_MX))
    const r = await client.detailed("hi@pyzit.com")
    expect(r.has_mx).toBe(true)
    expect(r.mx_hostnames()).toHaveLength(2)
    expect(r.mx_hostnames()).toContain("mail1.pyzit.com")
    expect(r.mx_hostnames()).toContain("mail2.pyzit.com")
  })

  it("parses classification fields", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_PAYLOAD))
    const r = await client.detailed("x@new-domain.io")
    expect(r.classification).toBe("disposable")
    expect(r.is_trusted).toBe(false)
    expect(r.is_valid_format).toBe(true)
  })

  it("parses trusted domain with classification", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_WITH_MX))
    const r = await client.detailed("hi@pyzit.com")
    expect(r.classification).toBe("trusted")
    expect(r.is_trusted).toBe(true)
    expect(r.rule_applied).toBe("custom_whitelist")
  })

  it("parses detailed DNS fields", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_WITH_MX))
    const r = await client.detailed("hi@pyzit.com")
    expect(r.details.has_a).toBe(true)
    expect(r.details.a_records).toContain("172.65.182.103")
    expect(r.details.spf_record).toBe("v=spf1 include:custom-whitelist ~all")
    expect(r.details.dmarc_record).toBe("v=DMARC1; p=none")
  })
})

// ── detailed() error handling ─────────────────────────────────────

describe("detailed() — error handling", () => {
  it("HTTP 402 → QuotaExceededError with detailed quota", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "You have exceeded your monthly detailed check quota. Please upgrade your plan.", code: "quota_exceeded" }, 402
    ))
    const err = await client.detailed("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(QuotaExceededError)
    expect(err.quotaType).toBe("detailed")
  })

  it("HTTP 403 scope → InsufficientScopeError with tmd:detailed", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "API key lacks required scope: 'tmd:detailed'." }, 403
    ))
    const err = await client.detailed("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(InsufficientScopeError)
    expect(err.requiredScope).toBe("tmd:detailed")
  })

  it("HTTP 429 → RateLimitError", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({}, 429, { "Retry-After": "30" })
    )
    const err = await client.detailed("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err.retryAfter).toBe(30)
  })

  it("HTTP 500 → APIError", async () => {
    mockFetch.mockResolvedValueOnce(makeTextResponse("server error", 500))
    const err = await client.detailed("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect(err.statusCode).toBe(500)
  })

  it("AbortError → TimeoutError", async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error("aborted"), { name: "AbortError" })
    )
    await expect(client.detailed("x@y.com")).rejects.toThrow(TimeoutError)
  })
})

// ── bulk() happy paths ────────────────────────────────────────────

describe("bulk() — happy paths", () => {
  it("returns BulkResult with new structure", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(BULK_PAYLOAD))
    const r = await client.bulk(["hi@pyzit.com", "x@mailnator.com"])
    expect(r.total).toBe(4)
    expect(r.status).toBe("mixed")
    expect(r.disposable_count).toBe(2)
    expect(r.flagged_domains).toContain("mailnator.com")
    expect(r.flagged_domains).toContain("temp-mail.org")
  })

  it("POSTs to correct URL with emails array in body", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(BULK_PAYLOAD))
    const emails = ["hi@pyzit.com", "x@mailnator.com"]
    await client.bulk(emails)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe(BULK_URL)
    expect(JSON.parse(opts.body)).toEqual({ emails })
  })

  it("can extract disposable emails from results", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(BULK_PAYLOAD))
    const r = await client.bulk(["hi@pyzit.com", "x@mailnator.com"])
    const disposable = r.disposable_emails()
    expect(disposable).toContain("x@mailnator.com")
    expect(disposable).toContain("fake@temp-mail.org")
    expect(disposable).not.toContain("hi@pyzit.com")
  })

  it("can extract clean emails from results", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(BULK_PAYLOAD))
    const r = await client.bulk(["hi@pyzit.com", "x@mailnator.com"])
    const clean = r.clean_emails()
    expect(clean).toContain("hi@pyzit.com")
    expect(clean).toContain("support@github.com")
    expect(clean).not.toContain("x@mailnator.com")
  })

  it("handles empty results gracefully", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ total: 0, status: "clean", disposable_count: 0, flagged_domains: [], results: [] })
    )
    const r = await client.bulk([])
    expect(r.total).toBe(0)
    expect(r.results).toHaveLength(0)
  })

  it("results array contains CheckResult objects", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(BULK_PAYLOAD))
    const r = await client.bulk(["hi@pyzit.com", "x@mailnator.com"])
    expect(r.results[0]).toBeInstanceOf(Object)
    expect(r.results[0].email).toBe("hi@pyzit.com")
    expect(r.results[0].is_disposable).toBe(false)
  })
})

// ── bulk() error handling ─────────────────────────────────────────

describe("bulk() — error handling", () => {
  it("HTTP 402 → QuotaExceededError with simple quota", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ detail: "You have exceeded your monthly simple check quota. Please upgrade your plan.", code: "quota_exceeded" }, 402)
    )
    const err = await client.bulk(["x@y.com"]).catch(e => e)
    expect(err).toBeInstanceOf(QuotaExceededError)
    expect(err.quotaType).toBe("simple")
  })

  it("HTTP 403 scope → InsufficientScopeError with tmd:basic", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "API key lacks required scope: 'tmd:basic'." }, 403
    ))
    const err = await client.bulk(["x@y.com"]).catch(e => e)
    expect(err).toBeInstanceOf(InsufficientScopeError)
    expect(err.requiredScope).toBe("tmd:basic")
  })

  it("HTTP 400 batch limit → BatchLimitExceededError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "Your plan allows a maximum of 10 emails per bulk request. Upgrade your plan for higher limits." }, 400
    ))
    const err = await client.bulk(["x@y.com"]).catch(e => e)
    expect(err).toBeInstanceOf(BatchLimitExceededError)
    expect(err.maxAllowed).toBe(10)
  })

  it("HTTP 429 → RateLimitError", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({}, 429, { "Retry-After": "60" })
    )
    const err = await client.bulk(["x@y.com"]).catch(e => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err.retryAfter).toBe(60)
  })

  it("HTTP 500 → APIError", async () => {
    mockFetch.mockResolvedValueOnce(makeTextResponse("server error", 500))
    const err = await client.bulk(["x@y.com"]).catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect(err.statusCode).toBe(500)
  })

  it("AbortError → TimeoutError", async () => {
    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error("aborted"), { name: "AbortError" })
    )
    await expect(client.bulk(["x@y.com"])).rejects.toThrow(TimeoutError)
  })
})