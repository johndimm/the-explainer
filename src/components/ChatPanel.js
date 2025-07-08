import { useState, useRef, useEffect } from 'react';
import { Send, Save, MessageSquare } from 'lucide-react';
import styles from '@/styles/ChatPanel.module.css';

const ChatPanel = ({ width, messages, isLoading, onFollowUpQuestion, selectedText }) => {
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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
    <div className={styles.panel} style={{ flex: '1 1 0%' }}>
      <div className={styles.header}>
        <h2>Chat</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className={styles.saveButton}
            onClick={handleSaveChat}
            disabled={messages.length === 0}
          >
            <Save size={16} />
            Save Chat
          </button>
          <a
            href="/library"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 500,
              padding: '7px 16px',
              borderRadius: 6,
              border: '1px solid #3b82f6',
              background: 'white',
              transition: 'all 0.2s',
              marginLeft: 0,
              height: 36
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
            Library
          </a>
        </div>
      </div>
      
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare size={48} />
            <p>Select text from the left panel to start a conversation</p>
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
                  Thinking...
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
          placeholder="Ask a follow-up question..."
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