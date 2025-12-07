# Database Access & Management Guide

This guide explains how to access and manage the PostgreSQL database for the Claude Log Analyzer.

## 📊 Database Overview

**Database Management System**: PostgreSQL 15
**Database Name**: `log_analyzer`
**Default Credentials** (Development):

- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres`

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

The database is automatically set up when you run docker-compose:

```bash
# Start all services (database, backend, frontend)
docker-compose up -d

# Check database status
docker-compose ps
```

The database will be accessible at `localhost:5432` with the credentials above.

### Option 2: Local PostgreSQL Installation

If you have PostgreSQL installed locally:

```bash
# Create database
createdb -U postgres log_analyzer

# Run schema
psql -U postgres log_analyzer < database/schema.sql
```

## 🔐 Initial User Setup

### Secure Method: Using the Setup Script

After starting the database, create your first admin user:

```bash
cd backend
node setup-admin.js
```

This interactive script will:

1. ✅ Validate database connection
2. ✅ Check for existing users
3. ✅ Validate email format
4. ✅ Enforce strong password requirements (8+ chars, uppercase, lowercase, number)
5. ✅ Confirm password entry
6. ✅ Hash password securely (bcrypt)
7. ✅ Create the admin user

**Example Session**:

```
===========================================
  Claude Log Analyzer - Admin Setup
===========================================

✅ Database connection successful

Enter admin email: admin@yourcompany.com
Enter admin name (optional): System Admin
Enter admin password (min 8 chars, 1 uppercase, 1 lowercase, 1 number): ********
Confirm password: ********

🔐 Hashing password...

✅ Admin user created successfully!

User Details:
  ID: 123e4567-e89b-12d3-a456-426614174000
  Email: admin@yourcompany.com
  Name: System Admin

⚠️  IMPORTANT: Keep these credentials secure!
You can now log in at: http://localhost:3000/login
```

### Alternative: Using the Registration Endpoint

You can also create users via the API:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "SecurePass123",
    "name": "Admin User"
  }'
```

**Note**: The registration endpoint includes validation for strong passwords.

## 🗄️ Accessing the Database

### Using Docker

```bash
# Access PostgreSQL shell in Docker container
docker exec -it log-analyzer-db psql -U postgres -d log_analyzer

# Or using docker-compose
docker-compose exec postgres psql -U postgres -d log_analyzer
```

### Using Local psql

```bash
# Connect to database
psql -h localhost -p 5432 -U postgres -d log_analyzer

# With password prompt
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d log_analyzer
```

### Using GUI Tools

#### pgAdmin

1. Download from: https://www.pgadmin.org/
2. Add new server:
   - Host: `localhost`
   - Port: `5432`
   - Database: `log_analyzer`
   - Username: `postgres`
   - Password: `postgres`

#### DBeaver

1. Download from: https://dbeaver.io/
2. Create new PostgreSQL connection with the credentials above

#### DataGrip (JetBrains)

1. Add PostgreSQL data source
2. Use the connection details above

## 📋 Database Schema

### Tables

1. **users** - User authentication

   - `id` (UUID, Primary Key)
   - `email` (VARCHAR, Unique)
   - `password_hash` (VARCHAR)
   - `name` (VARCHAR)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **log_files** - Uploaded log files

   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key → users)
   - `filename`, `original_filename` (VARCHAR)
   - `file_size` (INTEGER)
   - `file_path` (VARCHAR)
   - `log_type` (VARCHAR)
   - `status` (VARCHAR)
   - `uploaded_at` (TIMESTAMP)

3. **log_analyses** - Analysis results

   - `id` (UUID, Primary Key)
   - `log_file_id` (UUID, Foreign Key → log_files)
   - `total_entries`, `anomaly_count` (INTEGER)
   - `summary`, `timeline`, `statistics` (JSONB)
   - `analyzed_at` (TIMESTAMP)

4. **anomalies** - Detected security threats

   - `id` (UUID, Primary Key)
   - `analysis_id` (UUID, Foreign Key → log_analyses)
   - `entry_index` (INTEGER)
   - `anomaly_type` (VARCHAR)
   - `description` (TEXT)
   - `confidence_score` (DECIMAL)
   - `severity` (VARCHAR)
   - `timestamp` (TIMESTAMP)
   - `details` (JSONB)
   - `detected_at` (TIMESTAMP)

5. **log_entries** - Individual log lines
   - `id` (UUID, Primary Key)
   - `log_file_id` (UUID, Foreign Key → log_files)
   - `entry_index` (INTEGER)
   - `timestamp` (TIMESTAMP)
   - `raw_content` (TEXT)
   - `parsed_data` (JSONB)
   - `created_at` (TIMESTAMP)

### Indexes

