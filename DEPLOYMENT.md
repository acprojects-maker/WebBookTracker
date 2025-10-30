# Deployment Guide - Book Tracker

Complete step-by-step guide to deploy your Book Tracker application to free hosting services.

## Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Vercel    │────────▶│   Render    │────────▶│ PlanetScale  │
│  (Frontend) │         │  (Backend)  │         │  (Database)  │
└─────────────┘         └─────────────┘         └──────────────┘
                               │
                               │
                               ▼
                        ┌─────────────┐
                        │    Brevo    │
                        │   (Email)   │
                        └─────────────┘
```

**Cost:** $0/month for all services
**Limitations:**
- Backend cold starts after 15 minutes of inactivity (30s warmup)
- 5GB database storage
- 300 emails/day

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup (PlanetScale)](#1-database-setup-planetscale)
3. [Email Setup (Brevo)](#2-email-setup-brevo)
4. [Backend Deployment (Render)](#3-backend-deployment-render)
5. [Frontend Deployment (Vercel)](#4-frontend-deployment-vercel)
6. [Post-Deployment](#5-post-deployment)
7. [Monitoring & Maintenance](#6-monitoring--maintenance)
8. [Troubleshooting](#7-troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- [ ] GitHub account (for code repository)
- [ ] All your source code committed to a GitHub repository
- [ ] Basic understanding of environment variables
- [ ] Your API keys ready (Gemini, Hugging Face, Cohere, Google Books)

**No credit card required for any service!**

---

## 1. Database Setup (PlanetScale)

### Step 1.1: Create PlanetScale Account
1. Go to [planetscale.com](https://planetscale.com)
2. Click "Get Started" or "Sign Up"
3. Sign up with GitHub (recommended) or email
4. Verify your email address

### Step 1.2: Create Database
1. Click "Create database"
2. Enter database name: `booktracker`
3. Select region closest to your users (e.g., US East)
4. Click "Create database"
5. Wait 30-60 seconds for database to initialize

### Step 1.3: Get Connection Credentials
1. Click on your `booktracker` database
2. Click "Connect"
3. Select "Connect with: **Node.js**"
4. Copy the connection details (you'll need these):
   ```
   Host: <your-db>.us-east-2.psdb.cloud
   Username: <your-username>
   Password: <your-password>
   Database: booktracker
   ```
5. **Important:** Save these credentials securely

### Step 1.4: Import Database Schema
1. In PlanetScale dashboard, click "Console" tab
2. You'll see a web-based MySQL console
3. Copy the contents of `database-schema.sql` from your project
4. Paste into the console
5. Click "Run" or press Enter
6. Wait for all tables to be created (you should see 9 tables created)

**Verify:** Run this query to confirm:
```sql
SHOW TABLES;
```
You should see: `users`, `books`, `reading_sessions`, `reading_lists`, `list_books`, `user_preferences`, `book_recommendations`, `achievements`, `search_history`

### Step 1.5: Create Production Branch (Optional but Recommended)
1. Click "Branches" tab
2. Click "Create branch"
3. Name it `production`
4. Use this branch for your production deployment

**Note:** PlanetScale uses a branching model similar to Git. The `main` branch is for development, create a `production` branch for your deployed app.

---

## 2. Email Setup (Brevo)

### Step 2.1: Create Brevo Account
1. Go to [brevo.com](https://brevo.com)
2. Click "Sign up free"
3. Enter your email and create account
4. Verify your email address
5. Complete the onboarding questionnaire

### Step 2.2: Get SMTP Credentials
1. In Brevo dashboard, click your name (top right)
2. Go to "SMTP & API"
3. Click "SMTP" tab
4. You'll see your SMTP credentials:
   ```
   SMTP Server: smtp-relay.brevo.com
   Port: 587
   Login: your-email@example.com
   Password: [Click "Create new SMTP key"]
   ```
5. Click "Create a new SMTP key"
6. Name it "Book Tracker Production"
7. Copy the generated SMTP key (you won't be able to see it again!)

### Step 2.3: Verify Sender Email (Optional but Recommended)
1. Go to "Senders" in the left menu
2. Click "Add a sender"
3. Enter your email address or domain
4. Follow verification instructions
5. Once verified, you can send emails from this address

**Free Tier Limits:**
- 300 emails/day
- Unlimited contacts
- Basic email templates

---

## 3. Backend Deployment (Render)

### Step 3.1: Create Render Account
1. Go to [render.com](https://render.com)
2. Click "Get Started"
3. Sign up with GitHub (recommended)
4. Authorize Render to access your repositories

### Step 3.2: Deploy Backend Service
1. Click "New +" button (top right)
2. Select "Web Service"
3. Connect your GitHub repository
4. Select your `WebBookTracker` repository
5. Configure the service:

   **Basic Settings:**
   - Name: `booktracker-api` (or your choice)
   - Region: Oregon (or closest to your users)
   - Branch: `main`
   - Root Directory: (leave blank)
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`

   **Instance Type:**
   - Select "Free" ($0/month)

