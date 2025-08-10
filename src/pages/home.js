import { useState, useCallback, useRef, useEffect } from 'react';
import Head from "next/head";
import TextPanel from '@/components/TextPanel';
import ChatPanel from '@/components/ChatPanel';
import DraggableSeparator from '@/components/DraggableSeparator';
import PaywallModal from '@/components/PaywallModal';
import ExplanationConfirmDialog from '@/components/ExplanationConfirmDialog';
import InstallPrompt from '@/components/InstallPrompt';
import LandscapeSuggestion from '@/components/LandscapeSuggestion';
import styles from '@/styles/Home.module.css';
import { useSession, signIn } from 'next-auth/react';

// Console logging system with label-based control
const LOG_LABELS = {
  LAYOUT: 'layout',
  PROFILE: 'profile',
  STORAGE: 'storage',
  RESPONSIVE: 'responsive',
  DIVIDER: 'divider',
  GENERAL: 'general'
};

// Set which labels to enable for logging
const ENABLED_LOGS = new Set([
  LOG_LABELS.LAYOUT,    // Layout mode changes
  LOG_LABELS.PROFILE,   // Profile loading/saving
  // LOG_LABELS.STORAGE,  // localStorage operations
  // LOG_LABELS.RESPONSIVE, // Responsive layout changes
  // LOG_LABELS.DIVIDER,  // Divider position changes
  // LOG_LABELS.GENERAL   // General app state
]);

// Console log function that respects label settings
function log(label, ...args) {
  if (ENABLED_LOGS.has(label)) {
    console.log(`[${label.toUpperCase()}]`, ...args);
  }
}

// Function to enable/disable logging for specific labels
function setLogging(label, enabled) {
  if (enabled) {
    ENABLED_LOGS.add(label);
    console.log(`[LOGGING] Enabled logging for: ${label}`);
  } else {
    ENABLED_LOGS.delete(label);
    console.log(`[LOGGING] Disabled logging for: ${label}`);
  }
}

// Function to show current logging status
function showLoggingStatus() {
  console.log('[LOGGING] Current enabled labels:', Array.from(ENABLED_LOGS));
}

// Make logging functions available globally for debugging
if (typeof window !== 'undefined') {
  window.setLogging = setLogging;
  window.showLoggingStatus = showLoggingStatus;
  window.LOG_LABELS = LOG_LABELS;
}

function getLayoutMode() {
  if (typeof window === 'undefined') return { mode: 'desktop', isPortrait: false };
  
  // Check for mobile/tablet devices using multiple criteria
  const isMobile = window.innerWidth <= 1024 || 
                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check orientation using both media query and aspect ratio
  const mediaQueryPortrait = window.matchMedia('(orientation: portrait)').matches;
  const aspectRatioPortrait = window.innerHeight > window.innerWidth;
  const isPortrait = mediaQueryPortrait || aspectRatioPortrait;
  
  // Layout detection completed
  
  if (isMobile && isPortrait) return { mode: 'mobile-portrait', isPortrait: true };
  if (isMobile && !isPortrait) return { mode: 'mobile-landscape', isPortrait: false };
  return { mode: 'desktop', isPortrait: false };
}

