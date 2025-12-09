import { Response } from "express";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { query } from "../config/database";
import { AuthRequest } from "../middleware/auth";
import { AIAnalyzer } from "../services/aiAnalyzer";
import { LogParser } from "../services/logParser";
import { ProductionAnomalyDetector } from "../services/productionAnomalyDetector";
import { ReportGenerator } from "../services/reportGenerator";

/**
 * Log Analysis Controller
 * Handles log file uploads, processing, and analysis
 */

const logParser = new LogParser();
const anomalyDetector = new ProductionAnomalyDetector();
const aiAnalyzer = new AIAnalyzer();
const reportGenerator = new ReportGenerator();

export const uploadLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;
    const file = req.file;

    // Validate file size and type
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || "10485760"); // 10MB
    if (file.size > maxSize) {
      fs.unlinkSync(file.path); // Delete uploaded file
      res.status(400).json({ error: "File too large" });
      return;
    }

    // Save file metadata to database
    const fileId = uuidv4();
    await query(
      `INSERT INTO log_files (id, user_id, filename, original_filename, file_size, file_path, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        fileId,
        userId,
        file.filename,
        file.originalname,
        file.size,
        file.path,
        "processing",
      ]
    );

    // Start processing in background (don't wait for it)
    processLogFile(fileId, file.path).catch((error) => {
      console.error(`Error processing file ${fileId}:`, error);
    });

    res.json({
      message: "File uploaded successfully",
      fileId,
      status: "processing",
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Process log file in the background
 */
async function processLogFile(fileId: string, filePath: string) {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, "utf-8");

    // Detect format and parse
    const format = logParser.detectLogFormat(content);
    const entries = logParser.parseLogFile(content, format);

    // Update log file with detected format
    await query("UPDATE log_files SET log_type = $1 WHERE id = $2", [
      format,
      fileId,
    ]);

    // Store parsed entries in database
    for (let i = 0; i < entries.length; i++) {
      await query(
        `INSERT INTO log_entries (log_file_id, entry_index, timestamp, raw_content, parsed_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          fileId,
          i,
          entries[i].timestamp || null,
          entries[i].raw || "",
          JSON.stringify(entries[i]),
        ]
      );
    }

    // Run statistical anomaly detection
    const statisticalAnomalies = anomalyDetector.detectAnomalies(entries);

    // Run AI-powered analysis
    const aiAnomalies = await aiAnalyzer.analyzeWithAI(
      entries,
      statisticalAnomalies
    );

    // Combine anomalies
    const allAnomalies = [...statisticalAnomalies, ...aiAnomalies];

    // Generate comprehensive SOC report
    const socReport = reportGenerator.generateSOCReport(allAnomalies, entries);

    // Calculate statistics
    const statistics = anomalyDetector.calculateStatistics(entries);

    // Generate timeline
    const timeline = generateTimeline(entries, allAnomalies);

    // Generate summary
    const summary = {
      total_requests: entries.length,
      unique_ips: statistics.uniqueIPs,
      error_rate: statistics.errorRate,
      time_range: {
        start: entries[0]?.timestamp || null,
        end: entries[entries.length - 1]?.timestamp || null,
      },
      status_distribution: statistics.statusCodes,
      methods: getMethodDistribution(entries),
      top_sources: getTopSources(entries, 10),
      high_risk: socReport.summary.highCount + socReport.summary.criticalCount,
      medium_risk: socReport.summary.mediumCount,
      low_risk: socReport.summary.lowCount,
    };

    // Create analysis record with SOC report
    const analysisResult = await query(
      `INSERT INTO log_analyses (log_file_id, total_entries, anomaly_count, summary, timeline, statistics)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        fileId,
        entries.length,
        allAnomalies.length,
        JSON.stringify({ ...summary, socReport }),
        JSON.stringify(timeline),
        JSON.stringify(statistics),
      ]
    );

    const analysisId = analysisResult.rows[0].id;

    // Store anomalies
    for (let i = 0; i < allAnomalies.length; i++) {
      const anomaly = allAnomalies[i];
      await query(
        `INSERT INTO anomalies (analysis_id, entry_index, anomaly_type, description, confidence_score, severity, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          analysisId,
          i,
          anomaly.type,
          anomaly.description,
          anomaly.confidence,
          anomaly.severity,
          JSON.stringify(anomaly.details || {}),
        ]
      );
    }

    // Update log file status
    await query("UPDATE log_files SET status = $1 WHERE id = $2", [
      "completed",
      fileId,
    ]);

    console.log(`Successfully processed file ${fileId}`);
  } catch (error) {
    console.error(`Error processing file ${fileId}:`, error);

    // Update status to failed
    await query("UPDATE log_files SET status = $1 WHERE id = $2", [
      "failed",
      fileId,
    ]);
  }
}

