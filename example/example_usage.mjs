/**
 * tempmail-pyzit JS SDK — real-world usage examples
 *
 * Run:
 *   node example_usage.mjs
 *
 * Requires PYZIT_TOKEN env var:
 *   export PYZIT_TOKEN="your_real_token"        # Mac/Linux
 *   $env:PYZIT_TOKEN="your_real_token"          # Windows PowerShell
 */

import {
  TempMailClient,
  AuthenticationError,
  ScopeError,
  PlanRequiredError,
  RateLimitError,
  APIError,
  TimeoutError,
  PyzitError,
} from "../dist/index.mjs"

// ── bootstrap ─────────────────────────────────────────────────────

const TOKEN = process.env.PYZIT_TOKEN
if (!TOKEN) {
  console.error("ERROR: set PYZIT_TOKEN environment variable first.")
  process.exit(1)
}

const client = new TempMailClient(TOKEN)
// full options example:
// const client = new TempMailClient({ apiToken: TOKEN, timeout: 15_000 })

const SEP  = "─".repeat(60)
const PASS = "✓"
const FAIL = "✗"
const INFO = "→"

const header = (t) => console.log(`\n${SEP}\n  ${t}\n${SEP}`)
const ok     = (m) => console.log(`  ${PASS}  ${m}`)
const fail   = (m) => console.log(`  ${FAIL}  ${m}`)
const info   = (m) => console.log(`  ${INFO}  ${m}`)


// ── 1. BASIC CHECK ────────────────────────────────────────────────

async function exampleCheck() {
  header("1. check() — free tier")

  const emails = [
    "hi@pyzit.com",
    "user@mailnator.com",
    "test@guerrillamail.com",
    "support@github.com",
    "fake@temp-mail.org",
  ]

  for (const email of emails) {
    const r   = await client.check(email)
    const tag = r.is_disposable ? "DISPOSABLE" : "CLEAN     "
    console.log(`  [${tag}]  ${email.padEnd(35)}  status=${r.status.toUpperCase()}`)
  }

  info("\nResult fields:")
  const r = await client.check("hi@pyzit.com")
  console.log(`    r.email         = "${r.email}"`)
  console.log(`    r.is_disposable = ${r.is_disposable}`)
  console.log(`    r.is_clean      = ${r.is_clean}`)
  console.log(`    r.status        = "${r.status}"`)
}


// ── 2. DETAILED ANALYSIS ──────────────────────────────────────────

async function exampleDetailed() {
  header("2. detailed() — Pro tier")

  const cases = [
    ["hi@pyzit.com",       "trusted domain"],
    ["user@mailnator.com", "known disposable"],
  ]

  for (const [email, label] of cases) {
    console.log(`\n  [${label}]  ${email}`)
    try {
      const r = await client.detailed(email)
      console.log(`    reputation_score : ${r.reputation_score.toFixed(2)}`)
      console.log(`    risk_level       : ${r.risk_level.toUpperCase()}`)
      console.log(`    recommendation   : ${r.recommendation.toUpperCase()}`)
      console.log(`    should_reject    : ${r.should_reject}`)
      console.log(`    domain           : ${r.domain}`)

      const dns = r.details.dns_intelligence
      console.log(`    dns.has_mx       : ${dns.has_mx}`)
      console.log(`    dns.has_spf      : ${dns.has_spf}`)
      console.log(`    dns.has_dmarc    : ${dns.has_dmarc}`)
      console.log(`    dns.mx_hostnames : ${dns.mx_hostnames().join(", ") || "(none)"}`)
      console.log(`    dns.mx_ips       : ${dns.mx_ips().join(", ") || "(none)"}`)

      if (dns.mx_records.length > 0) {
        console.log(`    dns.mx_records   :`)
        for (const mx of dns.mx_records) {
          console.log(`      priority=${mx.priority}  exchange=${mx.exchange}  ips=${mx.ips.join(", ")}`)
        }
      } else {
        console.log(`    dns.mx_records   : (none)`)
      }

      const sig = r.details.signals
      console.log(`    signals.positive : ${sig.positive.join(", ") || "(none)"}`)
      console.log(`    signals.negative : ${sig.negative.join(", ") || "(none)"}`)
      console.log(`    signals.neutral  : ${sig.neutral.join(", ")  || "(none)"}`)

      const stab = r.details.stability
      console.log(`    stability.score  : ${stab.stability_score.toFixed(2)}`)
      console.log(`    domain_age_days  : ${stab.domain_age_days}`)
      console.log(`    is_new_domain    : ${stab.is_new_domain}`)

    } catch (err) {
      if (err instanceof PlanRequiredError) fail(`Need '${err.requiredPlan}' plan for detailed()`)
      else if (err instanceof ScopeError)  fail(`Scope missing: ${err.requiredScope}`)
      else throw err
    }
  }
}


