const { Pool } = require('pg');

async function resetAnonymousCookies() {
  console.log('🔄 Resetting anonymous user cookies...');
  console.log('');
  console.log('This will clear the anon_explanations cookie so you can test the free explanation system again.');
  console.log('');
  console.log('To reset your browser cookies:');
  console.log('');
  console.log('1. Open browser dev tools (F12)');
  console.log('2. Go to Application/Storage tab');
  console.log('3. Find "Cookies" in the left sidebar');
  console.log('4. Click on your domain (localhost:3000 or your site URL)');
  console.log('5. Find "anon_explanations" cookie');
  console.log('6. Right-click and delete it');
  console.log('');
  console.log('OR use this JavaScript in the browser console:');
  console.log('');
  console.log('document.cookie = "anon_explanations=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";');
  console.log('');
  console.log('After clearing the cookie, you should have 3 free explanations available again.');
  console.log('');
  
  // Also check if there are any anonymous users in the database that need cleanup
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    console.log('🔍 Checking for any anonymous user data in database...');
    
    // Check if there are any users with null emails (anonymous users)
    const result = await pool.query('SELECT COUNT(*) FROM users WHERE email IS NULL');
    const anonUserCount = result.rows[0].count;
    
    if (anonUserCount > 0) {
      console.log(`Found ${anonUserCount} anonymous users in database.`);
      console.log('These might be causing issues with the anonymous system.');
      console.log('');
      console.log('To clean up anonymous users from database, run:');
      console.log('DELETE FROM users WHERE email IS NULL;');
    } else {
      console.log('✅ No anonymous users found in database.');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not set, skipping database check.');
}

resetAnonymousCookies(); 