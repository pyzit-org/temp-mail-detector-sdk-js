<div align="center">

```
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
```

**The official JavaScript/TypeScript SDK for the [Pyzit Disposable Email Detector API](https://temp-mail-detector.pyzit.com)**

Stop fake signups. Block throwaway addresses. Protect your platform.

[![NPM version](https://img.shields.io/npm/v/@pyzit/tempmail?color=1D9E75&labelColor=0f0f0f&style=flat-square)](https://www.npmjs.com/package/@pyzit/tempmail)
[![License](https://img.shields.io/npm/l/@pyzit/tempmail?color=1D9E75&labelColor=0f0f0f&style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/types-included-1D9E75?labelColor=0f0f0f&style=flat-square)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-1D9E75?labelColor=0f0f0f&style=flat-square)](https://vitest.dev/)
[![tsup](https://img.shields.io/badge/built%20with-tsup-1D9E75?labelColor=0f0f0f&style=flat-square)](https://tsup.egoist.dev/)

</div>

---

## ◈ What is this?

`@pyzit/tempmail` is the official Node.js/JavaScript client for the **Pyzit Disposable Email API** — a high-performance service that detects throwaway, temporary, and fake email addresses in real time.

```
User submits email          SDK validates it              Your app decides
─────────────────           ─────────────────             ───────────────
user@mailnator.com  ──────► is_disposable: true  ──────►  ✗  Reject signup
hi@yourcompany.com  ──────► is_disposable: false ──────►  ✓  Allow signup
```

Works with **Next.js**, **Express**, **Nuxt**, **Remix**, **Hono**, **Bun**, **Cloudflare Workers**, and any modern JS environment.

---

## ◈ Table of contents

- [Installation](#-installation)
- [Quick start](#-quick-start)
- [API tiers](#-api-tiers)
- [All methods](#-all-methods)
  - [check()](#checkresult--await-clientcheckemail)
  - [detailed()](#detailedresult--await-clientdetailedemail)
  - [bulk()](#bulkresult--await-clientbulkemails)
- [Response models](#-response-models)
- [Error handling](#-error-handling)
- [Framework integrations](#-framework-integrations)
- [Configuration](#-configuration)
- [Development](#-development)

---

## ◈ Installation

```bash
npm install @pyzit/tempmail
```

Or using your preferred package manager:

```bash
yarn add @pyzit/tempmail
pnpm add @pyzit/tempmail
bun add @pyzit/tempmail
```

**Requirements:** Node.js 18+ or any environment with `fetch` support.

---

## ◈ Quick start

```javascript
import { TempMailClient } from "@pyzit/tempmail";

const client = new TempMailClient("YOUR_API_TOKEN");

const result = await client.check("user@example.com");

if (result.is_disposable) {
  console.log("❌ Disposable email — rejected");
} else {
  console.log("✅ Looks clean — allowed");
}
```

Get your API token at [temp-mail-detector.pyzit.com](https://temp-mail-detector.pyzit.com).

> **Tip:** Store your token in an environment variable, never hard-code it.
> ```javascript
> const client = new TempMailClient(process.env.PYZIT_TOKEN);
> ```

The client also accepts an options object for advanced configuration:

```javascript
const client = new TempMailClient({
  apiKey: process.env.PYZIT_TOKEN,
  timeout: 10,      // 10 seconds
  maxRetries: 3,    // Retry up to 3 times
  failOpen: true,   // Don't block users if API is down
});
```

---

## ◈ API tiers

Three endpoints, three plan levels. Use only what you need.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENDPOINT OVERVIEW                           │
├──────────────────┬─────────────┬──────────────────────────────────┤
│  Method          │  Plan       │  What you get                    │
├──────────────────┼─────────────┼──────────────────────────────────┤
│  client.check()  │  Free       │  is_disposable + status          │
│  client.detailed()│  Pro       │  DNS, signals, risk score, reco  │
│  client.bulk()   │  Business   │  Up to 100 emails, one request   │
└──────────────────┴─────────────┴──────────────────────────────────┘
```

---

## ◈ All methods

### `CheckResult` ← `await client.check(email)`

The fastest check. One email in, one decision out. **Free tier.**

```javascript
const result = await client.check("user@mailnator.com");

result.email          // "user@mailnator.com"
result.is_disposable  // true
result.status         // "disposable"
result.is_clean       // false (convenience getter, opposite of is_disposable)
```

**Response shape:**

```typescript
class CheckResult {
  email: string;
  is_disposable: boolean;
  status: "clean" | "disposable";
  readonly is_clean: boolean; // getter
}
```

---

### `DetailedResult` ← `await client.detailed(email)`

Full forensic analysis. DNS records, SMTP probing, reputation scoring,
domain classification. **Pro tier.**

```javascript
const result = await client.detailed("suspicious@new-domain.io");

result.risk_level       // "high"
result.reputation_score // 0.0
result.classification   // "disposable"
result.is_trusted       // false

// DNS intelligence
result.has_mx           // false
result.mx_hostnames()   // []
result.a_ips()          // []

// Detailed DNS info
result.details.has_mx        // false
result.details.mx_records   // []
result.details.has_spf       // false
result.details.spf_record    // null
result.details.has_dmarc     // false
result.details.dmarc_record  // null
```

**Response shape:**

```typescript
class DetailedResult {
  email: string;
  domain: string;
  is_disposable: boolean;
  is_trusted: boolean;
  classification: "trusted" | "disposable" | "unknown";
  reputation_score: number;
  risk_level: "low" | "medium" | "high";
  is_valid_format: boolean;
  rule_applied: string | null;
  details: DetailedDetails;
  status: "clean" | "disposable";
  readonly is_clean: boolean;
  
  // Helper methods
  mx_hostnames(): string[];
  a_ips(): string[];
  get has_mx(): boolean;
}

interface DetailedDetails {
  has_mx: boolean;
  mx_records: string[];
  has_a: boolean;
  a_records: string[];
  has_spf: boolean;
  spf_record: string | null;
  has_dmarc: boolean;
  dmarc_record: string | null;
}
```

---

### `BulkResult` ← `await client.bulk(emails)`

Validate up to 100 emails in a single API call. **Business tier.**

```javascript
const result = await client.bulk([
  "hi@pyzit.com",
  "cyz@temp-mail.org",
  "user@mailnator.com",
]);

result.total              // 3
result.status             // "mixed"
result.disposable_count   // 2
result.flagged_domains    // ["temp-mail.org", "mailnator.com"]

result.disposable_emails() // ["cyz@temp-mail.org", "user@mailnator.com"]
result.clean_emails()      // ["hi@pyzit.com"]
```

**Response shape:**

```typescript
class BulkResult {
  total: number;
  status: "clean" | "disposable" | "mixed";
  disposable_count: number;
  flagged_domains: string[];
  results: CheckResult[];
  
  // Helper methods
  disposable_emails(): string[];
  clean_emails(): string[];
}
```

---

## ◈ Response models

The SDK uses classes for response models to provide helper methods and getters.

```typescript
import {
  CheckResult,
  DetailedResult,
  BulkResult
} from "@pyzit/tempmail";

// Also available: VERSION constant
import { VERSION } from "@pyzit/tempmail";
console.log(VERSION); // "1.0.0"
```

---

## ◈ Error handling

All SDK errors inherit from `PyzitError`, so you can catch everything
at one level or be specific.

```
PyzitError                    ← catch-all for any SDK error
├── AuthenticationError       ← HTTP 401 — bad or missing token
├── InsufficientScopeError    ← HTTP 403 — missing required scope
│   └── .requiredScope        ← string, e.g. "tmd:detailed"
├── QuotaExceededError        ← HTTP 402 — quota exhausted
│   └── .quotaType            ← "simple" or "detailed"
├── BatchLimitExceededError   ← HTTP 400 — batch size exceeded
│   └── .maxAllowed           ← number, maximum allowed for plan
├── RateLimitError            ← HTTP 429 — slow down
│   └── .retryAfter           ← number, seconds to wait
├── ValidationError           ← HTTP 400 — invalid request parameters
│   └── .fieldErrors          ← object with field-specific errors
├── APIError                  ← any other non-2xx response
│   ├── .statusCode           ← number
│   └── .responseBody         ← string, raw body for debugging
└── TimeoutError              ← request took too long
```

**Recommended pattern — catch specific errors:**

```javascript
import { 
  TempMailClient, 
  AuthenticationError, 
  InsufficientScopeError,
  QuotaExceededError,
  PyzitError 
} from "@pyzit/tempmail";

const client = new TempMailClient("YOUR_TOKEN");

try {
  const result = await client.check("user@example.com");
} catch (err) {
  if (err instanceof AuthenticationError) {
    console.error("Check your API token.");
  } else if (err instanceof InsufficientScopeError) {
    console.error(`Missing scope: ${err.requiredScope}`);
  } else if (err instanceof QuotaExceededError) {
    console.error(`Quota exceeded for: ${err.quotaType}`);
  } else if (err instanceof PyzitError) {
    console.error("SDK Error:", err.message);
  }
}
```

**Minimal pattern — fail open gracefully:**

```javascript
async function isAllowed(email) {
  try {
    const res = await client.check(email);
    return res.is_clean;
  } catch (err) {
    return true; // fail open — don't block users if API is down
  }
}
```

---

## ◈ Framework integrations

### Next.js (App Router)

```typescript
// app/api/register/route.ts
import { TempMailClient, PyzitError } from "@pyzit/tempmail";
import { NextResponse } from "next/server";

const client = new TempMailClient(process.env.PYZIT_TOKEN!);

export async function POST(req: Request) {
  const { email } = await req.json();
  try {
    const res = await client.check(email);
    if (!res.is_clean) {
      return NextResponse.json({ error: "Disposable emails blocked." }, { status: 422 });
    }
  } catch (err) {
    // fail open on API errors
    if (!(err instanceof PyzitError)) throw err;
  }
  return NextResponse.json({ ok: true });
}
```

---

### Express

```javascript
// middleware/validateEmail.js
import { TempMailClient } from "@pyzit/tempmail";

const client = new TempMailClient(process.env.PYZIT_TOKEN);

export async function validateEmail(req, res, next) {
  try {
    const result = await client.check(req.body.email);
    if (result.is_disposable) {
      return res.status(422).json({ error: "Temporary emails not allowed." });
    }
    next();
  } catch (err) {
    next(); // fail open
  }
}
```

---

### Cloudflare Workers

```javascript
import { TempMailClient } from "@pyzit/tempmail";

export default {
  async fetch(request, env) {
    const client = new TempMailClient(env.PYZIT_TOKEN);
    const { email } = await request.json();
    const result = await client.check(email);
    return Response.json({ is_disposable: result.is_disposable });
  }
};
```

---

## ◈ Configuration

`TempMailClient` accepts an options object:

```javascript
const client = new TempMailClient({
  apiKey: "YOUR_TOKEN",    // required
  timeout: 10,             // seconds, default 5
  baseUrl: "https://api.pyzit.com", // override for testing
  maxRetries: 2,           // default 2
  failOpen: false,         // default false
});
```

| Parameter  | Type     | Default                              | Description                        |
|------------|----------|--------------------------------------|------------------------------------|
| `apiKey`   | `string` | —                                    | Your Pyzit API token (required)    |
| `timeout`  | `number` | `5`                                  | Request timeout in seconds        |
| `baseUrl`  | `string` | `https://api.pyzit.com`             | Override for local testing / mocks |
| `maxRetries` | `number` | `2`                               | Max retry attempts for transient failures |
| `failOpen` | `boolean` | `false`                             | Return synthetic clean result on API errors |

---

## ◈ Advanced Features

### Automatic Retry Logic

The SDK automatically retries transient failures (5xx errors, timeouts, network issues) with exponential backoff and jitter:

```javascript
const client = new TempMailClient({
  apiKey: process.env.PYZIT_TOKEN,
  maxRetries: 3,  // Retry up to 3 times
});

// Retries happen automatically for:
// - 5xx server errors
// - Request timeouts
// - Network failures
// - Rate limit errors (respects Retry-After header)
```

### Fail-Open Mode

For production environments, enable fail-open mode to never block users when the API is unavailable:

```javascript
const client = new TempMailClient({
  apiKey: process.env.PYZIT_TOKEN,
  failOpen: true,  // Return synthetic clean result on errors
});

// On API errors, returns: { email: "...", is_disposable: false, status: "clean" }
```

**Recommended for**: Signup flows, high-availability systems, graceful degradation.

---

## ◈ Development

This project uses `tsup` for bundling and `vitest` for testing.

```bash
# install
npm install

# build (outputs to dist/)
npm run build

# run tests (all HTTP is mocked)
npm run test

# type check
npm run typecheck
```

---

## ◈ Changelog

See [CHANGELOG.md](CHANGELOG.md).

---

## ◈ License

[MIT](LICENSE) © [Pyzit](https://pyzit.com)

---

<div align="center">

```
Built with care by the Pyzit team · https://pyzit.com
```

</div>
