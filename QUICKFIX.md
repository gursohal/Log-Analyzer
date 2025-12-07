# Quick Fix for Registration Issue

## The Problem

The registration button isn't sending requests to the backend. This could be due to:

1. CORS issues
2. Frontend/backend not communicating
3. Validation blocking requests

## Immediate Solution: Use the Setup Script

Since the web registration isn't working yet, use the secure CLI script:

```bash
# In a new terminal
cd backend
node setup-admin.js
```

Follow the prompts:

```
Enter admin email: test@example.com
Enter admin name: Test User
Enter admin password: Welcome123
Confirm password: Welcome123
```

Then login at: http://localhost:3000/login

- Email: test@example.com
- Password: Welcome123

## Debug Steps

### 1. Check Browser Console

Open browser DevTools (F12) → Console tab
Look for any errors when clicking "Create Account"

### 2. Check Network Tab

Open DevTools → Network tab
Click "Create Account"

- Do you see a POST request to /api/auth/register?
- What's the status code?
- What's the response?

### 3. Test Backend Directly

```bash
# Test if registration endpoint works
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "curl@example.com",
    "password": "CurlTest123",
    "name": "Curl User"
  }'
```

If this works, the issue is in the frontend.
If this fails, the issue is in the backend.

## Alternative: Use API Registration

Open a new terminal and run:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "AdminPass123",
    "name": "Admin User"
  }'
```

Then login with those credentials at http://localhost:3000/login

## If You See CORS Errors

The backend CORS might be too restrictive. Check backend logs:

```bash
docker-compose logs backend | grep -i cors
```

## Most Likely Issue

The validation middleware might be too strict. Let me know what you see in the browser console and I'll fix it.

## For Now - Use the Script

The **setup-admin.js** script is the most reliable way:

```bash
cd backend
node setup-admin.js
```

This bypasses any frontend/API issues and creates the user directly in the database.
