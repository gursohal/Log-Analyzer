import { ParsedLogEntry } from "../types";

/**
 * Log Parser Service
 * Supports multiple log formats: ZScaler, Apache, Nginx, generic application logs
 */

export class LogParser {
  /**
   * Detect log format based on content patterns
   */
  detectLogFormat(content: string): string {
    const firstLines = content.split("\n").slice(0, 5).join("\n");

    if (this.isSimpleLog(firstLines)) {
      return "simple";
    } else if (this.isZScalerLog(firstLines)) {
      return "zscaler";
    } else if (this.isApacheLog(firstLines)) {
      return "apache";
    } else if (this.isNginxLog(firstLines)) {
      return "nginx";
    } else if (this.isApplicationLog(firstLines)) {
      return "application";
    }

    return "generic";
  }

  /**
   * Parse log file based on detected format
   */
  parseLogFile(content: string, format?: string): ParsedLogEntry[] {
    const detectedFormat = format || this.detectLogFormat(content);
    const lines = content.split("\n").filter((line) => line.trim());

    switch (detectedFormat) {
      case "simple":
        return this.parseSimpleLogs(lines);
      case "zscaler":
        return this.parseZScalerLogs(lines);
      case "apache":
        return this.parseApacheLogs(lines);
      case "nginx":
        return this.parseNginxLogs(lines);
      case "application":
        return this.parseApplicationLogs(lines);
      default:
        return this.parseGenericLogs(lines);
    }
  }

  /**
   * Parse ZScaler Web Proxy logs
   * Format: timestamp,user,department,url,action,threat,category,etc.
   */
  private parseZScalerLogs(lines: string[]): ParsedLogEntry[] {
    const entries: ParsedLogEntry[] = [];

    for (const line of lines) {
      try {
        const parts = line.split(",");

        if (parts.length < 5) continue;

        entries.push({
          timestamp: this.parseTimestamp(parts[0]),
          user: parts[1]?.trim(),
          department: parts[2]?.trim(),
          url: parts[3]?.trim(),
          action: parts[4]?.trim(),
          threat: parts[5]?.trim(),
          category: parts[6]?.trim(),
          bytes: parseInt(parts[7]) || 0,
          raw: line,
        });
      } catch (error) {
        console.error("Error parsing ZScaler log line:", error);
      }
    }

    return entries;
  }

  /**
   * Parse Apache Combined Log Format
   * Format: IP - - [timestamp] "METHOD URL PROTOCOL" status bytes "referrer" "user-agent"
   */
  private parseApacheLogs(lines: string[]): ParsedLogEntry[] {
    const entries: ParsedLogEntry[] = [];
    const apacheRegex =
      /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]*) \S+" (\d{3}) (\S+) "([^"]*)" "([^"]*)"/;

    for (const line of lines) {
      try {
        const match = line.match(apacheRegex);
        if (!match) continue;

        entries.push({
          ip: match[1],
          timestamp: this.parseApacheTimestamp(match[2]),
          method: match[3],
          url: match[4],
          status: parseInt(match[5]),
          bytes: match[6] === "-" ? 0 : parseInt(match[6]),
          referrer: match[7],
          user_agent: match[8],
          raw: line,
        });
      } catch (error) {
        console.error("Error parsing Apache log line:", error);
      }
    }

    return entries;
  }

  /**
   * Parse Nginx logs (similar to Apache)
   */
  private parseNginxLogs(lines: string[]): ParsedLogEntry[] {
    return this.parseApacheLogs(lines);
  }

  /**
   * Parse generic application logs
   * Format: [timestamp] LEVEL: message
   */
  private parseApplicationLogs(lines: string[]): ParsedLogEntry[] {
    const entries: ParsedLogEntry[] = [];
    const logRegex = /^\[([^\]]+)\]\s+(\w+):\s*(.+)$/;

    for (const line of lines) {
      try {
        const match = line.match(logRegex);
        if (match) {
          entries.push({
            timestamp: this.parseTimestamp(match[1]),
            level: match[2],
            message: match[3],
            raw: line,
          });
        } else {
          entries.push({
            message: line,
            raw: line,
          });
        }
      } catch (error) {
        console.error("Error parsing application log line:", error);
      }
    }

    return entries;
  }

  /**
   * Parse generic logs (best effort)
   */
  private parseGenericLogs(lines: string[]): ParsedLogEntry[] {
    const entries: ParsedLogEntry[] = [];

    for (const line of lines) {
      entries.push({
        message: line,
        raw: line,
      });
    }

    return entries;
  }

  /**
   * Format detection helpers
   */
  private isZScalerLog(sample: string): boolean {
    return (
      sample.includes(",") &&
      (sample.toLowerCase().includes("zscaler") ||
        sample.toLowerCase().includes("url") ||
        sample.toLowerCase().includes("action"))
    );
  }

  private isApacheLog(sample: string): boolean {
    return /\d+\.\d+\.\d+\.\d+ - - \[/.test(sample);
  }

  private isNginxLog(sample: string): boolean {
    return this.isApacheLog(sample);
  }

  private isApplicationLog(sample: string): boolean {
    return /^\[.*\]\s+(INFO|DEBUG|WARN|ERROR|FATAL):/m.test(sample);
  }

  private isSimpleLog(sample: string): boolean {
    // Format: 2025-12-06T12:00:10 GET /api/path 200
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\s+(GET|POST|PUT|DELETE|PATCH)\s+\/\S*\s+\d{3}/.test(
      sample
    );
  }

  /**
   * Parse simple timestamp method url status logs
   * Format: 2025-12-06T12:00:10 GET /api/path 200
   */
  private parseSimpleLogs(lines: string[]): ParsedLogEntry[] {
    const entries: ParsedLogEntry[] = [];
    // Format: timestamp method url status
    const simpleRegex = /^(\S+)\s+(\S+)\s+(\S+)\s+(\d{3})$/;

    for (const line of lines) {
      try {
        const match = line.match(simpleRegex);
        if (match) {
          entries.push({
            timestamp: this.parseTimestamp(match[1]),
            method: match[2],
            url: match[3],
            status: parseInt(match[4]),
            raw: line,
          });
        }
      } catch (error) {
        console.error("Error parsing simple log line:", error);
      }
    }

    return entries;
  }

  /**
   * Timestamp parsing helpers
   */
  private parseTimestamp(timeStr: string): Date | undefined {
    try {
      const date = new Date(timeStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  private parseApacheTimestamp(timeStr: string): Date | undefined {
    try {
      // Format: 10/Oct/2000:13:55:36 -0700
      const parts = timeStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+)/);
      if (!parts) return undefined;

      const months: { [key: string]: number } = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const date = new Date(
        parseInt(parts[3]),
        months[parts[2]],
        parseInt(parts[1]),
        parseInt(parts[4]),
        parseInt(parts[5]),
        parseInt(parts[6])
      );

      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }
}
