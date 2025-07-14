import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const client = await pool.connect();
  try {
    // Get user info
    const userResult = await client.query('SELECT id, created_at FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userResult.rows[0].id;
    const createdAt = userResult.rows[0].created_at;
    // Total explanations
    const totalResult = await client.query(
      `SELECT COUNT(*) FROM user_activity WHERE user_id = $1 AND activity_type = 'explanation'`,
      [userId]
    );
    const totalExplanations = parseInt(totalResult.rows[0].count, 10);
    // Today's explanations
    const todayResult = await client.query(
      `SELECT COUNT(*) FROM user_activity WHERE user_id = $1 AND activity_type = 'explanation' AND activity_time::date = CURRENT_DATE`,
      [userId]
    );
    const todaysExplanations = parseInt(todayResult.rows[0].count, 10);
    // List of unique books explained for this user, with counts
    const booksResult = await client.query(
      `SELECT meta->>'bookTitle' AS book_title, COUNT(*) AS count
       FROM user_activity
       WHERE user_id = $1 AND activity_type = 'explanation' AND meta->>'bookTitle' IS NOT NULL
       GROUP BY book_title
       ORDER BY count DESC, book_title ASC`,
      [userId]
    );
    const books = booksResult.rows
      .filter(row => row.book_title)
      .map(row => ({ title: row.book_title, count: parseInt(row.count, 10) }));
    res.status(200).json({
      created_at: createdAt,
      total_explanations: totalExplanations,
      todays_explanations: todaysExplanations,
      books
    });
  } finally {
    client.release();
  }
} 