// ─────────────────────────────────────────────────────────────────
// tests/detailed-bulk.test.ts — detailed() and bulk() full coverage
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  TempMailClient,
  PlanRequiredError,
  ScopeError,
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

const client = new TempMailClient(FAKE_TOKEN)

// ── detailed() happy paths ────────────────────────────────────────

describe("detailed() — happy paths", () => {
  it("returns full DetailedResult", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_PAYLOAD))
    const r = await client.detailed("x@new-domain.io")
    expect(r.email).toBe("x@new-domain.io")
    expect(r.domain).toBe("new-domain.io")
    expect(r.is_disposable).toBe(true)
    expect(r.risk_level).toBe("high")
    expect(r.recommendation).toBe("reject")
    expect(r.reputation_score).toBe(0.0)
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
    const dns = r.details.dns_intelligence
    expect(dns.has_mx).toBe(false)
    expect(dns.mx_records).toHaveLength(0)
    expect(dns.has_spf).toBe(false)
    expect(dns.has_dmarc).toBe(false)
    expect(dns.error).toBeNull()
  })

  it("parses mx_records as objects with priority, exchange, ips", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_WITH_MX))
    const r = await client.detailed("hi@pyzit.com")
    const dns = r.details.dns_intelligence
    expect(dns.has_mx).toBe(true)
    expect(dns.mx_records).toHaveLength(2)

    const [first, second] = dns.mx_records
    expect(first.priority).toBe(5)
    expect(first.exchange).toBe("mail1.pyzit.com")
    expect(first.ips).toContain("172.65.182.103")

    expect(second.priority).toBe(10)
    expect(second.exchange).toBe("mail2.pyzit.com")
    expect(second.ips).toContain("172.65.182.104")
  })

  it("parses signals — negative signals present", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_PAYLOAD))
    const r = await client.detailed("x@new-domain.io")
    const sig = r.details.signals
    expect(sig.negative).toContain("no_mx_records")
    expect(sig.negative).toContain("new_domain")
    expect(sig.positive).toHaveLength(0)
    expect(sig.neutral).toContain("limited_history")
  })

  it("parses stability fields", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_PAYLOAD))
    const r = await client.detailed("x@new-domain.io")
    const stab = r.details.stability
    expect(stab.is_new_domain).toBe(true)
    expect(stab.domain_age_days).toBe(0)
    expect(stab.stability_score).toBe(0.2)
    expect(stab.risk_factors).toContain("newly_observed_domain")
    expect(stab.risk_factors).toContain("no_mx_records")
  })

  it("parses reputation detail fields", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(DETAILED_PAYLOAD))
    const r = await client.detailed("x@new-domain.io")
    const rep = r.details.reputation
    expect(rep.reputation_score).toBe(0.0)
    expect(rep.disposable_confidence).toBe(0.79)
    expect(rep.is_disposable).toBe(true)
    expect(rep.risk_level).toBe("high")
    expect(rep.recommendation).toBe("reject")
  })
})

// ── detailed() error handling ─────────────────────────────────────

describe("detailed() — error handling", () => {
  it("HTTP 402 → PlanRequiredError with requiredPlan=pro", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ required_plan: "pro" }, 402))
    const err = await client.detailed("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(PlanRequiredError)
    expect(err.requiredPlan).toBe("pro")
  })

  it("HTTP 403 scope → ScopeError with requiredScope", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "Token missing required scope: detailed:tempemail_check" }, 403
    ))
    const err = await client.detailed("x@y.com").catch(e => e)
    expect(err).toBeInstanceOf(ScopeError)
    expect(err.requiredScope).toBe("detailed:tempemail_check")
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
  it("returns BulkResult with results map", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(BULK_PAYLOAD))
    const r = await client.bulk(["hi@pyzit.com", "x@mailnator.com"])
    expect(r.processed).toBe(4)
    expect(r.results["hi@pyzit.com"]).toBe(false)
    expect(r.results["x@mailnator.com"]).toBe(true)
    expect(r.results["fake@temp-mail.org"]).toBe(true)
    expect(r.results["support@github.com"]).toBe(false)
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
    const disposable = Object.entries(r.results)
      .filter(([, isDisp]) => isDisp)
      .map(([email]) => email)
    expect(disposable).toContain("x@mailnator.com")
    expect(disposable).toContain("fake@temp-mail.org")
    expect(disposable).not.toContain("hi@pyzit.com")
  })

  it("can extract clean emails from results", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(BULK_PAYLOAD))
    const r = await client.bulk(["hi@pyzit.com", "x@mailnator.com"])
    const clean = Object.entries(r.results)
      .filter(([, isDisp]) => !isDisp)
      .map(([email]) => email)
    expect(clean).toContain("hi@pyzit.com")
    expect(clean).toContain("support@github.com")
    expect(clean).not.toContain("x@mailnator.com")
  })

  it("handles empty results map gracefully", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ results: {}, processed: 0 })
    )
    const r = await client.bulk([])
    expect(r.processed).toBe(0)
    expect(Object.keys(r.results)).toHaveLength(0)
  })
})

// ── bulk() error handling ─────────────────────────────────────────

describe("bulk() — error handling", () => {
  it("HTTP 402 → PlanRequiredError with requiredPlan=business", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ required_plan: "business" }, 402)
    )
    const err = await client.bulk(["x@y.com"]).catch(e => e)
    expect(err).toBeInstanceOf(PlanRequiredError)
    expect(err.requiredPlan).toBe("business")
  })

  it("HTTP 403 scope → ScopeError", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(
      { detail: "Token missing required scope: bulk:validate" }, 403
    ))
    const err = await client.bulk(["x@y.com"]).catch(e => e)
    expect(err).toBeInstanceOf(ScopeError)
    expect(err.requiredScope).toBe("bulk:validate")
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