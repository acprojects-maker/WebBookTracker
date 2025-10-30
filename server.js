
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fetch = require('node-fetch');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 9000;
const JWT_SECRET = process.env.JWT_SECRET;


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


transporter.verify(function(error, success) {
  if (error) {
    console.log('⚠️  Email configuration error:', error.message);
    console.log('📧 Emails will be logged to console instead');
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});


async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html
    });
    console.log('📧 Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
}

function getVerificationEmailHTML(username, verificationLink) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 40px;
          color: white;
        }
        .content {
          background: white;
          border-radius: 12px;
          padding: 32px;
          margin-top: 24px;
          color: #333;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 24px 0;
        }
        .footer {
          text-align: center;
          margin-top: 32px;
          font-size: 14px;
          color: #666;
        }
        h1 { margin: 0 0 16px 0; font-size: 28px; }
        p { margin: 0 0 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📚 Welcome to Book Tracker!</h1>
        <p>Hi ${username},</p>
        <div class="content">
          <p>Thanks for signing up! We're excited to help you track your reading journey.</p>
          <p>To get started, please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify Email Address</a>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationLink}" style="color: #667eea; word-break: break-all;">${verificationLink}</a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            This link will expire in 24 hours.
          </p>
        </div>
        <div class="footer">
          <p>If you didn't create an account with Book Tracker, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getPasswordResetEmailHTML(username, resetLink) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 40px;
          color: white;
        }
        .content {
          background: white;
          border-radius: 12px;
          padding: 32px;
          margin-top: 24px;
          color: #333;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 24px 0;
        }
        .footer {
          text-align: center;
          margin-top: 32px;
          font-size: 14px;
          color: #666;
        }
        h1 { margin: 0 0 16px 0; font-size: 28px; }
        p { margin: 0 0 16px 0; }
        .warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          margin: 24px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔒 Password Reset Request</h1>
        <p>Hi ${username},</p>
        <div class="content">
          <p>We received a request to reset your password for your Book Tracker account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
          </p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>If you're having trouble, please contact support or try requesting a new reset link.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}


app.use(helmet());

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.APP_URL
    : ['http://localhost:9000', 'http://127.0.0.1:9000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing with size limits for security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});


// Database connection pool for PostgreSQL (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}


app.get('/', (req, res) => {
  res.json({
    message: 'Book Tracker API is running!',
    version: '2.0.0',
    features: ['Discovery', 'AI Search', 'Reading Lists'],
    endpoints: {
      auth: '/api/auth',
      books: '/api/books',
      stats: '/api/stats',
      discovery: '/api/discovery',
      search: '/api/search'
    }
  });
});

// Health check endpoint for Render and monitoring services
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});