All foreign keys and frequently queried columns have indexes for optimal performance.

## 🔍 Useful Database Queries

### Check Users

```sql
-- List all users
SELECT id, email, name, created_at FROM users;

-- Count users
SELECT COUNT(*) FROM users;

-- Find specific user
SELECT * FROM users WHERE email = 'admin@example.com';
```

### Check Log Files

```sql
-- Recent uploads
SELECT
  lf.original_filename,
  lf.status,
  lf.uploaded_at,
  u.email as uploaded_by
FROM log_files lf
JOIN users u ON lf.user_id = u.id
ORDER BY lf.uploaded_at DESC
LIMIT 10;

-- Upload statistics
SELECT
  status,
  COUNT(*) as count
FROM log_files
GROUP BY status;
```

### Check Analyses

```sql
-- Recent analyses with anomaly count
SELECT
  la.id,
  lf.original_filename,
  la.total_entries,
  la.anomaly_count,
  la.analyzed_at
FROM log_analyses la
JOIN log_files lf ON la.log_file_id = lf.id
ORDER BY la.analyzed_at DESC
LIMIT 10;
```

### Check Anomalies

```sql
-- High severity anomalies
SELECT
  anomaly_type,
  severity,
  COUNT(*) as count
FROM anomalies
WHERE severity IN ('high', 'critical')
GROUP BY anomaly_type, severity
ORDER BY count DESC;

-- Recent critical threats
SELECT
  a.anomaly_type,
  a.description,
  a.confidence_score,
  a.detected_at
FROM anomalies a
WHERE a.severity = 'critical'
ORDER BY a.detected_at DESC
LIMIT 20;
```

## 🧹 Maintenance & Cleanup

### Delete Old Data

```sql
-- Delete log files older than 90 days
DELETE FROM log_files
WHERE uploaded_at < NOW() - INTERVAL '90 days';

-- Orphaned data is automatically deleted due to CASCADE constraints
```

### Vacuum Database

```sql
-- Reclaim storage and update statistics
VACUUM ANALYZE;

-- Full vacuum (requires exclusive lock)
VACUUM FULL;
```

### Check Database Size

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('log_analyzer'));

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔒 Security Best Practices

### Production Database Setup

1. **Change Default Password**:

```sql
ALTER USER postgres WITH PASSWORD 'your-strong-password';
```

2. **Create Application User** (Recommended):

```sql
-- Create dedicated user for the application
CREATE USER log_analyzer_app WITH PASSWORD 'strong-app-password';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE log_analyzer TO log_analyzer_app;
GRANT USAGE ON SCHEMA public TO log_analyzer_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO log_analyzer_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO log_analyzer_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO log_analyzer_app;
```

3. **Update Connection Settings**:
   Update your `.env` file:

```bash
DB_USER=log_analyzer_app
DB_PASSWORD=strong-app-password
```

4. **Restrict Network Access**:
   In `postgresql.conf`:

```
listen_addresses = 'localhost'
```

In `pg_hba.conf`:

```
# Allow only local connections
host    log_analyzer    log_analyzer_app    127.0.0.1/32    scram-sha-256
```

## 📦 Backup & Restore

### Backup Database

```bash
# Full backup
pg_dump -U postgres log_analyzer > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -U postgres log_analyzer | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup with Docker
docker exec log-analyzer-db pg_dump -U postgres log_analyzer > backup.sql
```

### Restore Database

```bash
# Restore from backup
psql -U postgres log_analyzer < backup_20241206_120000.sql

# Restore compressed backup
gunzip -c backup_20241206_120000.sql.gz | psql -U postgres log_analyzer

# Restore with Docker
docker exec -i log-analyzer-db psql -U postgres log_analyzer < backup.sql
```

### Automated Backups (Linux/Mac)

Create a cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U postgres log_analyzer | gzip > /backups/log_analyzer_$(date +\%Y\%m\%d).sql.gz
```

## 🔧 Troubleshooting

### Connection Issues

**Problem**: Cannot connect to database

```bash
# Check if PostgreSQL is running
docker-compose ps  # For Docker
sudo systemctl status postgresql  # For local installation

# Check if port is listening
netstat -an | grep 5432

# Test connection
psql -h localhost -p 5432 -U postgres -d log_analyzer
```

**Problem**: Authentication failed

- Verify credentials in `.env` file
- Check `pg_hba.conf` for authentication method
- Ensure user has proper permissions

### Performance Issues

```sql
-- Find slow queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '5 seconds';

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 📞 Support

For database-related issues:

1. Check connection settings in `.env`
2. Verify database is running: `docker-compose ps`
3. Check logs: `docker-compose logs postgres`
4. Review this guide's troubleshooting section

## 🔗 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