// ── 3. BULK ───────────────────────────────────────────────────────

async function exampleBulk() {
  header("3. bulk() — Business tier")

  const emails = [
    "hi@pyzit.com",
    "user@mailnator.com",
    "support@github.com",
    "test@guerrillamail.com",
    "hello@microsoft.com",
    "fake@temp-mail.org",
  ]

  info(`Sending ${emails.length} emails in one API call...`)

  try {
    const r = await client.bulk(emails)
    console.log(`\n  processed: ${r.processed}`)

    const disposable = r.disposable_emails()
    const clean      = r.clean_emails()

    console.log(`\n  Disposable (${disposable.length}):`)
    for (const e of disposable) console.log(`    ${FAIL}  ${e}`)

    console.log(`\n  Clean (${clean.length}):`)
    for (const e of clean) console.log(`    ${PASS}  ${e}`)

  } catch (err) {
    if (err instanceof PlanRequiredError) fail(`Need '${err.requiredPlan}' plan for bulk()`)
    else throw err
  }
}


// ── 4. CONCURRENT — Promise.allSettled ───────────────────────────

async function exampleConcurrent() {
  header("4. Concurrent checks — Promise.allSettled")

  const emails = [
    "hi@pyzit.com",
    "user@mailnator.com",
    "support@github.com",
    "fake@temp-mail.org",
  ]

  const start   = performance.now()
  const settled = await Promise.allSettled(emails.map(e => client.check(e)))
  const elapsed = (performance.now() - start).toFixed(0)

  for (let i = 0; i < emails.length; i++) {
    const s = settled[i]
    if (s.status === "fulfilled") {
      const tag = s.value.is_disposable ? "DISPOSABLE" : "CLEAN     "
      console.log(`  [${tag}]  ${emails[i]}`)
    } else {
      console.log(`  [ERROR    ]  ${emails[i]}  → ${s.reason?.constructor?.name}`)
    }
  }
  console.log(`\n  ${emails.length} checks in ${elapsed}ms (concurrent)`)
}


// ── 5. PRODUCTION SIGNUP GUARD ────────────────────────────────────

async function exampleSignupGuard() {
  header("5. Production signup guard — fail open")

  async function validateSignup(email) {
    try {
      const r = await client.check(email)
      return {
        email,
        allowed: !r.is_disposable,
        reason:  r.is_disposable ? "disposable_email" : null,
        status:  r.status,
        error:   null,
      }
    } catch (err) {
      // always fail open — never block a real user because the API is down
      const error =
        err instanceof AuthenticationError ? "auth_error"               :
        err instanceof ScopeError          ? `missing_scope:${err.requiredScope}` :
        err instanceof RateLimitError      ? `rate_limit:${err.retryAfter}s`      :
        err instanceof TimeoutError        ? "timeout"                  :
        err instanceof PyzitError          ? "sdk_error"                : "unknown"
      return { email, allowed: true, reason: null, status: "unknown", error }
    }
  }

  const emails = [
    "hi@pyzit.com",
    "user@mailnator.com",
    "support@github.com",
    "fake@temp-mail.org",
  ]

  console.log(`\n  ${"EMAIL".padEnd(35)} ${"ALLOWED".padEnd(10)} ${"REASON".padEnd(20)} STATUS`)
  console.log(`  ${"─".repeat(35)} ${"─".repeat(10)} ${"─".repeat(20)} ${"─".repeat(10)}`)

  for (const email of emails) {
    const r       = await validateSignup(email)
    const allowed = r.allowed ? `${PASS} yes` : `${FAIL} no `
    const reason  = r.reason ?? ""
    const errNote = r.error  ? `  [err: ${r.error}]` : ""
    console.log(`  ${email.padEnd(35)} ${allowed.padEnd(10)} ${reason.padEnd(20)} ${r.status}${errNote}`)
  }
}


// ── 6. ERROR HANDLING ─────────────────────────────────────────────

