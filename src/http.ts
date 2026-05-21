// ─────────────────────────────────────────────────────────────────
// src/http.ts — shared fetch layer (private, not exported)
// ─────────────────────────────────────────────────────────────────

import {
  AuthenticationError,
  ScopeError,
  PlanRequiredError,
  RateLimitError,
  APIError,
} from "./errors.js"

export const BASE_URL       = "https://api-tempmail.pyzit.com/v1"
export const DEFAULT_TIMEOUT = 10_000 // 10 seconds

export function buildHeaders(apiToken: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type":  "application/json",
    "Accept":        "application/json",
  }
}

export async function raiseForStatus(res: Response): Promise<unknown> {
  if (res.ok) return res.json()

  // read body once — needed for error inspection
  const text = await res.text()
  let body: Record<string, unknown> = {}
  try { body = JSON.parse(text) } catch { /* not JSON, body stays {} */ }

  if (res.status === 401) {
    throw new AuthenticationError()
  }

  if (res.status === 403) {
    const detail = String(body["detail"] ?? "")

    // scope error: "Token missing required scope: detailed:tempemail_check"
    if (detail.toLowerCase().includes("scope")) {
      const scope = detail.includes("scope:")
        ? (detail.split("scope:").pop()?.trim() ?? "")
        : ""
      throw new ScopeError(scope)
    }

    // plan error on 403
    if (body["required_plan"] || detail.toLowerCase().includes("upgrade")) {
      throw new PlanRequiredError(String(body["required_plan"] ?? "pro"))
    }

    // fallback — bad/inactive token
    throw new AuthenticationError(
      "Access denied (403). Check your API token is valid and active."
    )
  }

  if (res.status === 402) {
    throw new PlanRequiredError(String(body["required_plan"] ?? "pro"))
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10)
    throw new RateLimitError(retryAfter)
  }

  throw new APIError(res.status, text)
}