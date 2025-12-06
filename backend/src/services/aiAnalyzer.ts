import OpenAI from "openai";
import { AnomalyDetectionResult, ParsedLogEntry } from "../types";

/**
 * AI-Powered Anomaly Detection Service using OpenAI GPT-4
 *
 * AI USAGE DOCUMENTATION:
 * - Location: This service (backend/src/services/aiAnalyzer.ts)
 * - Purpose: Advanced pattern recognition, threat intelligence, and semantic analysis
 * - Model: OpenAI GPT-4 (gpt-4-turbo-preview)
 * - Input: Parsed log entries with statistical features
 * - Output: Anomaly classifications with confidence scores and human-readable explanations
 *
 * HOW AI IS USED:
 * 1. Analyzes log patterns that are difficult to detect with rule-based systems
 * 2. Provides contextual understanding of security threats
 * 3. Generates natural language explanations for detected anomalies
 * 4. Correlates multiple events to identify sophisticated attack patterns
 * 5. Adapts to new and emerging threat patterns
 */

export class AIAnalyzer {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== "your-openai-api-key-here") {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn(
        "OpenAI API key not configured. AI-powered analysis will be limited."
      );
    }
  }

  /**
   * Analyze log entries using AI for advanced threat detection
   */
  async analyzeWithAI(
    entries: ParsedLogEntry[],
    statisticalAnomalies: AnomalyDetectionResult[]
  ): Promise<AnomalyDetectionResult[]> {
    if (!this.openai) {
      console.log("AI analysis skipped - OpenAI not configured");
      return [];
    }

    try {
      // Sample entries for AI analysis (to avoid token limits)
      const sampleSize = Math.min(100, entries.length);
      const sampledEntries = this.sampleEntries(entries, sampleSize);

      // Prepare context for AI
      const context = this.prepareContext(sampledEntries, statisticalAnomalies);

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `You are a cybersecurity expert analyzing web server logs for security threats and anomalies. 
            Your task is to identify potential security issues, attack patterns, and unusual behaviors.
            Focus on:
            - SQL injection attempts
            - Cross-site scripting (XSS)
            - Brute force attacks
            - Data exfiltration patterns
            - Unusual access patterns
            - Privilege escalation attempts
            - Session hijacking indicators
            
            Respond in JSON format with an array of anomalies. Each anomaly should have:
            - type: string (e.g., "sql_injection", "brute_force", "data_exfiltration")
            - description: string (clear explanation for SOC analysts)
            - confidence: number (0-100)
            - severity: string ("low", "medium", "high", "critical")
            - evidence: array of log entry indices or patterns that support this finding`,
          },
          {
            role: "user",
            content: context,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 2000,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        return [];
      }

      // Parse AI response
      return this.parseAIResponse(aiResponse);
    } catch (error: any) {
      console.error("Error in AI analysis:", error.message);
      return [];
    }
  }

  /**
   * Generate a timeline summary using AI
   */
  async generateTimelineSummary(entries: ParsedLogEntry[]): Promise<string> {
    if (!this.openai) {
      return this.generateBasicTimeline(entries);
    }

    try {
      const keyEvents = this.extractKeyEvents(entries);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a SOC analyst creating a concise timeline summary of security events. Highlight the most important events and their implications.",
          },
          {
            role: "user",
            content: `Analyze these log events and create a brief timeline summary (2-3 paragraphs):\n\n${keyEvents}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      return (
        response.choices[0]?.message?.content ||
        this.generateBasicTimeline(entries)
      );
    } catch (error) {
      console.error("Error generating AI timeline:", error);
      return this.generateBasicTimeline(entries);
    }
  }

  /**
   * Sample entries evenly from the dataset
   */
  private sampleEntries(
    entries: ParsedLogEntry[],
    sampleSize: number
  ): ParsedLogEntry[] {
    if (entries.length <= sampleSize) {
      return entries;
    }

    const step = Math.floor(entries.length / sampleSize);
    const sampled: ParsedLogEntry[] = [];

    for (let i = 0; i < entries.length; i += step) {
      sampled.push(entries[i]);
      if (sampled.length >= sampleSize) break;
    }

    return sampled;
  }

  /**
   * Prepare context for AI analysis
   */
  private prepareContext(
    entries: ParsedLogEntry[],
    statisticalAnomalies: AnomalyDetectionResult[]
  ): string {
    let context = "LOG ANALYSIS REQUEST\n\n";

    // Add statistical anomalies detected
    if (statisticalAnomalies.length > 0) {
      context += "STATISTICAL ANOMALIES DETECTED:\n";
      statisticalAnomalies.forEach((anomaly, i) => {
        context += `${i + 1}. ${anomaly.type}: ${anomaly.description}\n`;
      });
      context += "\n";
    }

    // Add sample log entries
    context += "SAMPLE LOG ENTRIES:\n";
    entries.forEach((entry, i) => {
      const timestamp = entry.timestamp ? entry.timestamp.toISOString() : "N/A";
      const ip = entry.ip || "N/A";
      const method = entry.method || "N/A";
      const url = entry.url || entry.message || entry.raw?.substring(0, 100);
      const status = entry.status || "N/A";

      context += `[${i}] ${timestamp} | IP: ${ip} | ${method} ${url} | Status: ${status}\n`;
    });

    context +=
      "\n\nAnalyze these logs for security threats and unusual patterns. Return results in JSON format.";

    return context;
  }

  /**
   * Parse AI response into anomaly objects
   */
  private parseAIResponse(response: string): AnomalyDetectionResult[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn("No JSON array found in AI response");
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item: any) => ({
        type: item.type || "ai_detected_anomaly",
        description: item.description || "AI detected unusual pattern",
        confidence: Math.min(100, Math.max(0, item.confidence || 70)),
        severity: this.normalizeSeverity(item.severity),
        details: {
          ai_generated: true,
          evidence: item.evidence || [],
        },
      }));
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return [];
    }
  }

  /**
   * Extract key events for timeline generation
   */
  private extractKeyEvents(entries: ParsedLogEntry[]): string {
    const events: string[] = [];

    // Get first and last entries
    if (entries.length > 0) {
      const first = entries[0];
      const last = entries[entries.length - 1];

      events.push(
        `First event: ${first.timestamp?.toISOString() || "Unknown time"}`
      );
      events.push(
        `Last event: ${last.timestamp?.toISOString() || "Unknown time"}`
      );
    }

    // Get errors
    const errors = entries.filter((e) => e.status && e.status >= 400);
    if (errors.length > 0) {
      events.push(`${errors.length} error responses detected`);
    }

    // Get unique IPs
    const uniqueIPs = new Set(entries.map((e) => e.ip).filter(Boolean));
    events.push(`${uniqueIPs.size} unique IP addresses`);

    return events.join("\n");
  }

  /**
   * Generate a basic timeline without AI
   */
  private generateBasicTimeline(entries: ParsedLogEntry[]): string {
    if (entries.length === 0) {
      return "No log entries to analyze.";
    }

    const timeRange =
      entries[0].timestamp && entries[entries.length - 1].timestamp
        ? `from ${entries[0].timestamp.toISOString()} to ${entries[
            entries.length - 1
          ].timestamp.toISOString()}`
        : "with unknown time range";

    const uniqueIPs = new Set(entries.map((e) => e.ip).filter(Boolean));
    const errors = entries.filter((e) => e.status && e.status >= 400);

    return `Log analysis ${timeRange} shows ${entries.length} total requests from ${uniqueIPs.size} unique IP addresses. ${errors.length} error responses were recorded. Further analysis may reveal additional patterns.`;
  }

  /**
   * Normalize severity values
   */
  private normalizeSeverity(
    severity: string
  ): "low" | "medium" | "high" | "critical" {
    const normalized = severity?.toLowerCase();
    if (
      normalized === "low" ||
      normalized === "medium" ||
      normalized === "high" ||
      normalized === "critical"
    ) {
      return normalized;
    }
    return "medium";
  }
}
