import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FixedSizeList as List } from 'react-window';
import styles from '@/styles/TextPanel.module.css';

const ROW_HEIGHT = 36; // Increased to accommodate line-height and padding

const TextPanel = forwardRef(({ width, onTextSelection, title = "Source Text", onScrollProgress }, ref) => {
  console.log('TextPanel component loaded - version without react-window');
  
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







  // Helper: detect Shakespeare play by title
  const SHAKESPEARE_PLAYS = [
    'Romeo and Juliet', 'Hamlet', 'Macbeth', 'Othello', 'King Lear', 'A Midsummer Night\'s Dream',
    'Julius Caesar', 'The Tempest', 'Much Ado About Nothing', 'Twelfth Night', 'As You Like It',
    'The Merchant of Venice', 'Richard III', 'Henry V', 'Antony and Cleopatra', 'Coriolanus',
    'Taming of the Shrew', 'Measure for Measure', 'All\'s Well That Ends Well', 'King John',
    'Love\'s Labour\'s Lost', 'The Winter\'s Tale', 'Two Gentlemen of Verona', 'Timon of Athens',
    'Pericles', 'Cymbeline', 'Troilus and Cressida', 'Henry IV', 'Henry VI', 'Henry VIII',
    'The Comedy of Errors', 'The Merry Wives of Windsor', 'Titus Andronicus', 'Sonnets',
    'Venus and Adonis', 'The Rape of Lucrece', 'A Lover\'s Complaint', 'The Phoenix and the Turtle',
    'The Passionate Pilgrim', 'Sonnets To Sundry Notes of Music', 'Sir Thomas More', 'Locrine',
    'The Two Noble Kinsmen', 'The Tragedy of Titus Andronicus', 'The Life of King Henry the Fifth',
    'The Life and Death of King Richard the Second', 'The Life and Death of King John',
    'The Tragedy of King Richard the Third', 'The Tragedy of King Lear', 'The Tragedy of Hamlet',
    'The Tragedy of Macbeth', 'The Tragedy of Othello', 'The Tragedy of Julius Caesar',
    'The Tragedy of Antony and Cleopatra', 'The Tragedy of Coriolanus', 'The Tragedy of Timon of Athens',
    'The Tragedy of Troilus and Cressida', 'The Tragedy of Cymbeline', 'The Tragedy of Pericles',
    'The Tragedy of Romeo and Juliet', 'The Tragedy of Titus Andronicus',
  ];
  function isShakespearePlay(title) {
    if (!title) return false;
    if (title.toLowerCase().includes('shakespeare')) return true;
    return SHAKESPEARE_PLAYS.some(play => title.toLowerCase().includes(play.toLowerCase()));
  }

  // Helper: Detect speaker for plays/scripts
  function detectSpeaker(textLines, startIndex) {
    for (let i = startIndex; i >= 0; i--) {
      const line = textLines[i].trim();
      // Match lines like FRIAR LAWRENCE. or JULIET:
      if (/^[A-Z][A-Z\s\-\.']{2,30}[\.:]$/.test(line) && line.length < 40) {
        return line.replace(/[\.:]$/, '').trim();
      }
    }
    return null;
  }

  // Function to render line content
  const renderLineContent = useCallback((line, lineIndex) => {
    const trimmed = line.trim();
    
    // Title and author styling (first few lines)
    if (lineIndex === 1) {
      // Main title
      return <span style={{ display: 'block', textAlign: 'center', fontWeight: 700, fontSize: '24px', margin: '20px 0 8px 0', color: '#1e293b' }}>{trimmed}</span>;
    }
    if (lineIndex === 2) {
      // Author line
      return <span style={{ display: 'block', textAlign: 'center', fontWeight: 500, fontSize: '18px', margin: '0 0 20px 0', color: '#64748b' }}>{trimmed}</span>;
    }
    
    if (!isShakespearePlay(title)) return line;
    
    // Scene/act headings
    if (/^(act|scene)\b/i.test(trimmed)) {
      return <span style={{ display: 'block', textAlign: 'center', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '16px 0 8px 0' }}>{trimmed}</span>;
    }
    // Character names (all caps, centered, not too long)
    if (/^[A-Z][A-Z\s\-\.']{2,30}$/.test(trimmed) && trimmed.length < 32) {
      return <span style={{ display: 'block', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', margin: '12px 0 0 0', letterSpacing: 1 }}>{trimmed}</span>;
    }
    // Stage directions (in brackets or parentheses)
    if (/^\s*\[.*\]\s*$/.test(line) || /^\s*\(.*\)\s*$/.test(line)) {
      return <span style={{ fontStyle: 'italic', marginLeft: 48, color: '#64748b' }}>{trimmed}</span>;
    }
    // Dialogue (default)
    return <span style={{ marginLeft: 32, display: 'block' }}>{line}</span>;
  }, [title]);

  // Function to split text into lines (no artificial line breaks)
  const splitLongLines = useCallback((text) => {
    return text.split('\n');
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
      // Prepend title and author to the text
      const titleLines = [
        '',
        title,
        `by ${title.includes(' by ') ? title.split(' by ').pop() : 'William Shakespeare'}`,
        ''
      ];
      setTextLines([...titleLines, ...lines]);
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
          // Prepend title and author to the text
          const titleLines = [
            '',
            title,
            `by ${title.includes(' by ') ? title.split(' by ').pop() : 'William Shakespeare'}`,
            ''
          ];
          setTextLines([...titleLines, ...lines]);
        })
        .catch(error => {
          console.error('Error loading text:', error);
          setTextLines(['Error loading text. Please try again.']);
        });
    }
  }, [splitLongLines, title]);



  // Effect 3: Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      try {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log(`📱 Mobile detection: ${isMobileDevice}, User Agent: ${navigator.userAgent}`);
        setIsMobile(isMobileDevice);
      } catch (error) {
        console.warn('Failed to detect mobile device:', error);
        setIsMobile(false);
      }
    };
    
    checkMobile();
    
    try {
      window.addEventListener('resize', checkMobile);
    } catch (error) {
      console.warn('Failed to add resize listener:', error);
    }
    
    return () => {
      try {
        window.removeEventListener('resize', checkMobile);
      } catch (error) {
        console.warn('Failed to remove resize listener:', error);
      }
    };
  }, []);

  // Effect 4: Setup height and resize listener
  useEffect(() => {
    function updateHeight() {
      if (containerRef.current) {
        // Since there's no header, use the full container height
        setListHeight(containerRef.current.offsetHeight);
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
      // Since there's no header, use the full container height
      setListHeight(containerRef.current.offsetHeight);
    }
  }, [textLines]);



  // Function to get current scroll position from react-window
  const getCurrentScrollPosition = useCallback(() => {
    if (!listRef.current) return 0;
    
    try {
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

  // Effect 7.5: Save bookmark on page termination - TEMPORARILY DISABLED
  // useEffect(() => {
  //   // Only add event listeners if we're in a browser environment
  //   if (typeof window === 'undefined') return;

  //   const handleBeforeUnload = () => {
  //     try {
  //       const currentPosition = getCurrentScrollPosition();
  //       if (currentPosition > 0) {
  //         // Use synchronous localStorage for beforeunload
  //         const bookmarkKey = getBookmarkKey();
  //         if (bookmarkKey) {
  //           localStorage.setItem(bookmarkKey, currentPosition.toString());
  //           if (process.env.NODE_ENV === 'development') {
  //             console.log(`💾 Emergency bookmark save on page termination: line ${currentPosition + 1}`);
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       console.warn('Failed to save bookmark on page termination:', error);
  //     }
  //   };

  //   const handlePageHide = () => {
  //     try {
  //       const currentPosition = getCurrentScrollPosition();
  //       if (currentPosition > 0) {
  //         // Use synchronous localStorage for pagehide
  //         const bookmarkKey = getBookmarkKey();
  //         if (bookmarkKey) {
  //           localStorage.setItem(bookmarkKey, currentPosition.toString());
  //           if (process.env.NODE_ENV === 'development') {
  //             console.log(`💾 Emergency bookmark save on page hide: line ${currentPosition + 1}`);
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       console.warn('Failed to save bookmark on page hide:', error);
  //     }
  //   };

  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'hidden') {
  //       try {
  //         const currentPosition = getCurrentScrollPosition();
  //       if (currentPosition > 0) {
  //           // Use synchronous localStorage for visibility change
  //           const bookmarkKey = getBookmarkKey();
  //           if (bookmarkKey) {
  //             localStorage.setItem(bookmarkKey, currentPosition.toString());
  //             if (process.env.NODE_ENV === 'development') {
  //               console.log(`💾 Emergency bookmark save on visibility change: line ${currentPosition + 1}`);
  //             }
  //           }
  //         }
  //       } catch (error) {
  //         console.warn('Failed to save bookmark on visibility change:', error);
  //       }
  //     }
  //   };

  //   try {
  //     window.addEventListener('beforeunload', handleBeforeUnload);
  //     window.addEventListener('pagehide', handlePageHide);
  //     document.addEventListener('visibilitychange', handleVisibilityChange);
  //   } catch (error) {
  //     console.warn('Failed to add termination event listeners:', error);
  //   }

  //   return () => {
  //     try {
  //       window.removeEventListener('beforeunload', handleBeforeUnload);
  //       window.removeEventListener('pagehide', handlePageHide);
  //       document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   } catch (error) {
  //       console.warn('Failed to remove termination event listeners:', error);
  //     }
  //   };
  // }, [getCurrentScrollPosition, getBookmarkKey]);

  // Effect 8: Add global mouse move listener for drag detection
  useEffect(() => {
    if (isMobile) return;
    
    const handleMouseMove = (event) => {
      if (dragStartIndex !== null && !isDragging) {
        const dx = Math.abs(event.clientX - mouseStartPos.current.x);
        const dy = Math.abs(event.clientY - mouseStartPos.current.y);
        if (dx > 10 || dy > 10) { // Increased threshold to prevent accidental drag detection
          console.log(`🖱️ Drag detected: dx=${dx}, dy=${dy}`);
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



  // Effect 10: Mobile scroll position detection using Intersection Observer - TEMPORARILY DISABLED
  // useEffect(() => {
  //   if (!isMobile || !listRef.current) return;
    
  //   try {
  //     const observer = new IntersectionObserver((entries) => {
  //       entries.forEach((entry) => {
  //         if (entry.isIntersecting) {
  //           const index = parseInt(entry.target.dataset.index, 10);
  //           if (!isNaN(index) && index !== currentScrollIndexRef.current) {
  //             currentScrollIndexRef.current = index;
  //             setCurrentScrollIndex(index);
  //             saveBookmarkDebounced(index);
              
  //             if (process.env.NODE_ENV === 'development') {
  //               console.log(`📱 Intersection observer: line ${index + 1} is visible`);
  //             }
  //           }
  //         }
  //       });
  //     }, {
  //       root: null,
  //       rootMargin: '0px',
  //       threshold: 0.5
  //     });
      
  //     // Observe all visible rows with safety check
  //     if (listRef.current) {
  //       const rows = listRef.current.querySelectorAll('[data-index]');
  //       if (rows && rows.length > 0) {
  //         rows.forEach(row => {
  //             if (row && row.dataset && row.dataset.index) {
  //               observer.observe(row);
  //             }
  //           });
  //         }
  //       }
      
  //       return () => {
  //         observer.disconnect();
  //       };
  //     } catch (error) {
  //       console.warn('Failed to setup Intersection Observer:', error);
  //       return () => {};
  //     }
  //   }, [isMobile, saveBookmarkDebounced, textLines.length]);

  // Event handlers
  const handleLineSelection = useCallback((index) => {
    if (isDragging || submitting) return;

    if (!isMobile) {
      // Desktop: submit immediately on first click
      const selectedText = textLines[index];
      const speaker = isShakespearePlay(title) ? detectSpeaker(textLines, index) : null;
      onTextSelection({ text: selectedText, speaker });
      setSelectedLines(new Set());
      setSubmitting(false);
      return;
    }

    // Mobile: two-tap logic
    if (firstClickIndex === null) {
      // First tap: highlight and store index, do NOT submit
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
      // No submission yet
    } else {
      // Second tap: submit single line or range
      if (firstClickIndex === index) {
        // Second tap on same line - submit after highlight
        const selectedText = textLines[index];
        const speaker = isShakespearePlay(title) ? detectSpeaker(textLines, index) : null;
        onTextSelection({ text: selectedText, speaker });
        setSelectedLines(new Set());
        setFirstClickIndex(null);
      } else {
        // Tap on different line - submit range after highlight
        const start = Math.min(firstClickIndex, index);
        const end = Math.max(firstClickIndex, index);
        const rangeSelection = new Set();
        for (let i = start; i <= end; i++) {
          rangeSelection.add(i);
        }
        const selectedText = textLines.slice(start, end + 1).join('\n');
        const speaker = isShakespearePlay(title) ? detectSpeaker(textLines, start) : null;
        onTextSelection({ text: selectedText, speaker });
        setSelectedLines(new Set());
        setFirstClickIndex(null);
      }
    }
  }, [isMobile, firstClickIndex, textLines, onTextSelection, isDragging, submitting, title]);

  const handleLineClick = useCallback((index, event) => {
    console.log(`🎯 handleLineClick called for line ${index + 1}, isMobile: ${isMobile}, submitting: ${submitting}`);
    
    if (isMobile) {
      console.log(`📱 Mobile mode - calling handleLineSelection`);
      handleLineSelection(index);
    } else {
      // Desktop: immediate single-click selection
      if (submitting) {
        console.log(`⏳ Already submitting, ignoring click`);
        return;
      }
      
      const selectedText = textLines[index];
      const speaker = isShakespearePlay(title) ? detectSpeaker(textLines, index) : null;
      onTextSelection({ text: selectedText, speaker });
      setSelectedLines(new Set([index]));
      setSubmitting(true);
      
      // Add visual feedback for debugging
      console.log(`📝 Line ${index + 1} clicked and highlighted`);
      
      setTimeout(() => {
        console.log(`⏰ Timeout fired - sending text to chat`);
        setSelectedLines(new Set());
        setSubmitting(false);
      }, 800); // Increased delay to make highlighting more visible
    }
  }, [isMobile, handleLineSelection, textLines, onTextSelection, submitting, title]);

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
      const selectedText = textLines[index];
      const speaker = isShakespearePlay(title) ? detectSpeaker(textLines, index) : null;
      onTextSelection({ text: selectedText, speaker });
      setSelectedLines(new Set([index]));
      setTimeout(() => {
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
      const selectedText = textLines.slice(start, end + 1).join('\n');
      const speaker = isShakespearePlay(title) ? detectSpeaker(textLines, start) : null;
      onTextSelection({ text: selectedText, speaker });
      setSelectedLines(rangeSelection);
      setTimeout(() => {
        setSelectedLines(new Set());
        setFirstClickIndex(null);
      }, 300);
    }
  }, [isMobile, firstClickIndex, textLines, onTextSelection, submitting, title]);

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
    console.log(`🖱️ Mouse up - isDragging: ${isDragging}, selectedLines.size: ${selectedLines.size}, mouseMoved: ${mouseMoved.current}`);
    
    if (isDragging && selectedLines.size > 0) {
      const selectedText = Array.from(selectedLines)
        .sort((a, b) => a - b)
        .map(index => textLines[index])
        .join('\n');
      
      setTimeout(() => {
        onTextSelection({ text: selectedText, speaker: null }); // No speaker for drag selection
        setSelectedLines(new Set());
        setIsDragging(false);
        setDragStartIndex(null);
        setFirstClickIndex(null);
      }, 300);
    } else if (!mouseMoved.current && dragStartIndex !== null) {
      // Simple click - no drag detected
      console.log(`🖱️ Simple click detected on line ${dragStartIndex + 1}`);
      const selectedText = textLines[dragStartIndex];
      const speaker = isShakespearePlay(title) ? detectSpeaker(textLines, dragStartIndex) : null;
      onTextSelection({ text: selectedText, speaker });
      setSelectedLines(new Set([dragStartIndex]));
      setSubmitting(true);
      setTimeout(() => {
        setSelectedLines(new Set());
        setSubmitting(false);
      }, 800);
    }
    setDragStartIndex(null);
    mouseMoved.current = false;
  }, [isDragging, selectedLines, textLines, onTextSelection, dragStartIndex, submitting, title]);

  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (!scrollUpdateWasRequested) {
      const currentIndex = Math.floor(scrollOffset / ROW_HEIGHT);
      if (currentIndex !== currentScrollIndexRef.current) {
        currentScrollIndexRef.current = currentIndex;
        setCurrentScrollIndex(currentIndex);
        
        // Calculate and report progress
        if (textLines.length > 0 && onScrollProgress) {
          const progress = Math.min(1, Math.max(0, currentIndex / (textLines.length - 1)));
          onScrollProgress(progress);
        }
        
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
  }, [saveBookmarkDebounced, saveBookmark, isMobile, ROW_HEIGHT, textLines.length, onScrollProgress]);

  // Row component for react-window - defined after all handlers
  const Row = useCallback(({ index, style }) => {
    const isSelected = selectedLines.has(index);
    const line = textLines[index] || '';

    return (
      <div
        className={`${styles.line} ${isSelected ? styles.selected : ''}`}
        style={{ ...style, width: '100%', height: ROW_HEIGHT }}
        data-index={index}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleLineClick(index, event);
        }}
        onMouseDown={(e) => handleLineMouseDown(index, e)}
        onMouseEnter={() => handleLineMouseEnter(index)}
        onMouseUp={handleMouseUp}
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
  }, [selectedLines, textLines, handleLineClick, handleLineMouseDown, handleLineMouseEnter, handleMouseUp, renderLineContent]);

  // Early return after all hooks
  if (textLines.length === 0) {
    return (
      <div className={`${styles.panel} ${isShakespearePlay(title) ? styles.shakespeare : ''}`} style={{ '--panel-width': `${width}%` }}>
        <div className={styles.loading}>Loading text...</div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.panel} ${isShakespearePlay(title) ? `${styles.screenplayFormat} ${styles.shakespeare}` : ''}`}
      style={{ '--panel-width': `${width}%` }}
      ref={containerRef}
    >

      
      <div className={styles.textContainer}>
        <List
          ref={listRef}
          height={listHeight}
          itemCount={textLines.length}
          itemSize={ROW_HEIGHT}
          width={'100%'}
          onScroll={handleScroll}
          estimatedItemSize={ROW_HEIGHT}
          overscanCount={10}
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