-- Paywall system database schema
-- This migration adds credit system support to the existing database

-- Add credit-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_hourly_credit TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';

-- Create transactions table for credit purchases and usage
CREATE TABLE IF NOT EXISTS user_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(20) NOT NULL, -- 'purchase', 'usage', 'hourly_grant'
    amount INTEGER NOT NULL, -- positive for purchases/grants, negative for usage
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_type ON user_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON user_transactions(created_at);

-- Create credit_usage table for detailed usage tracking
CREATE TABLE IF NOT EXISTS credit_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    credits_used INTEGER NOT NULL DEFAULT 1,
    provider VARCHAR(50),
    model VARCHAR(100),
    is_byollm BOOLEAN DEFAULT FALSE,
    book_title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for credit usage
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON credit_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_usage_provider ON credit_usage(provider);
CREATE INDEX IF NOT EXISTS idx_credit_usage_byollm ON credit_usage(is_byollm);

-- Add some default data for testing
-- (This would normally be handled by the application, but included for completeness)