const { Pool } = require('pg');

async function resetUserCredits() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    const userEmail = 'john.r.dimm@gmail.com';
    
    // Reset the last_hourly_credit to null so user can get a fresh credit
    const result = await pool.query(
      'UPDATE users SET last_hourly_credit = NULL WHERE email = $1 RETURNING id, credits',
      [userEmail]
    );
    
    if (result.rows.length > 0) {
      console.log(`Reset timestamp for ${userEmail}`);
      console.log(`Current credits: ${result.rows[0].credits}`);
      console.log('User can now get a fresh hourly credit');
    } else {
      console.log(`User ${userEmail} not found`);
    }
    
  } catch (error) {
    console.error('Failed to reset credits:', error);
  } finally {
    await pool.end();
  }
}

resetUserCredits();