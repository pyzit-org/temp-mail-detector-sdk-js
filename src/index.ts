/**
 *  ██████╗ ██╗   ██╗███████╗██╗████████╗
 *  ██╔══██╗╚██╗ ██╔╝╚══███╔╝██║╚══██╔══╝
 *  ██████╔╝ ╚████╔╝   ███╔╝ ██║   ██║   
 *  ██╔═══╝   ╚██╔╝   ███╔╝  ██║   ██║   
 *  ██║        ██║   ███████╗██║   ██║   
 *  ╚═╝        ╚═╝   ╚══════╝╚═╝   ╚═╝   
 *                                       
 *  ████████╗███████╗███╗   ███╗██████╗ ███╗   ███╗ █████╗ ██╗██╗
 *  ╚══██╔══╝██╔════╝████╗ ████║██╔══██╗████╗ ████║██╔══██╗██║██║
 *     ██║   █████╗  ██╔████╔██║██████╔╝██╔████╔██║███████║██║██║
 *     ██║   ██╔══╝  ██║╚██╔╝██║██╔═══╝ ██║╚██╔╝██║██╔══██║██║██║
 *     ██║   ███████╗██║ ╚═╝ ██║██║     ██║ ╚═╝ ██║██║  ██║██║███████╗
 *     ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝     ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚══════╝
 * 
 *  ─────────────────────────────────────────────────────────────────────────────
 *  @pyzit/tempmail — Official JS/TS SDK
 *  Stop fake signups. Block throwaway addresses. Protect your platform.
 *  ─────────────────────────────────────────────────────────────────────────────
 */

/**
 *  Core Client
 */
export { TempMailClient } from "./client.js"

/**
 *  Error Handling
 */
export {
  PyzitError,
  AuthenticationError,
  InsufficientScopeError,
  QuotaExceededError,
  BatchLimitExceededError,
  RateLimitError,
  ValidationError,
  APIError,
  TimeoutError,
} from "./errors.js"

/**
 *  Response Models & Types
 */
export {
  CheckResult,
  DetailedResult,
  BulkResult,
} from "./types.js"

export type {
  TempMailClientOptions,
  DetailedDetails,
} from "./types.js"

/**
 *  Metadata
 */
export const VERSION = "1.0.0"