6. Click "Advanced" to add environment variables

### Step 3.3: Configure Environment Variables

Click "Add Environment Variable" and add each of these:

**Server Configuration:**
```
NODE_ENV = production
PORT = 10000
```

**Security:**
```
JWT_SECRET = [Generate a long random string - see note below]
```

**Database (from PlanetScale Step 1.3):**
```
DB_HOST = <your-db>.us-east-2.psdb.cloud
DB_USER = <your-username>
DB_PASSWORD = <your-password>
DB_NAME = booktracker
DB_SSL = true
```

**Email (from Brevo Step 2.2):**
```
SMTP_HOST = smtp-relay.brevo.com
SMTP_PORT = 587
SMTP_SECURE = false
SMTP_USER = your-email@example.com
SMTP_PASS = <your-brevo-smtp-key>
EMAIL_FROM = Book Tracker <noreply@yourdomain.com>
```

**AI API Keys (your existing keys):**
```
GEMINI_API_KEY = <your-gemini-key>
HF_API_KEY = <your-huggingface-key>
COHERE_API_KEY = <your-cohere-key>
GOOGLE_BOOKS_API_KEY = <your-google-books-key>
```

**App URL (will update later):**
```
APP_URL = https://booktracker-api.onrender.com
```

**Note:** To generate a secure JWT secret, run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 3.4: Deploy
1. Click "Create Web Service"
2. Wait 2-5 minutes for deployment
3. Watch the logs for any errors
4. Once complete, you'll see "Your service is live"

### Step 3.5: Verify Backend
1. Copy your backend URL: `https://booktracker-api.onrender.com`
2. Open in browser
3. You should see:
   ```json
   {
     "message": "Book Tracker API is running!",
     "version": "2.0.0",
     ...
   }
   ```

**Test health endpoint:**
`https://booktracker-api.onrender.com/api/health`

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "environment": "production"
}
```

### Step 3.6: Update APP_URL
1. Go back to Render dashboard
2. Click on your service
3. Click "Environment" tab
4. Find `APP_URL` variable
5. Update to: `https://your-frontend-domain.vercel.app` (we'll get this in next section)
6. Save and wait for redeploy

---

## 4. Frontend Deployment (Vercel)

### Step 4.1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with GitHub (recommended)
4. Authorize Vercel

### Step 4.2: Update Frontend Configuration

**Before deploying**, update `config.js` in your repository:

```javascript
const CONFIG = {
  API_URL: (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:9000';
    }
    // Update this with your actual Render backend URL
    return 'https://booktracker-api.onrender.com';
  })(),
  // ... rest of config
};
```

**Commit and push this change:**
```bash
git add config.js
git commit -m "Update production API URL"
git push
```

### Step 4.3: Deploy Frontend
1. In Vercel dashboard, click "Add New..."
2. Select "Project"
3. Click "Import" next to your repository
4. Configure project:

   **Project Settings:**
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: (leave empty or `echo "No build needed"`)
   - Output Directory: `./`

5. Click "Deploy"
6. Wait 1-2 minutes for deployment

### Step 4.4: Get Frontend URL
1. Once deployed, you'll see: "Congratulations! Your project has been deployed"
2. Copy your URL: `https://your-project.vercel.app`
3. Click "Visit" to test your app

### Step 4.5: Update Backend APP_URL
Now go back to Render (Step 3.6 if you skipped it):
1. Update the `APP_URL` environment variable in Render
2. Set it to your Vercel URL: `https://your-project.vercel.app`
3. This ensures email verification and password reset links use the correct domain

### Step 4.6: Set up Custom Domain (Optional)
1. In Vercel, go to your project
2. Click "Settings" > "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Wait for SSL certificate (automatic, ~1 hour)

---

## 5. Post-Deployment

### Step 5.1: Test Complete Flow
1. **Register a new user**
   - Go to your Vercel URL
   - Click "Sign Up"
   - Enter email, username, password
   - Submit registration

