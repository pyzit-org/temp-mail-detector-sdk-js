// ─────────────────────────────────────────────────────────────────
// src/client.ts — TempMailClient
// ─────────────────────────────────────────────────────────────────

import { BASE_URL, DEFAULT_TIMEOUT, buildHeaders, raiseForStatus } from "./http.js"
import { TimeoutError } from "./errors.js"
import {
  CheckResult,
  DetailedResult,
  BulkResult,
} from "./types.js"
import type { TempMailClientOptions } from "./types.js"

export class TempMailClient {
  private readonly headers: Record<string, string>
  private readonly timeout: number
  private readonly baseUrl: string

  /**
   * Create a new TempMailClient.
   *
   * @param options - Your API token string, or a full options object.
   *
   * @example
   * // simple — just pass your token
   * const client = new TempMailClient("YOUR_API_TOKEN")
   *
   * @example
   * // with options
   * const client = new TempMailClient({
   *   apiToken: process.env.PYZIT_TOKEN!,
   *   timeout: 15_000,
   * })
   */
  constructor(options: TempMailClientOptions | string) {
    const opts: TempMailClientOptions =
      typeof options === "string" ? { apiToken: options } : options

    this.headers = buildHeaders(opts.apiToken)
    this.timeout = opts.timeout ?? DEFAULT_TIMEOUT
    this.baseUrl = (opts.baseUrl ?? BASE_URL).replace(/\/$/, "")
  }

  private async post(path: string, body: unknown): Promise<any> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const res = await fetch(this.baseUrl + path, {
        method:  "POST",
        headers: this.headers,
        body:    JSON.stringify(body),
        signal:  controller.signal,
      })
      return await raiseForStatus(res)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError()
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Quick disposable check — free tier.
   *
   * @param email - The email address to validate.
   * @returns CheckResult with is_disposable and status.
   *
   * @example
   * const result = await client.check("user@example.com")
   * if (result.is_disposable) {
   *   throw new Error("Disposable emails not allowed.")
   * }
   */
  async check(email: string): Promise<CheckResult> {
    const data = await this.post("/validate/check/", { email })
    return new CheckResult(data)
  }

  /**
   * Full DNS + reputation analysis — Pro tier.
   *
   * @param email - The email address to analyse.
   * @returns DetailedResult with risk_level, signals, dns_intelligence, stability.
   *
   * @throws {PlanRequiredError} if your token does not have Pro access.
   * @throws {ScopeError} if your token is missing the required scope.
   *
   * @example
   * const result = await client.detailed("user@example.com")
   * if (result.recommendation === "reject") {
   *   throw new Error("Email rejected.")
   * }
   */
  async detailed(email: string): Promise<DetailedResult> {
    const data = await this.post("/validate/detailed/", { email })
    return new DetailedResult(data)
  }

  /**
   * Validate many emails in one request — Business tier.
   *
   * @param emails - Array of email addresses (max 100 per request).
   * @returns BulkResult with a results map and processed count.
   *
   * @throws {PlanRequiredError} if your token does not have Business access.
   *
   * @example
   * const result = await client.bulk(["a@x.com", "b@y.com"])
   * const blocked = result.disposable_emails()
   */
  async bulk(emails: string[]): Promise<BulkResult> {
    const data = await this.post("/validate/bulk/", { emails })
    return new BulkResult(data)
  }
}