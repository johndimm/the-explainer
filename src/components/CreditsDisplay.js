import { useState, useEffect } from 'react';
import styles from '../styles/CreditsDisplay.module.css';

export default function CreditsDisplay({ session }) {
  const [creditStatus, setCreditStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      fetchCreditStatus();
    }
  }, [session]);

  const fetchCreditStatus = async () => {
    try {
      const response = await fetch(`/api/credit-status?userEmail=${encodeURIComponent(session.user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setCreditStatus(data);
      }
    } catch (error) {
      console.error('Error fetching credit status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (packageType) => {
    setIsPurchasing(true);
    try {
      const response = await fetch('/api/purchase-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: session.user.email,
          package: packageType
        }),
      });

      if (response.ok) {
        await fetchCreditStatus(); // Refresh credit status
      } else {
        console.error('Failed to purchase credits');
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!session?.user?.email) return null;
  if (isLoading) return <div className={styles.loading}>Loading credits...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>💎 Your Credits</h3>
        <div className={styles.balance}>
          <span className={styles.amount}>{creditStatus?.credits || 0}</span>
          <span className={styles.label}>credits</span>
        </div>
      </div>

      <div className={styles.status}>
        {creditStatus?.canGetHourlyCredit ? (
          <div className={styles.hourlyReady}>
            <span className={styles.icon}>⏰</span>
            <span>Hourly credit ready! Get 1 free explanation.</span>
          </div>
        ) : (
          <div className={styles.hourlyWaiting}>
            <span className={styles.icon}>⏳</span>
            <span>Next hourly credit in {creditStatus?.minutesUntilNextCredit} minutes</span>
          </div>
        )}
      </div>

      <div className={styles.explanation}>
        <h4>How Credits Work</h4>
        <ul>
          <li>🆓 <strong>Free tier:</strong> 1 credit per hour (must be used within the hour)</li>
          <li>💰 <strong>Purchased credits:</strong> Use anytime, no expiration</li>
          <li>🚀 <strong>BYOLLM:</strong> 5x efficiency - 1 credit = 5 explanations when using your own API key</li>
        </ul>
      </div>

      <div className={styles.packages}>
        <h4>Purchase Credits</h4>
        <div className={styles.packageGrid}>
          <div className={styles.package}>
            <h5>Starter</h5>
            <div className={styles.price}>$1.00</div>
            <div className={styles.credits}>20 credits</div>
            <button 
              onClick={() => handlePurchase('starter')}
              disabled={isPurchasing}
              className={styles.buyButton}
            >
              {isPurchasing ? 'Processing...' : 'Buy Now'}
            </button>
          </div>
          
          <div className={styles.package}>
            <h5>Standard</h5>
            <div className={styles.price}>$5.00</div>
            <div className={styles.credits}>100 credits</div>
            <div className={styles.popular}>Popular</div>
            <button 
              onClick={() => handlePurchase('standard')}
              disabled={isPurchasing}
              className={styles.buyButton}
            >
              {isPurchasing ? 'Processing...' : 'Buy Now'}
            </button>
          </div>
          
          <div className={styles.package}>
            <h5>Premium</h5>
            <div className={styles.price}>$20.00</div>
            <div className={styles.credits}>500 credits</div>
            <button 
              onClick={() => handlePurchase('premium')}
              disabled={isPurchasing}
              className={styles.buyButton}
            >
              {isPurchasing ? 'Processing...' : 'Buy Now'}
            </button>
          </div>
          
          <div className={styles.package}>
            <h5>Deluxe</h5>
            <div className={styles.price}>$35.00</div>
            <div className={styles.credits}>1000 credits</div>
            <div className={styles.bestValue}>Best Value</div>
            <button 
              onClick={() => handlePurchase('deluxe')}
              disabled={isPurchasing}
              className={styles.buyButton}
            >
              {isPurchasing ? 'Processing...' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.note}>
        <p><strong>Note:</strong> This is a simulation. No actual payment processing occurs.</p>
      </div>
    </div>
  );
}