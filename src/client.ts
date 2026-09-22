// ─────────────────────────────────────────────────────────────────
// src/client.ts — TempMailClient
// ─────────────────────────────────────────────────────────────────

import { BASE_URL, DEFAULT_TIMEOUT, buildHeaders, raiseForStatus, calculateRetryDelay, sleep } from "./http.js"
import { TimeoutError, PyzitError, RateLimitError, APIError } from "./errors.js"
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
  private readonly maxRetries: number
  private readonly failOpen: boolean

  /**
   * Create a new TempMailClient.
   *
   * @param options - Your API token string, or a full options object.
   *
   * @example
   * // simple — just pass your token
   * const client = new TempMailClient("pyzit_live_YOUR_API_TOKEN")
   *
   * @example
   * // with options
   * const client = new TempMailClient({
   *   apiKey: process.env.PYZIT_TOKEN!,
   *   timeout: 10,
   *   maxRetries: 3,
   *   failOpen: true,
   * })
   */
  constructor(options: TempMailClientOptions | string) {
    const opts: TempMailClientOptions =
      typeof options === "string" ? { apiKey: options } : options

    if (!opts.apiKey || opts.apiKey.trim() === "") {
      throw new Error("apiKey is required")
    }

    this.headers = buildHeaders(opts.apiKey)
    this.timeout = (opts.timeout ?? DEFAULT_TIMEOUT) * 1000 // convert to ms
    this.baseUrl = (opts.baseUrl ?? BASE_URL).replace(/\/$/, "")
    this.maxRetries = opts.maxRetries ?? 2
    this.failOpen = opts.failOpen ?? false
  }

  private async post(path: string, body: unknown): Promise<any> {
    let attempts = 0

    while (attempts <= this.maxRetries) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeout)

      try {
        const res = await fetch(this.baseUrl + path, {
          method:  "POST",
          headers: this.headers,
          body:    JSON.stringify(body),
          signal:  controller.signal,
        })

        clearTimeout(timer)

        if (res.ok) {
          return await res.json()
        }

        // Handle error response immediately for non-retryable errors
        if (res.status === 429) {
          // Only retry if we haven't exceeded max retries
          if (attempts < this.maxRetries) {
            const retryHeader = res.headers.get("Retry-After")
            const retrySec = retryHeader ? parseFloat(retryHeader) : 1.0
            const delaySec = retrySec + Math.random() * 0.4 + 0.1
            await sleep(delaySec * 1000)
            attempts++
            continue
          }
          // Max retries exceeded, raise the error
          await raiseForStatus(res)
        }

        // Retry 5xx with exponential backoff
        if (res.status >= 500 && attempts < this.maxRetries) {
          const delaySec = calculateRetryDelay(attempts)
          await sleep(delaySec * 1000)
          attempts++
          continue
        }

        // For all other errors, handle immediately
        await raiseForStatus(res)

      } catch (err) {
        clearTimeout(timer)

        // Re-raise known SDK errors (these were already raised from raiseForStatus)
        if (err instanceof PyzitError) {
          // If fail-open is enabled and this is a 5xx error, return synthetic clean result
          if (this.failOpen && err instanceof APIError && err.statusCode >= 500) {
            const email = typeof body === 'object' && body !== null && 'email' in body ? (body as any).email : ""
            return { email: email || "", is_disposable: false, status: "clean" }
          }
          if (this.failOpen && err instanceof RateLimitError) {
            const email = typeof body === 'object' && body !== null && 'email' in body ? (body as any).email : ""
            return { email: email || "", is_disposable: false, status: "clean" }
          }
          throw err
        }

        // Timeout or network error
        if (err instanceof Error && err.name === "AbortError") {
          if (attempts < this.maxRetries) {
            const delaySec = calculateRetryDelay(attempts)
            await sleep(delaySec * 1000)
            attempts++
            continue
          }
          if (this.failOpen) {
            const email = typeof body === 'object' && body !== null && 'email' in body ? (body as any).email : ""
            return { email: email || "", is_disposable: false, status: "clean" }
          }
          throw new TimeoutError()
        }

        // Other network errors
        if (attempts < this.maxRetries) {
          const delaySec = calculateRetryDelay(attempts)
          await sleep(delaySec * 1000)
          attempts++
          continue
        }

        if (this.failOpen) {
          const email = typeof body === 'object' && body !== null && 'email' in body ? (body as any).email : ""
          return { email: email || "", is_disposable: false, status: "clean" }
        }

        throw new PyzitError(`Network error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    throw new PyzitError("Max retries exceeded.")
  }

  /**
   * Quick disposable check — uses simple quota.
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
    const data = await this.post("/v1/tmd/check/", { email })
    return new CheckResult(data)
  }

  /**
   * Full DNS + reputation analysis — uses detailed quota.
   *
   * @param email - The email address to analyse.
   * @returns DetailedResult with risk_level, classification, dns_intelligence.
   *
   * @throws {InsufficientScopeError} if your token is missing the tmd:detailed scope.
   * @throws {QuotaExceededError} if your monthly detailed quota is exhausted.
   *
   * @example
   * const result = await client.detailed("user@example.com")
   * if (result.is_disposable) {
   *   throw new Error("Email rejected.")
   * }
   */
  async detailed(email: string): Promise<DetailedResult> {
    const data = await this.post("/v1/tmd/detailed/", { email })
    return new DetailedResult(data)
  }

  /**
   * Validate many emails in one request — uses simple quota.
   *
   * @param emails - Array of email addresses (up to plan batch limit: 10, 50, or 100).
   * @returns BulkResult with total, status, disposable_count, flagged_domains, and results.
   *
   * @throws {BatchLimitExceededError} if the email list exceeds your plan's batch limit.
   * @throws {QuotaExceededError} if your monthly simple quota is exhausted.
   *
   * @example
   * const result = await client.bulk(["a@x.com", "b@y.com"])
   * const blocked = result.disposable_emails()
   */
  async bulk(emails: string[]): Promise<BulkResult> {
    const data = await this.post("/v1/tmd/bulk/", { emails })
    return new BulkResult(data)
  }
}