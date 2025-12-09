# Claude Log Analyzer

An enterprise-grade, full-stack web application for analyzing log files with AI-powered anomaly detection, designed for SOC analysts and security professionals.

## ✨ Features

### Core Functionality

- **🔐 Secure Authentication**: JWT-based auth with bcrypt password hashing
- **📤 Log Upload**: Support for multiple log formats (.txt, .log files up to 50MB)
- **🧠 Intelligent Parsing**: Automatic detection of Apache, ZScaler, and custom log formats
- **📊 Interactive Visualizations**: 4 professional charts using Recharts
  - Threat Severity Distribution (Pie Chart)
  - Top 10 Source IPs (Bar Chart)
  - HTTP Status Code Distribution (Bar Chart)
  - HTTP Methods Analysis (Pie Chart)
- **📅 Timeline Visualization**: Chronological view of security events with actual log timestamps
- **🤖 Dual-Layer Anomaly Detection**: Statistical + AI-powered threat detection
- **🎯 SOC Analyst Dashboard**: Comprehensive metrics, insights, and actionable recommendations

### Security Features (Production-Ready)

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security Headers**: Helmet.js for XSS, clickjacking protection
- **Input Validation**: Express-validator on all endpoints
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Strict origin control
- **No Hardcoded Credentials**: Environment-based configuration
- **Session Security**: HTTP-only cookies, secure flags

### Performance & Scalability

- **Connection Pooling**: PostgreSQL connection management (10-20 connections)
- **Async Processing**: Background log analysis
- **Query Optimization**: Indexed database queries
- **Efficient Parsing**: Stream-based log processing
- **Docker Ready**: Full containerization support

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

- **Anthropic Claude 3 Haiku** (fast, cost-effective AI model) for advanced log analysis
- **Statistical Detection Engine**: 9 attack types with regex patterns
- **Dual-Layer Approach**: Statistical + AI (optional with API key)
- **Confidence Scoring**: 0-100% for each detected anomaly
- **Pattern Matching**: SQL injection, XSS, brute force, path traversal, etc.
- **Visual Distinction**: Clear UI badges showing AI vs Statistical detections

### Security & Middleware

- **Helmet.js**: Security headers (XSS, clickjacking protection)
- **Express-rate-limit**: DDoS protection
- **Express-validator**: Input sanitization
- **Bcrypt**: Password hashing (10 rounds)
- **JWT**: Secure token-based authentication

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
- Anthropic Claude API key (for AI features - optional)

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

## 🛡️ Anomaly Detection System

### Dual-Layer Detection Approach

#### Layer 1: Statistical Detection (Always Active)

**File**: `backend/src/services/productionAnomalyDetector.ts`

Detects **9 attack types** using pattern matching:

1. **SQL Injection** - Regex patterns for UNION, OR '1'='1', DROP TABLE, etc.
2. **XSS Attacks** - Detects `<script>`, `javascript:`, `onerror` patterns
3. **Path Traversal** - Identifies `../`, `/etc/passwd` attempts
4. **Brute Force** - Groups failed logins by IP (>5 attempts in 5 min)
5. **Rate Limiting Violations** - High request rates (>100/min per IP)
6. **Suspicious User-Agents** - Identifies sqlmap, nikto, nmap, burp
7. **Error Rate Spikes** - 4xx/5xx rates exceeding 30%
8. **Unusual Time Access** - Flags requests during 1am-5am
9. **Geographic Anomalies** - Multiple unique IPs in short timeframe

**Confidence**: 70-95% based on pattern strength

#### Layer 2: AI-Powered Analysis (Optional - Requires API Key)

**File**: `backend/src/services/aiAnalyzer.ts`  
**Model**: Anthropic Claude 3 Haiku (fast, cost-effective, December 2024)

**What AI Adds**:

- **Context-aware threat detection** - Understands relationships between log entries
- **Multi-stage attack correlation** - Identifies reconnaissance → exploitation chains
- **Novel pattern recognition** - Detects zero-day and unknown threats
- **Natural language explanations** - Clear, actionable descriptions for SOC analysts
- **Semantic analysis** - Goes beyond pattern matching to understand intent

**How It Works**:

1. Statistical detector runs first, finding known patterns
2. Claude receives:
   - Statistical anomalies detected
   - Sample of log entries (up to 100)
   - Context about attack patterns
3. Claude analyzes for:
   - Missed threats
   - Correlation between events
   - Attack sophistication level
   - Recommendations

**How to Enable**:

1. Get API key from https://console.anthropic.com/
2. Add to `backend/.env`: `ANTHROPIC_API_KEY=sk-ant-api03-your-key-here`
3. Restart backend server
4. Look for purple "🤖 AI Powered" badges on dashboard!

**Cost**: ~$0.01-0.05 per log file analysis (Claude Haiku pricing)

**AI is Optional**: The system works perfectly with statistical detection alone! If no API key is provided, you'll see a helpful warning banner with setup instructions.

### Visual Distinction on Dashboard

The UI clearly distinguishes between detection methods:

- **🤖 AI Powered** (Purple badge) - Claude-detected anomalies with detailed context
- **📊 Statistical** (Gray badge) - Pattern-matching detections
- **🤖📊 Both Methods** (Gradient badge) - Confirmed by both approaches (highest confidence!)

Anomalies detected by both methods are automatically deduplicated and display the AI's more detailed description.

### Confidence Scoring

Each anomaly receives a confidence score (0-100%):

- Statistical patterns: 70-95%
- AI detections: Variable, model-determined
- Combined: Highest confidence wins

### Example Detections

```
SQL Injection Attempt
- Type: sql_injection_attempt
- Confidence: 85%
- Severity: Critical
- Description: "URL contains UNION SELECT pattern"
- Source IP: 192.168.1.100
- Recommendation: Block IP, enable WAF

Brute Force Attack
- Type: authentication_failures
- Confidence: 95%
- Severity: High
- Description: "23 failed login attempts in 2 minutes"
- Source IP: 10.0.0.50
- Recommendation: Implement account lockout
```

## 👤 User Management

### Creating Users

**Option 1: Registration Page**

1. Navigate to http://localhost:3000/register
2. Fill in name, email, and password
3. Submit to create account

**Option 2: API Registration**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123","name":"User Name"}'
```

**Option 3: Admin Setup Script**

```bash
cd backend
node setup-admin.js
```

**Password Requirements**:

- Minimum 8 characters
- At least one uppercase letter
- At least one number

**Security**: All passwords are hashed with bcrypt (10 rounds)

## 📚 Documentation

Comprehensive guides are available in the root directory:

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[AUTH-GUIDE.md](AUTH-GUIDE.md)** - Authentication system documentation
- **[DATABASE.md](DATABASE.md)** - Database schema and queries
- **[PRODUCTION.md](PRODUCTION.md)** - Production deployment guide
- **[TESTING-GUIDE.md](TESTING-GUIDE.md)** - Testing procedures
- **[REQUIREMENTS-CHECK.md](REQUIREMENTS-CHECK.md)** - Requirements compliance
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Code improvements log

## 📁 Example Log Files

Sample log files are provided in the `examples/` directory:

- `sample_logs.txt` - Mixed format logs with various attacks
- `anomalous_logss.txt` - Logs with SQL injection, XSS attempts
- `hard_logs.txt` - Complex attack patterns

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
