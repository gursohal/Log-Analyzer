import { AnomalyDetectionResult, ParsedLogEntry } from "../types";

/**
 * SOC Analyst Report Generator
 * Generates comprehensive threat intelligence reports
 */

interface ThreatActor {
  sourceIP: string;
  anomalies: AnomalyDetectionResult[];
  indicators: string[];
  userAgents: Set<string>;
  endpoints: string[];
  requestCount: number;
  timeRange: { first: Date; last: Date } | null;
  severity: "critical" | "high" | "medium" | "low";
}

interface SOCReport {
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    primaryThreatActor: string | null;
  };
  criticalAnomalies: EnhancedAnomaly[];
  highAnomalies: EnhancedAnomaly[];
  mediumAnomalies: EnhancedAnomaly[];
  lowAnomalies: EnhancedAnomaly[];
  threatActors: ThreatActor[];
  recommendations: string[];
}

interface EnhancedAnomaly extends AnomalyDetectionResult {
  sourceIP?: string;
  payload?: string;
  userAgent?: string;
  timestamp?: string;
  indicators?: string[];
  likelyIntent?: string;
  recommendedActions?: string[];
}

export class ReportGenerator {
  /**
   * Generate comprehensive SOC analyst report
   */
  generateSOCReport(
    anomalies: AnomalyDetectionResult[],
    entries: ParsedLogEntry[]
  ): SOCReport {
    // Enhance anomalies with context
    const enhancedAnomalies = this.enhanceAnomalies(anomalies, entries);

    // Group by severity
    const critical = enhancedAnomalies.filter((a) => a.severity === "critical");
    const high = enhancedAnomalies.filter((a) => a.severity === "high");
    const medium = enhancedAnomalies.filter((a) => a.severity === "medium");
    const low = enhancedAnomalies.filter((a) => a.severity === "low");

    // Identify threat actors
    const threatActors = this.identifyThreatActors(enhancedAnomalies, entries);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      enhancedAnomalies,
      threatActors
    );

    // Find primary threat actor
    const primaryThreatActor =
      threatActors.length > 0
        ? threatActors.sort(
            (a, b) => b.anomalies.length - a.anomalies.length
          )[0].sourceIP
        : null;

