# Quick Start Guide

## Starting the Application

### Step 1: Start All Services

```powershell
cd C:\Users\gursohal\claude-log-analyzer
docker-compose up -d
```

### Step 2: Wait for Services (30 seconds)

```powershell
docker ps
```

You should see 3 containers running:

- `log-analyzer-db` (PostgreSQL)
- `log-analyzer-backend` (API Server)
- `log-analyzer-frontend` (Web UI)

### Step 3: Access the Application

Open your browser to: **http://localhost:3000**

### Step 4: Login

- Email: `admin@example.com`
- Password: `admin123`

### Step 5: Upload a Log File

1. Click the upload area on the dashboard
2. Select `examples/apache-access.log`
3. Click Open
4. You'll see "File uploaded successfully!"

---

## Current Status: Results Display

**⚠️ IMPORTANT:** After upload, you see "success" but the dashboard doesn't show results yet.

**This is because:** The frontend UI doesn't have the results display section implemented yet. However, **the backend IS processing your file successfully!**

### How to See Your Results

#### Option 1: Check Backend Logs (Easiest)

```powershell
docker logs log-analyzer-backend --tail 100
```

Look for output like:

```
✓ Parsed 50 log entries
✓ Detected 5 anomalies
  - SQL Injection attempt (confidence: 85%)
  - XSS attack (confidence: 82%)
  - Path traversal (confidence: 78%)
  ...
```

#### Option 2: Query the API Directly

**Step 1: Get your auth token**

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"admin123"}'

$token = $response.token
Write-Host "Your token: $token"
```

**Step 2: Get your uploaded files**

```powershell
$logs = Invoke-RestMethod -Uri "http://localhost:5000/api/logs" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}

$logs | Format-List
```

**Step 3: Get analysis for a specific file**

```powershell
# Use the file ID from step 2
$fileId = $logs[0].id

$analysis = Invoke-RestMethod -Uri "http://localhost:5000/api/logs/$fileId/analysis" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}

# View the analysis
$analysis | ConvertTo-Json -Depth 10
```

This will show you:

- Total entries processed
- Detected anomalies with confidence scores
- Timeline of events
- Statistics

---

## Stopping the Application

```powershell
docker-compose down
```

---

## For Your Video/Presentation

Since the results UI isn't implemented, focus on demonstrating:

1. **The Working System**

   - Show all services running
   - Login works
   - File upload succeeds
   - Backend processes files (show logs)

2. **Backend Implementation** (Most Important!)

   - Show the code:
     - `backend/src/services/logParser.ts`
     - `backend/src/services/anomalyDetector.ts`
     - `backend/src/services/aiAnalyzer.ts` ⭐ (AI implementation)
   - Explain the algorithms
   - Show the database schema

3. **API Testing**

   - Use Postman or PowerShell
   - Demonstrate login endpoint
   - Show file upload endpoint
   - Display analysis results from API

4. **Explain the Architecture**
   - Frontend: Next.js with authentication
   - Backend: Express API with log processing
   - Database: PostgreSQL storing results
   - Docker: Containerized deployment

### What to Say

"The application successfully processes log files and detects anomalies. The backend analysis engine is complete and working - it parses logs, detects threats using both statistical analysis and AI, and stores results in PostgreSQL. The API exposes all this data. The frontend handles authentication and file uploads successfully. Given time constraints, I focused on the core backend functionality which demonstrates the technical depth needed for SOC analysis."

---

## What's Working ✅

✅ Docker deployment (3 services)
✅ Authentication (JWT)
✅ File upload
✅ Log parsing (multiple formats)
✅ Anomaly detection (SQL injection, XSS, etc.)
✅ AI analysis integration
✅ Database storage
✅ RESTful API

## What's Pending ⏳

⏳ Frontend results display UI (data is available via API)

---

## Need Help?

Check the logs:

```powershell
# Backend logs
docker logs log-analyzer-backend

# Frontend logs
docker logs log-analyzer-frontend

# Database logs
docker logs log-analyzer-db
```

Restart if needed:

```powershell
docker-compose restart
```

---

## Example: Complete Flow via API

```powershell
# 1. Login
$auth = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"admin123"}'

# 2. Upload file (use Postman for this step - easier with files)
# POST http://localhost:5000/api/logs/upload
# Headers: Authorization: Bearer $auth.token
# Body: form-data, key=logFile, select file

# 3. Get your files
$files = Invoke-RestMethod -Uri "http://localhost:5000/api/logs" `
  -Headers @{Authorization="Bearer $($auth.token)"}

# 4. View analysis
$analysis = Invoke-RestMethod -Uri "http://localhost:5000/api/logs/$($files[0].id)/analysis" `
  -Headers @{Authorization="Bearer $($auth.token)"}

Write-Host "Analysis Results:" -ForegroundColor Green
$analysis | ConvertTo-Json -Depth 5
```

This shows all detected anomalies, confidence scores, and threat explanations!
