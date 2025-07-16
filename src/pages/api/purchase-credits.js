import { CreditManager } from '../../lib/credits.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail, package: packageType } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Credit packages (simulation - no real payment)
    const packages = {
      'starter': { credits: 20, name: 'Starter Pack', price: '$1.00' },
      'standard': { credits: 100, name: 'Standard Pack', price: '$5.00' },
      'premium': { credits: 500, name: 'Premium Pack', price: '$20.00' },
      'deluxe': { credits: 1000, name: 'Deluxe Pack', price: '$35.00' }
    };

    const selectedPackage = packages[packageType];
    if (!selectedPackage) {
      return res.status(400).json({ error: 'Invalid package type' });
    }

    // Simulate credit purchase (no actual payment processing)
    const success = await CreditManager.purchaseCredits(
      userEmail, 
      selectedPackage.credits, 
      `${selectedPackage.name} - ${selectedPackage.price}`
    );

    if (!success) {
      return res.status(500).json({ error: 'Failed to purchase credits' });
    }

    // Get updated credit balance
    const user = await CreditManager.getUserCredits(userEmail);

    res.status(200).json({
      success: true,
      message: `Successfully purchased ${selectedPackage.credits} credits!`,
      package: selectedPackage,
      newBalance: user.credits,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error purchasing credits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}