    return {
      summary: {
        totalAnomalies: anomalies.length,
        criticalCount: critical.length,
        highCount: high.length,
        mediumCount: medium.length,
        lowCount: low.length,
        primaryThreatActor,
      },
      criticalAnomalies: critical,
      highAnomalies: high,
      mediumAnomalies: medium,
      lowAnomalies: low,
      threatActors,
      recommendations,
    };
  }

  /**
   * Enhance anomalies with detailed context
   */
  private enhanceAnomalies(
    anomalies: AnomalyDetectionResult[],
    entries: ParsedLogEntry[]
  ): EnhancedAnomaly[] {
    return anomalies.map((anomaly) => {
      const enhanced: EnhancedAnomaly = { ...anomaly };

      // Find related log entry
      if (anomaly.details?.entryIndex !== undefined) {
        const entry = entries[anomaly.details.entryIndex];
        if (entry) {
          enhanced.sourceIP = entry.ip;
          enhanced.userAgent = entry.user_agent;
          enhanced.timestamp = entry.timestamp?.toISOString();
          enhanced.payload = entry.url;
        }
      } else if (anomaly.details?.ip) {
        enhanced.sourceIP = anomaly.details.ip;
      }

      // Add indicators based on anomaly type
      enhanced.indicators = this.extractIndicators(anomaly, entries);

      // Determine likely intent
      enhanced.likelyIntent = this.determineLikelyIntent(anomaly);

      // Generate recommended actions
      enhanced.recommendedActions = this.generateActions(anomaly);

      return enhanced;
    });
  }

  /**
   * Extract specific indicators from anomaly
   */
  private extractIndicators(
    anomaly: AnomalyDetectionResult,
    _entries: ParsedLogEntry[]
  ): string[] {
    const indicators: string[] = [];

    switch (anomaly.type) {
      case "sql_injection_attempt":
        indicators.push("Classic SQL injection patterns detected");
        if (anomaly.details?.url) {
          const url = anomaly.details.url as string;
          if (url.includes("UNION")) indicators.push("UNION SELECT detected");
          if (url.includes("OR '1'='1"))
            indicators.push("Authentication bypass attempt");
          if (url.includes("--")) indicators.push("SQL comment injection");
        }
        break;

      case "xss_attempt":
        indicators.push("XSS payload in request");
        if (anomaly.details?.url) {
          const url = anomaly.details.url as string;
          if (url.includes("<script>")) indicators.push("Script tag injection");
          if (url.includes("javascript:"))
            indicators.push("JavaScript protocol handler");
          if (url.includes("onerror"))
            indicators.push("Event handler injection");
        }
        break;

      case "path_traversal_attempt":
        indicators.push("Directory traversal patterns");
        indicators.push("Attempting to access system files");
        break;

      case "suspicious_user_agent":
        if (anomaly.details?.userAgent) {
          const ua = anomaly.details.userAgent as string;
          if (ua.includes("sqlmap"))
            indicators.push("Automated SQL injection tool detected");
          if (ua.includes("nikto"))
            indicators.push("Web vulnerability scanner detected");
          if (ua.includes("nmap")) indicators.push("Network scanner detected");
        }
        break;

      case "high_request_rate":
        indicators.push(
          `Abnormally high request volume: ${anomaly.details?.requestCount} requests`
        );
        break;

      case "authentication_failures":
        indicators.push("Multiple failed authentication attempts");
        indicators.push("Possible credential stuffing or brute force");
        break;
    }

    return indicators;
  }

  /**
   * Determine likely intent behind anomaly
   */
  private determineLikelyIntent(anomaly: AnomalyDetectionResult): string {
    const intents: Record<string, string> = {
      sql_injection_attempt: "Database enumeration or credential extraction",
      xss_attempt:
        "Testing input validation for stored/reflected XSS vulnerabilities",
      path_traversal_attempt:
        "Identify misconfigurations or read sensitive system files",
      suspicious_user_agent: "Automated vulnerability scanning and enumeration",
      high_request_rate: "DDoS attack or aggressive reconnaissance",
      burst_traffic: "Automated scanning or brute force attack",
      authentication_failures:
        "Password spraying or brute force credential attack",
      high_error_rate: "System misconfiguration or active exploitation attempt",
      unusual_time_access: "Unauthorized access during off-hours",
      geographic_spread: "Distributed attack or botnet activity",
    };

    return intents[anomaly.type] || "Unknown malicious activity";
  }

  /**
   * Generate recommended actions for anomaly
   */
  private generateActions(anomaly: AnomalyDetectionResult): string[] {
    const actions: string[] = [];

    switch (anomaly.type) {
      case "sql_injection_attempt":
        actions.push("Block source IP at firewall or WAF");
        actions.push("Review and strengthen input validation");
        actions.push("Enable prepared statements in database queries");
        actions.push("Check database logs for successful breaches");
        break;

      case "xss_attempt":
        actions.push("Confirm input sanitization and output encoding");
        actions.push("Implement Content Security Policy (CSP)");
        actions.push("Review search and form endpoints");
        break;

      case "path_traversal_attempt":
        actions.push("Ensure path sanitization is implemented");
        actions.push("Apply principle of least privilege to file access");
        actions.push("Block source IP");
        actions.push("Review web server hardening");
        break;

      case "suspicious_user_agent":
        actions.push("Block known attack tool user agents at WAF");
        actions.push("Investigate other requests from same source");
        actions.push("Enable rate limiting for suspicious clients");
        break;

      case "high_request_rate":
      case "burst_traffic":
        actions.push("Implement rate limiting");
        actions.push("Enable DDoS protection");
        actions.push("Block or throttle source IP");
        break;

      case "authentication_failures":
        actions.push("Enable account lockout after N failed attempts");
        actions.push("Implement CAPTCHA on login pages");
        actions.push("Require MFA for admin accounts");
        actions.push("Block source IP temporarily");
        break;

      case "high_error_rate":
        actions.push("Review application logs for error details");
        actions.push("Check for misconfiguration or exploitation");
        actions.push("Monitor for data exfiltration attempts");
        break;

      case "unusual_time_access":
        actions.push("Verify legitimacy of after-hours access");
        actions.push("Require additional authentication for off-hours");
        actions.push("Set up alerts for unusual time patterns");
        break;
    }

    return actions;
  }

  /**
   * Identify threat actors by correlating anomalies
   */
  private identifyThreatActors(
    anomalies: EnhancedAnomaly[],
    entries: ParsedLogEntry[]
  ): ThreatActor[] {
    const actorMap = new Map<string, ThreatActor>();

    // Group anomalies by source IP
    for (const anomaly of anomalies) {
      const ip = anomaly.sourceIP || "unknown";
      if (!actorMap.has(ip)) {
        actorMap.set(ip, {
          sourceIP: ip,
          anomalies: [],
          indicators: [],
          userAgents: new Set(),
          endpoints: [],
          requestCount: 0,
          timeRange: null,
          severity: "low",
        });
      }

      const actor = actorMap.get(ip)!;
      actor.anomalies.push(anomaly);

      if (anomaly.indicators) {
        actor.indicators.push(...anomaly.indicators);
      }

      if (anomaly.userAgent) {
        actor.userAgents.add(anomaly.userAgent);
      }

      if (anomaly.payload) {
        actor.endpoints.push(anomaly.payload);
      }

      // Determine highest severity
      if (
        this.getSeverityLevel(anomaly.severity) >
        this.getSeverityLevel(actor.severity)
      ) {
        actor.severity = anomaly.severity;
      }
    }

    // Calculate request counts and time ranges for each actor
    for (const [ip, actor] of actorMap.entries()) {
      const actorEntries = entries.filter((e) => e.ip === ip);
      actor.requestCount = actorEntries.length;

      const timestamps = actorEntries
        .map((e) => e.timestamp)
        .filter(Boolean) as Date[];
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a.getTime() - b.getTime());
        actor.timeRange = {
          first: timestamps[0],
          last: timestamps[timestamps.length - 1],
        };
      }
    }

    // Sort by severity and anomaly count
    return Array.from(actorMap.values()).sort((a, b) => {
      const severityDiff =
        this.getSeverityLevel(b.severity) - this.getSeverityLevel(a.severity);
      if (severityDiff !== 0) return severityDiff;
      return b.anomalies.length - a.anomalies.length;
    });
  }

  /**
   * Get numeric severity level for comparison
   */
  private getSeverityLevel(severity: string): number {
    const levels: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return levels[severity] || 0;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    anomalies: EnhancedAnomaly[],
    threatActors: ThreatActor[]
  ): string[] {
    const recommendations: string[] = [];

    // IP-based recommendations
    const criticalActors = threatActors.filter(
      (a) => a.severity === "critical" || a.severity === "high"
    );
    if (criticalActors.length > 0) {
      recommendations.push(
        `🚨 IMMEDIATE: Block ${
          criticalActors.length
        } hostile IP address(es): ${criticalActors
          .slice(0, 3)
          .map((a) => a.sourceIP)
          .join(", ")}`
      );
    }

    // SQL injection specific
    const sqlInjections = anomalies.filter(
      (a) => a.type === "sql_injection_attempt"
    );
    if (sqlInjections.length > 0) {
      recommendations.push(
        "Enable WAF rules for SQL injection protection across all endpoints"
      );
      recommendations.push(
        "Audit all database queries for proper parameterization"
      );
    }

    // Authentication
    const authFailures = anomalies.filter(
      (a) => a.type === "authentication_failures"
    );
    if (authFailures.length > 0) {
      recommendations.push(
        "Implement rate limiting on authentication endpoints"
      );
      recommendations.push(
        "Enable Multi-Factor Authentication (MFA) for all admin accounts"
      );
    }

    // Scanner detection
    const scanners = anomalies.filter(
      (a) => a.type === "suspicious_user_agent"
    );
    if (scanners.length > 0) {
      recommendations.push(
        "Update WAF signatures to block known vulnerability scanners"
      );
      recommendations.push("Enable logging for all User-Agent headers");
    }

    // Path traversal
    const pathTraversal = anomalies.filter(
      (a) => a.type === "path_traversal_attempt"
    );
    if (pathTraversal.length > 0) {
      recommendations.push(
        "Implement strict input validation and path normalization"
      );
      recommendations.push(
        "Apply principle of least privilege to file system access"
      );
    }

    // XSS
    const xssAttempts = anomalies.filter((a) => a.type === "xss_attempt");
    if (xssAttempts.length > 0) {
      recommendations.push("Implement Content Security Policy (CSP) headers");
      recommendations.push(
        "Enable output encoding for all user-generated content"
      );
    }

    // General recommendations
    recommendations.push(
      "Review and correlate with IDS/IPS alerts for the same time period"
    );
    recommendations.push(
      "Check application and database logs for signs of successful exploitation"
    );
    recommendations.push(
      "Consider temporary blocking of suspicious geographic regions if pattern continues"
    );

    return recommendations;
  }
}
