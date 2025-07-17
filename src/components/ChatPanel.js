import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Save, MessageSquare, Settings, BookOpen, HelpCircle, CreditCard } from 'lucide-react';
import styles from '@/styles/ChatPanel.module.css';
import { t, getUserLanguage } from '@/i18n';
import { useSession, signIn, signOut } from 'next-auth/react';

const ChatPanel = ({ width, messages, isLoading, onFollowUpQuestion, selectedText, scrollToText, bookTitle, scrollProgress }) => {
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [lang, setLang] = useState('en');
  const prevMessagesLengthRef = useRef(0);
  const { data: session } = useSession();

  useEffect(() => {
    setLang(getUserLanguage());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToNewResponse = () => {
    if (messagesContainerRef.current && messages.length > prevMessagesLengthRef.current) {
      // Find the new AI response
      const newMessageIndex = messages.length - 1;
      const newMessageElement = messagesContainerRef.current.children[0]?.children[newMessageIndex];
      if (newMessageElement) {
        newMessageElement.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }
    }
  };

  useEffect(() => {
    // If we have more messages than before, a new response came in
    if (messages.length > prevMessagesLengthRef.current) {
      scrollToNewResponse();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (followUpQuestion.trim() && !isLoading) {
      onFollowUpQuestion(followUpQuestion);
      setFollowUpQuestion('');
    }
  };

  const handleSaveChat = () => {
    const chatData = {
      messages,
      timestamp: new Date().toISOString(),
      selectedText
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>{bookTitle || t('chat', lang)}</h2>
        <div className={styles.topRightButtons}>
          <span className={styles.lineCount}>
            {scrollProgress !== undefined ? `${Math.round(scrollProgress * 100)}%` : 'Ready'}
          </span>
          <a
            href="/library"
            className={styles.headerButton}
            title="Browse and load books from our library of classic literature"
          >
            <BookOpen size={16} />
            <span className={styles.buttonText}>{t('library', lang)}</span>
          </a>
          <a
            href="/guide"
            className={styles.headerButton}
            title="Learn how to use The Explainer effectively"
          >
            <HelpCircle size={16} />
            <span className={styles.buttonText}>Guide</span>
          </a>
          <a
            href={session ? "/credits" : undefined}
            className={styles.headerButton}
            title="View and purchase credits"
            onClick={e => {
              if (!session) {
                e.preventDefault();
                signIn('google');
              }
            }}
          >
            <CreditCard size={16} />
            <span className={styles.buttonText}>Credits</span>
          </a>
          <a
            href={session ? "/profile" : undefined}
            className={styles.headerButtonIcon}
            title={t('profileSettings', lang)}
            onClick={e => {
              if (!session) {
                e.preventDefault();
                signIn('google');
              }
            }}
          >
            <Settings size={16} />
          </a>
        </div>
      </div>
      
      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare size={48} />
            <p>{t('selectTextPrompt', lang)}</p>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`${styles.message} ${styles[message.type]}`}
              >
                <div className={styles.messageHeader}>
                  {message.type === 'user' ? (
                    <span className={styles.timestamp}>
                      {formatTimestamp(message.timestamp)}
                    </span>
                  ) : (
                    <>
                      <span className={styles.messageType}>
                        {message.model || 'AI'}
                      </span>
                      <span className={styles.timestamp}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </>
                  )}
                </div>
                <div className={styles.messageContent}>
                  {message.type === 'user' ? (
                    <span
                      className={styles.quoteLink}
                      onClick={() => scrollToText && scrollToText(message.content)}
                      title="Jump to text"
                    >
                      {message.content}
                    </span>
                  ) : message.type === 'sign-in-required' ? (
                    <span>
                      <strong>Sign in required</strong><br />
                      You&apos;ve used your 3 free explanations.{' '}
                      <a
                        href="#"
                        style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}
                        onClick={e => { e.preventDefault(); signIn('google'); }}
                      >
                        Sign in
                      </a>{' '}to continue using The Explainer.
                    </span>
                  ) : message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.ai}`}>
                <div className={styles.messageHeader}>
                  <span className={styles.messageType}>
                    {(() => {
                      try {
                        const llm = JSON.parse(localStorage.getItem('explainer:llm') || '{}');
                        return llm.model || 'AI';
                      } catch {
                        return 'AI';
                      }
                    })()}
                  </span>
                </div>
                <div className={styles.loadingMessage}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  {t('thinking', lang)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <form className={styles.inputForm} onSubmit={handleSubmit}>
        <input
          type="text"
          value={followUpQuestion}
          onChange={(e) => setFollowUpQuestion(e.target.value)}
          placeholder={t('askFollowup', lang)}
          disabled={isLoading}
          className={styles.input}
        />
        <button 
          type="submit" 
          disabled={!followUpQuestion.trim() || isLoading}
          className={styles.sendButton}
        >
          <Send size={16} />
        </button>
        <button 
          className={styles.saveButtonBottom}
          onClick={handleSaveChat}
          disabled={messages.length === 0}
          title={t('saveChat', lang)}
        >
          <Save size={14} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;