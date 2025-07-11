import { useState, useCallback, useRef, useEffect } from 'react';
import Head from "next/head";
import TextPanel from '@/components/TextPanel';
import ChatPanel from '@/components/ChatPanel';
import DraggableSeparator from '@/components/DraggableSeparator';
import styles from '@/styles/Home.module.css';

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

  // Responsive: update layout mode on resize/orientation
  useEffect(() => {
    function updateLayout() {
      setLayoutMode(getLayoutMode());
    }
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    updateLayout();
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
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
  }, [layoutMode.mode]);

  // Mobile: scroll callback for divider
  const handleDividerScroll = useCallback((ratio) => {
    if (textPanelRef.current && textPanelRef.current.scrollToRatio) {
      textPanelRef.current.scrollToRatio(ratio);
    }
  }, []);

  const handleTextSelection = useCallback(async (selectedText) => {
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
          userNationality: userNationality
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response
      const aiMessage = {
        type: 'ai',
        content: data.explanation,
        timestamp: data.timestamp
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting explanation:', error);
      
      // Add error message
      const errorMessage = {
        type: 'ai',
        content: `Sorry, I encountered an error while trying to explain this text: ${error.message}`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
          userNationality: userNationality
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Add AI response
      const aiMessage = {
        type: 'ai',
        content: data.explanation,
        timestamp: data.timestamp
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting explanation:', error);
      
      // Add error message
      const errorMessage = {
        type: 'ai',
        content: `Sorry, I encountered an error while trying to answer your question: ${error.message}`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
              <div style={{ height: `var(--panel-height, 50vh)`, width: '100%', flex: 'none', marginBottom: 6 }}>
                <TextPanel 
                  ref={textPanelRef}
                  onTextSelection={handleTextSelection}
                  title={bookTitle}
                />
              </div>
              <div style={{ height: 20, width: '100%', flex: 'none' }}>
                <DraggableSeparator 
                  onResize={handleResize} 
                  leftWidth={panelSize}
                  onScrollDivider={handleDividerScroll}
                />
              </div>
              <div style={{ height: `calc(100vh - var(--panel-height, 50vh) - 20px)`, width: '100%', flex: 'none', minHeight: 0 }}>
                <ChatPanel 
                  messages={messages}
                  isLoading={isLoading}
                  onFollowUpQuestion={handleFollowUpQuestion}
                  selectedText={messages.length > 0 ? messages[0]?.content : ''}
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
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
