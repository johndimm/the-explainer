import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FixedSizeList as List } from 'react-window';
import styles from '@/styles/TextPanel.module.css';
import dynamic from 'next/dynamic';

// Dynamically import PDFViewerNew to avoid SSR issues
const PDFViewerNew = dynamic(() => import('./PDFViewerNew'), { ssr: false });

// Function to calculate row height based on font size
const getRowHeight = (fontSize) => {
  const baseSize = parseInt(fontSize) || 17;
  // Calculate height with proper spacing for line height 1.5
  // Add extra padding to prevent text cutoff
  return Math.max(36, Math.ceil(baseSize * 1.5) + 20);
};

const TextPanel = forwardRef(({ width, onTextSelection, title = "Source Text", onScrollProgress }, ref) => {
  // All state hooks - must be called in same order every time
  const [textLines, setTextLines] = useState([
    '',
    'Romeo and Juliet',
    'by William Shakespeare',
    '',
    'Loading...'
  ]);
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [firstClickIndex, setFirstClickIndex] = useState(null);
  const [currentScrollIndex, setCurrentScrollIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flyingText, setFlyingText] = useState(null);
  const [listHeight, setListHeight] = useState(400);
  const [fontSettings, setFontSettings] = useState({ fontFamily: 'Georgia', fontSize: '17', fontWeight: '400' });
  const [rowHeight, setRowHeight] = useState(36);
  const [horizontalScrollLeft, setHorizontalScrollLeft] = useState(0);
  const [isPDFMode, setIsPDFMode] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);



  // All refs - must be called in same order every time
  const containerRef = useRef();
  const listRef = useRef();
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);
  const mouseStartPos = useRef({ x: 0, y: 0 });
  const mouseMoved = useRef(false);
  const currentScrollIndexRef = useRef(0);
  const autoDeselectTimerRef = useRef(null);

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
        // Silent bookmark saving
      }
    } catch (error) {
      console.warn('Failed to save bookmark:', error);
      // Fallback: try to save to sessionStorage if localStorage fails
      try {
        const bookmarkKey = getBookmarkKey();
        if (bookmarkKey && scrollIndex > 0) {
          sessionStorage.setItem(bookmarkKey, scrollIndex.toString());
          // Reduced logging to avoid spam
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
      return <span style={{ display: 'block', textAlign: 'center', fontWeight: 700, fontSize: '24px', margin: '8px 0 16px 0', color: '#1e293b', lineHeight: '1.4', padding: '8px 0' }}>{trimmed}</span>;
    }
    if (lineIndex === 2) {
      // Author line
      return <span style={{ display: 'block', textAlign: 'center', fontWeight: 500, fontSize: '18px', margin: '0 0 16px 0', color: '#64748b', lineHeight: '1.4', padding: '6px 0' }}>{trimmed}</span>;
    }
    
    if (!isShakespearePlay(title)) return line;
    
    // Scene/act headings
    if (/^(act|scene)\b/i.test(trimmed)) {
      return <span style={{ display: 'block', textAlign: 'center', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '16px 0 8px 0' }}>{trimmed}</span>;
    }
    // Character names (all caps, centered, can end with period)
    if (/^[A-Z][A-Z\s\-\.']{1,30}$/.test(trimmed) && trimmed.length < 32) {
      return <span className={styles.characterName} style={{ display: 'block', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', margin: '12px 0 0 0', letterSpacing: 1 }}>{trimmed}</span>;
    }
    
    // Character names followed by dialogue (e.g., "CAPULET Go to, go to.")
    const characterMatch = trimmed.match(/^([A-Z][A-Z\s\-\.']{1,30})\s+(.+)$/);
    if (characterMatch && characterMatch[1].length < 32) {
      const characterName = characterMatch[1];
      const dialogue = characterMatch[2];
      return (
        <span>
          <span className={styles.characterName} style={{ display: 'block', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', margin: '12px 0 0 0', letterSpacing: 1 }}>{characterName}</span>
          <span style={{ marginLeft: 32, display: 'block' }}>{dialogue}</span>
        </span>
      );
    }
    // Stage directions (in brackets or parentheses)
    if (/^\s*\[.*\]\s*$/.test(line) || /^\s*\(.*\)\s*$/.test(line)) {
      return <span style={{ fontStyle: 'italic', marginLeft: 48, color: '#64748b' }}>{trimmed}</span>;
    }
    // Dialogue (default)
    return <span style={{ marginLeft: 32, display: 'block' }}>{line}</span>;
  }, [title]);

  // Function to split text into lines with intelligent line breaking
  const splitLongLines = useCallback((text) => {
    const lines = text.split('\n');
    const processedLines = [];
    
    // First pass: Process lines normally
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        processedLines.push('');
        continue;
      }
      
      // For Shakespeare plays, preserve character names (all caps, can end with period)
      if (isShakespearePlay(title) && /^[A-Z][A-Z\s\-\.']{1,30}$/.test(trimmed) && trimmed.length < 32) {
        console.log('TextPanel: Preserving character name:', `"${trimmed}"`);
        processedLines.push(trimmed);
        continue;
      }
      
      // If line is already reasonably short (under 80 chars), keep it as is
      if (trimmed.length <= 80) {
        processedLines.push(trimmed);
        continue;
      }
      
      // For longer lines, break them intelligently
      const words = trimmed.split(/\s+/);
      let currentLine = '';
      for (const word of words) {
        // If adding this word would make the line too long, start a new line
        if (currentLine && (currentLine + ' ' + word).length > 80) {
          processedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      }
      // Add the last line if it has content
      if (currentLine) {
        processedLines.push(currentLine);
      }
    }
    
    // Second pass: Fix broken character names for Shakespeare plays
    if (isShakespearePlay(title)) {
      const fixedLines = [];
      for (let i = 0; i < processedLines.length; i++) {
        const currentLine = processedLines[i];
        const nextLine = processedLines[i + 1];
        
        // Check if current line looks like part of a character name
        if (/^[A-Z][A-Z\s]*$/.test(currentLine) && currentLine.length < 20) {
          // Check if next line is also part of a character name
          if (nextLine && /^[A-Z][A-Z\s]*$/.test(nextLine) && nextLine.length < 20) {
            // Combine them
            const combined = (currentLine + ' ' + nextLine).trim();
            if (combined.length < 32) {
              console.log('TextPanel: Fixed broken character name:', `"${currentLine}" + "${nextLine}" = "${combined}"`);
              fixedLines.push(combined);
              i++; // Skip next line since we combined it
              continue;
            }
          }
        }
        fixedLines.push(currentLine);
      }
      return fixedLines;
    }
    
    return processedLines;
  }, [title]);



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

  // Helper function to load PDF from IndexedDB
  const loadPDFFromIndexedDB = async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ExplainerPDFs', 1);
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['pdfs'], 'readonly');
        const store = transaction.objectStore('pdfs');
        const getRequest = store.get('current-pdf');
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(getRequest.result.data);
          } else {
            reject(new Error('PDF data not found in IndexedDB'));
          }
        };
        
        getRequest.onerror = () => reject(new Error('Failed to retrieve PDF from IndexedDB'));
      };
    });
  };

  // Helper function to load text content
  const loadTextContent = useCallback(() => {
    console.log('TextPanel: Loading text content, clearing PDF mode');
    
    // Set immediate fallback text to prevent loading screen
    const immediateFallback = [
      '',
      'Romeo and Juliet',
      'by William Shakespeare',
      '',
      'Loading...'
    ];
    setTextLines(immediateFallback);
    
    // Clear PDF mode and data
    setIsPDFMode(false);
    setPdfData(null);
    setPdfFileName('');
    
    // Clear any PDF-related storage
    try {
      sessionStorage.removeItem('explainer:pdfData');
      sessionStorage.removeItem('explainer:pdfSource');
    } catch (error) {
      console.warn('TextPanel: Could not clear PDF storage:', error);
    }
    
    // Get current title from localStorage or use prop as fallback
    let currentTitle = 'Romeo and Juliet';
    try {
      currentTitle = localStorage.getItem('explainer:bookTitle') || title || 'Romeo and Juliet';
    } catch (error) {
      console.warn('TextPanel: Could not access localStorage for title:', error);
    }
    
    // Check both sessionStorage and localStorage for text content
    let savedText = null;
    try {
      savedText = sessionStorage.getItem('explainer:bookText');
      if (!savedText) {
        savedText = localStorage.getItem('explainer:bookText');
      }
    } catch (error) {
      console.warn('TextPanel: Could not access storage for saved text:', error);
    }
    
    console.log('TextPanel: Text content check:', {
      sessionStorageText: !!savedText,
      foundText: !!savedText,
      textLength: savedText ? savedText.length : 0,
      currentTitle,
      userAgent: navigator.userAgent
    });
    
    if (savedText) {
      console.log('TextPanel: Processing saved text, length:', savedText.length);
      const lines = splitLongLines(savedText);
      console.log('TextPanel: Split into lines:', lines.length);
      
      // Prepend title and author to the text
      const titleLines = [
        '',
        currentTitle,
        // Only add author line if title doesn't already contain "by"
        currentTitle.includes(' by ') ? '' : `by ${currentTitle.includes(' by ') ? currentTitle.split(' by ').pop() : 'William Shakespeare'}`,
        ''
      ];
      setTextLines([...titleLines, ...lines]);
    } else {
      // Fallback to Romeo and Juliet
      console.log('TextPanel: No saved text found, fetching Romeo and Juliet');
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('TextPanel: Fetch timeout reached, using fallback text');
        controller.abort();
        const fallbackLines = [
          '',
          currentTitle,
          'by William Shakespeare',
          '',
          'The text could not be loaded. Please check your internet connection and try again.',
          '',
          'If the problem persists, try refreshing the page.'
        ];
        setTextLines(fallbackLines);
      }, 15000); // 15 second timeout for mobile
      
      fetch('/public-domain-texts/shakespeare-romeo-and-juliet.txt', {
        signal: controller.signal,
        // Add mobile-specific headers
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(response => {
          clearTimeout(timeoutId);
          console.log('TextPanel: Fetch response status:', response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then(text => {
          console.log('TextPanel: Successfully fetched text, length:', text.length);
          const lines = splitLongLines(text);
          // Prepend title and author to the text
          const titleLines = [
            '',
            currentTitle,
            // Only add author line if title doesn't already contain "by"
            currentTitle.includes(' by ') ? '' : `by ${currentTitle.includes(' by ') ? currentTitle.split(' by ').pop() : 'William Shakespeare'}`,
            ''
          ];
          setTextLines([...titleLines, ...lines]);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.error('TextPanel: Error loading text:', error);
          // Set a fallback text instead of error message
          const fallbackLines = [
            '',
            currentTitle,
            'by William Shakespeare',
            '',
            'The text could not be loaded. Please check your internet connection and try again.',
            '',
            'If the problem persists, try refreshing the page.'
          ];
          setTextLines(fallbackLines);
        });
    }
  }, [title]); // Added title dependency back

  // Search functionality
  const performSearch = useCallback((query) => {
    if (!query.trim() || textLines.length === 0) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results = [];
    const searchTerm = query.toLowerCase();
    
    textLines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchTerm)) {
        results.push({
          lineIndex: index,
          line: line,
          matchIndex: line.toLowerCase().indexOf(searchTerm)
        });
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    // Scroll to first result if found
    if (results.length > 0 && listRef.current) {
      listRef.current.scrollToItem(results[0].lineIndex, 'center');
    }
  }, [textLines]);

  const goToNextResult = useCallback(() => {
    if (searchResults.length === 0) return;
    
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    
    if (listRef.current) {
      listRef.current.scrollToItem(searchResults[nextIndex].lineIndex, 'center');
    }
  }, [searchResults, currentSearchIndex]);

  const goToPreviousResult = useCallback(() => {
    if (searchResults.length === 0) return;
    
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    
    if (listRef.current) {
      listRef.current.scrollToItem(searchResults[prevIndex].lineIndex, 'center');
    }
  }, [searchResults, currentSearchIndex]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setShowSearch(false);
  }, []);

  // Effect 1: Load text or PDF on mount
  useEffect(() => {
    console.log('TextPanel: Starting PDF detection...');
    
    // Detect if we're on mobile
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('TextPanel: Mobile device detected:', isMobileDevice);
    
    // On mobile, immediately load text content to avoid loading screen
    if (isMobileDevice) {
      console.log('TextPanel: Mobile device - immediately loading text content');
      setTimeout(() => {
        loadTextContent();
      }, 100); // Small delay to ensure component is mounted
    }
    
    // Add a timeout to force text loading if nothing happens
    const forceLoadTimeout = setTimeout(() => {
      if (textLines.length <= 5 && !isPDFMode) { // Check for just the fallback text
        console.log('TextPanel: Force loading text due to timeout');
        loadTextContent();
      }
    }, isMobileDevice ? 2000 : 3000); // Shorter timeout for mobile
    
    // Check for PDF data first
    const pdfSource = sessionStorage.getItem('explainer:pdfSource');
    const storedPdfData = sessionStorage.getItem('explainer:pdfData');
    const storedFileName = sessionStorage.getItem('explainer:bookTitle');
    
    console.log('TextPanel: PDF detection results:', {
      pdfSource,
      hasStoredPdfData: !!storedPdfData,
      storedFileName,
      pdfDataLength: storedPdfData ? storedPdfData.length : 0
    });
    
    if (pdfSource === 'sessionstorage' && storedPdfData) {
      // PDF is stored in sessionStorage
      console.log('TextPanel: Loading PDF from sessionStorage');
      setIsPDFMode(true);
      setPdfData(storedPdfData);
      setPdfFileName(storedFileName || 'PDF Document');
      return;
    } else if (pdfSource === 'indexeddb') {
      // PDF is stored in IndexedDB
      console.log('TextPanel: Loading PDF from IndexedDB');
      loadPDFFromIndexedDB().then(pdfDataFromIndexedDB => {
        if (pdfDataFromIndexedDB) {
          console.log('TextPanel: Successfully loaded PDF from IndexedDB');
          setIsPDFMode(true);
          setPdfData(pdfDataFromIndexedDB);
          setPdfFileName(storedFileName || 'PDF Document');
        } else {
          console.log('TextPanel: No PDF data found in IndexedDB, falling back to text');
          // Fall back to text mode
          loadTextContent();
        }
      }).catch(error => {
        console.error('TextPanel: Error loading PDF from IndexedDB:', error);
        // Fall back to text mode
        loadTextContent();
      });
      return;
    }
    
    // No PDF data, load text content
    console.log('TextPanel: No PDF data found, loading text content');
    loadTextContent();
    
    // Cleanup timeout
    return () => clearTimeout(forceLoadTimeout);
  }, [title]); // Removed loadTextContent dependency to prevent cycles

  // Effect 2: Listen for storage changes to handle file uploads
  useEffect(() => {
    const handleStorageChange = (e) => {
      console.log('TextPanel: Storage change detected:', e.key);
      if (e.key === 'explainer:bookText' || e.key === 'explainer:pdfData' || e.key === 'explainer:pdfSource') {
        console.log('TextPanel: Relevant storage change, reloading content');
        // Force a reload of content when storage changes
        setTimeout(() => {
          const pdfSource = sessionStorage.getItem('explainer:pdfSource');
          const storedPdfData = sessionStorage.getItem('explainer:pdfData');
          
          if (pdfSource && storedPdfData) {
            // PDF data was added
            console.log('TextPanel: PDF data detected in storage change');
            setIsPDFMode(true);
            setPdfData(storedPdfData);
            setPdfFileName(sessionStorage.getItem('explainer:bookTitle') || 'PDF Document');
          } else if (sessionStorage.getItem('explainer:bookText') || localStorage.getItem('explainer:bookText')) {
            // Text data was added
            console.log('TextPanel: Text data detected in storage change');
            loadTextContent();
          }
        }, 100); // Small delay to ensure storage is updated
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); // Removed loadTextContent dependency to prevent cycles


  // Effect 3: Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      try {
        // Use the same logic as the main page
        const isMobileDevice = window.innerWidth <= 1024 || 
                              /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Check orientation using both media query and aspect ratio
        const mediaQueryPortrait = window.matchMedia('(orientation: portrait)').matches;
        const aspectRatioPortrait = window.innerHeight > window.innerWidth;
        const isPortraitMode = mediaQueryPortrait || aspectRatioPortrait;
        
        // Mobile detection completed
        setIsMobile(isMobileDevice);
        setIsPortrait(isPortraitMode);
      } catch (error) {
        console.warn('Failed to detect mobile device:', error);
        setIsMobile(false);
        setIsPortrait(false);
      }
    };
    
    checkMobile();
    
    try {
      window.addEventListener('resize', checkMobile);
      window.addEventListener('orientationchange', checkMobile);
    } catch (error) {
      console.warn('Failed to add resize listener:', error);
    }
    
    return () => {
      try {
        window.removeEventListener('resize', checkMobile);
        window.removeEventListener('orientationchange', checkMobile);
      } catch (error) {
        console.warn('Failed to remove resize listener:', error);
      }
    };
  }, []);

  // Effect 4: Setup height and resize listener
  useEffect(() => {
    function updateHeight() {
      if (containerRef.current) {
        // Account for search bar height (approximately 60px)
        const searchBarHeight = 60;
        setListHeight(containerRef.current.offsetHeight - searchBarHeight);
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
      // Account for search bar height (approximately 60px)
      const searchBarHeight = 60;
      setListHeight(containerRef.current.offsetHeight - searchBarHeight);
    }
  }, [textLines]);

  // Effect 7: Perform search when query changes
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Function to get current scroll position from react-window
  const getCurrentScrollPosition = useCallback(() => {
    if (!listRef.current) return 0;
    
    try {
      const scrollElement = listRef.current._outerRef;
      if (scrollElement) {
        const scrollTop = scrollElement.scrollTop;
        const index = Math.floor(scrollTop / rowHeight);
        return Math.max(0, index);
      }
    } catch (error) {
      console.warn('Failed to get scroll position from react-window:', error);
    }
    
    return currentScrollIndexRef.current;
  }, [rowHeight]);

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
              // Bookmark restored
            }
          } catch (error) {
            console.warn('Failed to restore bookmark position:', error);
          }
        }, delay);
      }
    }
  }, [textLines, loadBookmark, isMobile]);

  // Effect 7: Load font settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadFontSettings = () => {
        try {
          const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
          const newFontSettings = {
            fontFamily: profile.fontFamily || 'Georgia',
            fontSize: profile.fontSize || '17',
            fontWeight: profile.fontWeight || '400'
          };
          setFontSettings(newFontSettings);
          setRowHeight(getRowHeight(newFontSettings.fontSize));
        } catch (error) {
          console.warn('Failed to load font settings:', error);
        }
      };

      // Load initial settings
      loadFontSettings();

      // Listen for storage changes
      const handleStorageChange = (e) => {
        if (e.key === 'explainer:profile') {
          loadFontSettings();
        }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Effect 8: Save bookmark on unmount
  useEffect(() => {
    return () => {
      try {
        const currentPosition = getCurrentScrollPosition();
        if (currentPosition > 0) {
          saveBookmark(currentPosition);
          // Final bookmark save on unmount
        }
      } catch (error) {
        console.warn('Failed to save bookmark on unmount:', error);
      }
    };
  }, [saveBookmark, getCurrentScrollPosition]);

  // Effect 8.5: Cleanup auto-deselect timer on unmount and text changes
  useEffect(() => {
    return () => {
      if (autoDeselectTimerRef.current) {
        clearTimeout(autoDeselectTimerRef.current);
        autoDeselectTimerRef.current = null;
      }
    };
  }, [textLines]); // Clear timer when text changes

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
          // Drag detected
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
          // Reduced logging to avoid spam
        }
      } catch (error) {
        console.warn('Failed to save periodic bookmark:', error);
      }
    }, 10000); // Increased to 10 seconds to reduce frequency
    
    return () => clearInterval(interval);
  }, [isMobile, saveBookmark, getCurrentScrollPosition]);

  // Effect: Handle horizontal scroll position tracking and restoration
  useEffect(() => {
    const scrollContainer = listRef.current?._outerRef;
    if (!scrollContainer) return;
    
    // Set up scroll listener to track horizontal scroll changes
    const handleScrollChange = () => {
      const scrollLeft = scrollContainer.scrollLeft;
      if (scrollLeft !== horizontalScrollLeft) {
        setHorizontalScrollLeft(scrollLeft);
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScrollChange, { passive: true });
    
    // Restore horizontal scroll position if width changed and we have a saved position
    if (horizontalScrollLeft > 0) {
      const timeoutId = setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollLeft = horizontalScrollLeft;
        }
      }, 50);
      
      return () => {
        clearTimeout(timeoutId);
        scrollContainer.removeEventListener('scroll', handleScrollChange);
      };
    }
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScrollChange);
    };
  }, [width, horizontalScrollLeft]);



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
      
      // Clear any existing timer
      if (autoDeselectTimerRef.current) {
        clearTimeout(autoDeselectTimerRef.current);
      }
      
      // Set auto-deselect timer for 3 seconds
      autoDeselectTimerRef.current = setTimeout(() => {
        setSelectedLines(new Set());
        setFirstClickIndex(null);
        autoDeselectTimerRef.current = null;
      }, 3000);
      
      // No submission yet
    } else {
      // Second tap: submit single line or range
      // Clear the auto-deselect timer since user made second tap
      if (autoDeselectTimerRef.current) {
        clearTimeout(autoDeselectTimerRef.current);
        autoDeselectTimerRef.current = null;
      }
      
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
          // handleLineClick called
    
    if (isMobile) {
      // Mobile mode - calling handleLineSelection
      handleLineSelection(index);
    } else {
      // Desktop: immediate single-click selection
      if (submitting) {
        return;
      }
      
      const selectedText = textLines[index];
      const speaker = isShakespearePlay(title) ? detectSpeaker(textLines, index) : null;
      onTextSelection({ text: selectedText, speaker });
      setSelectedLines(new Set([index]));
      setSubmitting(true);
      
      setTimeout(() => {
        setSelectedLines(new Set());
        setSubmitting(false);
      }, 800);
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
    if (!isMobile || submitting) {
      return;
    }
    if (touchMoved.current) {
      return; // User was scrolling, not tapping
    }
    const index = parseInt(event.currentTarget.dataset.index);
    
    if (firstClickIndex === null) {
      // First tap - select this line
      setFirstClickIndex(index);
      setSelectedLines(new Set([index]));
      
      // Clear any existing timer
      if (autoDeselectTimerRef.current) {
        clearTimeout(autoDeselectTimerRef.current);
      }
      
      // Set auto-deselect timer for 3 seconds
      autoDeselectTimerRef.current = setTimeout(() => {
        setSelectedLines(new Set());
        setFirstClickIndex(null);
        autoDeselectTimerRef.current = null;
      }, 3000);
    } else if (firstClickIndex === index) {
      // Second tap on same line - submit after highlight
      // Clear the auto-deselect timer since user made second tap
      if (autoDeselectTimerRef.current) {
        clearTimeout(autoDeselectTimerRef.current);
        autoDeselectTimerRef.current = null;
      }
      
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
      // Clear the auto-deselect timer since user made second tap
      if (autoDeselectTimerRef.current) {
        clearTimeout(autoDeselectTimerRef.current);
        autoDeselectTimerRef.current = null;
      }
      
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
  }, [isDragging, selectedLines, textLines, onTextSelection, dragStartIndex, submitting, title, isMobile]);

  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    // Track horizontal scroll position
    if (listRef.current && listRef.current._outerRef) {
      const scrollLeft = listRef.current._outerRef.scrollLeft;
      if (scrollLeft !== horizontalScrollLeft) {
        setHorizontalScrollLeft(scrollLeft);
      }
    }
    
    if (!scrollUpdateWasRequested) {
      const currentIndex = Math.floor(scrollOffset / rowHeight);
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
        } else {
          saveBookmarkDebounced(currentIndex);
        }
      }
    }
  }, [saveBookmarkDebounced, saveBookmark, isMobile, rowHeight, textLines.length, onScrollProgress, horizontalScrollLeft]);

  // Row component for react-window - defined after all handlers
  const Row = useCallback(({ index, style }) => {
    const isSelected = selectedLines.has(index);
    const line = textLines[index] || '';
    
    // Check if this line is a search result
    const searchResult = searchResults.find(result => result.lineIndex === index);
    const isCurrentSearchResult = searchResult && searchResults[currentSearchIndex]?.lineIndex === index;

    return (
      <div
        className={`${styles.line} ${isSelected ? styles.selected : ''} ${searchResult ? styles.searchResult : ''} ${isCurrentSearchResult ? styles.currentSearchResult : ''}`}
        style={{ 
          ...style, 
          width: '100%', 
          height: rowHeight,
          display: 'flex',
          alignItems: 'flex-start',
          boxSizing: 'border-box'
        }}
        data-index={index}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!isMobile) {
            handleLineClick(index, event);
          }
        }}
        onTouchStart={(e) => handleLineTouchStart(e)}
        onTouchMove={(e) => handleLineTouchMove(e)}
        onTouchEnd={(e) => handleLineTouchEnd(e)}
        onMouseDown={(e) => !isMobile && handleLineMouseDown(index, e)}
        onMouseEnter={() => !isMobile && handleLineMouseEnter(index)}
        onMouseUp={(e) => !isMobile && handleMouseUp(e)}
      >
        <span className={styles.lineNumber}>{index + 1}</span>
        <span 
          className={styles.lineContent} 
          title={line.length > 100 ? line : undefined}
          style={{
            fontFamily: fontSettings.fontFamily,
            fontSize: fontSettings.fontSize + 'px',
            fontWeight: fontSettings.fontWeight,
            lineHeight: '1.5',
            padding: '2px 0',
            display: 'block',
            width: '100%'
          }}
        >
          {searchResult && searchQuery ? (
            <span>
              {line.substring(0, searchResult.matchIndex)}
              <span className={styles.searchHighlight}>
                {line.substring(searchResult.matchIndex, searchResult.matchIndex + searchQuery.length)}
              </span>
              {line.substring(searchResult.matchIndex + searchQuery.length)}
            </span>
          ) : (
            renderLineContent(line, index)
          )}
        </span>
      </div>
    );
  }, [selectedLines, textLines, searchResults, currentSearchIndex, searchQuery, handleLineClick, handleLineTouchStart, handleLineTouchMove, handleLineTouchEnd, handleLineMouseDown, handleLineMouseEnter, handleMouseUp, renderLineContent, isMobile, rowHeight, fontSettings]);

  // Handler for PDF text selection
  const handlePDFTextSelection = useCallback((selectedText, metadata) => {
    if (selectedText && selectedText.trim().length > 0) {
      // Clean the text as a backup (in case it wasn't cleaned in PDFViewer)
      const cleanedText = cleanPDFText(selectedText.trim());
          // PDF text selection processed
      
      if (cleanedText.length > 0 && onTextSelection) {
        onTextSelection({
          text: cleanedText,
          speaker: null,
          source: 'pdf',
          metadata
        });
      }
    }
  }, [onTextSelection]);

  // Clean extracted text from PDF (backup function)
  const cleanPDFText = useCallback((text) => {
    if (!text) return '';
    
    return text
      // Remove common PDF artifacts and special characters
      .replace(/[^\w\s.,!?;:()\-'"]/g, ' ') // Remove special characters except basic punctuation
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      // Remove common PDF positioning artifacts
      .replace(/\d+\.\d+/g, '') // Remove decimal numbers (often positioning data)
      .replace(/[A-Z]{2,}\d+/g, '') // Remove uppercase words followed by numbers
      .replace(/[a-z]{1,2}\d+/g, '') // Remove short lowercase words followed by numbers
      // Remove specific garbled patterns
      .replace(/['"]{2,}/g, '') // Remove multiple quotes
      .replace(/\.{3,}/g, '') // Remove multiple dots
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/[~`]/g, '') // Remove tildes and backticks
      .replace(/[|\\]/g, '') // Remove pipes and backslashes
      .replace(/[{}[\]]/g, '') // Remove brackets
      .replace(/[=+]/g, '') // Remove equals and plus signs
      .replace(/[&^%$#@!]/g, '') // Remove other special characters
      // Remove specific garbled patterns from the image
      .replace(/[a-z]+\d+[a-z]*/g, '') // Remove mixed letter-number sequences
      .replace(/\d+[a-z]+\d*/g, '') // Remove number-letter sequences
      // Removed overly aggressive mixed case pattern removal that deletes valid words like "Her"
      // Clean up remaining artifacts
      .replace(/\s+/g, ' ') // Final space cleanup
      .trim();
  }, []);

  // Handler for PDF load completion
  const handlePDFLoadComplete = useCallback((info) => {
    // PDF loaded successfully
  }, []);

  // Early return after all hooks
  if (textLines.length === 0 && !isPDFMode) {
    // Loading state
    console.log('TextPanel: Showing loading screen - textLines.length:', textLines.length, 'isPDFMode:', isPDFMode);
    
    // On mobile, always show some content instead of loading screen
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobileDevice) {
      console.log('TextPanel: Mobile device detected, showing fallback content instead of loading screen');
      return (
        <div className={`${styles.panel} ${isShakespearePlay(title) ? styles.shakespeare : ''}`} style={{ '--panel-width': `${width}%` }}>
          <div className={styles.textContainer}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h3>Romeo and Juliet</h3>
              <p>by William Shakespeare</p>
              <p>Loading text...</p>
              <p>If this doesn't load, please refresh the page.</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className={`${styles.panel} ${isShakespearePlay(title) ? styles.shakespeare : ''}`} style={{ '--panel-width': `${width}%` }}>
        <div className={styles.loading}>Loading content...</div>
      </div>
    );
  }

  // Render PDF viewer if in PDF mode
  if (isPDFMode && pdfData) {
    return (
      <div 
        className={styles.panel}
        style={{ '--panel-width': `${width}%` }}
        ref={containerRef}
      >
        <PDFViewerNew
          key={`pdf-${pdfFileName}-${pdfData ? pdfData.substring(0, 50) : 'null'}`}
          pdfData={pdfData}
          fileName={pdfFileName}
          onTextSelection={handlePDFTextSelection}
          onLoadComplete={handlePDFLoadComplete}
          width="100%"
          height="100%"
        />
      </div>
    );
  }

  // Render text content
  return (
    <div 
      key={`text-${title}-${textLines.length}`}
      className={`${styles.panel} ${isShakespearePlay(title) ? `${styles.screenplayFormat} ${styles.shakespeare}` : ''}`}
      style={{ '--panel-width': `${width}%` }}
      ref={containerRef}
    >
      {/* Search Interface */}
      <div className={styles.searchContainer}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.shiftKey ? goToPreviousResult() : goToNextResult();
              } else if (e.key === 'Escape') {
                clearSearch();
              }
            }}
          />
          {searchQuery && (
            <div className={styles.searchControls}>
              <span className={styles.searchResults}>
                {searchResults.length > 0 ? `${currentSearchIndex + 1} of ${searchResults.length}` : 'No results'}
              </span>
              <button 
                onClick={goToPreviousResult}
                disabled={searchResults.length === 0}
                className={styles.searchButton}
                title="Previous result (Shift+Enter)"
              >
                ↑
              </button>
              <button 
                onClick={goToNextResult}
                disabled={searchResults.length === 0}
                className={styles.searchButton}
                title="Next result (Enter)"
              >
                ↓
              </button>
              <button 
                onClick={clearSearch}
                className={styles.searchButton}
                title="Clear search (Esc)"
              >
                ×
              </button>
            </div>
          )}
        </div>

      </div>
      <div className={styles.textContainer}>
        <List
          ref={listRef}
          height={listHeight}
          itemCount={textLines.length}
          itemSize={rowHeight}
          width={'100%'}
          onScroll={handleScroll}
          estimatedItemSize={rowHeight}
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