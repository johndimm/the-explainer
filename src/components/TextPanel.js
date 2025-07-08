import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FixedSizeList as List } from 'react-window';
import styles from '@/styles/TextPanel.module.css';

const ROW_HEIGHT = 28; // Compact, but readable
const HEADER_HEIGHT = 56; // Adjust if your header is a different height

const TextPanel = forwardRef(({ width, onTextSelection, title = "Source Text" }, ref) => {
  const [textLines, setTextLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [firstClickIndex, setFirstClickIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchSequence, setIsTouchSequence] = useState(false);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [submitButtonVisible, setSubmitButtonVisible] = useState(false);
  const [touchInProgress, setTouchInProgress] = useState(false);
  const [flyingText, setFlyingText] = useState(null);
  const [listHeight, setListHeight] = useState(400);
  const containerRef = useRef();
  const textContainerRef = useRef();
  const lastTouchTimeRef = useRef(0);
  const clickTimeoutRef = useRef(null);
  const listRef = useRef();

  useImperativeHandle(ref, () => ({
    scrollToRatio: (ratio) => {
      if (!listRef.current || !textLines.length) return;
      const targetIndex = Math.floor(ratio * (textLines.length - 1));
      listRef.current.scrollToItem(targetIndex, 'start');
    }
  }), [textLines]);

  // Update listHeight on mount and resize
  useEffect(() => {
    function updateHeight() {
      if (containerRef.current) {
        setListHeight(containerRef.current.offsetHeight - HEADER_HEIGHT);
      }
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      console.log('Mobile detection - width:', window.innerWidth, 'isMobile:', isMobileDevice);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    // Reset selection state when component mounts or mobile detection changes
    setFirstClickIndex(null);
    setSelectedLines(new Set());
    setSubmitButtonVisible(false);
    
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Load Romeo and Juliet by default
  useEffect(() => {
    fetch('/public-domain-texts/shakespeare-romeo-and-juliet.txt')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(text => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        setTextLines(lines);
      })
      .catch(error => {
        console.error('Error loading text:', error);
        setTextLines(['Error loading text. Please try again.']);
      });
  }, []);

  // Desktop selection handler - maintains original behavior
  const handleLineSelection = useCallback((index) => {
    if (isDragging) return; // Don't handle during drag
    
    console.log('handleLineSelection called:', index, 'firstClickIndex:', firstClickIndex);
    
    if (firstClickIndex === null) {
      // First click - highlight this line
      console.log('First click - highlighting');
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
    } else if (firstClickIndex === index) {
      // Second click on same line - submit this line
      console.log('Second click on same line - submitting');
      const selectedText = textLines[index];
      onTextSelection(selectedText);
      setSelectedLines(new Set());
      setFirstClickIndex(null);
    } else {
      // Click on different line - submit range from first to this line
      console.log('Click on different line - submitting range');
      const start = Math.min(firstClickIndex, index);
      const end = Math.max(firstClickIndex, index);
      const selectedText = textLines.slice(start, end + 1).join('\n');
      onTextSelection(selectedText);
      setSelectedLines(new Set());
      setFirstClickIndex(null);
    }
  }, [firstClickIndex, textLines, onTextSelection, isDragging]);

  // Click handler for both desktop and mobile
  const handleLineClick = useCallback((index, event) => {
    console.log('handleLineClick called:', index, 'isMobile:', isMobile, 'touchInProgress:', touchInProgress);
    
    // On mobile, completely ignore click events - only use touch events
    if (isMobile || touchInProgress) {
      console.log('Ignoring click - mobile or touch in progress');
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    console.log('Calling handleLineSelection from click');
    handleLineSelection(index);
  }, [handleLineSelection, isMobile, touchInProgress]);

  // Mobile touch handlers - only expand selection, never submit directly
  const handleLineTouchStart = useCallback((event) => {
    if (!isMobile) return;
    
    setTouchInProgress(true);
    const index = parseInt(event.currentTarget.dataset.index);
    
    if (firstClickIndex === null) {
      // First touch - just highlight
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
    } else if (firstClickIndex === index) {
      // Second touch on same line - just show submit button, don't auto-submit
      setSelectedLines(new Set([index]));
      setSubmitButtonVisible(true);
    } else {
      // Touch different line - expand selection
      const start = Math.min(firstClickIndex, index);
      const end = Math.max(firstClickIndex, index);
      const newSelection = new Set();
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
      setSelectedLines(newSelection);
      setSubmitButtonVisible(true);
    }
  }, [isMobile, firstClickIndex]);

  const handleLineTouchEnd = useCallback(() => {
    if (isMobile) {
      setTimeout(() => setTouchInProgress(false), 100);
    }
  }, [isMobile]);

  // Submit selected text (for mobile)
  const handleSubmitSelection = useCallback(() => {
    if (selectedLines.size > 0) {
      const selectedText = Array.from(selectedLines)
        .sort((a, b) => a - b)
        .map(index => textLines[index])
        .join('\n');
      
      onTextSelection(selectedText);
      setSelectedLines(new Set());
      setFirstClickIndex(null);
      setSubmitButtonVisible(false);
    }
  }, [selectedLines, textLines, onTextSelection]);

  // Clear selection (for mobile)
  const handleClearSelection = useCallback(() => {
    setSelectedLines(new Set());
    setFirstClickIndex(null);
    setSubmitButtonVisible(false);
  }, []);

  // Animate text flying to chat panel
  const animateTextToChat = useCallback((text, sourceElement) => {
    if (!sourceElement) return;
    
    const sourceRect = sourceElement.getBoundingClientRect();
    
    // Create flying text element
    const flyingElement = {
      text: text,
      startX: sourceRect.left,
      startY: sourceRect.top,
      startWidth: sourceRect.width,
      timestamp: Date.now()
    };
    
    setFlyingText(flyingElement);
    
    // Remove flying text after animation
    setTimeout(() => {
      setFlyingText(null);
    }, 800);
  }, []);

  // Mouse down to start drag selection
  const handleLineMouseDown = useCallback((index, event) => {
    if (isDragging) return;
    
    setIsDragging(true);
    setDragStartIndex(index);
    setSelectedLines(new Set([index]));
  }, [isDragging]);

  // Mouse move during drag selection
  const handleLineMouseEnter = useCallback((index) => {
    if (isDragging && dragStartIndex !== null) {
      const start = Math.min(dragStartIndex, index);
      const end = Math.max(dragStartIndex, index);
      const newSelection = new Set();
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
      setSelectedLines(newSelection);
    }
  }, [isDragging, dragStartIndex]);

  // Mouse up to end drag selection
  const handleMouseUp = useCallback(() => {
    if (isDragging && selectedLines.size > 0) {
      // Submit selected text
      const selectedText = Array.from(selectedLines)
        .sort((a, b) => a - b)
        .map(index => textLines[index])
        .join('\n');
      
      onTextSelection(selectedText);
      
      // Clear selection
      setSelectedLines(new Set());
      setIsDragging(false);
      setDragStartIndex(null);
    }
  }, [isDragging, selectedLines, textLines, onTextSelection]);

  if (textLines.length === 0) {
    return (
      <div className={styles.panel} style={{ width: `${width}%` }}>
        <div className={styles.loading}>Loading text...</div>
      </div>
    );
  }

  // Virtualized row renderer
  const Row = ({ index, style }) => {
    const isSelected = selectedLines.has(index);
    const line = textLines[index] || '';
    return (
      <div
        className={`${styles.line} ${isSelected ? styles.selected : ''}`}
        style={{ ...style, width: '100%' }}
        data-index={index}
        onClick={!isMobile ? (event) => handleLineClick(index, event) : undefined}
        onMouseDown={!isMobile ? (e) => handleLineMouseDown(index, e) : undefined}
        onMouseEnter={!isMobile ? () => handleLineMouseEnter(index) : undefined}
        onMouseUp={!isMobile ? handleMouseUp : undefined}
        {...(isMobile ? {
          onTouchStart: handleLineTouchStart,
          onTouchEnd: handleLineTouchEnd
        } : {})}
      >
        <span className={styles.lineNumber}>{index + 1}</span>
        <span className={styles.lineContent}>{line}</span>
      </div>
    );
  };

  return (
    <div 
      className={styles.panel}
      style={{ '--panel-width': `${width}%` }}
      ref={containerRef}
    >
      <div className={styles.header}>
        <h2>{title}</h2>
        <span className={styles.lineCount}>{textLines.length} lines</span>
        {isMobile && submitButtonVisible && (
          <div className={styles.mobileActions}>
            <button 
              className={styles.submitButton}
              onClick={handleSubmitSelection}
              type="button"
            >
              Submit ({selectedLines.size} lines)
            </button>
            <button 
              className={styles.clearButton}
              onClick={handleClearSelection}
              type="button"
            >
              Clear
            </button>
          </div>
        )}
      </div>
      <div className={styles.textContainer}>
        <List
          ref={listRef}
          height={listHeight}
          itemCount={textLines.length}
          itemSize={ROW_HEIGHT}
          width={'100%'}
        >
          {Row}
        </List>
      </div>
      {/* Flying text animation */}
      {flyingText && (
        <div 
          className={styles.flyingText}
          style={{
            left: flyingText.startX,
            top: flyingText.startY,
            width: flyingText.startWidth,
            '--start-x': `${flyingText.startX}px`,
            '--start-y': `${flyingText.startY}px`,
            '--end-x': `${window.innerWidth - 50}px`,
            '--end-y': `${window.innerHeight / 2}px`,
          }}
        >
          {flyingText.text.substring(0, 100)}...
        </div>
      )}
    </div>
  );
});

export default TextPanel; 