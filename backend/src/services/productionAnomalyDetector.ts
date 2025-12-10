import { AnomalyDetectionResult, ParsedLogEntry } from "../types";

/**
 * Production-Ready Anomaly Detection Service
 * Fixes all identified issues with accurate counting and severity
 */

export class ProductionAnomalyDetector {
  /**
   * Analyze log entries for anomalies
   */
  detectAnomalies(entries: ParsedLogEntry[]): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // Run all detection algorithms
    anomalies.push(...this.detectBruteForceAttacks(entries));
    anomalies.push(...this.detectScannerActivity(entries));
    anomalies.push(...this.detectSuspiciousUrls(entries));
    anomalies.push(...this.detectUnauthorizedAccess(entries));
    anomalies.push(...this.detectPrivilegedOperations(entries));
    anomalies.push(...this.detectUnusualBehavior(entries));

    return anomalies;
  }

  /**
   * Detect brute-force attacks - FIXED SEVERITY TO HIGH
   */
  private detectBruteForceAttacks(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const ipFailures = new Map<
      string,
      Array<{ timestamp: Date; url: string }>
    >();

    for (const entry of entries) {
      if (!entry.ip || !entry.timestamp) continue;

      if (entry.status === 401 || entry.status === 403) {
        const url = entry.url || "";
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

    for (const [ip, failures] of ipFailures.entries()) {
      if (failures.length >= 3) {
        failures.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const firstAttempt = failures[0].timestamp;
        const lastAttempt = failures[failures.length - 1].timestamp;
        const durationMinutes =
          (lastAttempt.getTime() - firstAttempt.getTime()) / 1000 / 60;

        // Enhanced confidence calculation
        let confidence = 75;
        if (failures.length >= 10) confidence = 92;
        else if (failures.length >= 5) confidence = 88;
        if (durationMinutes < 5) confidence += 5; // Rapid = more confident

        // Brute force is always HIGH severity
        const severity = "high";

        anomalies.push({
          type: "brute_force_attack",
          description: `Brute force attack from ${ip}: ${
            failures.length
          } failed login attempts in ${durationMinutes.toFixed(1)} minutes`,
          confidence: Math.min(98, confidence),
          severity,
          details: {
            ip,
            attemptCount: failures.length,
            durationMinutes,
            firstAttempt: firstAttempt.toISOString(),
            lastAttempt: lastAttempt.toISOString(),
            targetUrls: [...new Set(failures.map((f) => f.url))],
            event_timestamp: firstAttempt.toISOString(), // Use log time
          },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect scanner activity - FIXED SEVERITY TO HIGH
   * FIXED: Track each scanner type separately per IP
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

    // Track by IP + scanner type combination
    const ipScannerActivity = new Map<
      string, // key: "IP:scanner"
      {
        ip: string;
        scanner: string;
        count: number;
        urls: Set<string>;
        timestamps: Date[];
        userAgent: string;
      }
    >();

    for (const entry of entries) {
      if (!entry.ip || !entry.user_agent) continue;

      for (const [scannerName, pattern] of Object.entries(scannerPatterns)) {
        if (pattern.test(entry.user_agent)) {
          const key = `${entry.ip}:${scannerName}`;
          
          if (!ipScannerActivity.has(key)) {
            ipScannerActivity.set(key, {
              ip: entry.ip,
              scanner: scannerName,
              count: 0,
              urls: new Set(),
              timestamps: [],
              userAgent: entry.user_agent,
            });
          }
          const activity = ipScannerActivity.get(key)!;
          activity.count++;
          if (entry.url) activity.urls.add(entry.url);
          if (entry.timestamp) activity.timestamps.push(entry.timestamp);
          break; // Only match first scanner pattern per entry
        }
      }
    }

    for (const [_, activity] of ipScannerActivity.entries()) {
      // Enhanced confidence based on scanner detection
      let confidence = 88; // Base confidence for scanner detection
      if (activity.count >= 10) confidence = 95; // Definite scanner
      else if (activity.count >= 5) confidence = 92;

      // Scanner activity is always HIGH severity
      const severity = "high";

      let description = `${activity.scanner.charAt(0).toUpperCase() + activity.scanner.slice(1)} scanner from ${activity.ip}`;
      description += `: ${activity.count} request${activity.count > 1 ? 's' : ''}`;

      if (activity.urls.size > 3) {
        description += `, targeting ${activity.urls.size} endpoints`;
      }

      // Use earliest timestamp from activity
      const eventTimestamp =
        activity.timestamps.length > 0
          ? activity.timestamps.sort((a, b) => a.getTime() - b.getTime())[0]
          : new Date();

      anomalies.push({
        type: "scanner_activity",
        description,
        confidence,
        severity,
        details: {
          ip: activity.ip,
          scannerType: activity.scanner,
          requestCount: activity.count,
          uniqueUrls: activity.urls.size,
          userAgent: activity.userAgent,
          event_timestamp: eventTimestamp.toISOString(), // Use log time
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
   * Detect suspicious URLs - FIXED SEVERITY FOR PATH TRAVERSAL
   * ADDED: Command injection detection
   */
  private detectSuspiciousUrls(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    const sqlInjectionPatterns = [
      { pattern: /union\s+select/i, name: "UNION SELECT", confidence: 95 },
      { pattern: /;\s*drop\s+table/i, name: "DROP TABLE", confidence: 98 },
      {
        pattern: /'\s*or\s*'1'\s*=\s*'1/i,
        name: "Auth Bypass",
        confidence: 92,
      },
    ];

    const xssPatterns = [
      { pattern: /<script[^>]*>/i, name: "Script Tag", confidence: 90 },
      { pattern: /javascript:/i, name: "JavaScript Protocol", confidence: 85 },
    ];

    const pathTraversalPatterns = [
      { pattern: /\.\.\//g, name: "Parent Directory", confidence: 90 },
      { pattern: /etc\/passwd/i, name: "System File (/etc/passwd)", confidence: 95 },
      { pattern: /etc\/shadow/i, name: "System File (/etc/shadow)", confidence: 95 },
      { pattern: /var\/log/i, name: "Log File Access", confidence: 92 },
    ];

    const commandInjectionPatterns = [
      { pattern: /exec=.*bash/i, name: "Bash Execution", confidence: 95 },
      { pattern: /exec=.*nc\s+-e/i, name: "Reverse Shell (nc)", confidence: 98 },
      { pattern: /cmd=.*curl/i, name: "Remote Code Execution", confidence: 95 },
      { pattern: /cmd=.*\$/i, name: "Command Substitution", confidence: 93 },
      { pattern: /nc\s+-e.*bash/i, name: "Netcat Reverse Shell", confidence: 98 },
      { pattern: /bash\s+-[ic]/i, name: "Interactive Bash", confidence: 90 },
    ];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const url = entry.url || entry.raw || "";
      const ip = entry.ip || "unknown";

      // SQL injection - CRITICAL severity
      for (const { pattern, name, confidence } of sqlInjectionPatterns) {
        if (pattern.test(url)) {
          anomalies.push({
            type: "sql_injection_attempt",
            description: `SQL Injection (${name}) from ${ip}: ${url.substring(
              0,
              80
            )}`,
            confidence,
            severity: "critical",
            details: {
              ip,
              url,
              pattern: name,
              timestamp: entry.timestamp?.toISOString(),
              event_timestamp: entry.timestamp?.toISOString(),
              entryIndex: i,
            },
          });
          break;
        }
      }

      // XSS - HIGH severity
      for (const { pattern, name, confidence } of xssPatterns) {
        if (pattern.test(url)) {
          anomalies.push({
            type: "xss_attempt",
            description: `XSS Attack (${name}) from ${ip}: ${url.substring(
              0,
              80
            )}`,
            confidence,
            severity: "high",
            details: {
              ip,
              url,
              pattern: name,
              timestamp: entry.timestamp?.toISOString(),
              event_timestamp: entry.timestamp?.toISOString(),
              entryIndex: i,
            },
          });
          break;
        }
      }

      // Path traversal - HIGH severity (FIXED)
      for (const { pattern, name, confidence } of pathTraversalPatterns) {
        if (pattern.test(url)) {
          anomalies.push({
            type: "path_traversal_attempt",
            description: `Path Traversal (${name}) from ${ip}: ${entry.method} ${url} [Status: ${entry.status}]`,
            confidence,
            severity: "high", // FIXED: Changed from medium to high
            details: {
              ip,
              method: entry.method,
              url: url, // Actual URL that matched
              status: entry.status,
              pattern: name,
              timestamp: entry.timestamp?.toISOString(),
              event_timestamp: entry.timestamp?.toISOString(),
              entryIndex: i, // Exact index of the matching entry
              matchedUrl: url, // Explicitly store the matched URL
            },
          });
          break;
        }
      }

      // Command injection - HIGH severity (NEW)
      for (const { pattern, name, confidence } of commandInjectionPatterns) {
        if (pattern.test(url)) {
          anomalies.push({
            type: "command_injection_attempt",
            description: `Command Injection (${name}) from ${ip}: ${url.substring(0, 80)}`,
            confidence,
            severity: "high",
            details: {
              ip,
              url,
              method: entry.method,
              status: entry.status,
              pattern: name,
              timestamp: entry.timestamp?.toISOString(),
              event_timestamp: entry.timestamp?.toISOString(),
              entryIndex: i,
            },
          });
          break;
        }
      }
    }

    return anomalies;
  }

  /**
   * NEW: Detect unauthorized admin access attempts
   */
  private detectUnauthorizedAccess(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Detect 403 to admin/privileged endpoints
      if (entry.status === 403) {
        const url = entry.url || "";
        if (url.includes("/admin") || url.includes("/api/admin")) {
          anomalies.push({
            type: "unauthorized_admin_access",
            description: `Unauthorized admin access attempt from ${entry.ip}: ${url}`,
            confidence: 85,
            severity: "medium",
            details: {
              ip: entry.ip,
              url,
              status: entry.status,
              timestamp: entry.timestamp?.toISOString(),
              event_timestamp: entry.timestamp?.toISOString(),
              entryIndex: i,
            },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * NEW: Detect privileged operations (DELETE, sensitive API calls)
   */
  private detectPrivilegedOperations(
    entries: ParsedLogEntry[]
  ): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const url = entry.url || "";

      // Detect DELETE operations on user/sensitive resources
      if (entry.method === "DELETE") {
        if (url.includes("/api/user") || url.includes("/api/data")) {
          anomalies.push({
            type: "privileged_operation",
            description: `Privileged DELETE operation from ${entry.ip}: ${entry.method} ${url}`,
            confidence: 80,
            severity: "high", // FIXED: DELETE is destructive, should be HIGH
            details: {
              ip: entry.ip,
              method: entry.method,
              url,
              status: entry.status,
              timestamp: entry.timestamp?.toISOString(),
              event_timestamp: entry.timestamp?.toISOString(),
              entryIndex: i,
            },
          });
        }
      }

      // Detect PUT operations on sensitive endpoints
      if (entry.method === "PUT" && url.includes("/api/settings")) {
        anomalies.push({
          type: "privileged_operation",
          description: `Privileged PUT operation from ${entry.ip}: ${entry.method} ${url}`,
          confidence: 75,
          severity: "medium", // FIXED: Configuration changes are MEDIUM
          details: {
            ip: entry.ip,
            method: entry.method,
            url,
            status: entry.status,
            timestamp: entry.timestamp?.toISOString(),
            event_timestamp: entry.timestamp?.toISOString(),
            entryIndex: i,
          },
        });
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
      }
    >();

    for (const entry of entries) {
      if (!entry.ip) continue;

      if (!ipBehavior.has(entry.ip)) {
        ipBehavior.set(entry.ip, {
          requests: 0,
          errors: 0,
          timestamps: [],
          urls: new Set(),
        });
      }

      const behavior = ipBehavior.get(entry.ip)!;
      behavior.requests++;
      if (entry.status && entry.status >= 400) behavior.errors++;
      if (entry.timestamp) behavior.timestamps.push(entry.timestamp);
      if (entry.url) behavior.urls.add(entry.url);
    }

    for (const [ip, behavior] of ipBehavior.entries()) {
      // High request rate
      if (behavior.requests > 5) {
        // Lower threshold for small dataset
        const timestamps = behavior.timestamps.sort(
          (a, b) => a.getTime() - b.getTime()
        );
        if (timestamps.length > 1) {
          const duration =
            (timestamps[timestamps.length - 1].getTime() -
              timestamps[0].getTime()) /
            1000 /
            60;

          // FIXED: Correct calculation to avoid rounding errors
          const requestsPerMinute =
            duration > 0 ? behavior.requests / duration : behavior.requests;

          if (requestsPerMinute > 5) {
            // Adjusted threshold
            anomalies.push({
              type: "high_request_rate",
              description: `High request rate from ${ip}: ${
                behavior.requests
              } requests in ${duration.toFixed(1)} minutes (${
                Math.round(requestsPerMinute * 10) / 10
              }/min)`,
              confidence: 75,
              severity: "medium",
              details: {
                ip,
                totalRequests: behavior.requests,
                durationMinutes: duration,
                requestsPerMinute,
                uniqueUrls: behavior.urls.size,
                event_timestamp: timestamps[0].toISOString(),
              },
            });
          }
        }
      }
    }

    return anomalies;
  }

  /**
   * Calculate ACCURATE statistics - FIXED IP and error counting
   */
  calculateStatistics(entries: ParsedLogEntry[]) {
    const ipSet = new Set<string>();
    let errorCount = 0;
    const timestamps: Date[] = [];
    const statusCodes: Record<string, number> = {};
    const methods: Record<string, number> = {};
    let totalBytes = 0;

    for (const entry of entries) {
      // Count ONLY valid, non-empty IPs
      if (entry.ip && entry.ip.trim() !== "" && entry.ip !== "undefined") {
        ipSet.add(entry.ip);
      }

      // Count errors (4xx, 5xx)
      if (entry.status) {
        const statusKey = entry.status.toString();
        statusCodes[statusKey] = (statusCodes[statusKey] || 0) + 1;

        if (entry.status >= 400) {
          errorCount++;
        }
      }

      if (entry.method) {
        methods[entry.method] = (methods[entry.method] || 0) + 1;
      }

      if (entry.bytes) {
        totalBytes += entry.bytes;
      }

      if (entry.timestamp) {
        timestamps.push(entry.timestamp);
      }
    }

    // ACCURATE error rate calculation
    const errorRate =
      entries.length > 0 ? (errorCount / entries.length) * 100 : 0;

    const stats = {
      totalEntries: entries.length,
      uniqueIPs: ipSet.size, // FIXED: Only count valid IPs
      statusCodes,
      methods,
      errorRate, // FIXED: Accurate calculation
      avgResponseSize: entries.length > 0 ? totalBytes / entries.length : 0,
      timeRange: {
        start:
          timestamps.length > 0
            ? timestamps.sort((a, b) => a.getTime() - b.getTime())[0]
            : null,
        end: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,
      },
    };

    return stats;
  }
}
