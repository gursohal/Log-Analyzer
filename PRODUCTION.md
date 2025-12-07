# Production Deployment Guide

This guide covers deploying the Claude Log Analyzer to production with security best practices and optimal performance.

## 🔒 Security Checklist

### Environment Variables

Before deploying to production, ensure all sensitive environment variables are properly configured:

#### Backend (.env)

```bash
# Generate a strong JWT secret (CRITICAL!)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Required Production Variables
NODE_ENV=production
PORT=5000
JWT_SECRET=<your-generated-secret-here>
JWT_EXPIRES_IN=7d

# Database (use secure credentials)
DB_HOST=<your-db-host>
DB_PORT=5432
DB_NAME=log_analyzer
DB_USER=<secure-username>
DB_PASSWORD=<secure-password>
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# OpenAI (Optional)
OPENAI_API_KEY=<your-api-key>

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=/var/app/uploads

# CORS (comma-separated for multiple origins)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
UPLOAD_RATE_LIMIT_MAX=10
```

#### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### ⚠️ CRITICAL Security Updates

1. **JWT Secret**: NEVER use the default `your-secret-key` in production
2. **Database Password**: Use a strong, unique password
3. **HTTPS Only**: Always use HTTPS in production
4. **CORS Origins**: Restrict to specific domains only
5. **Rate Limiting**: Adjust based on your needs
6. **Remove Default Admin**: Change or remove the default admin account

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Update docker-compose.yml for production**:

```yaml
version: "3.8"

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: log_analyzer
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: always
    healthcheck:
      test: ["CMD-BASH", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: log_analyzer
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      db:
        condition: service_healthy
    restart: always
    volumes:
      - uploads:/var/app/uploads

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
    depends_on:
      - backend
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - frontend
      - backend
    restart: always

volumes:
  postgres_data:
  uploads:
```

2. **Deploy**:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Manual Deployment

#### Backend Setup

```bash
cd backend
npm install --production
npm run build
NODE_ENV=production node dist/index.js
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run build
npm start
```

## 📊 Performance Optimization

### Database Optimization

1. **Connection Pooling**: Already configured in `database.ts`

   - Max connections: 20 (configurable)
   - Idle timeout: 30 seconds
   - Connection timeout: 10 seconds

2. **Indexes**: All critical indexes are created in `schema.sql`

   - User lookups
   - Log file queries
   - Anomaly searches
   - Timestamp-based queries

3. **Query Logging**: Only slow queries (>1s) are logged in production

### Application Optimization

1. **Rate Limiting**: Applied to all endpoints

   - General API: 100 requests/15 min
   - Auth endpoints: 5 attempts/15 min
   - Upload endpoints: 10 uploads/hour

2. **File Upload**:

   - Max file size: 50MB (configurable)
   - Validation on file types
   - Automatic cleanup of old files

3. **Caching**: Consider adding Redis for session management

## 🔐 Security Features Implemented

### Authentication & Authorization

- ✅ JWT-based authentication with token expiration
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Rate limiting on login endpoints
- ✅ Token validation with proper error handling
- ✅ Secure password requirements (min 8 chars, uppercase, lowercase, number)

### Input Validation

- ✅ Email validation and normalization
- ✅ Password strength requirements
- ✅ File type validation
- ✅ File size limits
- ✅ SQL injection protection (parameterized queries)

### Network Security

- ✅ Helmet.js for security headers
- ✅ CORS with configurable origins
- ✅ Rate limiting on all endpoints
- ✅ Request size limits (10MB)

### Error Handling

- ✅ Sanitized error messages in production
- ✅ Proper error logging
- ✅ Graceful shutdown handling

## 📈 Monitoring & Maintenance

### Health Checks

The application provides a health check endpoint:

```bash
curl https://api.yourdomain.com/health
```

Response:

```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Logging

- Development: Detailed console logs
- Production: Only errors and slow queries

### Database Backups

```bash
# Backup
pg_dump -U postgres log_analyzer > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres log_analyzer < backup_20241206.sql
```

### Monitoring Recommendations

1. **Application Monitoring**: Consider using PM2, New Relic, or DataDog
2. **Database Monitoring**: Enable PostgreSQL logging and monitoring
3. **Error Tracking**: Implement Sentry or similar
4. **Uptime Monitoring**: Use UptimeRobot or Pingdom

## 🔄 Updates & Maintenance

### Updating the Application

```bash
# 1. Backup database
pg_dump -U postgres log_analyzer > backup.sql

# 2. Pull latest code
git pull origin main

# 3. Update dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 4. Rebuild
docker-compose down
docker-compose build
docker-compose up -d
```

### Database Migrations

Run schema updates carefully:

```bash
psql -U postgres log_analyzer < database/migration.sql
```

## 🧹 Cleanup & Maintenance Tasks

### Regular Maintenance

1. **Clean old uploads**: Set up a cron job to delete old log files
2. **Database vacuum**: Run PostgreSQL VACUUM regularly
3. **Log rotation**: Implement log rotation for application logs
4. **Security updates**: Keep dependencies updated

### Automated Cleanup Script

```bash
# cleanup.sh
#!/bin/bash
# Delete uploads older than 30 days
find /var/app/uploads -type f -mtime +30 -delete

# Delete old log analyses
psql -U postgres log_analyzer -c "DELETE FROM log_files WHERE uploaded_at < NOW() - INTERVAL '90 days';"
```

## 📝 Production Checklist

Before going live, verify:

- [ ] JWT_SECRET is a strong, random value
- [ ] Database uses secure credentials
- [ ] CORS is restricted to your domain(s)
- [ ] HTTPS/SSL is configured
- [ ] Rate limits are appropriate
- [ ] File upload limits are set
- [ ] Health checks are working
- [ ] Logs are being captured
- [ ] Backups are configured
- [ ] Monitoring is set up
- [ ] Error tracking is enabled
- [ ] Default admin account is secured or removed
- [ ] Environment variables are not committed to git
- [ ] Database connection pooling is configured
- [ ] All TypeScript errors are resolved

## 🆘 Troubleshooting

### Common Issues

1. **Database connection fails**

   - Verify credentials in .env
   - Check database is running
   - Verify network connectivity

2. **JWT errors**

   - Ensure JWT_SECRET is set
   - Check token expiration settings
   - Verify time synchronization

3. **CORS errors**

   - Verify CORS_ORIGIN includes your frontend URL
   - Check for trailing slashes
   - Ensure protocol matches (http vs https)

4. **File upload fails**
   - Check MAX_FILE_SIZE setting
   - Verify UPLOAD_DIR permissions
   - Check disk space

## 🔗 Additional Resources

- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [OWASP Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)

## 📞 Support

For production issues:

1. Check application logs
2. Verify health endpoint
3. Review recent changes
4. Check monitoring alerts
