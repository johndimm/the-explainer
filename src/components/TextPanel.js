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

  // Check if storage is available
  const isStorageAvailable = useCallback(() => {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  // Bookmark management functions
  const getBookmarkKey = useCallback(() => {
    if (!isStorageAvailable()) {
      console.warn('localStorage is not available');
      return null;
    }
    try {
      const savedTitle = localStorage.getItem('explainer:bookTitle');
      return savedTitle ? `explainer:bookmark:${savedTitle}` : null;
    } catch (error) {
      console.warn('Failed to get bookmark key:', error);
      return null;
    }
  }, [isStorageAvailable]);

  const saveBookmark = useCallback((scrollIndex) => {
    if (!isStorageAvailable()) {
      console.warn('Cannot save bookmark: storage not available');
      return;
    }
    
    try {
      const bookmarkKey = getBookmarkKey();
      if (bookmarkKey && scrollIndex > 0) {
        localStorage.setItem(bookmarkKey, scrollIndex.toString());
        console.log('Bookmark saved:', scrollIndex);
        // Visual feedback for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`💾 Bookmark saved: line ${scrollIndex + 1}`);
        }
      }
    } catch (error) {
      console.warn('Failed to save bookmark:', error);
      // Fallback: try to save to sessionStorage if localStorage fails
      try {
        const bookmarkKey = getBookmarkKey();
        if (bookmarkKey && scrollIndex > 0) {
          sessionStorage.setItem(bookmarkKey, scrollIndex.toString());
          console.log('Bookmark saved to sessionStorage:', scrollIndex);
          if (process.env.NODE_ENV === 'development') {
            console.log(`💾 Bookmark saved to sessionStorage: line ${scrollIndex + 1}`);
          }
        }
      } catch (sessionError) {
        console.warn('Failed to save bookmark to sessionStorage:', sessionError);
      }
    }
  }, [getBookmarkKey, isStorageAvailable]);

  const loadBookmark = useCallback(() => {
    if (!isStorageAvailable()) {
      console.warn('Cannot load bookmark: storage not available');
      return 0;
    }
    
    try {
      const bookmarkKey = getBookmarkKey();
      if (bookmarkKey) {
        // Try localStorage first
        let savedIndex = localStorage.getItem(bookmarkKey);
        let source = 'localStorage';
        if (!savedIndex) {
          // Fallback to sessionStorage
          savedIndex = sessionStorage.getItem(bookmarkKey);
          source = 'sessionStorage';
        }
        if (savedIndex) {
          const index = parseInt(savedIndex, 10);
          if (!isNaN(index) && index >= 0) {
            console.log('Bookmark loaded:', index);
            if (process.env.NODE_ENV === 'development') {
              console.log(`📖 Bookmark loaded from ${source}: line ${index + 1}`);
            }
            return index;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load bookmark:', error);
    }
    return 0;
  }, [getBookmarkKey, isStorageAvailable]);







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
    },
    scrollToText: (quote) => {
      if (!listRef.current || !textLines.length || !quote) return;
      // Try to find the first line that matches the quote (or first line of quote)
      const lines = Array.isArray(quote) ? quote : quote.split('\n');
      const firstLine = lines[0].trim();
      const idx = textLines.findIndex(line => line.trim() === firstLine);
      if (idx >= 0) {
        listRef.current.scrollToItem(idx, 'start');
      }
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

  // Function to get current scroll position from the list container
  const getCurrentScrollPosition = useCallback(() => {
    if (!listRef.current) return 0;
    
    try {
      // Try to get scroll position from react-window's internal state
      const scrollElement = listRef.current._outerRef;
      if (scrollElement) {
        const scrollTop = scrollElement.scrollTop;
        const index = Math.floor(scrollTop / ROW_HEIGHT);
        return Math.max(0, index);
      }
    } catch (error) {
      console.warn('Failed to get scroll position from react-window:', error);
    }
    
    return currentScrollIndexRef.current;
  }, []);

  // Debounced bookmark saving
  const saveBookmarkDebounced = useCallback((() => {
    let timeoutId = null;
    return (scrollIndex) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        saveBookmark(scrollIndex);
      }, 1000); // Increased debounce time for better mobile performance
    };
  })(), [saveBookmark]);

  // Effect 6: Restore bookmark when text lines change
  useEffect(() => {
    if (textLines.length > 0) {
      const bookmarkIndex = loadBookmark();
      if (listRef.current && bookmarkIndex > 0) {
        // Use a longer delay on mobile to ensure the component is fully rendered
        const delay = isMobile ? 300 : 100;
        setTimeout(() => {
          try {
            if (listRef.current) {
              listRef.current.scrollToItem(bookmarkIndex, 'start');
              setCurrentScrollIndex(bookmarkIndex);
              currentScrollIndexRef.current = bookmarkIndex;
              console.log('Bookmark restored to position:', bookmarkIndex);
              if (process.env.NODE_ENV === 'development') {
                console.log(`📍 Bookmark restored to line ${bookmarkIndex + 1}`);
              }
            }
          } catch (error) {
            console.warn('Failed to restore bookmark position:', error);
          }
        }, delay);
      }
    }
  }, [textLines, loadBookmark, isMobile]);

  // Effect 7: Save bookmark on unmount
  useEffect(() => {
    return () => {
      try {
        const currentPosition = getCurrentScrollPosition();
        if (currentPosition > 0) {
          saveBookmark(currentPosition);
          if (process.env.NODE_ENV === 'development') {
            console.log(`💾 Final bookmark save on unmount: line ${currentPosition + 1}`);
          }
        }
      } catch (error) {
        console.warn('Failed to save bookmark on unmount:', error);
      }
    };
  }, [saveBookmark, getCurrentScrollPosition]);

  // Effect 7.5: Save bookmark on page termination
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const currentPosition = getCurrentScrollPosition();
        if (currentPosition > 0) {
          // Use synchronous localStorage for beforeunload
          const bookmarkKey = getBookmarkKey();
          if (bookmarkKey) {
            localStorage.setItem(bookmarkKey, currentPosition.toString());
            if (process.env.NODE_ENV === 'development') {
              console.log(`💾 Emergency bookmark save on page termination: line ${currentPosition + 1}`);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to save bookmark on page termination:', error);
      }
    };

    const handlePageHide = () => {
      try {
        const currentPosition = getCurrentScrollPosition();
        if (currentPosition > 0) {
          // Use synchronous localStorage for pagehide
          const bookmarkKey = getBookmarkKey();
          if (bookmarkKey) {
            localStorage.setItem(bookmarkKey, currentPosition.toString());
            if (process.env.NODE_ENV === 'development') {
              console.log(`💾 Emergency bookmark save on page hide: line ${currentPosition + 1}`);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to save bookmark on page hide:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        try {
          const currentPosition = getCurrentScrollPosition();
          if (currentPosition > 0) {
            // Use synchronous localStorage for visibility change
            const bookmarkKey = getBookmarkKey();
            if (bookmarkKey) {
              localStorage.setItem(bookmarkKey, currentPosition.toString());
              if (process.env.NODE_ENV === 'development') {
                console.log(`💾 Emergency bookmark save on visibility change: line ${currentPosition + 1}`);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to save bookmark on visibility change:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [getCurrentScrollPosition, getBookmarkKey]);

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

  // Effect 9: Periodic bookmark save for mobile reliability
  useEffect(() => {
    if (!isMobile) return;
    
    const interval = setInterval(() => {
      try {
        const currentPosition = getCurrentScrollPosition();
        if (currentPosition > 0) {
          saveBookmark(currentPosition);
          if (process.env.NODE_ENV === 'development') {
            console.log(`📱 Periodic bookmark save: line ${currentPosition + 1}`);
          }
        }
      } catch (error) {
        console.warn('Failed to save periodic bookmark:', error);
      }
    }, 3000); // Save every 3 seconds on mobile for better reliability
    
    return () => clearInterval(interval);
  }, [isMobile, saveBookmark, getCurrentScrollPosition]);

  // Effect 10: Mobile scroll position detection using Intersection Observer
  useEffect(() => {
    if (!isMobile || !listRef.current) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.dataset.index, 10);
          if (!isNaN(index) && index !== currentScrollIndexRef.current) {
            currentScrollIndexRef.current = index;
            setCurrentScrollIndex(index);
            saveBookmarkDebounced(index);
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`📱 Intersection observer: line ${index + 1} is visible`);
            }
          }
        }
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    });
    
    // Observe all visible rows
    const rows = listRef.current.querySelectorAll('[data-index]');
    rows.forEach(row => observer.observe(row));
    
    return () => {
      observer.disconnect();
    };
  }, [isMobile, saveBookmarkDebounced, textLines.length]);

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
      console.log('First touch: setSelectedLines', index);
    } else if (firstClickIndex === index) {
      // Second tap on same line - submit after highlight
      setSelectedLines(new Set([index]));
      setTimeout(() => {
        const selectedText = textLines[index];
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setFirstClickIndex(null);
      }, 300);
    } else {
      // Tap on different line - submit range after highlight
      const start = Math.min(firstClickIndex, index);
      const end = Math.max(firstClickIndex, index);
      const rangeSelection = new Set();
      for (let i = start; i <= end; i++) {
        rangeSelection.add(i);
      }
      setSelectedLines(rangeSelection);
      setTimeout(() => {
        const selectedText = textLines.slice(start, end + 1).join('\n');
        onTextSelection(selectedText);
        setSelectedLines(new Set());
        setFirstClickIndex(null);
      }, 300);
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
        
        // On mobile, save immediately for better reliability
        if (isMobile) {
          saveBookmark(currentIndex);
          if (process.env.NODE_ENV === 'development') {
            console.log(`📱 Mobile scroll (immediate save): offset=${scrollOffset}, index=${currentIndex}, line=${currentIndex + 1}`);
          }
        } else {
          saveBookmarkDebounced(currentIndex);
        }
      }
    }
  }, [saveBookmarkDebounced, saveBookmark, isMobile]);

  // Additional scroll handler for mobile reliability
  const handleContainerScroll = useCallback((event) => {
    if (!isMobile) return;
    
    const scrollTop = event.target.scrollTop;
    const currentIndex = Math.floor(scrollTop / ROW_HEIGHT);
    
    if (currentIndex !== currentScrollIndexRef.current) {
      currentScrollIndexRef.current = currentIndex;
      setCurrentScrollIndex(currentIndex);
      saveBookmark(currentIndex); // Immediate save on mobile
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 Container scroll (immediate save): scrollTop=${scrollTop}, index=${currentIndex}, line=${currentIndex + 1}`);
      }
    }
  }, [isMobile, saveBookmark]);



  // Row component - defined outside of render to avoid recreation
  const Row = useCallback(({ index, style }) => {
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
      
      <div className={styles.textContainer} onScroll={handleContainerScroll}>
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