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

    // Sanitize sensitive data
    auditEntry.parameters = this.sanitizeParameters(auditEntry.parameters);

    this.entries.push(auditEntry);

    // Maintain max entries limit
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Log to console for development
    console.log(`[AUDIT] ${auditEntry.timestamp} - ${auditEntry.toolName}: ${auditEntry.outcome}${auditEntry.error ? ` (${auditEntry.error})` : ''}`);
  }

  private sanitizeParameters(params: Record<string, any>): Record<string, any> {
    const sanitized = { ...params };
    
    // Remove sensitive information
    if (sanitized.password) {
      sanitized.password = '***REDACTED***';
    }
    if (sanitized.token) {
      sanitized.token = '***REDACTED***';
    }
    if (sanitized.apiKey) {
      sanitized.apiKey = '***REDACTED***';
    }

    return sanitized;
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
    console.log('[AUDIT] Audit log cleared');
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger();