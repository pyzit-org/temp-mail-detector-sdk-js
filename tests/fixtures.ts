// ─────────────────────────────────────────────────────────────────
// tests/fixtures.ts — shared test data, reused across all test files
// ─────────────────────────────────────────────────────────────────

import type { CheckResult, DetailedResult, BulkResult } from "../src/types.js"

export const FAKE_TOKEN   = "test-token-xyz"
export const BASE_URL     = "https://api-tempmail.pyzit.com/v1"
export const CHECK_URL    = BASE_URL + "/validate/check/"
export const DETAILED_URL = BASE_URL + "/validate/detailed/"
export const BULK_URL     = BASE_URL + "/validate/bulk/"

// ── response payloads ─────────────────────────────────────────────

export const CLEAN_PAYLOAD: CheckResult = {
  email:         "hi@pyzit.com",
  is_disposable: false,
  status:        "clean",
}

export const DISPOSABLE_PAYLOAD: CheckResult = {
  email:         "user@mailnator.com",
  is_disposable: true,
  status:        "disposable",
}

export const DETAILED_PAYLOAD: DetailedResult = {
  email:            "x@new-domain.io",
  domain:           "new-domain.io",
  is_disposable:    true,
  status:           "disposable",
  reputation_score: 0.0,
  risk_level:       "high",
  recommendation:   "reject",
  details: {
    reputation: {
      reputation_score:      0.0,
      is_disposable:         true,
      disposable_confidence: 0.79,
      risk_level:            "high",
      recommendation:        "reject",
    },
    signals: {
      positive: [],
      negative: ["no_mx_records", "new_domain", "smtp_server_unreachable"],
      neutral:  ["limited_history", "smtp_rejected_probe"],
    },
    dns_intelligence: {
      has_mx:       false,
      mx_records:   [],
      has_a_record: false,
      has_spf:      false,
      has_dmarc:    false,
      error:        null,
    },
    stability: {
      stability_score: 0.2,
      domain_age_days: 0,
      is_new_domain:   true,
      risk_factors:    ["newly_observed_domain", "no_mx_records"],
    },
  },
}

export const DETAILED_WITH_MX: DetailedResult = {
  ...DETAILED_PAYLOAD,
  domain:           "pyzit.com",
  is_disposable:    false,
  status:           "clean",
  reputation_score: 0.9,
  risk_level:       "low",
  recommendation:   "accept",
  details: {
    ...DETAILED_PAYLOAD.details,
    dns_intelligence: {
      has_mx:       true,
      mx_records:   [
        { priority: 5,  exchange: "mail1.pyzit.com", ips: ["172.65.182.103"] },
        { priority: 10, exchange: "mail2.pyzit.com", ips: ["172.65.182.104"] },
      ],
      has_a_record: true,
      has_spf:      true,
      has_dmarc:    true,
      error:        null,
    },
  },
}

export const BULK_PAYLOAD: BulkResult = {
  results: {
    "hi@pyzit.com":       false,
    "x@mailnator.com":    true,
    "support@github.com": false,
    "fake@temp-mail.org": true,
  },
  processed: 4,
}

// ── helper — build a mock Response ───────────────────────────────

export function makeResponse(
  body:    unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

export function makeTextResponse(text: string, status: number): Response {
  return new Response(text, { status })
}