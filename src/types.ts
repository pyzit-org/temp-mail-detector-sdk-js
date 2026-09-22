// ── /v1/tmd/check/ ─────────────────────────────────────

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

// ── /v1/tmd/detailed/ ───────────────────────────────────

export interface DetailedDetails {
  has_mx: boolean;
  mx_records: string[];
  has_a: boolean;
  a_records: string[];
  has_spf: boolean;
  spf_record: string | null;
  has_dmarc: boolean;
  dmarc_record: string | null;
}

export class DetailedResult {
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

  constructor(data: any) {
    this.email = data.email;
    this.domain = data.domain;
    this.is_disposable = data.is_disposable;
    this.is_trusted = data.is_trusted;
    this.classification = data.classification;
    this.reputation_score = data.reputation_score;
    this.risk_level = data.risk_level;
    this.is_valid_format = data.is_valid_format;
    this.rule_applied = data.rule_applied;
    this.details = data.details || {
      has_mx: false,
      mx_records: [],
      has_a: false,
      a_records: [],
      has_spf: false,
      spf_record: null,
      has_dmarc: false,
      dmarc_record: null,
    };
    this.status = data.status;
  }

  /** Shorthand: True when the email is NOT disposable. */
  get is_clean(): boolean {
    return !this.is_disposable;
  }

  /** Return just the exchange hostnames, e.g. ['mail.example.com'] */
  mx_hostnames(): string[] {
    return this.details.mx_records || [];
  }

  /** Return all resolved IPs across all A records. */
  a_ips(): string[] {
    return this.details.a_records || [];
  }

  /** Check if MX records exist. */
  get has_mx(): boolean {
    return this.details.has_mx;
  }
}

// ── /v1/tmd/bulk/ ───────────────────────────────────────

export class BulkResult {
  total: number;
  status: "clean" | "disposable" | "mixed";
  disposable_count: number;
  flagged_domains: string[];
  results: CheckResult[];

  constructor(data: any) {
    this.total = data.total || 0;
    this.status = data.status || "clean";
    this.disposable_count = data.disposable_count || 0;
    this.flagged_domains = data.flagged_domains || [];
    this.results = (data.results || []).map((item: any) => new CheckResult(item));
  }

  /** Return only the emails that ARE disposable. */
  disposable_emails(): string[] {
    return this.results
      .filter((r) => r.is_disposable)
      .map((r) => r.email);
  }

  /** Return only the emails that are NOT disposable. */
  clean_emails(): string[] {
    return this.results
      .filter((r) => r.is_clean)
      .map((r) => r.email);
  }
}

// ── client options ───────────────────────────────────────────

export interface TempMailClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number; // seconds, default 5.0
  maxRetries?: number; // default 2
  failOpen?: boolean; // default false
}
