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
  ScopeError,
  PlanRequiredError,
  RateLimitError,
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
  DnsIntelligence,
  DetailedDetails,
} from "./types.js"

export type {
  TempMailClientOptions,
  MxRecord,
  Signals,
  ReputationDetail,
  StabilityInfo,
} from "./types.js"

/**
 *  Metadata
 */
export const VERSION = "0.1.0"