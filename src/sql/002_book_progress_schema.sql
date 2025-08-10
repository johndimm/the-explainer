-- Book progress tracking for multi-device sync
CREATE TABLE IF NOT EXISTS user_book_progress (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  current_line INTEGER DEFAULT 0,
  total_lines INTEGER,
  progress_percentage DECIMAL(5,2),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, book_title)
);

-- Index for fast lookups by user and book
CREATE INDEX IF NOT EXISTS idx_user_book_progress_user_book ON user_book_progress(user_id, book_title);

-- Index for sorting by last updated
CREATE INDEX IF NOT EXISTS idx_user_book_progress_last_updated ON user_book_progress(user_id, last_updated DESC); 