const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    const migrationPath = path.join(__dirname, '../src/sql/001_paywall_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running paywall schema migration...');
    await pool.query(migrationSQL);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();