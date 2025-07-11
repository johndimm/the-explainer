import { useState, useRef, useEffect } from 'react';
import { Send, Save, MessageSquare, Settings } from 'lucide-react';
import styles from '@/styles/ChatPanel.module.css';
import { t, getUserLanguage } from '@/i18n';

const ChatPanel = ({ width, messages, isLoading, onFollowUpQuestion, selectedText }) => {
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [lang, setLang] = useState('en');
  const prevMessagesLengthRef = useRef(0);

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
        <h2>{t('chat', lang)}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button 
            className={styles.saveButton}
            onClick={handleSaveChat}
            disabled={messages.length === 0}
            title={t('saveChat', lang)}
          >
            <Save size={16} />
            <span className={styles.saveButtonText}>Save Chat</span>
          </button>
          <a
            href="/library"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid #3b82f6',
              background: 'white',
              transition: 'all 0.2s',
              height: 32
            }}
            onMouseEnter={e => {
              e.target.style.background = '#3b82f6';
              e.target.style.color = 'white';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'white';
              e.target.style.color = '#3b82f6';
            }}
          >
            {t('library', lang)}
          </a>
          <a
            href="/guide"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid #3b82f6',
              background: 'white',
              transition: 'all 0.2s',
              height: 32
            }}
            onMouseEnter={e => {
              e.target.style.background = '#3b82f6';
              e.target.style.color = 'white';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'white';
              e.target.style.color = '#3b82f6';
            }}
          >
            Guide
          </a>
          <a
            href="/profile"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              textDecoration: 'none',
              padding: '6px',
              borderRadius: 4,
              border: '1px solid #3b82f6',
              background: 'white',
              transition: 'all 0.2s',
              height: 32,
              width: 32
            }}
            title={t('profileSettings', lang)}
            onMouseEnter={e => {
              e.target.style.background = '#3b82f6';
              e.target.style.color = 'white';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'white';
              e.target.style.color = '#3b82f6';
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
                  <span className={styles.messageType}>
                    {message.type === 'user' ? 'You' : 'AI'}
                  </span>
                  <span className={styles.timestamp}>
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <div className={styles.messageContent}>
                  {message.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className={`${styles.message} ${styles.ai}`}>
                <div className={styles.messageHeader}>
                  <span className={styles.messageType}>AI</span>
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
      </form>
    </div>
  );
};

export default ChatPanel; 