/**
 * Get analysis results
 */
export const getAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const fileId = req.params.fileId;

    // Get log file info
    const fileResult = await query(
      "SELECT * FROM log_files WHERE id = $1 AND user_id = $2",
      [fileId, req.user.userId]
    );

    if (fileResult.rows.length === 0) {
      res.status(404).json({ error: "Log file not found" });
      return;
    }

    const logFile = fileResult.rows[0];

    // If still processing, return status
    if (logFile.status === "processing") {
      res.json({
        status: "processing",
        message: "Log file is still being processed",
      });
      return;
    }

    // If failed, return error
    if (logFile.status === "failed") {
      res.status(500).json({
        status: "failed",
        error: "Log file processing failed",
      });
      return;
    }

    // Get analysis results
    const analysisResult = await query(
      "SELECT * FROM log_analyses WHERE log_file_id = $1",
      [fileId]
    );

    if (analysisResult.rows.length === 0) {
      res.status(404).json({ error: "Analysis not found" });
      return;
    }

    const analysis = analysisResult.rows[0];

    // Get anomalies
    const anomaliesResult = await query(
      "SELECT * FROM anomalies WHERE analysis_id = $1 ORDER BY confidence_score DESC",
      [analysis.id]
    );

    res.json({
      status: "completed",
      file: {
        id: logFile.id,
        filename: logFile.original_filename,
        size: logFile.file_size,
        log_type: logFile.log_type,
        uploaded_at: logFile.uploaded_at,
      },
      analysis: {
        id: analysis.id,
        total_entries: analysis.total_entries,
        anomaly_count: analysis.anomaly_count,
        summary: analysis.summary,
        timeline: analysis.timeline,
        statistics: analysis.statistics,
        analyzed_at: analysis.analyzed_at,
      },
      anomalies: anomaliesResult.rows,
    });
  } catch (error) {
    console.error("Get analysis error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get user's log files
 */
export const getUserLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await query(
      "SELECT id, filename, original_filename, file_size, log_type, status, uploaded_at FROM log_files WHERE user_id = $1 ORDER BY uploaded_at DESC",
      [req.user.userId]
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error("Get user logs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Helper: Generate timeline from entries and anomalies with ACCURATE timestamps
 * FIXED: Always uses log timestamps, never current time
 */
function generateTimeline(entries: any[], anomalies: any[]) {
  const timeline: any[] = [];

  // Add log start event with actual log time
  if (entries.length > 0 && entries[0].timestamp) {
    timeline.push({
      timestamp: entries[0].timestamp,
      event_type: "log_start",
      description: `Log recording started - ${entries.length} entries processed`,
      severity: "info",
    });
  }

  // Add anomalies with their ACTUAL event timestamps from logs
  for (const anomaly of anomalies) {
    let timestamp = null;

    // Priority 1: Use event_timestamp from anomaly details (log time)
    if (anomaly.details?.event_timestamp) {
      timestamp = new Date(anomaly.details.event_timestamp);
    }
    // Priority 2: Use timestamp field (log time)
    else if (anomaly.details?.timestamp) {
      timestamp = new Date(anomaly.details.timestamp);
    }
    // Priority 3: Use firstAttempt for brute force
    else if (anomaly.details?.firstAttempt) {
      timestamp = new Date(anomaly.details.firstAttempt);
    }
    // Priority 4: Look up from entry index
    else if (anomaly.details?.entryIndex !== undefined) {
      const entry = entries[anomaly.details.entryIndex];
      if (entry && entry.timestamp) {
        timestamp = entry.timestamp;
      }
    }

    // Only add to timeline if we have a valid log timestamp
    if (timestamp && !isNaN(timestamp.getTime())) {
      timeline.push({
        timestamp,
        event_type: anomaly.type,
        description: anomaly.description,
        severity: anomaly.severity,
        details: anomaly.details,
      });
    }
  }

  // Add log end event with actual log time
  if (entries.length > 0 && entries[entries.length - 1].timestamp) {
    timeline.push({
      timestamp: entries[entries.length - 1].timestamp,
      event_type: "log_end",
      description: `Log recording ended - Analysis complete`,
      severity: "info",
    });
  }

  // Sort by timestamp
  return timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Helper: Get top source IPs
 */
function getTopSources(entries: any[], limit: number) {
  const ipCounts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.ip) {
      ipCounts.set(entry.ip, (ipCounts.get(entry.ip) || 0) + 1);
    }
  }

  return Array.from(ipCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ip, count]) => ({ ip, count }));
}

/**
 * Helper: Get HTTP method distribution
 */
function getMethodDistribution(entries: any[]): Record<string, number> {
  const methodCounts: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.method) {
      const method = entry.method.toUpperCase();
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    }
  }

  return methodCounts;
}
