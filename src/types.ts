// ── /v1/validate/check/ ─────────────────────────────────────

export class CheckResult {
  email: string;
  is_disposable: boolean;
  status: "clean" | "disposable";

  constructor(data: any) {
    this.email = data.email;
    this.is_disposable = data.is_disposable;
    this.status = data.status;
  }

  /** Shorthand: True when the email is NOT disposable. */
  get is_clean(): boolean {
    return !this.is_disposable;
  }
}

// ── /v1/validate/detailed/ ───────────────────────────────────

export interface MxRecord {
  priority: number;
  exchange: string;
  ips: string[];
}

export class DnsIntelligence {
  has_mx: boolean;
  mx_records: MxRecord[];
  has_a_record: boolean;
  has_spf: boolean;
  has_dmarc: boolean;
  error: string | null;

  constructor(data: any) {
    this.has_mx = data.has_mx;
    this.mx_records = (data.mx_records || []).map((r: any) => ({
      priority: r.priority,
      exchange: r.exchange,
      ips: r.ips || [],
    }));
    this.has_a_record = data.has_a_record;
    this.has_spf = data.has_spf;
    this.has_dmarc = data.has_dmarc;
    this.error = data.error;
  }

  /** Return just the exchange hostnames, e.g. ['mail.example.com'] */
  mx_hostnames(): string[] {
    return this.mx_records.map((r) => r.exchange);
  }

  /** Return all resolved IPs across all MX records. */
  mx_ips(): string[] {
    return this.mx_records.flatMap((r) => r.ips);
  }
}

export interface Signals {
  positive: string[];
  negative: string[];
  neutral: string[];
}

export interface ReputationDetail {
  reputation_score: number;
  is_disposable: boolean;
  disposable_confidence: number;
  risk_level: string;
  recommendation: string;
}

export interface StabilityInfo {
  stability_score: number;
  domain_age_days: number;
  is_new_domain: boolean;
  risk_factors: string[];
}

export class DetailedDetails {
  reputation: ReputationDetail;
  signals: Signals;
  dns_intelligence: DnsIntelligence;
  stability: StabilityInfo;

  constructor(data: any) {
    this.reputation = data.reputation || {
      reputation_score: 0,
      is_disposable: false,
      disposable_confidence: 0,
      risk_level: "unknown",
      recommendation: "unknown",
    };
    this.signals = data.signals || {
      positive: [],
      negative: [],
      neutral: [],
    };
    this.dns_intelligence = new DnsIntelligence(data.dns_intelligence || {});
    this.stability = data.stability || {
      stability_score: 0,
      domain_age_days: 0,
      is_new_domain: false,
      risk_factors: [],
    };
  }
}

export class DetailedResult {
  email: string;
  domain: string;
  is_disposable: boolean;
  status: string;
  reputation_score: number;
  risk_level: string;
  recommendation: string;
  details: DetailedDetails;

  constructor(data: any) {
    this.email = data.email;
    this.domain = data.domain;
    this.is_disposable = data.is_disposable;
    this.status = data.status;
    this.reputation_score = data.reputation_score;
    this.risk_level = data.risk_level;
    this.recommendation = data.recommendation;
    this.details = new DetailedDetails(data.details || {});
  }

  /** True when the API recommends rejecting this email. */
  get should_reject(): boolean {
    return this.recommendation === "reject";
  }
}

// ── /v1/validate/bulk/ ───────────────────────────────────────

export class BulkResult {
  results: Record<string, boolean>; // { "email": isDisposable }
  processed: number;

  constructor(data: any) {
    this.results = data.results || {};
    this.processed = data.processed || 0;
  }

  /** Return only the emails that ARE disposable. */
  disposable_emails(): string[] {
    return Object.entries(this.results)
      .filter(([, isDisp]) => isDisp)
      .map(([email]) => email);
  }

  /** Return only the emails that are NOT disposable. */
  clean_emails(): string[] {
    return Object.entries(this.results)
      .filter(([, isDisp]) => !isDisp)
      .map(([email]) => email);
  }
}

// ── client options ───────────────────────────────────────────

export interface TempMailClientOptions {
  apiToken: string;
  timeout?: number; // ms, default 10000
  baseUrl?: string; // override for testing
}
