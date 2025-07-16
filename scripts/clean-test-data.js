const { Pool } = require('pg');

async function cleanTestData() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    console.log('Cleaning test data...');
    
    // Delete all credit-related data
    await pool.query('DELETE FROM credit_usage');
    await pool.query('DELETE FROM user_transactions');
    
    // Reset all users' credit data
    await pool.query('UPDATE users SET credits = 0, last_hourly_credit = NULL, subscription_tier = \'free\'');
    
    console.log('✅ Test data cleaned successfully!');
    console.log('- All credit usage records deleted');
    console.log('- All transaction records deleted');
    console.log('- All users reset to 0 credits with no hourly timestamp');
    
  } catch (error) {
    console.error('Failed to clean test data:', error);
  } finally {
    await pool.end();
  }
}

cleanTestData();