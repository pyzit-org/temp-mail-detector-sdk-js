# Changelog

## 0.1.0 — initial release

- `TempMailClient` with `check()`, `detailed()`, `bulk()` methods
- Full TypeScript types for all responses including `MxRecord` objects
- `AuthenticationError`, `ScopeError`, `PlanRequiredError`, `RateLimitError`, `APIError`, `TimeoutError`
- Zero runtime dependencies — uses native `fetch`
- Dual ESM + CJS build via tsup
- Node 18+ support