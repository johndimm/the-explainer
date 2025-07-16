import { Pool } from 'pg';

// Force UTC timezone for this module
process.env.TZ = 'UTC';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export class CreditManager {
  
  /**
   * Get user's current credit balance and hourly credit status
   */
  static async getUserCredits(userEmail) {
    if (!userEmail) return null;
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, credits, last_hourly_credit, subscription_tier FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (result.rows.length === 0) return null;
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Check if user can get an hourly credit (one per hour for signed-in users)
   */
  static async canGetHourlyCredit(userEmail) {
    const user = await this.getUserCredits(userEmail);
    if (!user) return false;
    
    if (!user.last_hourly_credit) return true;
    
    const lastCredit = new Date(user.last_hourly_credit);
    const now = new Date(); // Now should be in UTC due to TZ setting
    const hoursPassed = (now - lastCredit) / (1000 * 60 * 60);
    
    console.log('Debug canGetHourlyCredit:', {
      userEmail,
      lastCredit: lastCredit.toISOString(),
      now: now.toISOString(),
      hoursPassed,
      canGet: hoursPassed >= 1
    });
    
    return hoursPassed >= 1;
  }

  /**
   * Grant hourly credit to signed-in user
   */
  static async grantHourlyCredit(userEmail) {
    if (!userEmail) return false;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update user's credits and last_hourly_credit timestamp
      const result = await client.query(
        `UPDATE users 
         SET credits = credits + 1, last_hourly_credit = NOW()
         WHERE email = $1 AND (last_hourly_credit IS NULL OR last_hourly_credit < NOW() - INTERVAL '1 hour')
         RETURNING id`,
        [userEmail]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      
      const userId = result.rows[0].id;
      
      // Record transaction
      await client.query(
        `INSERT INTO user_transactions (user_id, transaction_type, amount, description, created_at)
         VALUES ($1, 'hourly_grant', 1, 'Hourly credit granted', NOW())`,
        [userId]
      );
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Use credits for explanation
   */
  static async useCredits(userEmail, provider, model, bookTitle, isByollm = false) {
    if (!userEmail) return false;
    
    // BYOLLM users get 5x efficiency (1 credit = 5 explanations)
    const creditsToUse = isByollm ? 0.2 : 1;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if user has enough credits
      const userResult = await client.query(
        'SELECT id, credits FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      
      const user = userResult.rows[0];
      if (user.credits < creditsToUse) {
        await client.query('ROLLBACK');
        return false;
      }
      
      // Deduct credits
      await client.query(
        'UPDATE users SET credits = credits - $1 WHERE id = $2',
        [creditsToUse, user.id]
      );
      
      // Record transaction
      const currentTime = new Date().toISOString();
      await client.query(
        `INSERT INTO user_transactions (user_id, transaction_type, amount, description, created_at)
         VALUES ($1, 'usage', $2, $3, $4)`,
        [user.id, -creditsToUse, `Explanation: ${bookTitle}`, currentTime]
      );
      
      // Record detailed usage
      await client.query(
        `INSERT INTO credit_usage (user_id, credits_used, provider, model, is_byollm, book_title, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, creditsToUse, provider, model, isByollm, bookTitle, currentTime]
      );
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Purchase credits (simulation - no actual payment)
   */
  static async purchaseCredits(userEmail, amount, description = 'Credit purchase') {
    if (!userEmail) return false;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      
      const userId = userResult.rows[0].id;
      
      // Add credits to user
      await client.query(
        'UPDATE users SET credits = credits + $1 WHERE id = $2',
        [amount, userId]
      );
      
      // Record transaction
      const currentTime = new Date().toISOString();
      await client.query(
        `INSERT INTO user_transactions (user_id, transaction_type, amount, description, created_at)
         VALUES ($1, 'purchase', $2, $3, $4)`,
        [userId, amount, description, currentTime]
      );
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get time until next hourly credit
   */
  static async getTimeUntilNextCredit(userEmail) {
    const user = await this.getUserCredits(userEmail);
    if (!user || !user.last_hourly_credit) return 0;
    
    const lastCredit = new Date(user.last_hourly_credit);
    const nextCredit = new Date(lastCredit.getTime() + 60 * 60 * 1000); // Add 1 hour
    const now = new Date();
    
    console.log('Debug time calculation:', {
      lastCredit: lastCredit.toISOString(),
      nextCredit: nextCredit.toISOString(),
      now: now.toISOString(),
      timeDiffMs: nextCredit - now,
      timeDiffMin: Math.ceil((nextCredit - now) / (1000 * 60))
    });
    
    return Math.max(0, nextCredit - now);
  }
}