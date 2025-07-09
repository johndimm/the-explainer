import { useState, useCallback, useRef, useEffect } from 'react';
import Head from "next/head";
import TextPanel from '@/components/TextPanel';
import ChatPanel from '@/components/ChatPanel';
import DraggableSeparator from '@/components/DraggableSeparator';
import styles from '@/styles/Home.module.css';

export default function Home() {
  const [leftWidth, setLeftWidth] = useState(50);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookTitle, setBookTitle] = useState("Romeo and Juliet");
  const textPanelRef = useRef();

  // Load book title from localStorage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem('explainer:bookTitle');
    if (savedTitle) {
      setBookTitle(savedTitle);
    }
  }, []);

  const handleResize = useCallback((newWidth) => {
    setLeftWidth(newWidth);
  }, []);

  // Mobile: scroll callback for divider
  const handleDividerScroll = useCallback((ratio) => {
    console.log('handleDividerScroll called, ratio:', ratio);
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
        <div className={styles.container}>
          <TextPanel 
            ref={textPanelRef}
            width={leftWidth} 
            onTextSelection={handleTextSelection}
            title={bookTitle}
          />
          <DraggableSeparator 
            onResize={handleResize} 
            leftWidth={leftWidth}
            onScrollDivider={handleDividerScroll}
          />
          <ChatPanel 
            width={100 - leftWidth}
            messages={messages}
            isLoading={isLoading}
            onFollowUpQuestion={handleFollowUpQuestion}
            selectedText={messages.length > 0 ? messages[0]?.content : ''}
          />
        </div>
      </div>
    </>
  );
}