2. **Verify email**
   - Check your email inbox
   - Click verification link
   - Should redirect to login page

3. **Login**
   - Enter credentials
   - Should see dashboard

4. **Add a book**
   - Click "Add Book"
   - Search for a book or add manually
   - Save book

5. **Test AI features**
   - Go to "Discover"
   - Try semantic search
   - Test AI recommendations

### Step 5.2: Test Password Reset
1. Logout
2. Click "Forgot Password"
3. Enter your email
4. Check inbox for reset link
5. Complete password reset
6. Login with new password

### Step 5.3: Monitor First Requests
1. Open Render dashboard
2. Go to your service
3. Click "Logs" tab
4. Watch for any errors during first user interactions

---

## 6. Monitoring & Maintenance

### 6.1: Set Up Uptime Monitoring (Free)

**Using UptimeRobot:**
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up for free
3. Add monitor:
   - Monitor Type: HTTP(s)
   - Friendly Name: Book Tracker API
   - URL: `https://booktracker-api.onrender.com/api/health`
   - Monitoring Interval: 5 minutes
4. Add email alerts

**Using Render Built-in Health Checks:**
Render automatically monitors `/api/health` endpoint (configured in `render.yaml`)

### 6.2: Handle Cold Starts

**Problem:** Render free tier spins down after 15 minutes of inactivity. First request after spin down takes ~30 seconds.

**Solutions:**

**Option A: Accept cold starts**
- Add loading message to frontend: "Server waking up, please wait..."
- Most cost-effective option

**Option B: Keep-alive pings** (Not recommended on free tier)
- Create a cron job that pings your API every 14 minutes
- Use cron-job.org or similar service
- **Warning:** This may violate Render's fair use policy

**Option C: Upgrade to paid plan**
- Render Starter: $7/month
- No cold starts
- Better performance

### 6.3: Database Maintenance

**PlanetScale Free Tier Notes:**
- 5GB storage (should be plenty for personal use)
- No automatic backups (manual exports only)
- Connection limits: reasonable for small apps

**Backup Strategy:**
1. Export database monthly:
   ```sql
   -- In PlanetScale console
   SELECT * FROM users;
   SELECT * FROM books;
   -- etc. for all tables
   ```
2. Save exports locally or to cloud storage

**Monitor Storage:**
- Check database size in PlanetScale dashboard
- Clean up old search history and analytics data periodically

### 6.4: Email Monitoring

**Brevo Dashboard:**
- Monitor email delivery rates
- Check bounce rates
- Review spam reports
- Track daily email usage (300/day limit)

**If approaching limits:**
- Reduce verification email resends
- Batch notification emails
- Consider upgrade ($25/month for 20k emails)

### 6.5: Cost Monitoring

**Current Setup:**
- Vercel: $0/month (100GB bandwidth)
- Render: $0/month (750 hours free - enough for 1 service)
- PlanetScale: $0/month (5GB storage)
- Brevo: $0/month (300 emails/day)

**Total: $0/month**

**When to upgrade:**
- Vercel: 100GB bandwidth exceeded (~10k+ daily active users)
- Render: Need to eliminate cold starts ($7/month)
- PlanetScale: Approaching 5GB storage ($39/month for 25GB)
- Brevo: Need >300 emails/day ($25/month for 20k)

---

## 7. Troubleshooting

### Issue: "Cannot connect to database"

**Symptoms:** Health check returns database: disconnected

**Solutions:**
1. Check PlanetScale credentials in Render environment variables
2. Ensure `DB_SSL=true` is set
3. Verify PlanetScale database is not paused
4. Check PlanetScale dashboard for connection issues
5. Review Render logs for specific error messages

### Issue: "Email not sending"

**Symptoms:** Verification emails not received

**Solutions:**
1. Check spam folder
2. Verify Brevo SMTP credentials in Render
3. Check Brevo dashboard for failed deliveries
4. Ensure sender email is verified in Brevo
5. Test SMTP connection manually:
   ```bash
   curl -v smtp://smtp-relay.brevo.com:587
   ```
6. Review Render logs for email errors

### Issue: "CORS errors in browser console"

**Symptoms:** API requests blocked by CORS policy

**Solutions:**
1. Verify `APP_URL` in Render matches your Vercel domain exactly
2. Check CORS configuration in `server.js`
3. Ensure no trailing slashes in `APP_URL`
4. Clear browser cache and cookies
5. Check Vercel domain is correctly set (not `localhost`)

