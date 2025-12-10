# Claude Log Analyzer - Setup Guide

## Prerequisites

- **Docker Desktop** (latest version - the UX will display if it's not updated)
- **Anthropic Claude API Key** (optional, for AI-powered analysis)

## Docker Setup (Recommended)

### Step 1: Clone and Setup

```bash
cd claude-log-analyzer
```

### Step 2: Configure Environment Variables

**Create backend environment file:**

```bash
cd backend
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

**Edit backend/.env and add your Claude API key:**

```
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-api-key-here
```

> **Note**: Get your API key from https://console.anthropic.com/

**Create frontend environment file:**

```bash
cd ../frontend
# Windows
copy .env.local.example .env.local

# Linux/Mac
cp .env.local.example .env.local
```

### Step 3: Start with Docker Compose

**Important**: Make sure your Docker Desktop is updated to the latest version. The UX will display if it's not updated.

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

- **Frontend**: http://localhost:3000/login

### Step 5: Register & Login

1. Click on the **Register** button
2. Register with your username and email
3. Login with those credentials

## What Happens After Setup

Once logged in, you can:

1. **Upload Log Files** - Drag and drop or click to upload .txt or .log files (up to 50MB)
2. **View Analysis** - The system automatically:
   - Parses your logs
   - Runs statistical anomaly detection (always active)
   - Runs AI-powered analysis with Claude (if API key is configured)
3. **Explore Results** - View:
   - Timeline of security events
   - Detected anomalies with confidence scores
   - Interactive charts and visualizations
   - SOC analyst-ready insights

## AI-Powered Analysis

### With Claude API Key (Recommended)

When you configure `ANTHROPIC_API_KEY`:

- ✅ **Dual-layer detection**: Statistical + AI
- ✅ **Context-aware analysis**: Claude understands attack patterns
- ✅ **Natural language explanations**: Clear, actionable descriptions
- ✅ **Novel threat detection**: Identifies zero-day attacks
- ✅ **Purple "🤖 AI Powered" badges** on anomalies

**Cost**: ~$0.01-0.05 per log file analysis (Claude Haiku pricing)

### Without Claude API Key

The system works perfectly without an API key:

- ✅ **Statistical detection**: Pattern matching for 9 attack types
- ✅ **Gray "📊 Statistical" badges** on anomalies
- ⚠️ **Warning banner** will explain how to enable AI

## Visual Distinction

The dashboard clearly shows which method detected each anomaly:

| Badge | Meaning |
|-------|---------|
| 🤖 **AI Powered** (Purple) | Detected by Claude with contextual analysis |
| 📊 **Statistical** (Gray) | Detected by pattern matching |
| 🤖📊 **Both Methods** (Gradient) | Confirmed by both (highest confidence!) |

## Testing the Application

### Use Example Log Files

Sample log files are provided in the `examples/` directory:

- `sample_logs.txt` - Mixed format logs with various attacks
- `anomalous_logss.txt` - Logs with SQL injection, XSS attempts
- `hard_logs.txt` - Complex attack patterns

### Expected Results

After uploading a log file, you'll see:

1. **Upload Progress**: Real-time status updates
2. **Analysis Processing**: ~10-30 seconds
3. **Results Dashboard**:
   - Total entries analyzed
   - Risk levels (High/Medium/Low)
   - Visual charts
   - Detected anomalies with details
   - Timeline of security events

## Stopping the Application

To stop all services:

```bash
docker-compose down
```

To stop and remove all data (including database):

```bash
docker-compose down -v
```

## Troubleshooting

### Docker Desktop Not Running

**Error**: `Cannot connect to the Docker daemon`

**Solution**: 
1. Open Docker Desktop
2. Wait for it to fully start (icon turns green/white)
3. Run `docker-compose up -d` again

### Port Already in Use

**Error**: `port is already allocated`

**Solution**:
```bash
# Find what's using the port (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F

# Or change the ports in docker-compose.yml
```

### Database Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if PostgreSQL container is running
docker ps

# View logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Frontend Won't Load

**Solution**:
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### AI Analysis Not Working

**Symptoms**: Only seeing gray "📊 Statistical" badges

**Solutions**:
1. Check if `ANTHROPIC_API_KEY` is set in `backend/.env`
2. Verify the key starts with `sk-ant-api03-`
3. Restart backend: `docker-compose restart backend`
4. Check backend logs: `docker-compose logs backend`
5. You should see: `🤖 Starting AI-powered anomaly detection with Claude...`

## Development Mode

If you want to develop and see live changes:

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## Viewing Logs

To view real-time logs from all services:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Updating the Application

To get the latest changes:

```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose up -d --build

# View updated containers
docker ps
```

## Project Structure

```
claude-log-analyzer/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── services/
│   │   │   ├── productionAnomalyDetector.ts  # Statistical detection
│   │   │   ├── aiAnalyzer.ts                 # Claude AI analysis
│   │   │   └── logParser.ts                  # Multi-format parser
│   │   └── controllers/
│   └── uploads/            # Uploaded log files
├── frontend/               # Next.js application
│   └── src/
│       └── app/
│           └── dashboard/  # Main dashboard UI
├── database/               # PostgreSQL schema
├── examples/               # Sample log files
└── docker-compose.yml      # Docker configuration
```

## Next Steps

1. ✅ **Upload your first log file**
2. ✅ **View the analysis results**
3. ✅ **Configure Claude API** for AI-powered insights
4. 📚 **Read the full documentation** in README.md
5. 🎯 **Customize detection rules** for your use case

## Support

For issues or questions:

- Check the main [README.md](README.md)
- Review [AUTH-GUIDE.md](AUTH-GUIDE.md) for authentication details
- Review [DATABASE.md](DATABASE.md) for database schema
- Open a GitHub issue

## Security Notes

⚠️ **Important for Production**:

- Change JWT secret in `.env`
- Use strong database passwords
- Enable HTTPS
- Keep Claude API key secure (never commit to git)
- Implement rate limiting
- Regular security updates

## License

MIT License - See LICENSE file for details
