import { useState, useCallback, useRef, useEffect } from 'react';
import Head from "next/head";
import TextPanel from '@/components/TextPanel';
import ChatPanel from '@/components/ChatPanel';
import DraggableSeparator from '@/components/DraggableSeparator';
import styles from '@/styles/Home.module.css';
import { useSession, signIn } from 'next-auth/react';

function getLayoutMode() {
  if (typeof window === 'undefined') return { mode: 'desktop', isPortrait: false };
  const isMobile = window.innerWidth <= 768;
  const isPortrait = isMobile && window.matchMedia('(orientation: portrait)').matches;
  if (isMobile && isPortrait) return { mode: 'mobile-portrait', isPortrait: true };
  if (isMobile && !isPortrait) return { mode: 'mobile-landscape', isPortrait: false };
  return { mode: 'desktop', isPortrait: false };
}

export default function Home() {
  const [panelSize, setPanelSize] = useState(50); // width or height %
  const [layoutMode, setLayoutMode] = useState(getLayoutMode());
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookTitle, setBookTitle] = useState("Romeo and Juliet");
  const textPanelRef = useRef();
  const containerRef = useRef();
  const { data: session } = useSession();

  // Load divider positions from localStorage
  const loadDividerPosition = useCallback((orientation) => {
    try {
      const savedPosition = localStorage.getItem(`explainer:divider:${orientation}`);
      if (savedPosition) {
        const position = parseFloat(savedPosition);
        if (!isNaN(position) && position >= 20 && position <= 80) {
          return position;
        }
      }
    } catch (error) {
      console.warn('Failed to load divider position:', error);
    }
    
    // Default positions: more text in landscape, more chat in portrait
    return orientation === 'portrait' ? 40 : 60;
  }, []);

  // Save divider position to localStorage
  const saveDividerPosition = useCallback((orientation, position) => {
    try {
      localStorage.setItem(`explainer:divider:${orientation}`, position.toString());
    } catch (error) {
      console.warn('Failed to save divider position:', error);
    }
  }, []);

  // Responsive: update layout mode on resize/orientation
  useEffect(() => {
    function updateLayout() {
      const newLayoutMode = getLayoutMode();
      setLayoutMode(newLayoutMode);
      
      // Load the appropriate divider position for the new orientation
      const orientation = newLayoutMode.mode === 'mobile-portrait' ? 'portrait' : 'landscape';
      const savedPosition = loadDividerPosition(orientation);
      setPanelSize(savedPosition);
    }
    
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    updateLayout();
    
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, [loadDividerPosition]);

  // Load book title from localStorage
  useEffect(() => {
    const savedTitle = localStorage.getItem('explainer:bookTitle');
    if (savedTitle) {
      setBookTitle(savedTitle);
    }
  }, []);

  // Load initial divider position based on current orientation
  useEffect(() => {
    const orientation = layoutMode.mode === 'mobile-portrait' ? 'portrait' : 'landscape';
    const savedPosition = loadDividerPosition(orientation);
    setPanelSize(savedPosition);
  }, [layoutMode.mode, loadDividerPosition]);

  // Listen for changes to book title in localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'explainer:bookTitle' && e.newValue) {
        setBookTitle(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Set both CSS variables on the container
  useEffect(() => {
    if (!containerRef.current) return;
    if (layoutMode.mode === 'mobile-portrait') {
      containerRef.current.style.setProperty('--panel-height', `${panelSize}vh`);
      containerRef.current.style.setProperty('--panel-width', `100%`);
      console.log('Portrait mode - set --panel-height:', `${panelSize}vh`, '--panel-width: 100%');
    } else {
      containerRef.current.style.setProperty('--panel-width', `${panelSize}%`);
      containerRef.current.style.setProperty('--panel-height', `100vh`);
      console.log('Landscape/Desktop mode - set --panel-width:', `${panelSize}%`, '--panel-height: 100vh');
    }
  }, [panelSize, layoutMode]);

  const handleResize = useCallback((newSize) => {
    console.log('handleResize called with:', newSize, 'layoutMode:', layoutMode.mode);
    setPanelSize(newSize);
    
    // Save the position for the current orientation
    const orientation = layoutMode.mode === 'mobile-portrait' ? 'portrait' : 'landscape';
    saveDividerPosition(orientation, newSize);
  }, [layoutMode.mode, saveDividerPosition]);

  // Mobile: scroll callback for divider
  const handleDividerScroll = useCallback((ratio) => {
    if (textPanelRef.current && textPanelRef.current.scrollToRatio) {
      textPanelRef.current.scrollToRatio(ratio);
    }
  }, []);

  const handleTextSelection = useCallback(async (selection) => {
    // Accepts { text, speaker }
    const selectedText = typeof selection === 'string' ? selection : selection.text;
    const speaker = typeof selection === 'object' && selection.speaker ? selection.speaker : null;
    if (!selectedText.trim()) return;

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
    const bookTitle = savedTitle || 'Romeo and Juliet';
    
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
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        userLanguage = profile.language;
        userAge = profile.age;
        userNationality = profile.nationality;
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }

    // Get LLM settings from localStorage
    const llm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
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
          provider: llm.provider,
          model: llm.model,
          apiKey: llm.provider === 'custom' ? llm.key : undefined,
          endpoint: llm.endpoint,
          customModel: llm.customModel,
          userEmail: session?.user?.email || null,
          speaker: speaker || null
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
        console.log('Backend error message:', backendMsg);
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
  }, [session]);

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
    const bookTitle = savedTitle || 'Romeo and Juliet';
    
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
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        userLanguage = profile.language;
        userAge = profile.age;
        userNationality = profile.nationality;
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }

    // Get LLM settings from localStorage
    const llm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.page}>
        <div className={styles.container} ref={containerRef}>
          {layoutMode.mode === 'mobile-portrait' ? (
            <>
              <div style={{ height: `calc(100vh - var(--panel-height, 50vh) - 20px)`, width: '100%', flex: 'none', minHeight: 0 }}>
                <ChatPanel 
                  messages={messages}
                  isLoading={isLoading}
                  onFollowUpQuestion={handleFollowUpQuestion}
                  selectedText={messages.length > 0 ? messages[0]?.content : ''}
                  scrollToText={quote => textPanelRef.current?.scrollToText?.(quote)}
                />
              </div>
              <div style={{ height: 20, width: '100%', flex: 'none' }}>
                <DraggableSeparator 
                  onResize={handleResize} 
                  leftWidth={panelSize}
                  onScrollDivider={handleDividerScroll}
                />
              </div>
              <div style={{ height: `var(--panel-height, 50vh)`, width: '100%', flex: 'none', marginTop: 6 }}>
                <TextPanel 
                  ref={textPanelRef}
                  onTextSelection={handleTextSelection}
                  title={bookTitle}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ width: `var(--panel-width, 50%)`, height: '100vh', flex: 'none' }}>
                <TextPanel 
                  ref={textPanelRef}
                  width={panelSize}
                  onTextSelection={handleTextSelection}
                  title={bookTitle}
                />
              </div>
              <div style={{ width: 24, height: '100%', flex: 'none' }}>
                <DraggableSeparator 
                  onResize={handleResize} 
                  leftWidth={panelSize}
                  onScrollDivider={handleDividerScroll}
                />
              </div>
              <div style={{ width: `calc(100% - var(--panel-width, 50%) - 24px)`, height: '100vh', flex: 'none', minWidth: 0 }}>
                <ChatPanel 
                  width={100 - panelSize}
                  messages={messages}
                  isLoading={isLoading}
                  onFollowUpQuestion={handleFollowUpQuestion}
                  selectedText={messages.length > 0 ? messages[0]?.content : ''}
                  scrollToText={quote => textPanelRef.current?.scrollToText?.(quote)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
