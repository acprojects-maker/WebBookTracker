-- ===================================
-- Book Tracker Database Schema (PostgreSQL)
-- ===================================
-- This file contains the complete database schema for the Book Tracker application
-- Compatible with PostgreSQL 12+ and Render PostgreSQL
--
-- To use with Render PostgreSQL:
-- 1. Create a new PostgreSQL database in Render dashboard
-- 2. Connect via the web console or psql
-- 3. Run this script to create all tables
-- ===================================

-- Users table - stores user accounts and authentication data
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  yearly_goal INTEGER DEFAULT 50,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_token_expiry TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Books table - stores all books added by users
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(20),
  status VARCHAR(50) DEFAULT 'Currently Reading',
  rating DECIMAL(2,1),
  progress INTEGER DEFAULT 0,
  pages INTEGER DEFAULT 0,
  genre VARCHAR(100),
  last_read_date DATE,
  reading_time DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  notes TEXT,
  publisher VARCHAR(255),
  published_date VARCHAR(50),
  cover_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_last_read_date ON books(last_read_date);

-- Reading sessions table - tracks individual reading sessions
CREATE TABLE IF NOT EXISTS reading_sessions (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  duration DECIMAL(10,2) NOT NULL,
  pages_read INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_session_date ON reading_sessions(session_date);

-- Reading lists table - stores custom reading lists
CREATE TABLE IF NOT EXISTS reading_lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reading_lists_user_id ON reading_lists(user_id);

-- List books junction table - links books to reading lists
CREATE TABLE IF NOT EXISTS list_books (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(list_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_list_books_list_id ON list_books(list_id);
CREATE INDEX IF NOT EXISTS idx_list_books_book_id ON list_books(book_id);

-- User preferences table - stores user settings and preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  favorite_genres JSONB,
  reading_goals JSONB,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Book recommendations table - stores AI-generated book recommendations
CREATE TABLE IF NOT EXISTS book_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_title VARCHAR(500) NOT NULL,
  book_author VARCHAR(255) NOT NULL,
  book_isbn VARCHAR(20),
  book_cover_url VARCHAR(500),
  recommendation_score DECIMAL(5,2),
  recommendation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_book_recommendations_user_id ON book_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_book_recommendations_created_at ON book_recommendations(created_at);

-- Achievements table - tracks user achievements
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_code VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_code, year)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_achievement_code ON achievements(achievement_code);
CREATE INDEX IF NOT EXISTS idx_achievements_year ON achievements(year);

-- Search history table - stores user search queries for analytics
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query VARCHAR(500) NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);

-- ===================================
-- Database initialization complete!
-- ===================================
-- Total tables: 9
-- - users
-- - books
-- - reading_sessions
-- - reading_lists
-- - list_books
-- - user_preferences
-- - book_recommendations
-- - achievements
-- - search_history
-- ===================================
