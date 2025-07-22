import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import styles from '@/styles/LandscapeSuggestion.module.css';

const LandscapeSuggestion = () => {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Check if we've already shown it in this session - do this first
  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('explainer:landscape-suggestion-shown');
    if (alreadyShown) {
      setHasShown(true);
    }
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if it's a mobile device
      const isMobileDevice = window.innerWidth <= 1024 || 
                           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      setIsMobile(isMobileDevice);
      
      if (!isMobileDevice) {
        setShowSuggestion(false);
        return;
      }
      
      // Check if it's in portrait mode
      const mediaQueryPortrait = window.matchMedia('(orientation: portrait)').matches;
      const aspectRatioPortrait = window.innerHeight > window.innerWidth;
      const isPortrait = mediaQueryPortrait || aspectRatioPortrait;
      
      // Only show if portrait AND we haven't shown it before in this session
      setShowSuggestion(isPortrait && !hasShown);
    };
    
    // Check on mount
    checkOrientation();
    
    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [hasShown]);

  // Mark as shown when the suggestion appears
  useEffect(() => {
    if (showSuggestion) {
      setHasShown(true);
      // Store in sessionStorage so it doesn't show again in this session
      sessionStorage.setItem('explainer:landscape-suggestion-shown', 'true');
    }
  }, [showSuggestion]);

  // Don't render anything if not showing
  if (!showSuggestion || !isMobile) {
    return null;
  }

  return (
    <div className={styles.landscapeSuggestion}>
      <div className={styles.suggestionContent}>
        <RotateCcw className={styles.rotateIcon} size={20} />
        <span className={styles.suggestionText}>
          Rotate to landscape for better experience
        </span>

      </div>
    </div>
  );
};

export default LandscapeSuggestion; 