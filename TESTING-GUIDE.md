# Testing Guide - Claude Log Analyzer

## Prerequisites Installation

To run and test this application, you need to install the following:

### 1. Install Node.js (Required)

**Download and Install:**

- Visit: https://nodejs.org/
- Download the LTS version (18.x or higher)
- Run the installer and follow the prompts
- Restart your terminal/PowerShell after installation

**Verify Installation:**

```powershell
node --version
npm --version
```

### 2. Install PostgreSQL (Option A - Required for Manual Setup)

**Download and Install:**

- Visit: https://www.postgresql.org/download/windows/
- Download PostgreSQL 14 or higher
- During installation, remember the password you set for the `postgres` user
- Keep default port 5432

**Verify Installation:**

```powershell
psql --version
```

### 3. Install Docker Desktop (Option B - Easiest Method)

**Download and Install:**

- Visit: https://www.docker.com/products/docker-desktop
- Download Docker Desktop for Windows
- Install and start Docker Desktop
- Restart your computer if prompted

**Verify Installation:**

```powershell
docker --version
docker-compose --version
```

## Testing Method 1: Using Docker (Recommended)

### Step 1: Start All Services

```powershell
cd C:\Users\gursohal\claude-log-analyzer
docker-compose up -d
```

### Step 2: Wait for Services to Start (30-60 seconds)

```powershell
# Check if all services are running
docker-compose ps
```

### Step 3: Test the Backend API

```powershell
# Test health endpoint
curl http://localhost:5000/health

# Or open in browser:
# http://localhost:5000/health
```

Expected response:

```json
{ "status": "healthy", "database": "connected" }
```

### Step 4: Test the Frontend

Open your browser and navigate to:

- http://localhost:3000

You should see the Claude Log Analyzer landing page.

### Step 5: Test Login

1. Click "Login" button
2. Enter credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Should redirect to dashboard (will show blank since dashboard page needs completion)

### Step 6: Test API with Postman/curl

**Login Request:**

```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"admin123\"}'
```

Expected response:

```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "Admin User"
  }
}
```

### Step 7: Stop Services

```powershell
docker-compose down
```

## Testing Method 2: Manual Setup (Without Docker)

### Step 1: Setup PostgreSQL Database

```powershell
# Open PostgreSQL command line
psql -U postgres

# In psql, run:
CREATE DATABASE log_analyzer;
\q
```

```powershell
# Load the schema
psql -U postgres -d log_analyzer -f C:\Users\gursohal\claude-log-analyzer\database\schema.sql
```

### Step 2: Install Backend Dependencies

```powershell
cd C:\Users\gursohal\claude-log-analyzer\backend
npm install
```

This will install all backend packages (Express, TypeScript, PostgreSQL driver, etc.)

### Step 3: Start Backend Server

```powershell
# Make sure you're in the backend directory
cd C:\Users\gursohal\claude-log-analyzer\backend
npm run dev
```

Expected output:

```
🚀 Server running on port 5000
📊 API available at http://localhost:5000
💚 Health check: http://localhost:5000/health
```

### Step 4: Test Backend (In New Terminal)

```powershell
# In a new PowerShell window
curl http://localhost:5000/health
```

### Step 5: Install Frontend Dependencies

```powershell
# In a new PowerShell window
cd C:\Users\gursohal\claude-log-analyzer\frontend
npm install
```

### Step 6: Start Frontend Server

```powershell
# Make sure you're in the frontend directory
npm run dev
```

Expected output:

```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Step 7: Test the Application

Open browser to: http://localhost:3000

## Complete Testing Workflow

### Test 1: Authentication Flow

1. **Landing Page**

   - Navigate to http://localhost:3000
   - Verify you see the landing page with "Claude Log Analyzer" title
   - Click "Login" button

2. **Login**

   - Enter: admin@example.com / admin123
   - Click "Sign In"
   - Should redirect (may show blank page - dashboard needs completion)

3. **API Token Verification**
   - Open browser developer tools (F12)
   - Go to Application → Local Storage
   - Verify "token" is stored

### Test 2: API Endpoints

Using PowerShell or Postman:

**1. Login:**

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"admin123"}'

$token = $response.token
Write-Host "Token: $token"
```

