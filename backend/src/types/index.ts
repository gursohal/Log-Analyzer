export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: Date;
}

export interface LogFile {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_path: string;
  log_type?: string;
  status: "processing" | "completed" | "failed";
  uploaded_at: Date;
}

export interface LogEntry {
  id: string;
  log_file_id: string;
  entry_index: number;
  timestamp?: Date;
  raw_content: string;
  parsed_data?: any;
}

export interface Anomaly {
  id: string;
  analysis_id: string;
  entry_index: number;
  anomaly_type: string;
  description: string;
  confidence_score: number;
  severity: "low" | "medium" | "high" | "critical";
  timestamp?: Date;
  details?: any;
  detected_at: Date;
}

export interface LogAnalysis {
  id: string;
  log_file_id: string;
  total_entries: number;
  anomaly_count: number;
  summary?: {
    total_requests?: number;
    unique_ips?: number;
    error_rate?: number;
    time_range?: {
      start: Date;
      end: Date;
    };
    top_sources?: Array<{ ip: string; count: number }>;
    status_distribution?: Record<string, number>;
  };
  timeline?: Array<{
    timestamp: Date;
    event_type: string;
    description: string;
    severity?: string;
  }>;
  statistics?: any;
  analyzed_at: Date;
}

export interface ParsedLogEntry {
  timestamp?: Date;
  ip?: string;
  method?: string;
  url?: string;
  status?: number;
  bytes?: number;
  user_agent?: string;
  referrer?: string;
  duration?: number;
  [key: string]: any;
}

export interface AnomalyDetectionResult {
  type: string;
  description: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  details?: any;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}
