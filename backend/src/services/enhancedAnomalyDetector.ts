import { AnomalyDetectionResult, ParsedLogEntry } from "../types";

/**
 * Enhanced Anomaly Detection Service
 * Uses behavioral analysis and contextual logic for accurate threat detection
 */

export class EnhancedAnomalyDetector {
  /**
   * Analyze log entries for anomalies with improved accuracy
   */
  detectAnomalies(entries: ParsedLogEntry[]): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // Run enhanced detection algorithms
    anomalies.push(...this.detectBruteForceAttacks(entries));
    anomalies.push(...this.detectScannerActivity(entries));
    anomalies.push(...this.detectSuspiciousUrls(entries));
    anomalies.push(...this.detectUnusualBehavior(entries));

    return anomalies;
  }

  /**
   * Detect brute-force attacks using temporal analysis
   */
  private detectBruteForceAttacks(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const ipFailures = new Map<
      string,
      Array<{ timestamp: Date; url: string }>
    >();

    // Track failed authentication attempts per IP
    for (const entry of entries) {
      if (!entry.ip || !entry.timestamp) continue;

      // Look for authentication failures (401, 403 status codes)
      if (entry.status === 401 || entry.status === 403) {
        const url = entry.url || "";
        // Check if it's a login/admin endpoint
        if (
          url.includes("login") ||
          url.includes("admin") ||
          url.includes("auth")
        ) {
          if (!ipFailures.has(entry.ip)) {
            ipFailures.set(entry.ip, []);
          }
          ipFailures.get(entry.ip)!.push({
            timestamp: entry.timestamp,
            url: url,
          });
        }
      }
    }

    // Analyze patterns for brute force
    for (const [ip, failures] of ipFailures.entries()) {
      if (failures.length >= 3) {
        // Sort by timestamp
        failures.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const firstAttempt = failures[0].timestamp;
        const lastAttempt = failures[failures.length - 1].timestamp;
        const durationMinutes =
          (lastAttempt.getTime() - firstAttempt.getTime()) / 1000 / 60;

        // Calculate confidence based on frequency and pattern
        let confidence = 60;
        if (failures.length >= 10) confidence += 20;
        if (failures.length >= 20) confidence += 10;
        if (durationMinutes < 5) confidence += 10; // Rapid attempts

        const severity =
          failures.length >= 20
            ? "high"
            : failures.length >= 10
            ? "medium"
            : "low";

        anomalies.push({
          type: "brute_force_attack",
          description: `Brute force attack detected from ${ip}: ${
            failures.length
          } failed authentication attempts in ${durationMinutes.toFixed(
            1
          )} minutes`,
          confidence: Math.min(95, confidence),
          severity,
          details: {
            ip,
            attemptCount: failures.length,
            durationMinutes,
            firstAttempt: firstAttempt.toISOString(),
            lastAttempt: lastAttempt.toISOString(),
            targetUrls: [...new Set(failures.map((f) => f.url))],
          },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect scanner activity using user agent and behavior patterns
   */
  private detectScannerActivity(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const scannerPatterns = {
      sqlmap: /sqlmap/i,
      nikto: /nikto/i,
      nmap: /nmap/i,
      masscan: /masscan/i,
      burp: /burp/i,
      acunetix: /acunetix/i,
      nessus: /nessus/i,
    };

    const ipScannerActivity = new Map<
      string,
      {
        scanner: string;
        count: number;
        urls: Set<string>;
        timestamps: Date[];
        userAgent: string;
      }
    >();

    // Identify scanner activity
    for (const entry of entries) {
      if (!entry.ip || !entry.user_agent) continue;

      for (const [scannerName, pattern] of Object.entries(scannerPatterns)) {
        if (pattern.test(entry.user_agent)) {
          if (!ipScannerActivity.has(entry.ip)) {
            ipScannerActivity.set(entry.ip, {
              scanner: scannerName,
              count: 0,
              urls: new Set(),
              timestamps: [],
              userAgent: entry.user_agent,
            });
          }
          const activity = ipScannerActivity.get(entry.ip)!;
          activity.count++;
          if (entry.url) activity.urls.add(entry.url);
          if (entry.timestamp) activity.timestamps.push(entry.timestamp);
        }
      }
    }

    // Generate anomalies for scanner activity
    for (const [ip, activity] of ipScannerActivity.entries()) {
      // Calculate confidence based on activity level
      let confidence = 70;
      if (activity.count >= 50) confidence = 95;
      else if (activity.count >= 20) confidence = 88;
      else if (activity.count >= 10) confidence = 80;

      const severity =
        activity.count >= 50 ? "high" : activity.count >= 20 ? "medium" : "low";

      let description = `Automated ${activity.scanner} scanner detected from ${ip}`;
      description += `: ${activity.count} requests`;

      if (activity.urls.size > 10) {
        description += `, scanning ${activity.urls.size} different endpoints`;
      }

      anomalies.push({
        type: "scanner_activity",
        description,
        confidence,
        severity,
        details: {
          ip,
          scannerType: activity.scanner,
          requestCount: activity.count,
          uniqueUrls: activity.urls.size,
          userAgent: activity.userAgent,
          duration:
            activity.timestamps.length > 1
              ? (activity.timestamps[activity.timestamps.length - 1].getTime() -
                  activity.timestamps[0].getTime()) /
                1000
              : 0,
        },
      });
    }

    return anomalies;
  }

  /**
   * Detect suspicious URLs with contextual analysis
   */
  private detectSuspiciousUrls(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    const sqlInjectionPatterns = [
      { pattern: /union\s+select/i, name: "UNION SELECT", weight: 95 },
      { pattern: /;\s*drop\s+table/i, name: "DROP TABLE", weight: 98 },
      { pattern: /'\s*or\s*'1'\s*=\s*'1/i, name: "Auth Bypass", weight: 92 },
      { pattern: /--\s*$/m, name: "SQL Comment", weight: 75 },
      { pattern: /\/\*.*\*\//, name: "Block Comment", weight: 70 },
    ];

    const xssPatterns = [
      { pattern: /<script[^>]*>/i, name: "Script Tag", weight: 90 },
      { pattern: /javascript:/i, name: "JavaScript Protocol", weight: 85 },
      { pattern: /onerror\s*=/i, name: "Error Handler", weight: 88 },
      { pattern: /onload\s*=/i, name: "Load Handler", weight: 88 },
      { pattern: /<iframe[^>]*>/i, name: "IFrame Injection", weight: 92 },
    ];

    const pathTraversalPatterns = [
      { pattern: /\.\.\//g, name: "Parent Directory", weight: 85 },
      { pattern: /etc\/passwd/i, name: "System File Access", weight: 95 },
      { pattern: /%2e%2e%2f/i, name: "Encoded Traversal", weight: 90 },
    ];

    // Track by IP for grouping
    const ipAnomalies = new Map<string, any[]>();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const url = entry.url || entry.raw || "";
      const ip = entry.ip || "unknown";

      // Check for SQL injection
      for (const { pattern, name, weight } of sqlInjectionPatterns) {
        if (pattern.test(url)) {
          const anomaly: AnomalyDetectionResult = {
            type: "sql_injection_attempt",
            description: `SQL Injection (${name}) detected from ${ip}: ${url.substring(
              0,
              100
            )}`,
            confidence: weight,
            severity: (weight >= 90 ? "high" : "medium") as
              | "high"
              | "medium"
              | "low"
              | "critical",
            details: {
              ip,
              url,
              pattern: name,
              timestamp: entry.timestamp?.toISOString(),
              entryIndex: i,
            },
          };
          anomalies.push(anomaly);

          if (!ipAnomalies.has(ip)) ipAnomalies.set(ip, []);
          ipAnomalies.get(ip)!.push(anomaly);
          break;
        }
      }

      // Check for XSS
      for (const { pattern, name, weight } of xssPatterns) {
        if (pattern.test(url)) {
          const anomaly: AnomalyDetectionResult = {
            type: "xss_attempt",
            description: `XSS Attack (${name}) detected from ${ip}: ${url.substring(
              0,
              100
            )}`,
            confidence: weight,
            severity: (weight >= 90 ? "high" : "medium") as
              | "high"
              | "medium"
              | "low"
              | "critical",
            details: {
              ip,
              url,
              pattern: name,
              timestamp: entry.timestamp?.toISOString(),
              entryIndex: i,
            },
          };
          anomalies.push(anomaly);

          if (!ipAnomalies.has(ip)) ipAnomalies.set(ip, []);
          ipAnomalies.get(ip)!.push(anomaly);
          break;
        }
      }

      // Check for path traversal
      for (const { pattern, name, weight } of pathTraversalPatterns) {
        if (pattern.test(url)) {
          const anomaly: AnomalyDetectionResult = {
            type: "path_traversal_attempt",
            description: `Path Traversal (${name}) detected from ${ip}: ${url.substring(
              0,
              100
            )}`,
            confidence: weight,
            severity: (weight >= 90 ? "high" : "medium") as
              | "high"
              | "medium"
              | "low"
              | "critical",
            details: {
              ip,
              url,
              pattern: name,
              timestamp: entry.timestamp?.toISOString(),
              entryIndex: i,
            },
          };
          anomalies.push(anomaly);

          if (!ipAnomalies.has(ip)) ipAnomalies.set(ip, []);
          ipAnomalies.get(ip)!.push(anomaly);
          break;
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect unusual behavior patterns
   */
  private detectUnusualBehavior(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const ipBehavior = new Map<
      string,
      {
        requests: number;
        errors: number;
        timestamps: Date[];
        urls: Set<string>;
        methods: Set<string>;
      }
    >();

    // Collect behavior data per IP
    for (const entry of entries) {
      if (!entry.ip) continue;

      if (!ipBehavior.has(entry.ip)) {
        ipBehavior.set(entry.ip, {
          requests: 0,
          errors: 0,
          timestamps: [],
          urls: new Set(),
          methods: new Set(),
        });
      }

      const behavior = ipBehavior.get(entry.ip)!;
      behavior.requests++;
      if (entry.status && entry.status >= 400) behavior.errors++;
      if (entry.timestamp) behavior.timestamps.push(entry.timestamp);
      if (entry.url) behavior.urls.add(entry.url);
      if (entry.method) behavior.methods.add(entry.method);
    }

    // Analyze for unusual patterns
    for (const [ip, behavior] of ipBehavior.entries()) {
      // High request rate
      if (behavior.requests > 100) {
        const timestamps = behavior.timestamps.sort(
          (a, b) => a.getTime() - b.getTime()
        );
        const duration =
          timestamps.length > 1
            ? (timestamps[timestamps.length - 1].getTime() -
                timestamps[0].getTime()) /
              1000 /
              60
            : 1;

        const requestsPerMinute = behavior.requests / duration;

        if (requestsPerMinute > 50) {
          // Calculate meaningful confidence
          let confidence = 70;
          if (requestsPerMinute > 100) confidence = 90;
          else if (requestsPerMinute > 75) confidence = 85;

          anomalies.push({
            type: "high_request_rate",
            description: `Abnormal request rate from ${ip}: ${
              behavior.requests
            } requests in ${duration.toFixed(
              1
            )} minutes (${requestsPerMinute.toFixed(1)}/min)`,
            confidence,
            severity: requestsPerMinute > 100 ? "high" : "medium",
            details: {
              ip,
              totalRequests: behavior.requests,
              durationMinutes: duration,
              requestsPerMinute,
              uniqueUrls: behavior.urls.size,
            },
          });
        }
      }

      // High error rate from single IP
      if (behavior.errors > 20) {
        const errorRate = (behavior.errors / behavior.requests) * 100;
        if (errorRate > 50) {
          anomalies.push({
            type: "high_error_rate_from_ip",
            description: `High error rate from ${ip}: ${
              behavior.errors
            } errors out of ${behavior.requests} requests (${errorRate.toFixed(
              1
            )}%)`,
            confidence: 80,
            severity: "medium",
            details: {
              ip,
              errorCount: behavior.errors,
              totalRequests: behavior.requests,
              errorRate,
            },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Calculate accurate statistics from entries
   */
  calculateStatistics(entries: ParsedLogEntry[]) {
    const stats = {
      totalEntries: entries.length,
      uniqueIPs: new Set(entries.map((e) => e.ip).filter(Boolean)).size,
      statusCodes: {} as Record<string, number>,
      methods: {} as Record<string, number>,
      errorRate: 0,
      avgResponseSize: 0,
      timeRange: {
        start: null as Date | null,
        end: null as Date | null,
      },
    };

    let totalBytes = 0;
    let errorCount = 0;
    const timestamps: Date[] = [];

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

      // Timestamps
      if (entry.timestamp) {
        timestamps.push(entry.timestamp);
      }
    }

    // Calculate error rate
    stats.errorRate =
      entries.length > 0 ? (errorCount / entries.length) * 100 : 0;

    // Calculate average response size
    stats.avgResponseSize =
      entries.length > 0 ? totalBytes / entries.length : 0;

    // Set time range
    if (timestamps.length > 0) {
      timestamps.sort((a, b) => a.getTime() - b.getTime());
      stats.timeRange.start = timestamps[0];
      stats.timeRange.end = timestamps[timestamps.length - 1];
    }

    return stats;
  }
}