**2. Get User Logs:**

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/logs" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}
```

**3. Upload Log File:**

```powershell
# Note: File upload via PowerShell requires multipart/form-data
# Use Postman for easier testing
```

### Test 3: Log File Upload (via Postman)

1. **Open Postman** (or download from https://www.postman.com/)

2. **Create New Request:**

   - Method: POST
   - URL: http://localhost:5000/api/logs/upload

3. **Set Headers:**

   - Key: Authorization
   - Value: Bearer YOUR_TOKEN_FROM_LOGIN

4. **Set Body:**

   - Select "form-data"
   - Key: logFile (change type to "File")
   - Value: Select `C:\Users\gursohal\claude-log-analyzer\examples\apache-access.log`

5. **Send Request**

Expected response:

```json
{
  "message": "File uploaded successfully",
  "fileId": "uuid-here",
  "status": "processing"
}
```

### Test 4: Check Analysis Results

After uploading, wait 5-10 seconds, then:

```powershell
# Replace FILE_ID with the fileId from upload response
Invoke-RestMethod -Uri "http://localhost:5000/api/logs/FILE_ID/analysis" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}
```

Expected response includes:

- `total_entries`: Number of log entries
- `anomalies`: Array of detected anomalies
- `timeline`: Timeline of events
- `statistics`: Statistical summary

## Expected Anomalies in Example Log File

The `examples/apache-access.log` file contains intentional attack patterns:

1. **SQL Injection Attempts** (IP: 45.76.123.45)

   - Pattern: `' OR '1'='1`
   - Confidence: ~85%

2. **Path Traversal Attempts**

   - Pattern: `/../../../etc/passwd`
   - Confidence: ~78%

3. **XSS Attack**

   - Pattern: `<script>alert('XSS')</script>`
   - Confidence: ~82%

4. **Brute Force Attack**

   - Multiple failed login attempts from same IP
   - Confidence: ~82%

5. **Suspicious User Agents**
   - sqlmap, nikto tools detected
   - Confidence: ~75%

## Troubleshooting

### "Cannot connect to database"

- Ensure PostgreSQL is running
- Check credentials in backend/.env
- Verify database exists: `psql -U postgres -l`

### "Port 5000 already in use"

- Another app is using port 5000
- Change PORT in backend/.env
- Or stop the other application

### "Module not found" errors

- Run `npm install` in the relevant directory
- Delete node_modules and run `npm install` again

### Frontend won't start

- Check if port 3000 is available
- Clear Next.js cache: `rm -rf .next` (or delete .next folder)
- Run `npm install` again

## Performance Testing

### Expected Performance

- **Log Parsing**: ~1000 entries/second
- **Anomaly Detection**: ~500 entries/second
- **AI Analysis**: 3-10 seconds (depends on OpenAI API)
- **Total Processing**: 30-50MB file in ~30 seconds

### Load Testing

```powershell
# Upload multiple files simultaneously
# Monitor system resources
# Check database performance
```

## Next Steps After Testing

1. ✅ Verify all services start correctly
2. ✅ Test authentication flow
3. ✅ Upload and analyze example log file
4. ✅ Review detected anomalies
5. 📝 Create dashboard page for better UI
6. 📝 Add visualization charts
7. 📝 Record video walkthrough
8. 📝 Deploy to cloud platform

## Additional Testing Resources

### Using Database GUI

- Install **pgAdmin** to visualize database: https://www.pgadmin.org/
- Connect to localhost:5432
- View tables: users, log_files, log_analyses, anomalies

### Using API Testing Tools

- **Postman**: Full-featured API testing
- **Insomnia**: Alternative to Postman
- **curl**: Command-line testing
- **Thunder Client**: VS Code extension

## Success Criteria

✅ Backend starts without errors
✅ Frontend loads at localhost:3000
✅ Can login with default credentials
✅ Can upload log file via API
✅ Log file gets processed
✅ Anomalies are detected and stored
✅ Can retrieve analysis results

## Getting Help

If you encounter issues:

1. Check the SETUP.md file
2. Review error messages carefully
3. Check if all prerequisites are installed
4. Verify environment variables are set correctly
5. Ensure all ports are available

## Video Walkthrough Checklist

When recording your video, demonstrate:

- [ ] Project structure overview
- [ ] Backend architecture explanation
- [ ] AI implementation details (aiAnalyzer.ts)
- [ ] Log parsing logic
- [ ] Anomaly detection algorithms
- [ ] Database schema
- [ ] Frontend components
- [ ] Authentication flow
- [ ] File upload and processing
- [ ] Results visualization
- [ ] Deployment considerations