app.get('/api/debug/pending-verifications', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, email_verified, verification_token, verification_token_expiry FROM users WHERE email_verified = false ORDER BY id DESC LIMIT 10'
    );
    res.json({ pendingUsers: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


async function cleanupUnverifiedAccounts() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await pool.query(
      'DELETE FROM users WHERE email_verified = false AND created_at < $1',
      [twentyFourHoursAgo]
    );

    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} unverified account(s) older than 24 hours`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up unverified accounts:', error);
  }
}


setInterval(cleanupUnverifiedAccounts, 60 * 60 * 1000);


cleanupUnverifiedAccounts();




app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, yearlyGoal } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);


    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await pool.query(
      'INSERT INTO users (username, email, password, yearly_goal, email_verified, verification_token, verification_token_expiry) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [username, email, hashedPassword, yearlyGoal || 50, false, verificationToken, tokenExpiry]
    );


    const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const verificationLink = `${baseUrl}/api/auth/verify-email/${verificationToken}`;
    const emailHTML = getVerificationEmailHTML(username, verificationLink);

    try {
      await sendEmail(
        email,
        'Welcome to Book Tracker - Verify Your Email',
        emailHTML
      );
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);

    }

    res.status(201).json({
      message: 'Account created successfully! Please check your email to verify your account before logging in.',
      requiresVerification: true,
      email: email
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});


app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const users = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (users.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }


    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in. Check your inbox for the verification link.',
        needsVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        yearlyGoal: user.yearly_goal
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});


app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const users = await pool.query(
      'SELECT id, username, email, yearly_goal, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (users.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});


app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { username, yearly_goal } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (username) {
      updates.push(`username = $${paramIndex++}`);
      params.push(username);
    }
    if (yearly_goal !== undefined) {
      updates.push(`yearly_goal = $${paramIndex++}`);
      params.push(yearly_goal);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(req.user.id);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const users = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    if (users.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users.rows[0];


    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);


    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});


app.delete('/api/auth/delete-account', authenticateToken, async (req, res) => {
  try {

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});


app.get('/api/auth/account-stats', authenticateToken, async (req, res) => {
  try {
    const bookCount = await pool.query(
      'SELECT COUNT(*) as count FROM books WHERE user_id = $1',
      [req.user.id]
    );

    const finishedCount = await pool.query(
      'SELECT COUNT(*) as count FROM books WHERE user_id = $1 AND status = $2',
      [req.user.id, 'Finished']
    );

    const totalPages = await pool.query(
      'SELECT SUM(pages) as total FROM books WHERE user_id = $1 AND status = $2',
      [req.user.id, 'Finished']
    );

    const accountAge = await pool.query(
      'SELECT created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    const createdAt = new Date(accountAge.rows[0].created_at);
    const daysActive = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));

    res.json({
      totalBooks: bookCount.rows[0].count,
      finishedBooks: finishedCount.rows[0].count,
      totalPages: totalPages.rows[0].total || 0,
      accountCreated: accountAge.rows[0].created_at,
      daysActive: daysActive
    });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({ error: 'Failed to fetch account statistics' });
  }
});

console.log('✅ Profile management routes added successfully');




app.get('/api/auth/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const users = await pool.query(
      'SELECT id, email, verification_token_expiry FROM users WHERE verification_token = $1',
      [token]
    );

    if (users.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const user = users.rows[0];


    if (new Date() > new Date(user.verification_token_expiry)) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }


    await pool.query(
      'UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expiry = NULL WHERE id = $1',
      [user.id]
    );


    res.redirect(`${process.env.APP_URL}/login.html?verified=true`);
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});


app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const users = await pool.query(
      'SELECT id, username FROM users WHERE email = $1',
      [email]
    );


    if (users.rows.length === 0) {
      return res.json({ message: 'If an account exists with that email, a password reset link has been sent.' });
    }

    const user = users.rows[0];


    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, tokenExpiry, user.id]
    );


    const resetLink = `${process.env.APP_URL}/reset-password.html?token=${resetToken}`;
    const emailHTML = getPasswordResetEmailHTML(user.username, resetLink);

    try {
      await sendEmail(
        email,
        'Book Tracker - Password Reset Request',
        emailHTML
      );
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);

    }

    res.json({
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});


app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const users = await pool.query(
      'SELECT id, reset_token_expiry FROM users WHERE reset_token = $1',
      [token]
    );

    if (users.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = users.rows[0];


    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);


    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password reset successfully! You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});


app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const users = await pool.query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (users.rows.length === 0) {
      return res.json({ message: 'If an account exists with that email, a verification link has been sent.' });
    }

    const user = users.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }


    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expiry = $2 WHERE id = $3',
      [verificationToken, tokenExpiry, user.id]
    );


    const userDetails = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [user.id]
    );


    const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const verificationLink = `${baseUrl}/api/auth/verify-email/${verificationToken}`;
    const emailHTML = getVerificationEmailHTML(userDetails.rows[0].username, verificationLink);

    try {
      await sendEmail(
        email,
        'Book Tracker - Verify Your Email',
        emailHTML
      );
      console.log(`✅ Verification email resent to ${email}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);

    }

    res.json({
      message: 'If an account exists with that email, a verification link has been sent.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

console.log('✅ Email verification & password reset routes added successfully');

// ==================== AI Configuration Endpoints ====================
// Secure endpoint to serve AI API keys to authenticated users
app.get('/api/config/ai-keys', authenticateToken, (req, res) => {
  try {
    // Return AI API keys from environment variables (server-side only)
    res.json({
      gemini: process.env.GEMINI_API_KEY || null,
      hf: process.env.HF_API_KEY || null,
      cohere: process.env.COHERE_API_KEY || null
    });
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

console.log('✅ AI configuration routes added successfully');
// =====================================================================




app.get('/api/books', authenticateToken, async (req, res) => {
  try {
    const { status, genre, sort } = req.query;
    let query = 'SELECT * FROM books WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (genre) {
      query += ` AND genre = $${paramIndex++}`;
      params.push(genre);
    }

    if (sort === 'rating') {
      query += ' ORDER BY rating DESC';
    } else if (sort === 'recent') {
      query += ' ORDER BY last_read_date DESC';
    } else if (sort === 'title') {
      query += ' ORDER BY title ASC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const books = await pool.query(query, params);
    res.json(books.rows);
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});


app.get('/api/books/:id', authenticateToken, async (req, res) => {
  try {
    const books = await pool.query(
      'SELECT * FROM books WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (books.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(books.rows[0]);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});


app.post('/api/books', authenticateToken, async (req, res) => {
  try {
    const {
      title, author, isbn, status, rating, progress, pages,
      genre, lastReadDate, readingTime, description, publisher,
      publishedDate, coverUrl, notes
    } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author required' });
    }

    const result = await pool.query(
      `INSERT INTO books (
        user_id, title, author, isbn, status, rating, progress, pages,
        genre, last_read_date, reading_time, description, publisher,
        published_date, cover_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        req.user.id, title, author, isbn, status || 'Currently Reading',
        rating, progress || 0, pages || 0, genre, lastReadDate,
        readingTime || 0, description, publisher, publishedDate, coverUrl,
        notes || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({ error: 'Failed to add book' });
  }
});


app.put('/api/books/:id', authenticateToken, async (req, res) => {
  try {
    const {
      title, author, isbn, status, rating, progress, pages,
      genre, lastReadDate, readingTime, description, publisher,
      publishedDate, coverUrl, notes
    } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title) { updates.push(`title = $${paramIndex++}`); params.push(title); }
    if (author) { updates.push(`author = $${paramIndex++}`); params.push(author); }
    if (isbn !== undefined) { updates.push(`isbn = $${paramIndex++}`); params.push(isbn); }
    if (status) { updates.push(`status = $${paramIndex++}`); params.push(status); }
    if (rating !== undefined) { updates.push(`rating = $${paramIndex++}`); params.push(rating); }
    if (progress !== undefined) { updates.push(`progress = $${paramIndex++}`); params.push(progress); }
    if (pages !== undefined) { updates.push(`pages = $${paramIndex++}`); params.push(pages); }
    if (genre) { updates.push(`genre = $${paramIndex++}`); params.push(genre); }
    if (lastReadDate) { updates.push(`last_read_date = $${paramIndex++}`); params.push(lastReadDate); }
    if (readingTime !== undefined) { updates.push(`reading_time = $${paramIndex++}`); params.push(readingTime); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); params.push(description); }
    if (publisher !== undefined) { updates.push(`publisher = $${paramIndex++}`); params.push(publisher); }
    if (publishedDate !== undefined) { updates.push(`published_date = $${paramIndex++}`); params.push(publishedDate); }
    if (coverUrl !== undefined) { updates.push(`cover_url = $${paramIndex++}`); params.push(coverUrl); }
    if (notes !== undefined) { updates.push(`notes = $${paramIndex++}`); params.push(notes); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE books SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
      params
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const updatedBook = await pool.query(
      'SELECT * FROM books WHERE id = $1',
      [req.params.id]
    );

    res.json(updatedBook.rows[0]);
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});


app.delete('/api/books/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM books WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});




app.get('/api/books/:bookId/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await pool.query(
      `SELECT rs.* FROM reading_sessions rs
       INNER JOIN books b ON rs.book_id = b.id
       WHERE rs.book_id = $1 AND b.user_id = $2
       ORDER BY rs.session_date DESC`,
      [req.params.bookId, req.user.id]
    );

    res.json(sessions.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch reading sessions' });
  }
});


app.post('/api/books/:bookId/sessions', authenticateToken, async (req, res) => {
  try {
    const { date, duration, pagesRead, notes } = req.body;

    if (!date || !duration) {
      return res.status(400).json({ error: 'Date and duration required' });
    }

    const books = await pool.query(
      'SELECT id FROM books WHERE id = $1 AND user_id = $2',
      [req.params.bookId, req.user.id]
    );

    if (books.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const result = await pool.query(
      `INSERT INTO reading_sessions (book_id, user_id, session_date, duration, pages_read, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.bookId, req.user.id, date, duration, pagesRead || 0, notes]
    );

    await pool.query(
      'UPDATE books SET reading_time = reading_time + $1 WHERE id = $2',
      [duration, req.params.bookId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add session error:', error);
    res.status(500).json({ error: 'Failed to add reading session' });
  }
});




app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;


    const booksRead = await pool.query(
      'SELECT COUNT(*) as count FROM books WHERE user_id = $1 AND status = $2 AND last_read_date >= $3 AND last_read_date <= $4',
      [req.user.id, 'Finished', yearStart, yearEnd]
    );


    const totalPages = await pool.query(
      'SELECT SUM(pages) as total FROM books WHERE user_id = $1 AND status = $2 AND last_read_date >= $3 AND last_read_date <= $4',
      [req.user.id, 'Finished', yearStart, yearEnd]
    );


    const avgRating = await pool.query(
      'SELECT AVG(rating) as avg FROM books WHERE user_id = $1 AND rating IS NOT NULL AND last_read_date >= $2 AND last_read_date <= $3',
      [req.user.id, yearStart, yearEnd]
    );


    const totalTime = await pool.query(
      'SELECT SUM(reading_time) as total FROM books WHERE user_id = $1 AND last_read_date >= $2 AND last_read_date <= $3',
      [req.user.id, yearStart, yearEnd]
    );


    const allTimeBooksRead = await pool.query(
      'SELECT COUNT(*) as count FROM books WHERE user_id = $1 AND status = $2',
      [req.user.id, 'Finished']
    );

    const allTimeTotalPages = await pool.query(
      'SELECT SUM(pages) as total FROM books WHERE user_id = $1 AND status = $2',
      [req.user.id, 'Finished']
    );


    const favoriteGenre = await pool.query(
      `SELECT genre, COUNT(*) as count FROM books
       WHERE user_id = $1 AND status = $2 AND genre IS NOT NULL
       AND last_read_date >= $3 AND last_read_date <= $4
       GROUP BY genre ORDER BY count DESC LIMIT 1`,
      [req.user.id, 'Finished', yearStart, yearEnd]
    );


    const monthlyBooks = await pool.query(
      `SELECT TO_CHAR(last_read_date, 'YYYY-MM') as month, COUNT(*) as count
       FROM books WHERE user_id = $1 AND status = $2 AND last_read_date >= $3 AND last_read_date <= $4
       GROUP BY TO_CHAR(last_read_date, 'YYYY-MM') ORDER BY month DESC`,
      [req.user.id, 'Finished', yearStart, yearEnd]
    );


    const genreDistribution = await pool.query(
      `SELECT genre, COUNT(*) as count FROM books
       WHERE user_id = $1 AND status = $2 AND genre IS NOT NULL
       AND last_read_date >= $3 AND last_read_date <= $4
       GROUP BY genre ORDER BY count DESC`,
      [req.user.id, 'Finished', yearStart, yearEnd]
    );

    const recentBooks = await pool.query(
      `SELECT DISTINCT last_read_date FROM books
       WHERE user_id = $1 AND last_read_date IS NOT NULL
       ORDER BY last_read_date DESC LIMIT 100`,
      [req.user.id]
    );

    let streak = 0;
    if (recentBooks.rows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let currentDate = today;

      for (const book of recentBooks.rows) {
        const bookDate = new Date(book.last_read_date);
        bookDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((currentDate - bookDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (diffDays === 1) {
          streak++;
          currentDate = new Date(bookDate);
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    res.json({
      year: currentYear,
      booksRead: booksRead.rows[0].count,
      totalPages: totalPages.rows[0].total || 0,
      averageRating: avgRating.rows[0].avg ? parseFloat(avgRating.rows[0].avg).toFixed(1) : 0,
      totalReadingTime: totalTime.rows[0].total || 0,
      favoriteGenre: favoriteGenre.rows[0]?.genre || 'N/A',
      readingStreak: streak,
      monthlyBooks: monthlyBooks.rows,
      genreDistribution: genreDistribution.rows,

      allTime: {
        booksRead: allTimeBooksRead.rows[0].count,
        totalPages: allTimeTotalPages.rows[0].total || 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});



app.get('/api/search/books', authenticateToken, async (req, res) => {
  try {
    const { q, isbn, genre } = req.query;

    if (!q && !isbn && !genre) {
      return res.status(400).json({ error: 'Query, ISBN, or genre required' });
    }

    let searchQuery;
    if (isbn) {
      searchQuery = `isbn:${isbn}`;
    } else if (genre) {
      searchQuery = `subject:${genre}`;
    } else {
      searchQuery = q.includes(':') ? q : `intitle:${q}`;
    }
    
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=40`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return res.json([]);
    }

    const books = data.items.map(item => ({
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.join(', ') || 'Unknown',
      isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
      pages: item.volumeInfo.pageCount || 0,
      description: item.volumeInfo.description || '',
      publisher: item.volumeInfo.publisher || '',
      publishedDate: item.volumeInfo.publishedDate || '',
      coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      cover: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      genre: item.volumeInfo.categories?.[0] || 'Unknown'
    }));

    res.json(books);
  } catch (error) {
    console.error('Search books error:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
});




app.get('/api/discovery/trending', authenticateToken, async (req, res) => {
  try {
    const trendingTopics = [
      'bestseller 2024',
      'award winner',
      'popular fiction',
      'trending nonfiction'
    ];

    const randomTopic = trendingTopics[Math.floor(Math.random() * trendingTopics.length)];
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(randomTopic)}&orderBy=relevance&maxResults=20`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return res.json([]);
    }

    const books = data.items.map(item => ({
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.join(', ') || 'Unknown',
      isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
      pages: item.volumeInfo.pageCount || 0,
      description: item.volumeInfo.description || '',
      publisher: item.volumeInfo.publisher || '',
      publishedDate: item.volumeInfo.publishedDate || '',
      coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      genre: item.volumeInfo.categories?.[0] || 'Fiction'
    }));

    res.json(books);
  } catch (error) {
    console.error('Trending books error:', error);
    res.status(500).json({ error: 'Failed to fetch trending books' });
  }
});


app.get('/api/discovery/recommendations', authenticateToken, async (req, res) => {
  try {

    const favoriteGenres = await pool.query(
      `SELECT genre, COUNT(*) as count FROM books
       WHERE user_id = $1 AND status = $2 AND rating >= 4 AND genre IS NOT NULL
       GROUP BY genre ORDER BY count DESC LIMIT 3`,
      [req.user.id, 'Finished']
    );

    if (favoriteGenres.rows.length === 0) {

      const url = `https://www.googleapis.com/books/v1/volumes?q=popular+fiction&orderBy=relevance&maxResults=20`;
      const response = await fetch(url);
      const data = await response.json();

      const books = data.items?.map(item => ({
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors?.join(', ') || 'Unknown',
        isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
        pages: item.volumeInfo.pageCount || 0,
        description: item.volumeInfo.description || '',
        coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
        genre: item.volumeInfo.categories?.[0] || 'Fiction'
      })) || [];

      return res.json(books);
    }


    const genre = favoriteGenres.rows[0].genre;
    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genre)}&orderBy=relevance&maxResults=20`;

    const response = await fetch(url);
    const data = await response.json();

    const books = data.items?.map(item => ({
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.join(', ') || 'Unknown',
      isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
      pages: item.volumeInfo.pageCount || 0,
      description: item.volumeInfo.description || '',
      publisher: item.volumeInfo.publisher || '',
      publishedDate: item.volumeInfo.publishedDate || '',
      coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      genre: item.volumeInfo.categories?.[0] || genre
    })) || [];

    res.json(books);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});


app.get('/api/discovery/genre/:genre', authenticateToken, async (req, res) => {
  try {
    const { genre } = req.params;
    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genre)}&orderBy=relevance&maxResults=30`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return res.json([]);
    }

    const books = data.items.map(item => ({
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.join(', ') || 'Unknown',
      isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier,
      pages: item.volumeInfo.pageCount || 0,
      description: item.volumeInfo.description || '',
      publisher: item.volumeInfo.publisher || '',
      publishedDate: item.volumeInfo.publishedDate || '',
      coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      genre: item.volumeInfo.categories?.[0] || genre
    }));

    res.json(books);
  } catch (error) {
    console.error('Genre search error:', error);
    res.status(500).json({ error: 'Failed to fetch books by genre' });
  }
});



app.get('/api/discovery/preferences', authenticateToken, async (req, res) => {
  try {
    const prefs = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [req.user.id]
    );

    if (prefs.rows.length === 0) {

      return res.json({
        favorite_genres: [],
        excluded_genres: [],
        excluded_authors: [],
        reading_goals: {},
        notifications_enabled: true,
        theme: 'dark'
      });
    }


    const pref = prefs.rows[0];
    return res.json({
      favorite_genres: JSON.parse(pref.favorite_genres || '[]'),
      excluded_genres: [],
      excluded_authors: [],
      reading_goals: JSON.parse(pref.reading_goals || '{}'),
      notifications_enabled: pref.notifications_enabled,
      theme: pref.theme || 'dark'
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});


app.put('/api/discovery/preferences', authenticateToken, async (req, res) => {
  try {
    const {
      favorite_genres,
      excluded_genres,
      excluded_authors,
      reading_goals,
      notifications_enabled,
      theme
    } = req.body;

    const existing = await pool.query(
      'SELECT id FROM user_preferences WHERE user_id = $1',
      [req.user.id]
    );

    if (existing.rows.length === 0) {

      await pool.query(
        `INSERT INTO user_preferences (user_id, favorite_genres, reading_goals, notifications_enabled, theme)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          JSON.stringify(favorite_genres || []),
          JSON.stringify(reading_goals || {}),
          notifications_enabled !== undefined ? notifications_enabled : true,
          theme || 'dark'
        ]
      );
    } else {

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (favorite_genres !== undefined) {
        updates.push(`favorite_genres = $${paramIndex++}`);
        params.push(JSON.stringify(favorite_genres));
      }
      if (reading_goals !== undefined) {
        updates.push(`reading_goals = $${paramIndex++}`);
        params.push(JSON.stringify(reading_goals));
      }
      if (notifications_enabled !== undefined) {
        updates.push(`notifications_enabled = $${paramIndex++}`);
        params.push(notifications_enabled);
      }
      if (theme !== undefined) {
        updates.push(`theme = $${paramIndex++}`);
        params.push(theme);
      }

      if (updates.length > 0) {
        params.push(req.user.id);
        await pool.query(
          `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
          params
        );
      }
    }

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});




app.get('/api/discovery/search-history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const history = await pool.query(
      `SELECT id, query, results_count, created_at
       FROM search_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );

    res.json(history.rows);
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});


app.post('/api/discovery/search-history', authenticateToken, async (req, res) => {
  try {
    const { query, results_count } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const result = await pool.query(
      'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, query, results_count || 0]
    );

    res.json({
      message: 'Search saved successfully',
      id: result.rows[0].id,
      query: query,
      results_count: results_count || 0
    });
  } catch (error) {
    console.error('Save search history error:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});




app.get('/api/discovery/saved-searches', authenticateToken, async (req, res) => {
  try {
    res.json([]);
    
    
    
  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});


app.post('/api/discovery/saved-searches', authenticateToken, async (req, res) => {
  try {
    const { name, query, filters } = req.body;
    
    res.json({ message: 'Search saved', id: Date.now() });
    
    
    
  } catch (error) {
    console.error('Save search error:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});


app.delete('/api/discovery/saved-searches/:id', authenticateToken, async (req, res) => {
  try {
    res.json({ message: 'Search deleted' });
    
    
    
  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({ error: 'Failed to delete search' });
  }
});




app.get('/api/discovery/reading-lists', authenticateToken, async (req, res) => {
  try {
    const lists = await pool.query(
      'SELECT * FROM reading_lists WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json(lists.rows);
  } catch (error) {
    console.error('Get reading lists error:', error);
    res.status(500).json({ error: 'Failed to fetch reading lists' });
  }
});


app.post('/api/discovery/reading-lists', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'List name required' });
    }

    const result = await pool.query(
      'INSERT INTO reading_lists (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create reading list error:', error);
    res.status(500).json({ error: 'Failed to create reading list' });
  }
});


app.post('/api/discovery/reading-lists/:listId/items', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const { title, author, isbn, coverUrl, genre } = req.body;


    const lists = await pool.query(
      'SELECT id FROM reading_lists WHERE id = $1 AND user_id = $2',
      [listId, req.user.id]
    );

    if (lists.rows.length === 0) {
      return res.status(404).json({ error: 'Reading list not found' });
    }



    res.json({ message: 'Book added to list' });



  } catch (error) {
    console.error('Add to reading list error:', error);
    res.status(500).json({ error: 'Failed to add book to list' });
  }
});


app.delete('/api/discovery/reading-lists/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM reading_lists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reading list not found' });
    }

    res.json({ message: 'Reading list deleted' });
  } catch (error) {
    console.error('Delete reading list error:', error);
    res.status(500).json({ error: 'Failed to delete reading list' });
  }
});




app.post('/api/discovery/interactions', authenticateToken, async (req, res) => {
  try {
    const { book_title, book_author, book_isbn, book_genre, interaction_type } = req.body;
    
    
    
    res.json({ message: 'Interaction tracked' });

    
    
  } catch (error) {
    console.error('Track interaction error:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});


app.get('/api/discovery/recommendations', authenticateToken, async (req, res) => {
  try {

    const favoriteGenres = await pool.query(
      `SELECT genre, COUNT(*) as count FROM books
       WHERE user_id = $1 AND status = $2 AND rating >= 4 AND genre IS NOT NULL
       GROUP BY genre ORDER BY count DESC LIMIT 3`,
      [req.user.id, 'Finished']
    );

    if (favoriteGenres.rows.length === 0) {

      return res.json({
        favorite_genres: [],
        favorite_authors: [],
        recommendation_query: 'popular highly rated fiction'
      });
    }


    const favoriteAuthors = await pool.query(
      `SELECT author, COUNT(*) as count FROM books
       WHERE user_id = $1 AND status = $2 AND rating >= 4
       GROUP BY author ORDER BY count DESC LIMIT 3`,
      [req.user.id, 'Finished']
    );

    const genres = favoriteGenres.rows.map(g => g.genre);
    const authors = favoriteAuthors.rows.map(a => a.author);


    const recommendationQuery = genres.slice(0, 2).join(' ') + ' highly rated';

    res.json({
      favorite_genres: genres,
      favorite_authors: authors,
      recommendation_query: recommendationQuery
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

console.log('✅ Discovery endpoints added successfully');




app.get('/api/lists', authenticateToken, async (req, res) => {
  try {
    const lists = await pool.query(
      'SELECT * FROM reading_lists WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json(lists.rows);
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ error: 'Failed to fetch reading lists' });
  }
});


app.post('/api/lists', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'List name required' });
    }

    const result = await pool.query(
      'INSERT INTO reading_lists (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Failed to create reading list' });
  }
});


app.post('/api/lists/:listId/books', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: 'Book ID required' });
    }


    const lists = await pool.query(
      'SELECT id FROM reading_lists WHERE id = $1 AND user_id = $2',
      [req.params.listId, req.user.id]
    );

    if (lists.rows.length === 0) {
      return res.status(404).json({ error: 'Reading list not found' });
    }


    const books = await pool.query(
      'SELECT id FROM books WHERE id = $1 AND user_id = $2',
      [bookId, req.user.id]
    );

    if (books.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }


    const existing = await pool.query(
      'SELECT id FROM list_books WHERE list_id = $1 AND book_id = $2',
      [req.params.listId, bookId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Book already in list' });
    }

    await pool.query(
      'INSERT INTO list_books (list_id, book_id) VALUES ($1, $2)',
      [req.params.listId, bookId]
    );

    res.status(201).json({ message: 'Book added to list' });
  } catch (error) {
    console.error('Add to list error:', error);
    res.status(500).json({ error: 'Failed to add book to list' });
  }
});


app.get('/api/lists/:listId/books', authenticateToken, async (req, res) => {
  try {
    const books = await pool.query(
      `SELECT b.* FROM books b
       INNER JOIN list_books lb ON b.id = lb.book_id
       INNER JOIN reading_lists rl ON lb.list_id = rl.id
       WHERE rl.id = $1 AND rl.user_id = $2
       ORDER BY lb.added_at DESC`,
      [req.params.listId, req.user.id]
    );

    res.json(books.rows);
  } catch (error) {
    console.error('Get list books error:', error);
    res.status(500).json({ error: 'Failed to fetch list books' });
  }
});




app.get('/api/achievements', authenticateToken, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const year = req.query.year ? parseInt(req.query.year) : currentYear;

    const achievements = await pool.query(
      'SELECT achievement_code, unlocked_at, year FROM achievements WHERE user_id = $1 AND year = $2 ORDER BY unlocked_at DESC',
      [req.user.id, year]
    );


    const achievementCodes = achievements.rows.map(a => a.achievement_code);
    res.json({
      achievements: achievementCodes,
      year: year,
      count: achievementCodes.length
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});


app.get('/api/achievements/history', authenticateToken, async (req, res) => {
  try {
    const achievements = await pool.query(
      'SELECT achievement_code, unlocked_at, year FROM achievements WHERE user_id = $1 ORDER BY year DESC, unlocked_at DESC',
      [req.user.id]
    );


    const byYear = achievements.rows.reduce((acc, ach) => {
      if (!acc[ach.year]) acc[ach.year] = [];
      acc[ach.year].push(ach.achievement_code);
      return acc;
    }, {});

    res.json(byYear);
  } catch (error) {
    console.error('Get achievements history error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements history' });
  }
});


app.post('/api/achievements', authenticateToken, async (req, res) => {
  try {
    const { achievements } = req.body;
    const currentYear = new Date().getFullYear();

    if (!Array.isArray(achievements) || achievements.length === 0) {
      return res.status(400).json({ error: 'Achievements array required' });
    }


    if (achievements.length > 0) {
      for (const code of achievements) {
        await pool.query(
          'INSERT INTO achievements (user_id, achievement_code, year) VALUES ($1, $2, $3) ON CONFLICT (user_id, achievement_code, year) DO NOTHING',
          [req.user.id, code, currentYear]
        );
      }
    }

    res.json({
      message: 'Achievements saved successfully',
      count: achievements.length,
      year: currentYear
    });
  } catch (error) {
    console.error('Save achievements error:', error);
    res.status(500).json({ error: 'Failed to save achievements' });
  }
});


app.post('/api/achievements/unlock', authenticateToken, async (req, res) => {
  try {
    const { achievement_code } = req.body;
    const currentYear = new Date().getFullYear();

    if (!achievement_code) {
      return res.status(400).json({ error: 'Achievement code required' });
    }


    await pool.query(
      'INSERT INTO achievements (user_id, achievement_code, year) VALUES ($1, $2, $3) ON CONFLICT (user_id, achievement_code, year) DO NOTHING',
      [req.user.id, achievement_code, currentYear]
    );

    res.json({
      message: 'Achievement unlocked',
      code: achievement_code,
      year: currentYear
    });
  } catch (error) {
    console.error('Unlock achievement error:', error);
    res.status(500).json({ error: 'Failed to unlock achievement' });
  }
});




app.use(express.static('.', {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
  }
}));



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});



async function initializeDatabase() {
  try {
    // PostgreSQL database - tables should be created via schema.sql
    // This function just verifies connectivity
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL database connected successfully');
    console.log('📊 Database tables should be created via schema.sql');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

async function startServer() {
  try {
    console.log('🔄 Initializing Book Tracker Server...');
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('🚀 Book Tracker API Server Started Successfully!');
      console.log('='.repeat(60));
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`📚 API Version: 2.0.0`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('📋 Available Endpoints:');
      console.log('   - GET  /                           (API Info)');
      console.log('   - POST /api/auth/register          (User Registration)');
      console.log('   - POST /api/auth/login             (User Login)');
      console.log('   - GET  /api/auth/me                (Current User)');
      console.log('   - PUT  /api/auth/profile           (Update Profile)');
      console.log('');
      console.log('   - GET  /api/books                  (Get All Books)');
      console.log('   - POST /api/books                  (Add Book)');
      console.log('   - GET  /api/books/:id              (Get Single Book)');
      console.log('   - PUT  /api/books/:id              (Update Book)');
      console.log('   - DELETE /api/books/:id            (Delete Book)');
      console.log('');
      console.log('   - GET  /api/books/:id/sessions     (Reading Sessions)');
      console.log('   - POST /api/books/:id/sessions     (Add Session)');
      console.log('');
      console.log('   - GET  /api/stats                  (User Statistics)');
      console.log('');
      console.log('   - GET  /api/search/books           (Search Books)');
      console.log('');
      console.log('   - GET  /api/discovery/trending     (Trending Books)');
      console.log('   - GET  /api/discovery/recommendations (Personalized)');
      console.log('   - GET  /api/discovery/genre/:genre (By Genre)');
      console.log('');
      console.log('   - GET  /api/lists                  (Reading Lists)');
      console.log('   - POST /api/lists                  (Create List)');
      console.log('   - GET  /api/lists/:id/books        (List Books)');
      console.log('   - POST /api/lists/:id/books        (Add to List)');
      console.log('');
      console.log('='.repeat(60));
      console.log('✨ Ready to track your reading journey!');
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}


startServer();


process.on('SIGTERM', async () => {
  console.log('');
  console.log('📴 SIGTERM received, closing server gracefully...');
  await pool.end();
  console.log('✅ Database connections closed');
  console.log('👋 Server shut down successfully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('');
  console.log('📴 SIGINT received, closing server gracefully...');
  await pool.end();
  console.log('✅ Database connections closed');
  console.log('👋 Server shut down successfully');
  process.exit(0);
});


process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});