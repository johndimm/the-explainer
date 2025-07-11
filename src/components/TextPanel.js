import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FixedSizeList as List } from 'react-window';
import styles from '@/styles/TextPanel.module.css';

const ROW_HEIGHT = 28; // Compact, but readable
const HEADER_HEIGHT = 56; // Adjust if your header is a different height

const TextPanel = forwardRef(({ width, onTextSelection, title = "Source Text" }, ref) => {
  // All state hooks - must be called in same order every time
  const [textLines, setTextLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [firstClickIndex, setFirstClickIndex] = useState(null);
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flyingText, setFlyingText] = useState(null);
  const [listHeight, setListHeight] = useState(400);


  // All refs - must be called in same order every time
  const containerRef = useRef();
  const listRef = useRef();
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);
  const mouseStartPos = useRef({ x: 0, y: 0 });
  const mouseMoved = useRef(false);
  const currentScrollIndexRef = useRef(0);

  // Bookmark management functions
  const getBookmarkKey = useCallback(() => {
    const savedTitle = localStorage.getItem('explainer:bookTitle');
    return savedTitle ? `explainer:bookmark:${savedTitle}` : null;
  }, []);

  const saveBookmark = useCallback((scrollIndex) => {
    const bookmarkKey = getBookmarkKey();
    if (bookmarkKey) {
      localStorage.setItem(bookmarkKey, scrollIndex.toString());
      console.log('Bookmark saved:', scrollIndex);
    }
  }, [getBookmarkKey]);

  const loadBookmark = useCallback(() => {
    const bookmarkKey = getBookmarkKey();
    if (bookmarkKey) {
      const savedIndex = localStorage.getItem(bookmarkKey);
      if (savedIndex) {
        const index = parseInt(savedIndex, 10);
        console.log('Bookmark loaded:', index);
        return index;
      }
    }
    return 0;
  }, [getBookmarkKey]);







  // Function to render line content
  const renderLineContent = useCallback((line, lineIndex) => {
    return line;
  }, []);

  // Function to split long lines at word boundaries
  const splitLongLines = useCallback((text, maxWidth = 80) => {
    const lines = text.split('\n');
    const processedLines = [];
    
    for (const line of lines) {
      if (line.trim() === '') {
        processedLines.push('');
        continue;
      }
      
      // If line is already short enough, keep it as is
      if (line.length <= maxWidth) {
        processedLines.push(line);
        continue;
      }
      
      // Split long lines at word boundaries
      const words = line.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        if ((currentLine + ' ' + word).length <= maxWidth) {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        } else {
          if (currentLine) {
            processedLines.push(currentLine);
            currentLine = word;
          } else {
            // If a single word is longer than maxWidth, split it
            processedLines.push(word.substring(0, maxWidth));
            currentLine = word.substring(maxWidth);
          }
        }
      }
      
      if (currentLine) {
        processedLines.push(currentLine);
      }
    }
    
    return processedLines.filter(line => line.trim() !== '');
  }, []);

  // Imperative handle
  useImperativeHandle(ref, () => ({
    scrollToRatio: (ratio) => {
      if (!listRef.current || !textLines.length) return;
      const targetIndex = Math.floor(ratio * (textLines.length - 1));
      listRef.current.scrollToItem(targetIndex, 'start');
    }
  }), [textLines]);

  // Effect 1: Load text on mount
  useEffect(() => {
    const savedText = localStorage.getItem('explainer:bookText');
    
    if (savedText) {
      const lines = splitLongLines(savedText);
      setTextLines(lines);
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
          const lines = splitLongLines(text);
          setTextLines(lines);
        })
        .catch(error => {
          console.error('Error loading text:', error);
          setTextLines(['Error loading text. Please try again.']);
        });
    }
  }, [splitLongLines]);



  // Effect 3: Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Effect 4: Setup height and resize listener
  useEffect(() => {
    function updateHeight() {
      if (containerRef.current) {
        setListHeight(containerRef.current.offsetHeight - HEADER_HEIGHT);
      }
    }
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Effect 5: Update height when textLines changes
  useEffect(() => {
    if (textLines.length > 0 && containerRef.current) {
      setListHeight(containerRef.current.offsetHeight - HEADER_HEIGHT);
    }
  }, [textLines]);

  // Effect 6: Restore bookmark when text lines change
  useEffect(() => {
    if (textLines.length > 0) {
      const bookmarkIndex = loadBookmark();
      if (listRef.current && bookmarkIndex > 0) {
        setTimeout(() => {
          listRef.current.scrollToItem(bookmarkIndex, 'start');
          setCurrentScrollIndex(bookmarkIndex);
        }, 100);
      }
    }
  }, [textLines, loadBookmark]);

  // Effect 7: Save bookmark on unmount
  useEffect(() => {
    return () => {
      if (currentScrollIndexRef.current > 0) {
        saveBookmark(currentScrollIndexRef.current);
      }
    };
  }, [saveBookmark]);

  // Effect 8: Add global mouse move listener for drag detection
  useEffect(() => {
    if (isMobile) return;
    
    const handleMouseMove = (event) => {
      if (dragStartIndex !== null && !isDragging) {
        const dx = Math.abs(event.clientX - mouseStartPos.current.x);
        const dy = Math.abs(event.clientY - mouseStartPos.current.y);
        if (dx > 5 || dy > 5) {
          mouseMoved.current = true;
          setIsDragging(true);
          setSelectedLines(new Set([dragStartIndex]));
        }
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [dragStartIndex, isDragging, isMobile]);

  // Event handlers
  const handleLineSelection = useCallback((index) => {
    if (isDragging || submitting) return;
    
    if (firstClickIndex === null) {
      // First click - submit immediately for single line
      const selectedText = textLines[index];
      setSelectedLines(new Set([index]));
      setSubmitting(true);
      setTimeout(() => {
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setSubmitting(false);
      }, 300);
    } else {
      // Second click - select range between first and current
      const start = Math.min(firstClickIndex, index);
      const end = Math.max(firstClickIndex, index);
      const selectedText = textLines.slice(start, end + 1).join('\n');
      
      const rangeSelection = new Set();
      for (let i = start; i <= end; i++) {
        rangeSelection.add(i);
      }
      setSelectedLines(rangeSelection);
      setSubmitting(true);
      setTimeout(() => {
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setFirstClickIndex(null);
        setSubmitting(false);
      }, 300);
    }
  }, [firstClickIndex, textLines, onTextSelection, isDragging, submitting]);

  const handleLineClick = useCallback((index, event) => {
    if (isMobile) {
      handleLineSelection(index);
    } else {
      // Desktop: immediate single-click selection
      if (submitting) return;
      
      const selectedText = textLines[index];
      setSelectedLines(new Set([index]));
      setSubmitting(true);
      setTimeout(() => {
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setSubmitting(false);
      }, 300);
    }
  }, [isMobile, handleLineSelection, textLines, onTextSelection, submitting]);

  const handleLineTouchStart = useCallback((event) => {
    if (!isMobile) return;
    setTouchInProgress(true);
    const touch = event.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchMoved.current = false;
  }, [isMobile]);

  const handleLineTouchMove = useCallback((event) => {
    if (!isMobile) return;
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      touchMoved.current = true;
    }
  }, [isMobile]);

  const handleLineTouchEnd = useCallback((event) => {
    if (!isMobile || submitting) return;
    if (touchMoved.current) {
      return; // User was scrolling, not tapping
    }
    const index = parseInt(event.currentTarget.dataset.index);
    
    if (firstClickIndex === null) {
      // First tap - select this line
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
    } else if (firstClickIndex === index) {
      // Second tap on same line - submit immediately
      const selectedText = textLines[index];
      onTextSelection(selectedText);
      setSelectedLines(new Set());
      setFirstClickIndex(null);
    } else {
      // Tap on different line - submit range immediately
      const start = Math.min(firstClickIndex, index);
      const end = Math.max(firstClickIndex, index);
      const selectedText = textLines.slice(start, end + 1).join('\n');
      onTextSelection(selectedText);
      setSelectedLines(new Set());
      setFirstClickIndex(null);
    }
  }, [isMobile, firstClickIndex, textLines, onTextSelection, submitting]);

  const handleLineMouseDown = useCallback((index, event) => {
    if (isDragging) return;
    mouseStartPos.current = { x: event.clientX, y: event.clientY };
    mouseMoved.current = false;
    setDragStartIndex(index);
  }, [isDragging]);

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

  const handleMouseUp = useCallback((event) => {
    if (isDragging && selectedLines.size > 0) {
      const selectedText = Array.from(selectedLines)
        .sort((a, b) => a - b)
        .map(index => textLines[index])
        .join('\n');
      
      setTimeout(() => {
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setIsDragging(false);
        setDragStartIndex(null);
        setFirstClickIndex(null);
      }, 300);
    }
    setDragStartIndex(null);
    mouseMoved.current = false;
  }, [isDragging, selectedLines, textLines, onTextSelection]);

  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (!scrollUpdateWasRequested) {
      const currentIndex = Math.floor(scrollOffset / ROW_HEIGHT);
      if (currentIndex !== currentScrollIndexRef.current) {
        currentScrollIndexRef.current = currentIndex;
        setCurrentScrollIndex(currentIndex);
        setTimeout(() => saveBookmark(currentIndex), 500);
      }
    }
  }, [saveBookmark]);



  // Row component - defined outside of render to avoid recreation
  const Row = useCallback(({ index, style }) => {
    const isSelected = selectedLines.has(index);
    const line = textLines[index] || '';
    
    return (
      <div
        className={`${styles.line} ${isSelected ? styles.selected : ''}`}
        style={{ ...style, width: '100%' }}
        data-index={index}
        onClick={(event) => handleLineClick(index, event)}
        onMouseDown={!isMobile ? (e) => handleLineMouseDown(index, e) : undefined}
        onMouseEnter={!isMobile ? () => handleLineMouseEnter(index) : undefined}
        onMouseUp={!isMobile ? handleMouseUp : undefined}
        onTouchStart={isMobile ? handleLineTouchStart : undefined}
        onTouchMove={isMobile ? handleLineTouchMove : undefined}
        onTouchEnd={isMobile ? handleLineTouchEnd : undefined}
      >
        <span className={styles.lineNumber}>{index + 1}</span>
        <span 
          className={styles.lineContent} 
          title={line.length > 100 ? line : undefined}
        >
          {renderLineContent(line, index)}
        </span>
      </div>
    );
  }, [selectedLines, textLines, handleLineClick, isMobile, handleLineMouseDown, handleLineMouseEnter, handleMouseUp, handleLineTouchStart, handleLineTouchMove, handleLineTouchEnd, renderLineContent]);

  // Early return after all hooks
  if (textLines.length === 0) {
    return (
      <div className={styles.panel} style={{ width: `${width}%` }}>
        <div className={styles.loading}>Loading text...</div>
      </div>
    );
  }

  return (
    <div 
      className={styles.panel}
      style={{ '--panel-width': `${width}%` }}
      ref={containerRef}
    >
      <div className={styles.header}>
        <h2>{title}</h2>
        <div className={styles.headerControls}>
          <span className={styles.lineCount}>
            {currentScrollIndex + 1} of {textLines.length} lines
          </span>
        </div>
      </div>
      
      <div className={styles.textContainer}>
        <List
          ref={listRef}
          height={listHeight}
          itemCount={textLines.length}
          itemSize={ROW_HEIGHT}
          width={'100%'}
          onScroll={handleScroll}
        >
          {Row}
        </List>
      </div>
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