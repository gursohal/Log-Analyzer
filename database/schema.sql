-- Database Schema for Log Analyzer

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log files table
CREATE TABLE IF NOT EXISTS log_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    log_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'processing',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log analyses table
CREATE TABLE IF NOT EXISTS log_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_file_id UUID NOT NULL REFERENCES log_files(id) ON DELETE CASCADE,
    total_entries INTEGER DEFAULT 0,
    anomaly_count INTEGER DEFAULT 0,
    summary JSONB,
    timeline JSONB,
    statistics JSONB,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES log_analyses(id) ON DELETE CASCADE,
    entry_index INTEGER NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    confidence_score DECIMAL(5, 2) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP,
    details JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log entries table (for storing parsed log lines)
CREATE TABLE IF NOT EXISTS log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_file_id UUID NOT NULL REFERENCES log_files(id) ON DELETE CASCADE,
    entry_index INTEGER NOT NULL,
    timestamp TIMESTAMP,
    raw_content TEXT NOT NULL,
    parsed_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_log_files_user_id ON log_files(user_id);
CREATE INDEX IF NOT EXISTS idx_log_files_status ON log_files(status);
CREATE INDEX IF NOT EXISTS idx_log_analyses_log_file_id ON log_analyses(log_file_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_analysis_id ON anomalies(analysis_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_confidence ON anomalies(confidence_score);
CREATE INDEX IF NOT EXISTS idx_log_entries_log_file_id ON log_entries(log_file_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp);

-- Note: No default users are created for security reasons
-- Create your first user by registering through the /api/auth/register endpoint
-- Or use the setup script: npm run setup-admin
