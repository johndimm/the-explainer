const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrateBookProgress() {
  try {
    console.log('🔄 Running book progress migration...');
    
    // Create the user_book_progress table
    await pool.query(`
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
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_book_progress_user_book ON user_book_progress(user_id, book_title);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_book_progress_last_updated ON user_book_progress(user_id, last_updated DESC);
    `);
    
    console.log('✅ Book progress migration completed successfully!');
    console.log('📊 Table: user_book_progress');
    console.log('🔍 Indexes: user_book, last_updated');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateBookProgress(); 