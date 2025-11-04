// Test PostgreSQL database connection
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Always use SSL for Render
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗');

    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL database');

    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✓ Database query successful');
    console.log('  Server time:', result.rows[0].current_time);

    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n✓ Tables found:', tablesResult.rows.length);
    tablesResult.rows.forEach(row => {
      console.log('  -', row.table_name);
    });

    // Check row counts
    console.log('\n✓ Row counts:');
    const counts = await client.query(`
      SELECT 'users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'books', COUNT(*) FROM books
      UNION ALL
      SELECT 'achievements', COUNT(*) FROM achievements
      UNION ALL
      SELECT 'search_history', COUNT(*) FROM search_history
      ORDER BY table_name
    `);

    counts.rows.forEach(row => {
      console.log(`  - ${row.table_name}: ${row.count} rows`);
    });

    client.release();
    await pool.end();

    console.log('\n✅ Database connection test successful!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Database connection test failed:');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testConnection();
