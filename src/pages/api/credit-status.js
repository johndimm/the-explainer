import { CreditManager } from '../../lib/credits.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Get user's current credit status
    const user = await CreditManager.getUserCredits(userEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user can get hourly credit
    const canGetHourly = await CreditManager.canGetHourlyCredit(userEmail);
    const timeUntilNext = await CreditManager.getTimeUntilNextCredit(userEmail);
    const minutesUntilNext = Math.ceil(timeUntilNext / (1000 * 60));

    res.status(200).json({
      credits: user.credits,
      lastHourlyCredit: user.last_hourly_credit,
      canGetHourlyCredit: canGetHourly,
      minutesUntilNextCredit: canGetHourly ? 0 : minutesUntilNext,
      subscriptionTier: user.subscription_tier || 'free',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting credit status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}