### Issue: "Cold start too slow"

**Symptoms:** First request after inactivity takes 30+ seconds

**Solutions:**
1. Add loading message to frontend
2. Optimize backend startup time (reduce dependencies)
3. Keep database connections pooled (already implemented)
4. Consider upgrading to Render paid plan ($7/month)
5. Use edge functions for critical paths (Vercel Edge Functions)

### Issue: "Rate limit exceeded"

**Symptoms:** API returns 429 Too Many Requests

**Solutions:**
1. Current limit: 100 requests per 15 minutes per IP
2. Increase limit in `server.js`:
   ```javascript
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 200 // increase from 100
   });
   ```
3. Commit and push changes
4. Render will auto-redeploy

### Issue: "API keys not working"

**Symptoms:** AI features return errors

**Solutions:**
1. Verify all API keys are set in Render environment variables
2. Check API key quotas on provider dashboards:
   - Gemini: [Google AI Studio](https://makersuite.google.com)
   - Hugging Face: [Account settings](https://huggingface.co/settings/tokens)
   - Cohere: [Dashboard](https://dashboard.cohere.com)
3. Ensure keys don't have whitespace or line breaks
4. Regenerate keys if necessary
5. Update keys in Render and redeploy

### Issue: "JWT token expired"

**Symptoms:** Users logged out unexpectedly

**Solutions:**
1. Check JWT expiration time in `server.js` (currently 24h)
2. Implement refresh token mechanism (future enhancement)
3. User needs to login again (expected behavior)
4. Increase token expiration if needed:
   ```javascript
   const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
   ```

### Issue: "Database schema out of date"

**Symptoms:** SQL errors about missing columns/tables

**Solutions:**
1. Re-run `database-schema.sql` in PlanetScale console
2. Check if all tables exist: `SHOW TABLES;`
3. Verify table structure: `DESCRIBE users;`
4. If needed, drop and recreate:
   ```sql
   DROP TABLE IF EXISTS achievements;
   DROP TABLE IF EXISTS search_history;
   -- ... etc for all tables in reverse order of dependencies
   -- Then run full schema script
   ```

---

## Quick Reference

### Important URLs
- **Frontend:** `https://your-project.vercel.app`
- **Backend:** `https://booktracker-api.onrender.com`
- **Health Check:** `https://booktracker-api.onrender.com/api/health`

### Service Dashboards
- **Vercel:** [vercel.com/dashboard](https://vercel.com/dashboard)
- **Render:** [dashboard.render.com](https://dashboard.render.com)
- **PlanetScale:** [app.planetscale.com](https://app.planetscale.com)
- **Brevo:** [app.brevo.com](https://app.brevo.com)

### Environment Variables Checklist
```
✓ NODE_ENV=production
✓ PORT=10000
✓ JWT_SECRET=<64-char-random-string>
✓ APP_URL=<vercel-url>
✓ DB_HOST=<planetscale-host>
✓ DB_USER=<planetscale-user>
✓ DB_PASSWORD=<planetscale-password>
✓ DB_NAME=booktracker
✓ DB_SSL=true
✓ SMTP_HOST=smtp-relay.brevo.com
✓ SMTP_PORT=587
✓ SMTP_SECURE=false
✓ SMTP_USER=<your-email>
✓ SMTP_PASS=<brevo-smtp-key>
✓ EMAIL_FROM=Book Tracker <noreply@yourdomain.com>
✓ GEMINI_API_KEY=<key>
✓ HF_API_KEY=<key>
✓ COHERE_API_KEY=<key>
✓ GOOGLE_BOOKS_API_KEY=<key>
```

---

## Next Steps

After successful deployment:

1. **Share your app** - Send the Vercel URL to friends and family
2. **Set up custom domain** - Makes your app more professional
3. **Monitor usage** - Watch for errors and performance issues
4. **Optimize performance** - Reduce bundle sizes, optimize images
5. **Gather feedback** - Improve based on user feedback
6. **Consider upgrades** - If you exceed free tier limits

---

## Getting Help

If you encounter issues not covered here:

1. **Check Render logs** - Most errors appear here
2. **Check browser console** - For frontend errors
3. **Test API directly** - Use Postman or curl
4. **Review service status pages**:
   - [Render Status](https://status.render.com)
   - [Vercel Status](https://vercel-status.com)
   - [PlanetScale Status](https://status.planetscale.com)

---

**Congratulations!** Your Book Tracker app is now deployed and accessible to the world! 🎉📚

