import { AnomalyDetectionResult, ParsedLogEntry } from "../types";

/**
 * Statistical Anomaly Detection Service
 * Detects anomalies using pattern matching and statistical analysis
 */

export class AnomalyDetector {
  /**
   * Analyze log entries for anomalies
   */
  detectAnomalies(entries: ParsedLogEntry[]): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // Run multiple detection algorithms
    anomalies.push(...this.detectHighRequestRate(entries));
    anomalies.push(...this.detectSuspiciousUrls(entries));
    anomalies.push(...this.detectUnusualTimeAccess(entries));
    anomalies.push(...this.detectErrorSpikes(entries));
    anomalies.push(...this.detectSuspiciousUserAgents(entries));
    anomalies.push(...this.detectGeographicAnomalies(entries));

    return anomalies;
  }

  /**
   * Detect high request rates from single IP
   */
  private detectHighRequestRate(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const ipCounts = new Map<string, { count: number; timestamps: Date[] }>();

    // Count requests per IP with timestamps
    for (const entry of entries) {
      if (!entry.ip) continue;

      const existing = ipCounts.get(entry.ip) || { count: 0, timestamps: [] };
      existing.count++;
      if (entry.timestamp) {
        existing.timestamps.push(entry.timestamp);
      }
      ipCounts.set(entry.ip, existing);
    }

    // Check for abnormal request rates
    for (const [ip, data] of ipCounts.entries()) {
      if (data.count > 100) {
        // High volume threshold
        const confidence = Math.min(95, 70 + (data.count - 100) / 10);
        const severity =
          data.count > 500 ? "critical" : data.count > 200 ? "high" : "medium";

        anomalies.push({
          type: "high_request_rate",
          description: `IP ${ip} made ${data.count} requests - potential DDoS or scanning activity`,
          confidence,
          severity,
          details: { ip, requestCount: data.count },
        });
      }

      // Check for burst patterns (many requests in short time)
      if (data.timestamps.length > 50) {
        const sortedTimes = data.timestamps.sort(
          (a, b) => a.getTime() - b.getTime()
        );
        const first = sortedTimes[0];
        const last = sortedTimes[sortedTimes.length - 1];
        const durationMinutes = (last.getTime() - first.getTime()) / 1000 / 60;

        if (durationMinutes < 5 && data.count > 100) {
          anomalies.push({
            type: "burst_traffic",
            description: `IP ${ip} made ${
              data.count
            } requests in ${durationMinutes.toFixed(1)} minutes`,
            confidence: 88,
            severity: "high",
            details: { ip, requestCount: data.count, durationMinutes },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect suspicious URLs (SQL injection, XSS, path traversal)
   */
  private detectSuspiciousUrls(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    const sqlInjectionPatterns = [
      /union\s+select/i,
      /;\s*drop\s+table/i,
      /'\s+or\s+'1'\s*=\s*'1/i,
      /--\s*$/,
      /\/\*.*\*\//,
    ];

    const xssPatterns = [
      /<script>/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onload\s*=/i,
      /<iframe>/i,
    ];

    const pathTraversalPatterns = [/\.\.\//g, /\.\.\\/, /%2e%2e%2f/i];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const url = entry.url || entry.raw || "";

      // Check for SQL injection
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(url)) {
          anomalies.push({
            type: "sql_injection_attempt",
            description: `Potential SQL injection detected in URL: ${url.substring(
              0,
              100
            )}`,
            confidence: 85,
            severity: "high",
            details: { entryIndex: i, url, pattern: pattern.source },
          });
          break;
        }
      }

      // Check for XSS
      for (const pattern of xssPatterns) {
        if (pattern.test(url)) {
          anomalies.push({
            type: "xss_attempt",
            description: `Potential XSS attack detected in URL: ${url.substring(
              0,
              100
            )}`,
            confidence: 82,
            severity: "high",
            details: { entryIndex: i, url, pattern: pattern.source },
          });
          break;
        }
      }

      // Check for path traversal
      for (const pattern of pathTraversalPatterns) {
        if (pattern.test(url)) {
          anomalies.push({
            type: "path_traversal_attempt",
            description: `Path traversal attempt detected in URL: ${url.substring(
              0,
              100
            )}`,
            confidence: 78,
            severity: "medium",
            details: { entryIndex: i, url },
          });
          break;
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect access at unusual times (e.g., 2-5 AM)
   */
  private detectUnusualTimeAccess(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const unusualHours = [1, 2, 3, 4, 5]; // 1 AM - 5 AM

    const suspiciousEntries = entries.filter((entry) => {
      if (!entry.timestamp) return false;
      const hour = entry.timestamp.getHours();
      return unusualHours.includes(hour);
    });

    if (suspiciousEntries.length > 10) {
      const percentage = (suspiciousEntries.length / entries.length) * 100;
      if (percentage > 15) {
        anomalies.push({
          type: "unusual_time_access",
          description: `${
            suspiciousEntries.length
          } requests (${percentage.toFixed(1)}%) during unusual hours (1-5 AM)`,
          confidence: 70,
          severity: "low",
          details: { count: suspiciousEntries.length, percentage },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect spikes in error responses
   */
  private detectErrorSpikes(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    const errorEntries = entries.filter(
      (entry) => entry.status && entry.status >= 400
    );
    const errorRate = (errorEntries.length / entries.length) * 100;

    if (errorRate > 20) {
      const severity =
        errorRate > 50 ? "critical" : errorRate > 35 ? "high" : "medium";
      anomalies.push({
        type: "high_error_rate",
        description: `High error rate detected: ${errorRate.toFixed(
          1
        )}% of requests resulted in errors`,
        confidence: 90,
        severity,
        details: { errorCount: errorEntries.length, errorRate },
      });
    }

    // Check for 401/403 patterns (authentication issues)
    const authErrors = entries.filter(
      (entry) => entry.status === 401 || entry.status === 403
    );
    if (authErrors.length > 20) {
      anomalies.push({
        type: "authentication_failures",
        description: `${authErrors.length} authentication/authorization failures detected - potential brute force attack`,
        confidence: 82,
        severity: "high",
        details: { count: authErrors.length },
      });
    }

    return anomalies;
  }

  /**
   * Detect suspicious user agents
   */
  private detectSuspiciousUserAgents(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    const suspiciousAgentPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
    ];

    const suspiciousEntries = entries.filter((entry) => {
      const agent = entry.user_agent || "";
      return suspiciousAgentPatterns.some((pattern) => pattern.test(agent));
    });

    if (suspiciousEntries.length > 5) {
      const agentCounts = new Map<string, number>();
      for (const entry of suspiciousEntries) {
        const agent = entry.user_agent || "unknown";
        agentCounts.set(agent, (agentCounts.get(agent) || 0) + 1);
      }

      for (const [agent, count] of agentCounts.entries()) {
        if (count > 3) {
          anomalies.push({
            type: "suspicious_user_agent",
            description: `Suspicious user agent detected: ${agent.substring(
              0,
              50
            )} (${count} requests)`,
            confidence: 75,
            severity: "medium",
            details: { userAgent: agent, count },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect geographic anomalies (placeholder - would need IP geolocation)
   */
  private detectGeographicAnomalies(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // This is a simplified version - in production, you'd use an IP geolocation service
    const uniqueIPs = new Set(entries.map((e) => e.ip).filter(Boolean));

    if (uniqueIPs.size > 50) {
      anomalies.push({
        type: "geographic_spread",
        description: `Requests from ${uniqueIPs.size} unique IP addresses - unusually high geographic distribution`,
        confidence: 65,
        severity: "low",
        details: { uniqueIPCount: uniqueIPs.size },
      });
    }

    return anomalies;
  }

  /**
   * Calculate summary statistics from entries
   */
  calculateStatistics(entries: ParsedLogEntry[]) {
    const stats = {
      totalEntries: entries.length,
      uniqueIPs: new Set(entries.map((e) => e.ip).filter(Boolean)).size,
      statusCodes: {} as Record<string, number>,
      methods: {} as Record<string, number>,
      errorRate: 0,
      avgResponseSize: 0,
    };

    let totalBytes = 0;
    let errorCount = 0;

    for (const entry of entries) {
      // Status codes
      if (entry.status) {
        const statusKey = entry.status.toString();
        stats.statusCodes[statusKey] = (stats.statusCodes[statusKey] || 0) + 1;

        if (entry.status >= 400) {
          errorCount++;
        }
      }

      // HTTP methods
      if (entry.method) {
        stats.methods[entry.method] = (stats.methods[entry.method] || 0) + 1;
      }

      // Bytes
      if (entry.bytes) {
        totalBytes += entry.bytes;
      }
    }

    stats.errorRate =
      entries.length > 0 ? (errorCount / entries.length) * 100 : 0;
    stats.avgResponseSize =
      entries.length > 0 ? totalBytes / entries.length : 0;

    return stats;
  }
}
