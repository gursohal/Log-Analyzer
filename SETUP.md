# Claude Log Analyzer - Setup Guide

## Quick Start Guide

This guide will help you get the Claude Log Analyzer up and running locally.

## Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ (or use Docker)
- **Docker & Docker Compose** (recommended)
- **OpenAI API Key** (optional, for AI-powered analysis)

## Option 1: Docker Setup (Recommended)

### Step 1: Clone and Setup

```bash
cd claude-log-analyzer
```

### Step 2: Configure Environment Variables

Create backend environment file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your OpenAI API key:

```
OPENAI_API_KEY=your-actual-openai-api-key-here
```

Create frontend environment file:

```bash
cd ../frontend
cp .env.local.example .env.local
```

### Step 3: Start with Docker Compose

From the root directory:

```bash
docker-compose up -d
```

This will start:

- PostgreSQL database on port 5432
- Backend API on port 5000
- Frontend on port 3000

### Step 4: Access the Application

Open your browser and navigate to:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Step 5: Login

Use the default credentials:

- **Email**: admin@example.com
- **Password**: admin123

## Option 2: Manual Setup

### Step 1: Setup PostgreSQL Database

Create a new database:

```bash
createdb log_analyzer
```

Run the schema:

```bash
psql -d log_analyzer -f database/schema.sql
```

### Step 2: Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configurations
npm run dev
```

The backend will start on http://localhost:5000

### Step 3: Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The frontend will start on http://localhost:3000

## Testing the Application

### 1. Login

Navigate to http://localhost:3000 and login with:

- Email: admin@example.com
- Password: admin123

### 2. Upload a Log File

Use the example log file provided:

- Navigate to the examples directory
- Upload `apache-access.log` through the dashboard

### 3. View Analysis Results

After uploading, the system will:

- Parse the log file
- Detect log format automatically
- Run statistical anomaly detection
- Run AI-powered analysis (if OpenAI key is configured)
- Display results with:
  - Timeline of events
  - Anomalies detected with confidence scores
  - Statistics and visualizations

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Logs

- `POST /api/logs/upload` - Upload log file
- `GET /api/logs/:fileId/analysis` - Get analysis results
- `GET /api/logs` - Get user's log files

### Health Check

- `GET /health` - Check API and database status

## AI Configuration

The application uses OpenAI GPT-4 for advanced anomaly detection. To enable:

1. Get an API key from https://platform.openai.com/
2. Add it to `backend/.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart the backend

Without an OpenAI key, the application will still work with statistical anomaly detection.

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection settings in backend/.env
```

### Port Already in Use

If ports 3000 or 5000 are already in use:

```bash
# Find and kill the process
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

### Frontend Build Errors

If you encounter TypeScript errors:

```bash
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

### Backend Build Errors

```bash
cd backend
rm -rf node_modules dist
npm install
npm run dev
```

## Project Structure

```
claude-log-analyzer/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   │   ├── logParser.ts          # Multi-format log parser
│   │   │   ├── anomalyDetector.ts    # Statistical analysis
│   │   │   └── aiAnalyzer.ts         # AI-powered analysis
│   │   └── types/          # TypeScript definitions
│   └── uploads/            # Uploaded log files
├── frontend/               # Next.js application
│   └── src/
│       ├── app/            # Next.js pages
│       └── components/     # React components
├── database/               # Database schema
├── examples/               # Sample log files
└── docker-compose.yml      # Docker configuration
```

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

## Supported Log Formats

- **Apache/Nginx** - Combined log format
- **ZScaler** - Web proxy logs (CSV)
- **Application Logs** - Generic format with timestamps
- **Generic** - Best-effort parsing for unknown formats

## Anomaly Detection Features

### Statistical Detection

- High request rates from single IP
- Burst traffic patterns
- SQL injection attempts
- XSS attack patterns
- Path traversal attempts
- Unusual time access (1-5 AM)
- High error rates
- Authentication failures
- Suspicious user agents

### AI-Powered Detection

- Complex attack patterns
- Data exfiltration attempts
- Session hijacking indicators
- Privilege escalation attempts
- Contextual threat analysis

## Security Notes

- Change default admin password immediately
- Use strong JWT secrets in production
- Enable HTTPS in production
- Regularly update dependencies
- Keep OpenAI API key secure
- Limit file upload sizes
- Implement rate limiting in production

## Next Steps

1. **Test with your own log files**
2. **Configure AI analysis with OpenAI**
3. **Customize anomaly detection rules**
4. **Deploy to cloud platform** (see DEPLOYMENT.md)
5. **Record video walkthrough** of implementation

## Support

For issues or questions:

- Check the main README.md
- Review the code documentation
- Open a GitHub issue

## License

MIT License - See LICENSE file for details
