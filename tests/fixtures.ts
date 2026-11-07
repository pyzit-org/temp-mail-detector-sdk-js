// ─────────────────────────────────────────────────────────────────
// tests/fixtures.ts — shared test data, reused across all test files
// ─────────────────────────────────────────────────────────────────

import type { CheckResult, DetailedResult, BulkResult } from "../src/types.js"

export const FAKE_TOKEN   = "pyzit_live_test-token-xyz"
export const BASE_URL     = "https://api.pyzit.com"
export const CHECK_URL    = BASE_URL + "/v1/tmd/check/"
export const DETAILED_URL = BASE_URL + "/v1/tmd/detailed/"
export const BULK_URL     = BASE_URL + "/v1/tmd/bulk/"

// ── response payloads ─────────────────────────────────────────────

export const CLEAN_PAYLOAD = {
  email:            "hi@pyzit.com",
  is_disposable:    false,
  is_privacy_relay: false,
  status:           "clean" as const,
}

export const DISPOSABLE_PAYLOAD = {
  email:            "user@mailnator.com",
  is_disposable:    true,
  is_privacy_relay: false,
  status:           "disposable" as const,
}

export const PRIVACY_RELAY_PAYLOAD = {
  email:            "user@privaterelay.appleid.com",
  is_disposable:    false,
  is_privacy_relay: true,
  status:           "privacy_relay" as const,
  relay_provider:   "apple",
  provider_name:    "Apple Private Relay",
}

export const DETAILED_PAYLOAD = {
  email:            "x@new-domain.io",
  domain:           "new-domain.io",
  is_disposable:    true,
  is_trusted:       false,
  is_privacy_relay: false,
  classification:  "disposable" as const,
  reputation_score: 0,
  risk_level:       "high" as const,
  is_valid_format:  true,
  cached:           false,
  rule_applied:     null,
  details: {
    has_mx:       false,
    mx_records:   [],
    has_a:        false,
    a_records:    [],
    has_spf:      false,
    spf_record:   null,
    has_dmarc:    false,
    dmarc_record: null,
  },
  status: "disposable" as const,
}

export const DETAILED_WITH_MX = {
  ...DETAILED_PAYLOAD,
  domain:           "pyzit.com",
  is_disposable:    false,
  is_trusted:       true,
  is_privacy_relay: false,
  classification:  "trusted" as const,
  reputation_score: 100,
  risk_level:       "low" as const,
  rule_applied:     "custom_whitelist",
  details: {
    has_mx:       true,
    mx_records:   ["mail1.pyzit.com", "mail2.pyzit.com"],
    has_a:        true,
    a_records:    ["172.65.182.103", "172.65.182.104"],
    has_spf:      true,
    spf_record:   "v=spf1 include:custom-whitelist ~all",
    has_dmarc:    true,
    dmarc_record: "v=DMARC1; p=none",
  },
  status: "clean" as const,
}

export const BULK_PAYLOAD = {
  total: 4,
  status: "mixed" as const,
  disposable_count: 2,
  privacy_relay_count: 0,
  flagged_domains: ["mailnator.com", "temp-mail.org"],
  results: [
    { email: "hi@pyzit.com", is_disposable: false, status: "clean" as const },
    { email: "x@mailnator.com", is_disposable: true, status: "disposable" as const },
    { email: "support@github.com", is_disposable: false, status: "clean" as const },
    { email: "fake@temp-mail.org", is_disposable: true, status: "disposable" as const },
  ],
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