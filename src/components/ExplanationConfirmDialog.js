import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from '../styles/ExplanationConfirmDialog.module.css';

export default function ExplanationConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedText, 
  isLoading 
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [creditStatus, setCreditStatus] = useState(null);
  const [anonUsage, setAnonUsage] = useState(0);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCreditStatus();
    }
  }, [isOpen, session]);

  const fetchCreditStatus = async () => {
    setIsLoadingStatus(true);
    try {
      if (session?.user?.email) {
        // Signed-in user - get credit status
        const response = await fetch(`/api/credit-status?userEmail=${encodeURIComponent(session.user.email)}`);
        if (response.ok) {
          const data = await response.json();
          setCreditStatus(data);
        }
      } else {
        // Anonymous user - check cookie
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
        const anonCount = parseInt(cookies.anon_explanations || '0', 10);
        setAnonUsage(anonCount);
      }
    } catch (error) {
      console.error('Error fetching credit status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const getCreditCost = () => {
    if (!session?.user?.email) return 1; // Anonymous users always use 1 explanation
    
    // Check if user has BYOLLM (custom provider)
    try {
      const llm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
      const isByollm = llm.provider === 'custom' && llm.key;
      return isByollm ? 0.2 : 1;
    } catch {
      return 1;
    }
  };

  const getAvailableExplanations = () => {
    if (!session?.user?.email) {
      // Anonymous user
      return Math.max(0, 3 - anonUsage);
    }
    
    // Signed-in user
    if (!creditStatus) return 0;
    
    const creditCost = getCreditCost();
    const availableFromCredits = Math.floor(creditStatus.credits / creditCost);
    const hourlyAvailable = creditStatus.canGetHourlyCredit ? 1 : 0;
    
    return availableFromCredits + hourlyAvailable;
  };

  const getStatusMessage = () => {
    if (isLoadingStatus) return 'Checking available explanations...';
    
    const available = getAvailableExplanations();
    const cost = getCreditCost();
    
    if (!session?.user?.email) {
      // Anonymous user
      return available > 0 
        ? `${available} free explanation${available === 1 ? '' : 's'} remaining`
        : 'No free explanations remaining - please sign in';
    }
    
    // Signed-in user
    if (available === 0) {
      const minutesUntilNext = creditStatus?.minutesUntilNextCredit || 0;
      if (minutesUntilNext > 0) {
        return `No explanations available. Next hourly credit in ${minutesUntilNext} minutes.`;
      }
      return 'No explanations available. Your hourly credit is ready!';
    }
    
    const isByollm = cost === 0.2;
    const costText = isByollm ? '0.2 credits (BYOLLM)' : '1 credit';
    const hourlyAvailable = creditStatus.canGetHourlyCredit ? 1 : 0;
    
    if (hourlyAvailable > 0) {
      return `${available} explanation${available === 1 ? '' : 's'} available. This explanation will use your free hourly credit.`;
    }
    
    return `${available} explanation${available === 1 ? '' : 's'} available. This will cost ${costText}.`;
  };

  const canSubmit = () => {
    if (isLoading || isLoadingStatus) return false;
    return getAvailableExplanations() > 0;
  };

  const handleBuyCredits = () => {
    onClose();
    router.push('/credits');
  };

  const truncateText = (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Confirm Explanation Request</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.selectedText}>
            <h3>Selected Text:</h3>
            <div className={styles.textPreview}>
              "{truncateText(selectedText)}"
            </div>
          </div>

          <div className={styles.status}>
            <div className={styles.statusMessage}>
              {getStatusMessage()}
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>
            {session?.user?.email && getAvailableExplanations() === 0 && (
              <button 
                onClick={handleBuyCredits}
                className={styles.buyCreditsButton}
                disabled={isLoading}
              >
                Buy Credits
              </button>
            )}
            <button 
              onClick={onConfirm} 
              className={`${styles.confirmButton} ${!canSubmit() ? styles.disabled : ''}`}
              disabled={!canSubmit()}
            >
              {isLoading ? 'Getting Explanation...' : 'Get Explanation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}