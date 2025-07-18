import { useState } from 'react';
import { signIn } from 'next-auth/react';
import styles from '../styles/PaywallModal.module.css';
import ConfirmationDialog from './ConfirmationDialog';

export default function PaywallModal({ isOpen, onClose, paywallData, session }) {
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPackage, setPendingPackage] = useState(null);

  const handleSignIn = () => {
    signIn('google');
  };

  const handlePurchase = (packageType) => {
    if (!session?.user?.email) return;
    setPendingPackage(packageType);
    setShowConfirmDialog(true);
  };

  const handleConfirmPurchase = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/purchase-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: session.user.email,
          package: pendingPackage
        }),
      });

      if (response.ok) {
        setPurchaseSuccess(true);
        setTimeout(() => {
          onClose();
          window.location.reload(); // Refresh to show new credits
        }, 2000);
      } else {
        console.error('Failed to purchase credits');
      }
    } catch (error) {
      console.error('Error purchasing credits:', error);
    } finally {
      setIsLoading(false);
      setPendingPackage(null);
    }
  };

  const handleCancelPurchase = () => {
    setShowConfirmDialog(false);
    setPendingPackage(null);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>
            {paywallData?.tier === 'anonymous' ? 'Sign In Required' : 'Credits Needed'}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <div className={styles.content}>
          {purchaseSuccess ? (
            <div className={styles.success}>
              <h3>✅ Purchase Successful!</h3>
              <p>Your credits have been added to your account. Refreshing page...</p>
            </div>
          ) : paywallData?.tier === 'anonymous' ? (
            <div className={styles.anonymousLimit}>
              <p>You've used your 3 free explanations! Sign in to get:</p>
              <ul>
                <li>🕐 1 free explanation credit every hour</li>
                <li>💎 Option to purchase additional credits</li>
                <li>🔑 Bring your own LLM for 5x efficiency</li>
              </ul>
              <button onClick={handleSignIn} className={styles.signInButton}>
                Sign In with Google
              </button>
            </div>
          ) : (
            <div className={styles.creditNeeded}>
              <p>You need {paywallData?.creditsNeeded} credit{paywallData?.creditsNeeded === 1 ? '' : 's'} to get an explanation.</p>
              <p>Current balance: {paywallData?.currentCredits} credits</p>
              
              {paywallData?.minutesUntilNext > 0 ? (
                <div className={styles.waitTime}>
                  <p>⏰ Next free hourly credit in: <strong>{paywallData.minutesUntilNext} minutes</strong></p>
                  <p>Or purchase credits to use immediately:</p>
                </div>
              ) : (
                <div className={styles.creditReady}>
                  <p>✅ Your hourly credit is ready! Try your request again.</p>
                  <p>Or purchase credits for more explanations:</p>
                </div>
              )}

              <div className={styles.packages}>
                <h3>Credit Packages</h3>
                <div className={styles.packageGrid}>
                  <div className={styles.package}>
                    <h4>Starter</h4>
                    <p className={styles.price}>$1.00</p>
                    <p>20 credits</p>
                    <button 
                      onClick={() => handlePurchase('starter')}
                      disabled={isLoading}
                      className={styles.purchaseButton}
                    >
                      {isLoading ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                  
                  <div className={styles.package}>
                    <h4>Standard</h4>
                    <p className={styles.price}>$5.00</p>
                    <p>100 credits</p>
                    <button 
                      onClick={() => handlePurchase('standard')}
                      disabled={isLoading}
                      className={styles.purchaseButton}
                    >
                      {isLoading ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                  
                  <div className={styles.package}>
                    <h4>Premium</h4>
                    <p className={styles.price}>$20.00</p>
                    <p>500 credits</p>
                    <button 
                      onClick={() => handlePurchase('premium')}
                      disabled={isLoading}
                      className={styles.purchaseButton}
                    >
                      {isLoading ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                  
                  <div className={styles.package}>
                    <h4>Deluxe</h4>
                    <p className={styles.price}>$35.00</p>
                    <p>1000 credits</p>
                    <button 
                      onClick={() => handlePurchase('deluxe')}
                      disabled={isLoading}
                      className={styles.purchaseButton}
                    >
                      {isLoading ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.byollmTip}>
                <p>💡 <strong>Pro tip:</strong> Use your own LLM API key for 5x efficiency - 1 credit = 5 explanations!</p>
                <p>Configure this in <a href="/profile">Settings</a></p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onConfirm={handleConfirmPurchase}
        onCancel={handleCancelPurchase}
        title="Free Credits!"
        message="If this were the real product, you would be getting your credit card out now. But it's not and all credits are currently free. Enjoy!"
      />
    </div>
  );
}