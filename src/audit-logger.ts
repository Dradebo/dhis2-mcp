import { redactSecrets } from './security/safe-errors.js';

/** Parameter keys whose scalar values are safe to record. Everything else is name-only. */
const AUDIT_VALUE_ALLOWLIST: ReadonlySet<string> = new Set([
  'profile', 'operation', 'pageSize', 'page', 'period', 'proxyType', 'platform', 'appType',
  'planId', 'state', 'transferId', 'packageId', 'projectId',
]);

function originOnly(url: string): string {
  try { return new URL(url).origin; } catch { return '[invalid-url]'; }
}

export interface AuditEntry {
  timestamp: string;
  toolName: string;
  parameters: Record<string, any>;
  outcome: 'success' | 'error';
  error?: string;
  dhis2Instance?: string | undefined;
  executionTime?: number;
  userId?: string;
  resourcesAffected?: string[];
}

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private maxEntries: number = 1000; // Keep last 1000 entries in memory

  log(entry: Omit<AuditEntry, 'timestamp'>): void {
    const auditEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Sanitize: allowlisted parameter facts, safe error text, instance origin only.
    auditEntry.parameters = this.sanitizeParameters(auditEntry.parameters);
    if (auditEntry.error !== undefined) auditEntry.error = redactSecrets(String(auditEntry.error));
    if (auditEntry.dhis2Instance) auditEntry.dhis2Instance = originOnly(auditEntry.dhis2Instance);

    this.entries.push(auditEntry);

    // Maintain max entries limit
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Log to console for development
    console.error(`[AUDIT] ${auditEntry.timestamp} - ${auditEntry.toolName}: ${auditEntry.outcome}${auditEntry.error ? ` (${auditEntry.error})` : ''}`);
  }

  /**
   * Allowlist, not blocklist (mission BASE-02): record parameter *names* plus
   * values only for a few non-sensitive scalar keys. Nested objects, payloads,
   * filters and free text are never stored, whatever their key names.
   */
  private sanitizeParameters(params: Record<string, any> | undefined): Record<string, any> {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return { parameterNames: [] };
    const names = Object.keys(params).filter(k => /^[A-Za-z0-9_]{1,64}$/.test(k)).sort().slice(0, 50);
    const values: Record<string, string | number | boolean> = {};
    for (const key of names) {
      if (!AUDIT_VALUE_ALLOWLIST.has(key)) continue;
      const v = params[key];
      if (typeof v === 'number' || typeof v === 'boolean') values[key] = v;
      else if (typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(v)) values[key] = redactSecrets(v);
    }
    return Object.keys(values).length ? { parameterNames: names, values } : { parameterNames: names };
  }

  getAuditTrail(limit?: number): AuditEntry[] {
    const entries = limit ? this.entries.slice(-limit) : this.entries;
    return [...entries]; // Return copy to prevent mutation
  }

  getSuccessCount(): number {
    return this.entries.filter(entry => entry.outcome === 'success').length;
  }

  getErrorCount(): number {
    return this.entries.filter(entry => entry.outcome === 'error').length;
  }

  getAuditSummary(): {
    totalOperations: number;
    successCount: number;
    errorCount: number;
    mostUsedTools: Array<{ tool: string; count: number }>;
    recentErrors: AuditEntry[];
  } {
    const toolUsage = new Map<string, number>();
    
    this.entries.forEach(entry => {
      toolUsage.set(entry.toolName, (toolUsage.get(entry.toolName) || 0) + 1);
    });

    const mostUsedTools = Array.from(toolUsage.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentErrors = this.entries
      .filter(entry => entry.outcome === 'error')
      .slice(-5);

    return {
      totalOperations: this.entries.length,
      successCount: this.getSuccessCount(),
      errorCount: this.getErrorCount(),
      mostUsedTools,
      recentErrors
    };
  }

  exportAuditLog(): string {
    return JSON.stringify({
      exportTimestamp: new Date().toISOString(),
      entries: this.entries,
      summary: this.getAuditSummary()
    }, null, 2);
  }

  clear(): void {
    this.entries = [];
    console.error('[AUDIT] Audit log cleared');
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger();