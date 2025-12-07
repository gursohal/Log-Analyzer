# Authentication Guide

## 📝 Quick Answer to Your Questions

### Where was admin@example.com stored?

**Previously**: The old default admin account (`admin@example.com` with password `admin123`) was hardcoded in the database schema file (`database/schema.sql`).

**Now**: 🔒 **REMOVED for security!** No default accounts are created automatically.

### How do I create my first user?

You have **3 options**:

---

## Option 1: Register Through the Website (Easiest) ✅

1. **Start the application**:

```bash
docker-compose up -d
```

2. **Visit**: http://localhost:3000

3. **Click "Register"** button on the home page

4. **Fill out the form**:

   - Email: your@email.com
   - Name: Your Name (optional)
   - Password: Must have:
     - At least 8 characters
     - One uppercase letter (A-Z)
     - One lowercase letter (a-z)
     - One number (0-9)
   - Confirm Password

5. **Click "Create Account"**

6. You'll be automatically logged in and redirected to the dashboard! 🎉

---

## Option 2: Use the Secure Setup Script

```bash
cd backend
node setup-admin.js
```

This interactive script will:

- Validate your email and password
- Enforce strong password requirements
- Check for duplicate accounts
- Securely hash your password
- Create the user in the database

**Example**:

```
===========================================
  Claude Log Analyzer - Admin Setup
===========================================

✅ Database connection successful

Enter admin email: admin@yourcompany.com
Enter admin name (optional): Admin User
Enter admin password: YourSecure123
Confirm password: YourSecure123

✅ Admin user created successfully!
```

---

## Option 3: Use the API Directly

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "SecurePass123",
    "name": "Your Name"
  }'
```

---

## 🔐 Password Requirements

All passwords must meet these requirements:

- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)

**Examples of valid passwords**:

- `Welcome123`
- `MySecure2024`
- `LogAnalyzer1`

**Examples of INVALID passwords**:

- `password` (too simple, no uppercase, no numbers)
- `Pass1` (too short)
- `PASSWORD123` (no lowercase)
- `password123` (no uppercase)

---

## 📊 Where Are Users Stored?

Users are stored in the **PostgreSQL database** in the `users` table.

### Database Location

- **Container**: `log-analyzer-db` (Docker)
- **Host**: `localhost:5432`
- **Database**: `log_analyzer`
- **Table**: `users`

### Access the Database

**Using Docker**:

```bash
docker exec -it log-analyzer-db psql -U postgres -d log_analyzer
```

**Query users**:

```sql
-- List all users
SELECT id, email, name, created_at FROM users;

-- Check if a specific user exists
SELECT * FROM users WHERE email = 'your@email.com';

-- Count total users
SELECT COUNT(*) FROM users;
```

---

## 🔧 Common Issues & Solutions

### Issue: "Cannot connect to database"

**Solution**:

```bash
# Check if database is running
docker-compose ps

# Start services if not running
docker-compose up -d

# Check database logs
docker-compose logs postgres
```

### Issue: "Registration failed"

**Possible causes**:

1. Backend not running
   - Solution: `docker-compose up -d`
2. Email already exists
   - Solution: Use a different email or login with existing account
3. Password doesn't meet requirements
   - Solution: Follow password requirements above

### Issue: "Network error"

**Solution**:

```bash
# Check if backend is accessible
curl http://localhost:5000/health

# Should return: {"status":"healthy","database":"connected"}
```

### Issue: "Email already registered"

**Solution**: This email is already in the system. Options:

1. Login instead of registering
2. Use a different email address
3. Delete the existing user from database (if you own it):
   ```sql
   DELETE FROM users WHERE email = 'your@email.com';
   ```

---

## 🎯 Testing the Registration

### Step-by-Step Test:

1. **Start services**:

```bash
docker-compose up -d
```

2. **Verify backend is running**:

```bash
curl http://localhost:5000/health
```

Expected: `{"status":"healthy","database":"connected"}`

3. **Open browser**: http://localhost:3000

4. **Click "Register"**

5. **Fill form**:

   - Email: `test@example.com`
   - Name: `Test User`
   - Password: `Test123Pass`
   - Confirm: `Test123Pass`

6. **Submit** → You should be redirected to `/dashboard`

7. **Verify in database**:

```bash
docker exec -it log-analyzer-db psql -U postgres -d log_analyzer -c "SELECT email, name FROM users;"
```

---

## 📱 Login After Registration

Once registered, you can login at: http://localhost:3000/login

**Credentials**: Use the email and password you registered with.

---

## 🔒 Security Notes

### What Changed?

**Before** (INSECURE):

- Default admin account with known credentials (`admin@example.com` / `admin123`)
- Hardcoded in schema file
- Scripts with passwords in plain text

**After** (SECURE):

- No default accounts
- User must create first account via secure methods
- Strong password enforcement
- Passwords hashed with bcrypt (10 rounds)
- Input validation on all endpoints
- Rate limiting to prevent brute force attacks

### Production Recommendations

1. ✅ Always use strong passwords
2. ✅ Enable HTTPS in production
3. ✅ Change database credentials
4. ✅ Use environment variables for secrets
5. ✅ Enable database backups
6. ✅ Monitor login attempts
7. ✅ Implement password reset flow (if needed)

---

## 📞 Quick Commands Reference

```bash
# Start application
docker-compose up -d

# Stop application
docker-compose down

# View logs
docker-compose logs -f backend

# Access database
docker exec -it log-analyzer-db psql -U postgres -d log_analyzer

# Create admin via script
cd backend && node setup-admin.js

# Check backend health
curl http://localhost:5000/health

# List users
docker exec -it log-analyzer-db psql -U postgres -d log_analyzer -c "SELECT * FROM users;"
```

---

## 🔗 Related Documentation

- **DATABASE.md**: Comprehensive database guide
- **PRODUCTION.md**: Production deployment guide
- **QUICKSTART.md**: Quick start guide
- **SETUP.md**: Setup instructions

---

## 💡 Pro Tips

1. **First User**: Create this via the website registration - it's the easiest method
2. **Additional Users**: Can be created by anyone through registration (consider adding admin approval in production)
3. **Password Manager**: Use a password manager to generate and store strong passwords
4. **Backup**: Export user list before making database changes:
   ```bash
   docker exec log-analyzer-db pg_dump -U postgres log_analyzer > backup.sql
   ```

---

## ✅ Summary

**To get started right now:**

1. `docker-compose up -d`
2. Go to http://localhost:3000
3. Click "Register"
4. Create your account
5. Start analyzing logs!

**No more default accounts. No more hardcoded passwords. Secure by default.** 🔒
