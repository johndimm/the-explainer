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
  const [toc, setToc] = useState([]); // [{title, lineIndex}]
  const containerRef = useRef();
  const textContainerRef = useRef();
  const lastTouchTimeRef = useRef(0);
  const clickTimeoutRef = useRef(null);
  const listRef = useRef();
  const touchSlop = 10;
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);

  useImperativeHandle(ref, () => ({
    scrollToRatio: (ratio) => {
      if (!listRef.current || !textLines.length) return;
      const targetIndex = Math.floor(ratio * (textLines.length - 1));
      listRef.current.scrollToItem(targetIndex, 'start');
    },
    scrollToLine: (lineIndex) => {
      if (!listRef.current || !textLines.length) return;
      listRef.current.scrollToItem(lineIndex, 'start');
    }
  }), [textLines]);

  // Update listHeight on mount, resize, and when text content changes
  useEffect(() => {
    function updateHeight() {
      if (containerRef.current) {
        setListHeight(containerRef.current.offsetHeight - HEADER_HEIGHT);
      }
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [textLines]);

  // Detect ToC and chapters after loading text
  useEffect(() => {
    if (!textLines.length) return;
    
    // Look for a line that says "Contents" (case insensitive)
    let contentsIndex = -1;
    for (let i = 0; i < textLines.length; ++i) {
      if (textLines[i].trim().toLowerCase() === 'contents') {
        contentsIndex = i;
        break;
      }
    }
    
    if (contentsIndex !== -1) {
      // Find ToC entries after the "Contents" line
      const tocEntries = [];
      const maxTocLines = 50; // Limit ToC to reasonable size
      const tocRegex = /^(chapter|act|scene|book|part|section|\d+\.|[ivxlc]+\.)/i;
      
      for (let i = contentsIndex + 1; i < Math.min(contentsIndex + maxTocLines, textLines.length); ++i) {
        const line = textLines[i].trim();
        if (line === '') break; // Stop at first blank line
        if (tocRegex.test(line)) {
          tocEntries.push({ title: line, lineIndex: i });
        }
      }
      console.log('Found ToC entries:', tocEntries.length);
      setToc(tocEntries);
    } else {
      console.log('No "Contents" found');
      setToc([]);
    }
  }, [textLines]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    setFirstClickIndex(null);
    setSelectedLines(new Set());
    setSubmitButtonVisible(false);
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
    } else {
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
          setTextLines(['Error loading text. Please try again.']);
        });
    }
  }, [title]);

  // Desktop selection handler - maintains original behavior
  const handleLineSelection = useCallback((index) => {
    if (isDragging) return;
    if (firstClickIndex === null) {
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
    } else if (firstClickIndex === index) {
      const selectedText = textLines[index];
      onTextSelection(selectedText);
      setSelectedLines(new Set());
      setFirstClickIndex(null);
    } else {
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
    if (isMobile || touchInProgress) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    handleLineSelection(index);
  }, [handleLineSelection, isMobile, touchInProgress]);

  // Mobile touch handlers - only expand selection, never submit directly
  const handleLineTouchStart = useCallback((event) => {
    if (!isMobile) return;
    setTouchInProgress(true);
    const index = parseInt(event.currentTarget.dataset.index);
    const touch = event.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchMoved.current = false;
  }, [isMobile]);

  const handleLineTouchMove = useCallback((event) => {
    if (!isMobile) return;
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > touchSlop || dy > touchSlop) {
      touchMoved.current = true;
    }
  }, [isMobile]);

  const handleLineTouchEnd = useCallback((event) => {
    if (!isMobile) return;
    setTimeout(() => setTouchInProgress(false), 100);
    if (touchMoved.current) return;
    const index = parseInt(event.currentTarget.dataset.index);
    if (firstClickIndex === null) {
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
    } else if (firstClickIndex === index) {
      setSelectedLines(new Set([index]));
      setSubmitButtonVisible(true);
    } else {
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
    const flyingElement = {
      text: text,
      startX: sourceRect.left,
      startY: sourceRect.top,
      startWidth: sourceRect.width,
      timestamp: Date.now()
    };
    setFlyingText(flyingElement);
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
      const selectedText = Array.from(selectedLines)
        .sort((a, b) => a - b)
        .map(index => textLines[index])
        .join('\n');
      onTextSelection(selectedText);
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
    const isTocLine = toc.some(entry => entry.lineIndex === index);
    
    return (
      <div
        className={`${styles.line} ${isSelected ? styles.selected : ''}`}
        style={{ ...style, width: '100%' }}
        data-index={index}
        onClick={!isMobile && !isTocLine ? (event) => handleLineClick(index, event) : undefined}
        onMouseDown={!isMobile && !isTocLine ? (e) => handleLineMouseDown(index, e) : undefined}
        onMouseEnter={!isMobile && !isTocLine ? () => handleLineMouseEnter(index) : undefined}
        onMouseUp={!isMobile && !isTocLine ? handleMouseUp : undefined}
        {...(isMobile && !isTocLine ? {
          onTouchStart: handleLineTouchStart,
          onTouchMove: handleLineTouchMove,
          onTouchEnd: handleLineTouchEnd
        } : {})}
      >
        <span className={styles.lineNumber}>{index + 1}</span>
        <span className={styles.lineContent}>
          {isTocLine ? (
            <button
              className={styles.tocInlineLink}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Find the chapter this ToC entry points to
                const tocEntry = toc.find(entry => entry.lineIndex === index);
                console.log('Clicked ToC entry:', tocEntry);
                console.log('Ref exists:', !!ref);
                console.log('Ref current exists:', !!(ref && ref.current));
                console.log('scrollToLine exists:', !!(ref && ref.current && ref.current.scrollToLine));
                
                if (tocEntry && ref && ref.current && ref.current.scrollToLine) {
                  // Find the end of the ToC section - start searching after the last ToC entry
                  const lastTocIndex = Math.max(...toc.map(entry => entry.lineIndex));
                  const searchStart = lastTocIndex + 1;
                  
                  // Extract the chapter number/identifier from ToC entry
                  const tocText = tocEntry.title.trim();
                  let searchPattern = '';
                  
                  // Try to extract chapter number (e.g., "Chapter 1" -> "Chapter 1")
                  if (tocText.match(/^Chapter\s+\d+/i)) {
                    searchPattern = tocText.match(/^Chapter\s+\d+/i)[0];
                  }
                  // Try to extract roman numerals (e.g., "I." -> "I")
                  else if (tocText.match(/^[IVXLC]+\./i)) {
                    searchPattern = tocText.match(/^[IVXLC]+\./i)[0];
                  }
                  // Try to extract arabic numerals (e.g., "1." -> "1")
                  else if (tocText.match(/^\d+\./)) {
                    searchPattern = tocText.match(/^\d+\./)[0];
                  }
                  // Try to extract ACT/SCENE format (e.g., "ACT 1" -> "ACT 1")
                  else if (tocText.match(/^ACT\s+\d+/i)) {
                    searchPattern = tocText.match(/^ACT\s+\d+/i)[0];
                  }
                  // Try to extract SCENE format (e.g., "SCENE 1" -> "SCENE 1")
                  else if (tocText.match(/^SCENE\s+\d+/i)) {
                    searchPattern = tocText.match(/^SCENE\s+\d+/i)[0];
                  }
                  // Fallback: use first few words
                  else {
                    searchPattern = tocText.split(' ').slice(0, 2).join(' ');
                  }
                  
                  console.log('ToC entry:', tocText, 'Search pattern:', searchPattern, 'Search start:', searchStart);
                  console.log('Total lines:', textLines.length);
                  
                  // Search for the chapter heading after the ToC section
                  let found = false;
                  for (let i = searchStart; i < textLines.length; ++i) {
                    const lineText = textLines[i].trim();
                    console.log(`Checking line ${i}: "${lineText}"`);
                    if (lineText.toLowerCase() === searchPattern.toLowerCase()) {
                      console.log('Found match at line:', i, 'Text:', lineText);
                      console.log('Calling scrollToLine with:', i);
                      ref.current.scrollToLine(i);
                      found = true;
                      break;
                    }
                  }
                  
                  if (!found) {
                    console.log('No match found for pattern:', searchPattern);
                  }
                } else {
                  console.log('Missing required components for navigation');
                }
              }}
              type="button"
            >
              {line}
            </button>
          ) : (
            line
          )}
        </span>
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