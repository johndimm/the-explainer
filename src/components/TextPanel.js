import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FixedSizeList as List } from 'react-window';
import styles from '@/styles/TextPanel.module.css';

const ROW_HEIGHT = 28; // Compact, but readable
const HEADER_HEIGHT = 56; // Adjust if your header is a different height

const TextPanel = forwardRef(({ width, onTextSelection, title = "Source Text" }, ref) => {
  const [textLines, setTextLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [firstClickIndex, setFirstClickIndex] = useState(null);
  
  // Debug: log when firstClickIndex changes
  useEffect(() => {
    console.log('firstClickIndex changed to:', firstClickIndex);
  }, [firstClickIndex]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchSequence, setIsTouchSequence] = useState(false);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [rerender, setRerender] = useState(false); // dummy state for force update

  const [touchInProgress, setTouchInProgress] = useState(false);
  const [flyingText, setFlyingText] = useState(null);
  const [listHeight, setListHeight] = useState(400);
  const containerRef = useRef();
  const textContainerRef = useRef();
  const lastTouchTimeRef = useRef(0);
  const clickTimeoutRef = useRef(null);
  const listRef = useRef();
  const touchSlop = 10;
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);
  const mouseStartPos = useRef({ x: 0, y: 0 });
  const mouseMoved = useRef(false);

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

  // Add global mouse move listener for drag detection
  useEffect(() => {
    if (!isMobile) {
      const handleMouseMove = (event) => {
        // Only handle mouse move if we have a drag start index and aren't already dragging
        if (dragStartIndex !== null && !isDragging) {
          const dx = Math.abs(event.clientX - mouseStartPos.current.x);
          const dy = Math.abs(event.clientY - mouseStartPos.current.y);
          if (dx > 5 || dy > 5) { // Small threshold to start drag
            mouseMoved.current = true;
            setIsDragging(true);
            setSelectedLines(new Set([dragStartIndex]));
          }
        }
      };
      
      // Use passive: false to allow preventDefault if needed
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [dragStartIndex, isDragging, isMobile]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      // Simplified mobile detection - only detect actual mobile devices
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      console.log('[MOBILE DETECTION]', {
        width: window.innerWidth,
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        isMobileDevice
      });
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    // Reset selection state when component mounts or mobile detection changes
    setFirstClickIndex(null);
    setSelectedLines(new Set());
    
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Load text from localStorage if available, otherwise load Romeo and Juliet
  useEffect(() => {
    const savedText = localStorage.getItem('explainer:bookText');
    const savedTitle = localStorage.getItem('explainer:bookTitle');
    
    if (savedText) {
      const lines = savedText.split('\n').filter(line => line.trim() !== '');
      setTextLines(lines);
      // Update the title if it's passed as a prop
      if (title === "Source Text" && savedTitle) {
        // Note: We can't update the title prop directly, but the parent component
        // can check localStorage for the title when rendering
      }
    } else {
      // Fallback to Romeo and Juliet
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
    }
  }, [title]);

  // Desktop selection handler - maintains original behavior
  const handleLineSelection = useCallback((index) => {
    if (isDragging || submitting) return; // Don't handle during drag or while submitting
    
    console.log('handleLineSelection called:', index, 'firstClickIndex:', firstClickIndex);
    
    if (firstClickIndex === null) {
      // First click - highlight this line
      console.log('First click - highlighting');
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
    } else if (firstClickIndex === index) {
      // Second click on same line - highlight briefly, then submit
      console.log('Second click on same line - highlighting briefly, then submitting');
      const selectedText = textLines[index];
      
      // Force immediate re-render to show selection
      setSelectedLines(new Set([index]));
      setRerender(x => !x);
      
      setSubmitting(true);
      setTimeout(() => {
        console.log('Submitting single line:', selectedText);
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setFirstClickIndex(null);
        setSubmitting(false);
        setRerender(x => !x);
      }, 300); // 300ms delay to show selection
    } else {
      // Click on different line - highlight range briefly, then submit
      console.log('Click on different line - highlighting range briefly, then submitting');
      const start = Math.min(firstClickIndex, index);
      const end = Math.max(firstClickIndex, index);
      const selectedText = textLines.slice(start, end + 1).join('\n');
      
      // Force immediate re-render to show selection
      const rangeSelection = new Set();
      for (let i = start; i <= end; i++) {
        rangeSelection.add(i);
      }
      setSelectedLines(rangeSelection);
      setRerender(x => !x);
      
      setSubmitting(true);
      setTimeout(() => {
        console.log('Submitting range:', selectedText);
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setFirstClickIndex(null);
        setSubmitting(false);
        setRerender(x => !x);
      }, 300); // 300ms delay to show selection
    }
  }, [firstClickIndex, textLines, onTextSelection, isDragging, submitting]);

  // Unified click/touch handler for both desktop and mobile
  const handleLineClick = useCallback((index, event) => {
    console.log('handleLineClick called:', index, 'isMobile:', isMobile);
    handleLineSelection(index);
  }, [handleLineSelection, isMobile]);

  // Mobile touch handlers - only expand selection, never submit directly
  const handleLineTouchStart = useCallback((event) => {
    if (!isMobile) return;
    console.log('Line touch start detected');
    setTouchInProgress(true);
    const index = parseInt(event.currentTarget.dataset.index);
    console.log('Line touch start for index:', index);
    const touch = event.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchMoved.current = false;
    // Do not select yet; wait for touchend
  }, [isMobile]);

  const handleLineTouchMove = useCallback((event) => {
    if (!isMobile) return;
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > touchSlop || dy > touchSlop) {
      touchMoved.current = true;
      console.log('Touch moved - scrolling detected');
    }
  }, [isMobile]);

  const handleLineTouchEnd = useCallback((event) => {
    if (!isMobile || submitting) return;
    console.log('Touch end detected, touchMoved:', touchMoved.current);
    setTouchInProgress(false); // Remove delay
    if (touchMoved.current) {
      console.log('Ignoring touch end - user was scrolling');
      return; // User was scrolling, not tapping
    }
    const index = parseInt(event.currentTarget.dataset.index);
    console.log('Processing touch selection for index:', index);
    
    // Simple mobile selection: tap to select, tap again to submit
    if (firstClickIndex === null) {
      // First tap - select this line
      console.log('First tap - selecting line', index);
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
      setRerender(x => !x); // Force immediate re-render
    } else if (firstClickIndex === index) {
      // Second tap on same line - submit immediately
      console.log('Second tap on same line - submitting immediately');
      const selectedText = textLines[index];
      console.log('Submitting single line (mobile):', selectedText);
      onTextSelection(selectedText);
      setSelectedLines(new Set());
      setFirstClickIndex(null);
      setRerender(x => !x); // Force re-render after submission
    } else {
      // Tap on different line - submit range immediately
      console.log('Tap on different line - submitting range immediately');
      const start = Math.min(firstClickIndex, index);
      const end = Math.max(firstClickIndex, index);
      const selectedText = textLines.slice(start, end + 1).join('\n');
      console.log('Submitting range (mobile):', selectedText);
      onTextSelection(selectedText);
      setSelectedLines(new Set());
      setFirstClickIndex(null);
      setRerender(x => !x); // Force re-render after submission
    }
  }, [isMobile, firstClickIndex, textLines, onTextSelection, submitting]);



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
    
    // Record mouse start position
    mouseStartPos.current = { x: event.clientX, y: event.clientY };
    mouseMoved.current = false;
    setDragStartIndex(index);
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
  const handleMouseUp = useCallback((event) => {
    if (isDragging && selectedLines.size > 0) {
      // Submit selected text after brief highlight
      const selectedText = Array.from(selectedLines)
        .sort((a, b) => a - b)
        .map(index => textLines[index])
        .join('\n');
      
      // Show selection briefly before submitting
      setTimeout(() => {
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setIsDragging(false);
        setDragStartIndex(null);
      }, 300); // 300ms delay to show selection
    } else if (dragStartIndex !== null && !mouseMoved.current) {
      // This was a click, not a drag - handle it in the click handler
      console.log('Mouse up detected as click');
    }
    
    // Reset drag state
    setDragStartIndex(null);
    mouseMoved.current = false;
  }, [isDragging, selectedLines, textLines, onTextSelection, dragStartIndex]);

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
    
    // Debug: log when a line is selected
    if (isSelected) {
      console.log(`Row ${index} is selected, selectedLines:`, Array.from(selectedLines));
    }
    
    return (
      <div
        className={`${styles.line} ${isSelected ? styles.selected : ''}`}
        style={{ ...style, width: '100%' }}
        data-index={index}
        onClick={(event) => handleLineClick(index, event)}
        onMouseDown={!isMobile ? (e) => handleLineMouseDown(index, e) : undefined}
        onMouseEnter={!isMobile ? () => handleLineMouseEnter(index) : undefined}
        onMouseUp={!isMobile ? handleMouseUp : undefined}
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
      </div>
      <div 
        className={styles.textContainer}
      >
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