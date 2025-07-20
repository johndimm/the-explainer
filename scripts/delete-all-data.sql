-- =====================================================
-- DATABASE CLEANUP SCRIPT - DELETE ALL DATA
-- =====================================================
-- 
-- WARNING: This script will delete ALL data from the database!
-- 
-- Tables affected:
-- - credit_usage (all usage tracking data)
-- - user_transactions (all transaction history)  
-- - users (credit-related columns only - accounts preserved)
--
-- Run this script with extreme caution!
-- Consider backing up your data first.
--
-- =====================================================

-- Start transaction for safety
BEGIN;

-- Step 1: Delete all credit usage records
-- This table tracks individual credit usage events
DELETE FROM credit_usage;

-- Step 2: Delete all user transaction records  
-- This table tracks credit purchases, grants, and usage
DELETE FROM user_transactions;

-- Step 3: Reset all user credit data
-- This preserves user accounts but clears all credit-related information
UPDATE users SET 
    credits = 0,
    last_hourly_credit = NULL,
    subscription_tier = 'free';

-- Verify the deletion (optional - uncomment to see results)
-- SELECT 
--     (SELECT COUNT(*) FROM users) as user_count,
--     (SELECT COUNT(*) FROM user_transactions) as transaction_count,
--     (SELECT COUNT(*) FROM credit_usage) as usage_count;

-- Commit the transaction
COMMIT;

-- =====================================================
-- CLEANUP COMPLETE
-- =====================================================
-- 
-- All data has been deleted:
-- ✅ All credit usage records removed
-- ✅ All transaction records removed  
-- ✅ All users reset to 0 credits with no hourly timestamp
-- ✅ User accounts preserved (only credit data cleared)
--
-- ===================================================== 