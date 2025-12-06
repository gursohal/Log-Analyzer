# Claude Log Analyzer

A full-stack web application for analyzing log files with AI-powered anomaly detection, designed for SOC analysts.

## Features

- **Authentication**: Basic authentication system for secure access
- **Log Upload**: Support for various log formats (.txt, .log files)
- **Intelligent Parsing**: Automatic log format detection and parsing
- **Timeline Visualization**: Chronological view of events
- **AI-Powered Anomaly Detection**: Machine learning-based detection of unusual patterns
- **SOC Analyst Dashboard**: Key metrics and insights for security operations

## Technology Stack

### Frontend

- Next.js 14 with TypeScript
- React for UI components
- TailwindCSS for styling
- Recharts for data visualization

### Backend

- Node.js with Express
- TypeScript
- Multer for file uploads
- JSON Web Tokens (JWT) for authentication

### AI/ML

- OpenAI GPT-4 API for advanced log analysis and anomaly detection
- Pattern matching algorithms for statistical anomaly detection
- Confidence scoring system

### Database

- PostgreSQL for storing user data, log metadata, and analysis results

## Project Structure

```
claude-log-analyzer/
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js app directory
│   │   ├── components/    # React components
│   │   ├── lib/           # Utility functions
│   │   └── types/         # TypeScript type definitions
│   └── package.json
├── backend/               # Express backend API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helper functions
│   └── package.json
├── database/              # Database schema and migrations
├── examples/              # Sample log files for testing
├── docker-compose.yml     # Docker configuration
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Docker and Docker Compose (optional)
- OpenAI API key (for AI features)

### Quick Start with Docker

1. Clone the repository:

```bash
git clone <repository-url>
cd claude-log-analyzer
```

2. Create environment files:

```bash
# Backend .env
cp backend/.env.example backend/.env
# Add your OpenAI API key and other configurations
```

3. Start the application:

```bash
docker-compose up -d
```

4. Access the application:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Manual Setup

#### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your configurations
```

3. Setup PostgreSQL database:

```bash
# Create database
createdb log_analyzer

# Run migrations
npm run migrate
```

4. Start the backend server:

```bash
npm run dev
```

#### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
# Edit .env.local with backend API URL
```

3. Start the development server:

```bash
npm run dev
```

## AI Model and Anomaly Detection

### Approach

Our anomaly detection system uses a multi-layered approach:

#### 1. Statistical Analysis

- **Frequency Analysis**: Detects unusual spikes in request rates
- **Time-based Patterns**: Identifies activities during unusual hours
- **Geographic Anomalies**: Flags requests from unexpected locations
- **Response Code Analysis**: Detects abnormal error rates

#### 2. AI-Powered Analysis (OpenAI GPT-4)

We leverage OpenAI's GPT-4 model to:

- Understand context and semantics of log entries
- Identify complex attack patterns (SQL injection, XSS, path traversal)
- Correlate multiple events to detect sophisticated threats
- Generate human-readable explanations for detected anomalies

**AI Usage Documentation**:

- **Location**: `backend/src/services/aiAnalyzer.ts`
- **Purpose**: Advanced pattern recognition and threat intelligence
- **Input**: Parsed log entries with statistical features
- **Output**: Anomaly classifications with confidence scores and explanations

#### 3. Confidence Scoring

Each anomaly is assigned a confidence score (0-100%) based on:

- Statistical deviation from baseline
- AI model confidence
- Severity of the detected pattern
- Number of corroborating indicators

### Example Anomalies Detected

1. **High Request Rate**: "Single IP made 500+ requests in 60 seconds" (95% confidence)
2. **SQL Injection Attempt**: "URL contains SQL injection patterns" (88% confidence)
3. **Unusual Access Time**: "Admin access at 3:47 AM, outside normal hours" (72% confidence)
4. **Geographic Anomaly**: "First-time access from high-risk country" (81% confidence)

## Default Credentials

For testing purposes:

- Username: `admin@example.com`
- Password: `admin123`

**⚠️ Change these credentials in production!**

## Example Log Files

Sample log files are provided in the `examples/` directory:

- `zscaler-proxy.log` - ZScaler Web Proxy logs
- `apache-access.log` - Apache web server logs
- `application.log` - Generic application logs

## API Documentation

### Authentication

```
POST /api/auth/login
Body: { "email": "string", "password": "string" }
Response: { "token": "jwt_token", "user": {...} }
```

### Upload Log File

```
POST /api/logs/upload
Headers: Authorization: Bearer <token>
Body: multipart/form-data with "logFile" field
Response: { "analysisId": "string", "status": "processing" }
```

### Get Analysis Results

```
GET /api/logs/analysis/:analysisId
Headers: Authorization: Bearer <token>
Response: { "timeline": [...], "anomalies": [...], "summary": {...} }
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
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

## Deployment

### Docker Deployment

The application includes Docker configuration for easy deployment:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment (Optional)

Instructions for deploying to:

- **Frontend**: Vercel
- **Backend**: Google Cloud Run or Railway
- **Database**: PostgreSQL on Cloud SQL or Supabase

See `DEPLOYMENT.md` for detailed instructions.

## Video Walkthrough

[Link to video walkthrough will be added here]

## Live Demo

[Live demo link will be added here if deployed]

## License

MIT License

## Contact

For questions or issues, please open a GitHub issue.
