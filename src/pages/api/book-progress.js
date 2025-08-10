import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.email;

  try {
             switch (req.method) {
           case 'GET':
             // Get progress for a specific book or all books
             const { book_title } = req.query;

             try {
               if (book_title) {
                 // Get progress for specific book
                 const result = await pool.query(
                   'SELECT * FROM user_book_progress WHERE user_id = $1 AND book_title = $2',
                   [userId, book_title]
                 );

                 if (result.rows.length === 0) {
                   return res.status(404).json({ error: 'No progress found for this book' });
                 }

                 return res.json(result.rows[0]);
               } else {
                 // Get all books with progress, sorted by last updated
                 const result = await pool.query(
                   'SELECT * FROM user_book_progress WHERE user_id = $1 ORDER BY last_updated DESC',
                   [userId]
                 );

                 return res.json(result.rows);
               }
             } catch (error) {
               // If table doesn't exist yet, return empty result
               if (error.code === '42P01') {
                 console.log('Book progress table not found, returning empty result');
                 if (book_title) {
                   return res.status(404).json({ error: 'No progress found for this book' });
                 } else {
                   return res.json([]);
                 }
               }
               throw error;
             }

                 case 'POST':
             // Save or update progress for a book
             const { book_title: postBookTitle, current_line, total_lines } = req.body;

             if (!postBookTitle || current_line === undefined) {
               return res.status(400).json({ error: 'book_title and current_line are required' });
             }

             try {
               const progressPercentage = total_lines ? (current_line / total_lines) * 100 : null;

               const upsertResult = await pool.query(
                 `INSERT INTO user_book_progress (user_id, book_title, current_line, total_lines, progress_percentage, last_updated)
                  VALUES ($1, $2, $3, $4, $5, NOW())
                  ON CONFLICT (user_id, book_title)
                  DO UPDATE SET
                    current_line = $3,
                    total_lines = $4,
                    progress_percentage = $5,
                    last_updated = NOW()
                  RETURNING *`,
                 [userId, postBookTitle, current_line, total_lines, progressPercentage]
               );

               return res.json(upsertResult.rows[0]);
             } catch (error) {
               // If table doesn't exist yet, just return success (data will be lost)
               if (error.code === '42P01') {
                 console.log('Book progress table not found, skipping save');
                 return res.json({ 
                   user_id: userId, 
                   book_title: postBookTitle, 
                   current_line, 
                   total_lines,
                   progress_percentage: total_lines ? (current_line / total_lines) * 100 : null,
                   last_updated: new Date().toISOString()
                 });
               }
               throw error;
             }

                 case 'DELETE':
             // Delete progress for a specific book
             const { book_title: deleteBookTitle } = req.query;

             if (!deleteBookTitle) {
               return res.status(400).json({ error: 'book_title is required' });
             }

             try {
               await pool.query(
                 'DELETE FROM user_book_progress WHERE user_id = $1 AND book_title = $2',
                 [userId, deleteBookTitle]
               );

               return res.json({ success: true });
             } catch (error) {
               // If table doesn't exist yet, just return success
               if (error.code === '42P01') {
                 console.log('Book progress table not found, skipping delete');
                 return res.json({ success: true });
               }
               throw error;
             }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Book progress API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 