export default function Home() {
  // Track component mounts to detect React Strict Mode double-mounting
  const mountCount = useRef(0);
  useEffect(() => {
    mountCount.current += 1;
    log(LOG_LABELS.LAYOUT, 'Home component mounted, count:', mountCount.current);
  }, []);
  
  const [panelSize, setPanelSize] = useState(50); // width or height %
  const [layoutMode, setLayoutMode] = useState({ mode: 'desktop', isPortrait: false });
  
  // Initialize userLayoutMode - try to get from localStorage during initialization
  const [userLayoutMode, setUserLayoutMode] = useState(() => {
    // Try to get the initial value from localStorage during initialization
    if (typeof window !== 'undefined') {
      try {
        const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
        if (profile.layoutMode && ['auto', 'two-panel', 'single-panel'].includes(profile.layoutMode)) {
          log(LOG_LABELS.LAYOUT, 'Initializing userLayoutMode from localStorage:', profile.layoutMode);
          return profile.layoutMode;
        }
      } catch (error) {
        console.warn('Failed to load initial layout mode:', error);
      }
    }
    log(LOG_LABELS.LAYOUT, 'Initializing userLayoutMode with default: auto');
    return 'auto';
  });

  // Create a wrapped setter that logs all calls
  const setUserLayoutModeWithLogging = useCallback((value) => {
    log(LOG_LABELS.LAYOUT, 'setUserLayoutMode called with:', value, 'from:', new Error().stack);
    setUserLayoutMode(value);
  }, []);

  // Track all state changes for debugging
  useEffect(() => {
    log(LOG_LABELS.LAYOUT, 'userLayoutMode state changed to:', userLayoutMode);
    
    // Also check if localStorage still has the correct value
    try {
      const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
      if (profile.layoutMode !== userLayoutMode) {
        log(LOG_LABELS.LAYOUT, 'WARNING: localStorage profile.layoutMode differs from state:', profile.layoutMode, 'vs state:', userLayoutMode);
      }
    } catch (error) {
      console.warn('Failed to check localStorage during state change:', error);
    }
  }, [userLayoutMode]);
  
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallData, setPaywallData] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [textPanelKey, setTextPanelKey] = useState(0); // Key to force re-mounting
  const [responseLength, setResponseLength] = useState('medium');
  const textPanelRef = useRef();
  const containerRef = useRef();
  const userLayoutModeRef = useRef(userLayoutMode);
  const { data: session } = useSession();

  // Load divider positions from localStorage
  const loadDividerPosition = useCallback((orientation) => {
    try {
      const savedPosition = localStorage.getItem(`explainer:divider:${orientation}`);
      if (savedPosition) {
        const position = parseFloat(savedPosition);
        // Adjust constraints based on screen size for landscape mode
        let minConstraint = 20;
        let maxConstraint = 80;
        
        if (orientation === 'landscape' && typeof window !== 'undefined' && window.innerWidth < 1024) {
          // For landscape on smaller screens, be more restrictive to ensure chat panel has enough space
          minConstraint = 20;
          maxConstraint = 70; // Don't let text panel take more than 70% on smaller screens
        }
        
        if (!isNaN(position) && position >= minConstraint && position <= maxConstraint) {
          return position;
        }
      }
    } catch (error) {
      console.warn('Failed to load divider position:', error);
    }
    
    // Default positions: start at 50% for both orientations
    return 50;
  }, []);

  // Save divider position to localStorage
  const saveDividerPosition = useCallback((orientation, position) => {
    try {
      localStorage.setItem(`explainer:divider:${orientation}`, position.toString());
    } catch (error) {
      console.warn('Failed to save divider position:', error);
    }
  }, []);

  // Load user's layout preference from localStorage
  const [isLayoutLoaded, setIsLayoutLoaded] = useState(false);

  // Determine effective layout mode based on user preference and device
  const getEffectiveLayoutMode = useCallback(() => {
    log(LOG_LABELS.LAYOUT, 'getEffectiveLayoutMode called, userLayoutMode:', userLayoutMode, 'layoutMode.mode:', layoutMode.mode);
    
    // If user has explicitly set a layout mode, respect it completely
    if (userLayoutMode === 'single-panel' || userLayoutMode === 'two-panel') {
      log(LOG_LABELS.LAYOUT, 'User has explicit layout, returning:', userLayoutMode);
      return userLayoutMode;
    }
    
    // Only use auto logic when userLayoutMode is actually 'auto'
    if (userLayoutMode === 'auto') {
      const effective = layoutMode.mode === 'mobile-portrait' ? 'single-panel' : 'two-panel';
      log(LOG_LABELS.LAYOUT, 'User in auto mode, returning device-based layout:', effective);
      return effective;
    }
    
    // Fallback to auto if userLayoutMode is somehow invalid
    const fallback = layoutMode.mode === 'mobile-portrait' ? 'single-panel' : 'two-panel';
    log(LOG_LABELS.LAYOUT, 'Fallback to device-based layout:', fallback);
    return fallback;
  }, [userLayoutMode, layoutMode.mode]);

  // Responsive: update layout mode on resize/orientation
  useEffect(() => {
    log(LOG_LABELS.RESPONSIVE, 'Responsive layout effect running, userLayoutMode:', userLayoutMode);
    log(LOG_LABELS.RESPONSIVE, 'Effect dependencies - loadDividerPosition:', typeof loadDividerPosition);
    
    function updateLayout() {
      const newLayoutMode = getLayoutMode();
      log(LOG_LABELS.RESPONSIVE, 'updateLayout called, setting layoutMode to:', newLayoutMode);
      setLayoutMode(newLayoutMode);
      
      // Load the appropriate divider position for the new orientation
      const orientation = newLayoutMode.mode === 'mobile-portrait' ? 'portrait' : 'landscape';
      const savedPosition = loadDividerPosition(orientation);
      setPanelSize(savedPosition);
    }
    
    // CRITICAL FIX: Use ref to check current layout mode without causing re-renders
    // This prevents device-based layout from overriding user preferences
    if (userLayoutModeRef.current === 'auto') {
      log(LOG_LABELS.RESPONSIVE, 'User in auto mode, calling updateLayout');
      updateLayout();
      
      // Only add event listeners if user is in auto mode
      window.addEventListener('resize', updateLayout);
      window.addEventListener('orientationchange', updateLayout);
      
      return () => {
        window.removeEventListener('resize', updateLayout);
        window.removeEventListener('orientationchange', updateLayout);
      };
    } else {
      // User has explicit layout - just set the device mode for divider positioning
      // but don't override the user's layout choice
      log(LOG_LABELS.RESPONSIVE, 'User has explicit layout, just setting device mode for divider positioning');
      const newLayoutMode = getLayoutMode();
      log(LOG_LABELS.RESPONSIVE, 'Setting device layout mode for divider positioning:', newLayoutMode);
      setLayoutMode(newLayoutMode);
    }
    
    log(LOG_LABELS.RESPONSIVE, 'Responsive layout effect completed');
  }, [loadDividerPosition]); // REMOVED userLayoutMode dependency to prevent interference

  // Separate effect to handle responsive layout when user layout mode changes
  useEffect(() => {
    log(LOG_LABELS.RESPONSIVE, 'User layout mode changed, checking if responsive updates needed');
    
    // If user switched to auto mode, we need to set up responsive behavior
    if (userLayoutMode === 'auto') {
      log(LOG_LABELS.RESPONSIVE, 'User switched to auto mode, setting up responsive behavior');
      const newLayoutMode = getLayoutMode();
      setLayoutMode(newLayoutMode);
      
      // Add event listeners for responsive behavior
      function updateLayout() {
        const newLayoutMode = getLayoutMode();
        log(LOG_LABELS.RESPONSIVE, 'Responsive updateLayout called, setting layoutMode to:', newLayoutMode);
        setLayoutMode(newLayoutMode);
        
        // Load the appropriate divider position for the new orientation
        const orientation = newLayoutMode.mode === 'mobile-portrait' ? 'portrait' : 'landscape';
        const savedPosition = loadDividerPosition(orientation);
        setPanelSize(savedPosition);
      }
      
      window.addEventListener('resize', updateLayout);
      window.addEventListener('orientationchange', updateLayout);
      
      return () => {
        window.removeEventListener('resize', updateLayout);
        window.removeEventListener('orientationchange', updateLayout);
      };
    } else {
      log(LOG_LABELS.RESPONSIVE, 'User has explicit layout, removing responsive event listeners');
      // User has explicit layout - remove responsive event listeners
      // The responsive effect above will handle this
    }
  }, [userLayoutMode, loadDividerPosition]);

  // Load book title from localStorage
  useEffect(() => {
    const savedTitle = localStorage.getItem('explainer:bookTitle');
    if (savedTitle) {
      setBookTitle(savedTitle);
    }
  }, []);

  // Load profile settings (response length and layout mode) from localStorage - only once on mount
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  // Load profile settings (response length and layout mode) from localStorage - only once on mount
  useEffect(() => {
    const effectId = 'PROFILE_LOADING_' + Date.now();
    log(LOG_LABELS.PROFILE, `[${effectId}] Profile loading effect running, profileLoaded:`, profileLoaded);
    
    if (profileLoaded) {
      log(LOG_LABELS.PROFILE, `[${effectId}] Profile already loaded, skipping`);
      return; // Only load once
    }
    
    try {
      const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
      log(LOG_LABELS.PROFILE, `[${effectId}] Loading profile settings:`, profile);
      
      if (profile.defaultResponseLength) {
        setResponseLength(profile.defaultResponseLength);
      }
      
      // Layout mode is now loaded during initialization, so we don't need to set it here
      // Just log what we found for debugging
      if (profile.layoutMode && ['auto', 'two-panel', 'single-panel'].includes(profile.layoutMode)) {
        log(LOG_LABELS.LAYOUT, `[${effectId}] Found layout mode in profile:`, profile.layoutMode, 'but not setting it (already set during init)');
      }
      
      setProfileLoaded(true);
      setIsLayoutLoaded(true);
      log(LOG_LABELS.PROFILE, `[${effectId}] Profile loading effect completed`);
    } catch (error) {
      console.warn('Failed to load profile settings (initial):', error);
      setProfileLoaded(true);
      setIsLayoutLoaded(true);
    }
  }, []); // Only run once on mount

  // Load initial divider position based on current orientation
  useEffect(() => {
    const orientation = layoutMode.mode === 'mobile-portrait' ? 'portrait' : 'landscape';
    const savedPosition = loadDividerPosition(orientation);
    setPanelSize(savedPosition);
  }, [layoutMode.mode, loadDividerPosition]);

  // Update ref and save layout preference when userLayoutMode changes
  useEffect(() => {
    const effectId = 'USER_LAYOUT_CHANGE_' + Date.now();
    log(LOG_LABELS.LAYOUT, `[${effectId}] userLayoutMode changed to:`, userLayoutMode);
    log(LOG_LABELS.LAYOUT, `[${effectId}] Previous ref value was:`, userLayoutModeRef.current);
    
    // Add stack trace to see where this change is coming from
    if (userLayoutMode === 'auto' && userLayoutModeRef.current !== 'auto') {
      log(LOG_LABELS.LAYOUT, `[${effectId}] WARNING: userLayoutMode changed to auto from:`, userLayoutModeRef.current);
      log(LOG_LABELS.LAYOUT, `[${effectId}] Stack trace:`, new Error().stack);
    }
    
    // Update the ref with the current value
    userLayoutModeRef.current = userLayoutMode;
    
    // Save user's layout preference to localStorage
    if (userLayoutMode && ['auto', 'two-panel', 'single-panel'].includes(userLayoutMode)) {
      try {
        const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
        if (profile.layoutMode !== userLayoutMode) {
          log(LOG_LABELS.STORAGE, `[${effectId}] Saving layout mode to profile:`, userLayoutMode);
          profile.layoutMode = userLayoutMode;
          profile.lastUpdated = Date.now();
          localStorage.setItem('explainer:profile', JSON.stringify(profile));
        }
      } catch (error) {
        console.warn('Home: Failed to save layout preference:', error);
      }
    }
    
    log(LOG_LABELS.LAYOUT, `[${effectId}] userLayoutMode change effect completed`);
  }, [userLayoutMode]);

  // Listen for custom layout change events from profile page
  useEffect(() => {
    const handleLayoutModeChange = (e) => {
      log(LOG_LABELS.LAYOUT, 'Custom layout event received:', e.detail);
      
      if (e.detail.layoutMode && ['auto', 'two-panel', 'single-panel'].includes(e.detail.layoutMode)) {
        log(LOG_LABELS.LAYOUT, 'Setting layout mode from custom event:', e.detail.layoutMode);
        setUserLayoutModeWithLogging(e.detail.layoutMode);
      }
    };
    
    window.addEventListener('layoutModeChanged', handleLayoutModeChange);
    
    return () => {
      window.removeEventListener('layoutModeChanged', handleLayoutModeChange);
    };
  }, []); // Only run once on mount

  // Set both CSS variables on the container
  useEffect(() => {
    if (!containerRef.current) return;
    if (layoutMode.mode === 'mobile-portrait') {
      containerRef.current.style.setProperty('--panel-height', `${panelSize}vh`);
      containerRef.current.style.setProperty('--panel-width', `100%`);
      // Portrait mode CSS variables set
    } else {
      containerRef.current.style.setProperty('--panel-width', `${panelSize}%`);
      containerRef.current.style.setProperty('--panel-height', `100vh`);
      // Landscape/Desktop mode CSS variables set
    }
  }, [panelSize, layoutMode]);

  const handleResize = useCallback((newSize) => {
    setPanelSize(newSize);
    
    // Save the position for the current orientation
    const orientation = layoutMode.mode === 'mobile-portrait' ? 'portrait' : 'landscape';
    saveDividerPosition(orientation, newSize);
  }, [layoutMode.mode, saveDividerPosition]);

  // Update scroll progress when text panel scrolls
  const handleScrollProgress = useCallback((progress) => {
    setScrollProgress(progress);
  }, []);

  const handleTextSelection = useCallback((selection) => {
    // Accepts { text, speaker, act, scene, charactersOnStage }
    const selectedText = typeof selection === 'string' ? selection : selection.text;
    const speaker = typeof selection === 'object' && selection.speaker ? selection.speaker : null;
    const act = typeof selection === 'object' && selection.act ? selection.act : null;
    const scene = typeof selection === 'object' && selection.scene ? selection.scene : null;
    const charactersOnStage = typeof selection === 'object' && selection.charactersOnStage ? selection.charactersOnStage : null;
    if (!selectedText.trim()) return;

    // Store the selection and show confirmation dialog
    setPendingSelection({ text: selectedText, speaker, act, scene, charactersOnStage });
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmExplanation = useCallback(async () => {
    if (!pendingSelection) return;
    
    const { text: selectedText, speaker, act, scene, charactersOnStage } = pendingSelection;
    
    // Close the confirmation dialog
    setShowConfirmDialog(false);
    setPendingSelection(null);

    // Add user message
    const userMessage = {
      type: 'user',
      content: selectedText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Get book info from localStorage
    const savedTitle = localStorage.getItem('explainer:bookTitle');
    const bookTitle = savedTitle || '';
    
    // Extract author from title if available (format: "Title by Author")
    let bookAuthor = 'William Shakespeare'; // default
    if (savedTitle && savedTitle.includes(' by ')) {
      bookAuthor = savedTitle.split(' by ').pop();
    }

    // Get user profile from localStorage
    const userProfile = localStorage.getItem('explainer:profile');
    let userLanguage = null;
    let userAge = null;
    let userNationality = null;
    let userEducationalLevel = null;
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        userLanguage = profile.language;
        userAge = profile.age;
        userNationality = profile.nationality;
        userEducationalLevel = profile.educationalLevel;
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }

    // Get LLM settings from localStorage with defaults
    const llm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
    
    // Set default provider if none configured
    if (!llm.provider) {
      llm.provider = 'openai';
      llm.model = 'gpt-4o-mini';
    }
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: selectedText,
          bookTitle: bookTitle,
          bookAuthor: bookAuthor,
          userLanguage: userLanguage,
          userAge: userAge,
          userNationality: userNationality,
          userEducationalLevel: userEducationalLevel,
          provider: llm.provider,
          model: llm.model,
          apiKey: llm.provider === 'custom' ? llm.key : undefined,
          endpoint: llm.endpoint,
          customModel: llm.customModel,
          userEmail: session?.user?.email || null,
          speaker: speaker || null,
          act: act || null,
          scene: scene || null,
          charactersOnStage: charactersOnStage || null,
          responseLength: responseLength
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }

      if (!response.ok) {
        // If the response has an error message, use it; otherwise use the status
        let backendMsg = data.error || data.message || '';
        
        // Handle paywall responses
        if (response.status === 403 && data.paywall) {
          setPaywallData(data);
          setShowPaywall(true);
          setIsLoading(false);
          return;
        }
        
        // Handle paywall responses
        if (response.status === 403 && data.paywall) {
          setPaywallData(data);
          setShowPaywall(true);
          setIsLoading(false);
          return;
        }
        
        if (response.status === 403 && backendMsg.toLowerCase().includes('sign in required')) {
          const errorMessage = {
            type: 'sign-in-required',
            timestamp: new Date().toISOString(),
            model: 'Notice'
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return; // Do not add the generic error message
        }
        const errorMessage = {
          type: 'ai',
          content: `Sorry, I encountered an error while trying to explain this text: HTTP error! status: ${response.status}${backendMsg ? '\n' + backendMsg : ''}`,
          timestamp: new Date().toISOString(),
          model: 'Error'
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response
      const aiMessage = {
        type: 'ai',
        content: data.explanation,
        timestamp: data.timestamp,
        model: llm.model || 'Unknown Model'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting explanation:', error);
      
      let errorContent = `Sorry, I encountered an error while trying to explain this text: ${error.message}`;
      
      // Handle rate limit errors with more helpful messages
      if (error.message && error.message.includes('429')) {
        errorContent = `The AI service is currently experiencing high usage and has hit its rate limit. \n\nYou can:\n• Switch to a different AI provider in Settings → LLM Provider\n• Try again in a few minutes\n• Use your own API key for higher limits\n\nTo switch providers, click the Settings button in the top right and change the LLM Provider.`;
      }
      
      // Add error message
      const errorMessage = {
        type: 'ai',
        content: errorContent,
        timestamp: new Date().toISOString(),
        model: 'Error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [session, pendingSelection]);

  const handleFollowUpQuestion = useCallback(async (question) => {
    if (!question.trim()) return;

    // Add user follow-up question
    const userMessage = {
      type: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Get book info from localStorage
    const savedTitle = localStorage.getItem('explainer:bookTitle');
    const bookTitle = savedTitle || '';
    
    // Extract author from title if available (format: "Title by Author")
    let bookAuthor = 'William Shakespeare'; // default
    if (savedTitle && savedTitle.includes(' by ')) {
      bookAuthor = savedTitle.split(' by ').pop();
    }

    // Get user profile from localStorage
    const userProfile = localStorage.getItem('explainer:profile');
    let userLanguage = null;
    let userAge = null;
    let userNationality = null;
    let userEducationalLevel = null;
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        userLanguage = profile.language;
        userAge = profile.age;
        userNationality = profile.nationality;
        userEducationalLevel = profile.educationalLevel;
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }

    // Get LLM settings from localStorage with defaults
    const llm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
    
    // Set default provider if none configured
    if (!llm.provider) {
      llm.provider = 'openai';
      llm.model = 'gpt-4o-mini';
    }
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: question,
          bookTitle: bookTitle,
          bookAuthor: bookAuthor,
          userLanguage: userLanguage,
          userAge: userAge,
          userNationality: userNationality,
          userEducationalLevel: userEducationalLevel,
          isFollowUp: true,
          provider: llm.provider,
          model: llm.model,
          apiKey: llm.provider === 'custom' ? llm.key : undefined,
          endpoint: llm.endpoint,
          customModel: llm.customModel,
          userEmail: session?.user?.email || null
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }

      if (!response.ok) {
        // If the response has an error message, use it; otherwise use the status
        let backendMsg = data.error || data.message || '';
        // Handle paywall responses
        if (response.status === 403 && data.paywall) {
          setPaywallData(data);
          setShowPaywall(true);
          setIsLoading(false);
          return;
        }
        
        if (response.status === 403 && backendMsg.toLowerCase().includes('sign in required')) {
          const errorMessage = {
            type: 'sign-in-required',
            timestamp: new Date().toISOString(),
            model: 'Notice'
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return; // Do not add the generic error message
        }
        const errorMessage = {
          type: 'ai',
          content: `Sorry, I encountered an error while trying to answer your question: HTTP error! status: ${response.status}${backendMsg ? '\n' + backendMsg : ''}`,
          timestamp: new Date().toISOString(),
          model: 'Error'
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response
      const aiMessage = {
        type: 'ai',
        content: data.explanation,
        timestamp: data.timestamp,
        model: llm.model || 'Unknown Model'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting explanation:', error);
      
      let errorContent = `Sorry, I encountered an error while trying to answer your question: ${error.message}`;
      
      // Handle rate limit errors with more helpful messages
      if (error.message && error.message.includes('429')) {
        errorContent = `The AI service is currently experiencing high usage and has hit its rate limit. \n\nYou can:\n• Switch to a different AI provider in Settings → LLM Provider\n• Try again in a few minutes\n• Use your own API key for higher limits\n\nTo switch providers, click the Settings button in the top right and change the LLM Provider.`;
      }
      
      // Add error message
      const errorMessage = {
        type: 'ai',
        content: errorContent,
        timestamp: new Date().toISOString(),
        model: 'Error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email, signIn]);

  return (
    <>
      <Head>
        <title>The Explainer - Understand Difficult Texts</title>
        <meta name="description" content="A progressive app to help you understand difficult texts line by line" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <LandscapeSuggestion />
      <div className={styles.page}>
        <div className={styles.container} ref={containerRef}>
          {!isLayoutLoaded ? (
            // Loading state while layout preference is being loaded
            <div style={{ 
              width: '100%', 
              height: '100vh', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '18px',
              color: '#64748b'
            }}>
              Loading layout... (userLayoutMode: {userLayoutMode})
            </div>
          ) : (() => {
            const effectiveMode = getEffectiveLayoutMode();
            return effectiveMode === 'single-panel' ? (
              // Single panel mode - only show TextPanel
              <div style={{ width: '100%', height: '100vh', flex: 'none' }}>
                <TextPanel 
                  key={textPanelKey}
                  ref={textPanelRef}
                  onTextSelection={handleTextSelection}
                  title={bookTitle}
                  onScrollProgress={handleScrollProgress}
                  messages={messages}
                  isLoading={isLoading}
                  onFollowUpQuestion={handleFollowUpQuestion}
                  scrollToText={quote => textPanelRef.current?.scrollToText?.(quote)}
                  scrollProgress={scrollProgress}
                />
              </div>
            ) : (
              // Two panel mode - show both panels with separator
              <>
                {layoutMode.mode === 'mobile-portrait' ? (
                  // Mobile portrait: ChatPanel on top, TextPanel on bottom
                  <>
                    <div style={{ height: `calc(100vh - var(--panel-height, 50vh) - 20px)`, width: '100%', flex: 'none', minHeight: 0 }}>
                      <ChatPanel 
                        messages={messages}
                        isLoading={isLoading}
                        onFollowUpQuestion={handleFollowUpQuestion}
                        selectedText={messages.length > 0 ? messages[0]?.content : ''}
                        scrollToText={quote => textPanelRef.current?.scrollToText?.(quote)}
                        bookTitle={bookTitle}
                        scrollProgress={scrollProgress}
                      />
                    </div>
                    <div style={{ height: 32, width: '100%', flex: 'none' }}>
                      <DraggableSeparator 
                        onResize={handleResize} 
                        leftWidth={panelSize}
                      />
                    </div>
                    <div style={{ height: `var(--panel-height, 50vh)`, width: '100%', flex: 'none', marginTop: 6 }}>
                      <TextPanel 
                        key={textPanelKey}
                        ref={textPanelRef}
                        onTextSelection={handleTextSelection}
                        title={bookTitle}
                        onScrollProgress={handleScrollProgress}
                        messages={messages}
                        isLoading={isLoading}
                        onFollowUpQuestion={handleFollowUpQuestion}
                        scrollToText={quote => textPanelRef.current?.scrollToText?.(quote)}
                        scrollProgress={scrollProgress}
                      />
                    </div>
                  </>
                ) : (
                  // Desktop/Landscape: TextPanel on left, ChatPanel on right
                  <>
                    <div style={{ width: `var(--panel-width, 50%)`, height: '100vh', flex: 'none' }}>
                      <TextPanel 
                        key={textPanelKey}
                        ref={textPanelRef}
                        width={panelSize}
                        onTextSelection={handleTextSelection}
                        title={bookTitle}
                        onScrollProgress={handleScrollProgress}
                        messages={messages}
                        isLoading={isLoading}
                        onFollowUpQuestion={handleFollowUpQuestion}
                        scrollToText={quote => textPanelRef.current?.scrollToText?.(quote)}
                        scrollProgress={scrollProgress}
                      />
                    </div>
                    <div style={{ width: 32, height: '100%', flex: 'none' }}>
                      <DraggableSeparator 
                        onResize={handleResize} 
                        leftWidth={panelSize}
                      />
                    </div>
                    <div style={{ width: `calc(100% - var(--panel-width, 50%) - 32px)`, height: '100vh', flex: 'none', minWidth: '200px' }}>
                      <ChatPanel 
                        width={100 - panelSize}
                        messages={messages}
                        isLoading={isLoading}
                        onFollowUpQuestion={handleFollowUpQuestion}
                        selectedText={messages.length > 0 ? messages[0]?.content : ''}
                        scrollToText={quote => textPanelRef.current?.scrollToText?.(quote)}
                        bookTitle={bookTitle}
                        scrollProgress={scrollProgress}
                      />
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>
      
      <PaywallModal 
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        paywallData={paywallData}
        session={session}
      />
      
      <ExplanationConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setPendingSelection(null);
        }}
        onConfirm={handleConfirmExplanation}
        selectedText={pendingSelection?.text || ''}
        isLoading={isLoading}
        responseLength={responseLength}
        onResponseLengthChange={setResponseLength}
      />
      
      <InstallPrompt />
    </>
  );
} 