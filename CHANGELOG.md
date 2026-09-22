# Changelog

## 1.0.0 — stable release

### Features
- `TempMailClient` with `check()`, `detailed()`, `bulk()` methods
- Full TypeScript types for all responses including `DetailedDetails` interface
- Comprehensive error hierarchy:
  - `PyzitError` (base class)
  - `AuthenticationError` (HTTP 401)
  - `InsufficientScopeError` (HTTP 403)
  - `QuotaExceededError` (HTTP 402)
  - `BatchLimitExceededError` (HTTP 400)
  - `RateLimitError` (HTTP 429)
  - `ValidationError` (HTTP 400)
  - `APIError` (any other non-2xx)
  - `TimeoutError` (request timeout)
- Response model classes with helper methods:
  - `CheckResult` with `is_clean` getter
  - `DetailedResult` with `mx_hostnames()`, `a_ips()`, `has_mx` methods
  - `BulkResult` with `disposable_emails()`, `clean_emails()` methods
- Automatic retry logic with exponential backoff and jitter
- Configurable fail-open mode for production safety
- Flexible client configuration (apiKey, baseUrl, timeout, maxRetries, failOpen)
- Zero runtime dependencies — uses native `fetch`
- Dual ESM + CJS build via tsup
- Node 18+ support

### Improvements
- Enhanced error handling with specific error types for different failure modes
- Added retry logic for transient failures (5xx errors, timeouts, network issues)
- Implemented fail-open mode to prevent blocking users when API is unavailable
- Improved response models with helper methods and convenience getters
- Better type safety with strict TypeScript configuration
- Comprehensive test coverage with Vitest and HTTP mocking

### Documentation
- Complete API reference for all methods and response models
- Error handling guide with examples for each error type
- Framework integration examples (Next.js, Express, Cloudflare Workers, Bun, Nuxt, Remix, Hono)
- Advanced usage patterns (concurrent validation, rate limiting, batch processing, caching)
- Best practices for security, performance, and user experience

## 0.1.0 — initial release

- `TempMailClient` with `check()`, `detailed()`, `bulk()` methods
- Full TypeScript types for all responses including `MxRecord` objects
- `AuthenticationError`, `ScopeError`, `PlanRequiredError`, `RateLimitError`, `APIError`, `TimeoutError`
- Zero runtime dependencies — uses native `fetch`
- Dual ESM + CJS build via tsup
- Node 18+ support