async function exampleErrorHandling() {
  header("6. Error handling — every exception path")

  info("Bad token → AuthenticationError:")
  try {
    await new TempMailClient("invalid-token").check("hi@pyzit.com")
    fail("Should have thrown!")
  } catch (err) {
    if (err instanceof AuthenticationError || err instanceof PyzitError) {
      ok(`${err.constructor.name} caught: "${err.message}"`)
    }
  }

  info("\nError attributes:")
  const errs = [
    new PlanRequiredError("business"),
    new ScopeError("detailed:tempemail_check"),
    new RateLimitError(42),
    new APIError(503, "Service Unavailable"),
  ]
  for (const err of errs) {
    ok(`${err.name.padEnd(22)}  ${JSON.stringify(
      err instanceof PlanRequiredError ? { requiredPlan: err.requiredPlan } :
      err instanceof ScopeError        ? { requiredScope: err.requiredScope } :
      err instanceof RateLimitError    ? { retryAfter: err.retryAfter } :
      err instanceof APIError          ? { statusCode: err.statusCode } : {}
    )}`)
  }

  info("\nisPyzitError check for all:")
  for (const err of errs) {
    ok(`${err.name.padEnd(22)}  instanceof PyzitError = ${err instanceof PyzitError}`)
  }
}


// ── 7. FRAMEWORK PATTERNS ─────────────────────────────────────────

function exampleFrameworkPatterns() {
  header("7. Framework patterns — copy-paste ready")
  console.log(`
  ── Next.js API route ────────────────────────────────────────
  // app/api/validate/route.ts
  import { TempMailClient, PyzitError } from "@pyzit/tempmail"
  import { NextResponse } from "next/server"
  const client = new TempMailClient(process.env.PYZIT_TOKEN!)
  export async function POST(req: Request) {
    const { email } = await req.json()
    try {
      const r = await client.check(email)
      if (!r.is_clean)
        return NextResponse.json({ error: "Disposable emails not allowed." }, { status: 422 })
      return NextResponse.json({ ok: true })
    } catch (err) {
      if (err instanceof PyzitError) return NextResponse.json({ ok: true }) // fail open    
      throw err
    }
  }

  ── Express middleware ────────────────────────────────────────
  // middleware/validateEmail.js
  import { TempMailClient } from "@pyzit/tempmail"
  const client = new TempMailClient(process.env.PYZIT_TOKEN)
  export async function validateEmail(req, res, next) {
    try {
      const r = await client.check(req.body.email)
      if (r.is_disposable) return res.status(422).json({ error: "Disposable emails blocked." })
      next()
    } catch { next() } // fail open
  }

  ── Cloudflare Worker ─────────────────────────────────────────
  // worker.js
  import { TempMailClient } from "@pyzit/tempmail"
  export default {
    async fetch(request, env) {
      const client = new TempMailClient(env.PYZIT_TOKEN)
      const { email } = await request.json()
      const r = await client.check(email)
      return Response.json({ is_disposable: r.is_disposable })
    }
  }
  `)
}


const BANNER = `
  ██████╗ ██╗   ██╗███████╗██╗████████╗
  ██╔══██╗╚██╗ ██╔╝╚══███╔╝██║╚══██╔══╝
  ██████╔╝ ╚████╔╝   ███╔╝ ██║   ██║   
  ██╔═══╝   ╚██╔╝   ███╔╝  ██║   ██║   
  ██║        ██║   ███████╗██║   ██║   
  ╚═╝        ╚═╝   ╚══════╝╚═╝   ╚═╝   

  ████████╗███████╗███╗   ███╗██████╗ ███╗   ███╗ █████╗ ██╗██╗
  ╚══██╔══╝██╔════╝████╗ ████║██╔══██╗████╗ ████║██╔══██╗██║██║
     ██║   █████╗  ██╔████╔██║██████╔╝██╔████╔██║███████║██║██║
     ██║   ██╔══╝  ██║╚██╔╝██║██╔═══╝ ██║╚██╔╝██║██╔══██║██║██║
     ██║   ███████╗██║ ╚═╝ ██║██║     ██║ ╚═╝ ██║██║  ██║██║███████╗
     ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝     ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝
`

// ── MAIN ──────────────────────────────────────────────────────────

async function main() {
  console.log("\x1b[32m" + BANNER + "\x1b[0m")
  console.log("  \x1b[1m@pyzit/tempmail\x1b[0m JS SDK — Official Usage Examples")
  console.log("  " + "═".repeat(60))

  await exampleCheck()
  await exampleDetailed()
  await exampleBulk()
  await exampleConcurrent()
  await exampleSignupGuard()
  await exampleErrorHandling()
  exampleFrameworkPatterns()

  console.log("\n" + "═".repeat(60))
  console.log("  All examples complete.")
  console.log("═".repeat(60) + "\n")
}

main().catch(err => {
  console.error("Unhandled error:", err)
  process.exit(1)
})