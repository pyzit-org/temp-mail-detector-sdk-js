// ─────────────────────────────────────────────────────────────────
// src/http.ts — shared fetch layer (private, not exported)
// ─────────────────────────────────────────────────────────────────

import {
  AuthenticationError,
  InsufficientScopeError,
  QuotaExceededError,
  BatchLimitExceededError,
  RateLimitError,
  ValidationError,
  APIError,
  PyzitError,
} from "./errors.js"

export const BASE_URL = "https://api.pyzit.com"
export const DEFAULT_TIMEOUT = 5.0 // 5 seconds

export function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  }
}

export async function raiseForStatus(res: Response): Promise<never> {
  // read body once — needed for error inspection
  const text = await res.text()
  let body: Record<string, unknown> = {}
  try { body = JSON.parse(text) } catch { /* not JSON, body stays {} */ }

  const detail = String(body["detail"] ?? "")
  const code = String(body["code"] ?? "")

  // 401 Unauthorized
  if (res.status === 401) {
    throw new AuthenticationError(detail || "Invalid or inactive API key.")
  }

  // 402 Payment Required (Quota Exceeded)
  if (res.status === 402 || code === "quota_exceeded" || detail.toLowerCase().includes("quota")) {
    const quotaType: "simple" | "detailed" = detail.toLowerCase().includes("detailed") ? "detailed" : "simple"
    throw new QuotaExceededError(detail || "Monthly quota exceeded.", quotaType)
  }

  // 403 Forbidden (Scope Missing)
  if (res.status === 403) {
    const requiredScope = detail.includes("tmd:detailed") ? "tmd:detailed" : "tmd:basic"
    throw new InsufficientScopeError(detail || "API key lacks required scope.", requiredScope)
  }

  // 400 Bad Request
  if (res.status === 400) {
    // Batch limit exceeded
    if (detail.includes("maximum of") && detail.includes("bulk request")) {
      const match = detail.match(/maximum of (\d+)/)
      const maxAllowed = match ? parseInt(match[1], 10) : 10
      throw new BatchLimitExceededError(detail, maxAllowed)
    }
    // Validation error
    throw new ValidationError(detail || "Validation error.", body)
  }

  // 429 Too Many Requests
  if (res.status === 429) {
    const retryHeader = res.headers.get("Retry-After")
    const retryAfter = retryHeader ? parseFloat(retryHeader) : 1.0
    throw new RateLimitError(detail || "Too many requests.", retryAfter)
  }

  // 5xx / Other
  throw new APIError(detail || `HTTP ${res.status}`, res.status, text)
}

/**
 * Calculate retry delay with exponential backoff and jitter
 * delay = 2^attempt + random(0.1, 0.4) seconds
 */
export function calculateRetryDelay(attempt: number): number {
  return Math.pow(2, attempt) + Math.random() * 0.3 + 0.1
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}