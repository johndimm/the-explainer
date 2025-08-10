import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/router';
import { BookOpen, Settings, MessageSquare } from 'lucide-react';
import styles from '@/styles/TextPanel.module.css';
import dynamic from 'next/dynamic';
import ChatPanel from './ChatPanel';

// Dynamically import PDFViewerNew to avoid SSR issues
const PDFViewerNew = dynamic(() => import('./PDFViewerNew'), { ssr: false });

// Function to calculate row height based on font size
const getRowHeight = (fontSize) => {
  const baseSize = parseInt(fontSize) || 17;
  // Calculate height with proper spacing for line height 1.5
  // Add extra padding to prevent text cutoff and accommodate wrapped text
  return Math.max(48, Math.ceil(baseSize * 1.8) + 20);
};

const TextPanel = forwardRef(({ width, onTextSelection, title = "Source Text", onScrollProgress, messages = [], isLoading: chatIsLoading = false, onFollowUpQuestion, scrollToText, scrollProgress }, ref) => {
  // All state hooks - must be called in same order every time
  const [textLines, setTextLines] = useState([]);
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
  const [lineHeights, setLineHeights] = useState([]);
  const [horizontalScrollLeft, setHorizontalScrollLeft] = useState(0);
  const [isPDFMode, setIsPDFMode] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(true);
  const [isTextReady, setIsTextReady] = useState(false);
  const [layoutMode, setLayoutMode] = useState('auto'); // 'auto', 'two-panel', 'single-panel'
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentSelectedText, setCurrentSelectedText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSinglePanelMode, setIsSinglePanelMode] = useState(false);

  // Router for navigation
  const router = useRouter();

  // All refs - must be called in same order every time
  const containerRef = useRef();
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchMoved = useRef(false);
  const mouseStartPos = useRef({ x: 0, y: 0 });
  const mouseMoved = useRef(false);
  const currentScrollIndexRef = useRef(0);
  const autoDeselectTimerRef = useRef(null);
  const textContentRef = useRef(null);



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

  // Load layout mode and interaction state from localStorage on mount
  useEffect(() => {
    // Load layout mode from profile settings
    const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
    if (profile.layoutMode && ['auto', 'two-panel', 'single-panel'].includes(profile.layoutMode)) {
      setLayoutMode(profile.layoutMode);
    }
    
    const savedHasInteracted = localStorage.getItem('explainer:hasInteracted');
    if (savedHasInteracted === 'true') {
      setHasInteracted(true);
    }
    
    // Listen for custom layout change events from profile page
    const handleLayoutModeChange = (e) => {
      // console.log('TextPanel: Custom layout mode change event:', e.detail.layoutMode); // Removed
      if (e.detail.layoutMode === 'single-panel') {
        setIsSinglePanelMode(true);
      } else {
        setIsSinglePanelMode(false);
      }
    };
    
    window.addEventListener('layoutModeChanged', handleLayoutModeChange);
    
    return () => {
      window.removeEventListener('layoutModeChanged', handleLayoutModeChange);
    };
  }, []);

  // Save layout mode and interaction state to localStorage when they change
  useEffect(() => {
    // Save layout mode to profile settings
    const profile = JSON.parse(localStorage.getItem('explainer:profile') || '{}');
    profile.layoutMode = layoutMode;
    localStorage.setItem('explainer:profile', JSON.stringify(profile));
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem('explainer:hasInteracted', hasInteracted.toString());
  }, [hasInteracted]);

  // Determine effective layout mode based on user preference and device
  const effectiveLayoutMode = useCallback(() => {
    if (layoutMode === 'auto') {
      return isMobile ? 'single-panel' : 'two-panel';
    }
    return layoutMode;
  }, [layoutMode, isMobile]);

  // Hide chat panel when switching to two-panel mode
  useEffect(() => {
    if (effectiveLayoutMode() === 'two-panel') {
      setShowChatPanel(false);
      setCurrentSelectedText('');
    }
  }, [effectiveLayoutMode]);

  // Bookmark management functions
  const getBookmarkKey = useCallback(() => {
    if (!isStorageAvailable()) {
      console.warn('localStorage is not available');
      return null;
    }
    try {
      const savedTitle = localStorage.getItem('explainer:bookTitle');
      const bookmarkKey = savedTitle ? `explainer:bookmark:${savedTitle}` : null;
      return bookmarkKey;
    } catch (error) {
      console.warn('Failed to get bookmark key:', error);
      return null;
    }
  }, [isStorageAvailable]);



  // Database progress management functions
  const saveBookProgress = useCallback(async (scrollIndex) => {
    try {
      const savedTitle = localStorage.getItem('explainer:bookTitle');
      if (!savedTitle || scrollIndex <= 0) return;

      const response = await fetch('/api/book-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book_title: savedTitle,
          current_line: scrollIndex,
          total_lines: textLines.length
        }),
      });

      if (!response.ok) {
        console.warn('Failed to save book progress to database');
      }
    } catch (error) {
      console.warn('Failed to save book progress:', error);
    }
  }, [textLines.length]);

  // Save bookmark to localStorage
  const saveBookmark = useCallback(async (scrollIndex) => {
    if (!title || !scrollIndex || scrollIndex < 0) return;
    
    const bookmarkKey = `explainer:bookmark:${title}`;
    const bookmarkData = {
      key: bookmarkKey,
      scrollIndex,
      textLinesLength: textLines.length,
      timestamp: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(bookmarkKey, JSON.stringify(bookmarkData));
      
      // Also save to sessionStorage as fallback
      sessionStorage.setItem(bookmarkKey, scrollIndex.toString());
      
      // Save to database via API
      try {
        await saveBookProgress(scrollIndex);
      } catch (error) {
        console.warn('Failed to save bookmark to database:', error);
      }
    } catch (error) {
      // Fallback to sessionStorage only
      sessionStorage.setItem(bookmarkKey, scrollIndex.toString());
    }
  }, [title, textLines.length]);

  // Separate function to save to database - only called when needed
  const saveBookmarkToDatabase = useCallback(async (scrollIndex) => {
    if (!scrollIndex || scrollIndex <= 0) return;
    
    try {
      await saveBookProgress(scrollIndex);
    } catch (error) {
      console.warn('Failed to save bookmark to database:', error);
    }
  }, [saveBookProgress]);

  const loadBookProgress = useCallback(async () => {
    try {
      const savedTitle = localStorage.getItem('explainer:bookTitle');
      if (!savedTitle) {
        return null;
      }

      const response = await fetch(`/api/book-progress?book_title=${encodeURIComponent(savedTitle)}`);
      
      if (response.ok) {
        const progress = await response.json();
        return progress.current_line;
      } else if (response.status === 404) {
        // No progress found, fall back to localStorage
        // Inline localStorage fallback to avoid circular dependency
        try {
          const bookmarkKey = `explainer:bookmark:${savedTitle}`;
          const savedIndex = localStorage.getItem(bookmarkKey) || sessionStorage.getItem(bookmarkKey);
          if (savedIndex) {
            const index = parseInt(savedIndex, 10);
            if (!isNaN(index) && index >= 0) {
              return index;
            }
          }
        } catch (fallbackError) {
          console.warn('Failed to load localStorage fallback:', fallbackError);
        }
        return null;
      }
    } catch (error) {
      console.warn('Failed to load book progress from database, falling back to localStorage:', error);
      // Inline localStorage fallback to avoid circular dependency
      try {
        const savedTitle = localStorage.getItem('explainer:bookTitle');
        if (savedTitle) {
          const bookmarkKey = `explainer:bookmark:${savedTitle}`;
          const savedIndex = localStorage.getItem(bookmarkKey) || sessionStorage.getItem(bookmarkKey);
          if (savedIndex) {
            const index = parseInt(savedIndex, 10);
            if (!isNaN(index) && index >= 0) {
              return index;
            }
          }
        }
      } catch (fallbackError) {
        console.warn('Failed to load localStorage fallback after error:', fallbackError);
      }
      return null;
    }
    return null;
  }, []); // No dependencies needed

  // Unified bookmark loading and validation function
  const loadAndValidateBookmark = useCallback(async (newTextLines, source = 'unknown') => {
    // Inline the bookmark loading logic to avoid circular dependencies
    let bookmarkIndex = null;
    
    try {
      const savedTitle = localStorage.getItem('explainer:bookTitle');
      console.log(`TextPanel: 🔍 Loading bookmark for title: "${savedTitle}" (${source})`);
      
      if (savedTitle) {
        // Try database first
        try {
          const response = await fetch(`/api/book-progress?book_title=${encodeURIComponent(savedTitle)}`);
          if (response.ok) {
            const progress = await response.json();
            const dbBookmark = progress.current_line;
            
            // Check if database bookmark is valid for current text length
            if (dbBookmark !== null && dbBookmark !== undefined && dbBookmark >= 0 && dbBookmark < newTextLines.length) {
              bookmarkIndex = dbBookmark;
            } else if (dbBookmark !== null && dbBookmark !== undefined && dbBookmark >= newTextLines.length) {
              console.warn(`TextPanel: ❌ Database bookmark out of bounds: ${dbBookmark} >= ${newTextLines.length} (${source}) - will use localStorage fallback`);
              // Don't set bookmarkIndex - let it fall through to localStorage
            }
          }
        } catch (dbError) {
          console.warn('Database fetch failed, using localStorage fallback:', dbError);
        }
        
        // Fallback to localStorage if database failed or returned no data
        if (bookmarkIndex === null || bookmarkIndex === undefined) {
          // Use the same function that saveBookmark uses to ensure consistency
          const bookmarkKey = getBookmarkKey();
          
          if (bookmarkKey) {
            const savedIndex = localStorage.getItem(bookmarkKey) || sessionStorage.getItem(bookmarkKey);
            
            if (savedIndex) {
              const index = parseInt(savedIndex, 10);
              if (!isNaN(index) && index >= 0) {
                bookmarkIndex = index;
              } else {
                console.warn(`TextPanel: ❌ Invalid bookmark value: "${savedIndex}" -> ${index} (${source})`);
              }
            }
          }
        }
      } else {
        console.log(`TextPanel: ❌ No saved title found in localStorage (${source})`);
      }
    } catch (error) {
      console.warn('Failed to load bookmark:', error);
    }
    
    if (bookmarkIndex !== null && bookmarkIndex !== undefined && bookmarkIndex >= 0 && bookmarkIndex < newTextLines.length) {
      setCurrentScrollIndex(bookmarkIndex);
      currentScrollIndexRef.current = bookmarkIndex;
    } else if (bookmarkIndex !== null && bookmarkIndex !== undefined && bookmarkIndex >= newTextLines.length) {
      console.warn(`TextPanel: ❌ Bookmark out of bounds: ${bookmarkIndex} >= ${newTextLines.length} (${source}) - resetting to beginning`);
      setCurrentScrollIndex(0);
      currentScrollIndexRef.current = 0;
      // Clear the invalid bookmark from storage to prevent future issues
      try {
        const bookmarkKey = getBookmarkKey();
        if (bookmarkKey) {
          localStorage.removeItem(bookmarkKey);
          sessionStorage.removeItem(bookmarkKey);
        }
      } catch (clearError) {
        console.warn('Failed to clear invalid bookmark:', clearError);
      }
    } else {
      setCurrentScrollIndex(0);
      currentScrollIndexRef.current = 0;
    }
  }, [textLines.length, getBookmarkKey]);



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
    
    // Extract the main title part (before "by" if present)
    const mainTitle = title.split(' by ')[0].trim();
    const isPlay = SHAKESPEARE_PLAYS.some(play => mainTitle.toLowerCase().includes(play.toLowerCase()));
    console.log('TextPanel: isShakespearePlay check:', { title, mainTitle, isPlay });
    return isPlay;
  }

  // Helper: Detect speaker for plays/scripts
  function detectSpeaker(textLines, startIndex) {
    // First, check if the current line or very recent lines have a character name followed by dialogue
    for (let i = startIndex; i >= Math.max(0, startIndex - 3); i--) {
      const line = textLines[i].trim();
      
      // Match character names followed by dialogue (e.g., "OCTAVIUS Caesar, I will.")
      const characterMatch = line.match(/^([A-Z][A-Z\s\-\.']{1,30})\s+(.+)$/);
      if (characterMatch && characterMatch[1].length < 32) {
        console.log('TextPanel: found speaker:', characterMatch[1].trim());
        return characterMatch[1].trim();
      }
    }
    
    // If no character with dialogue found, look for standalone character names
    for (let i = startIndex; i >= 0; i--) {
      const line = textLines[i].trim();
      // Match lines like FRIAR LAWRENCE. or JULIET:
      if (/^[A-Z][A-Z\s\-\.']{2,30}[\.:]$/.test(line) && line.length < 40) {
        const speaker = line.replace(/[\.:]$/, '').trim();
        console.log('TextPanel: found speaker:', speaker);
        return speaker;
      }
    }
    console.log('TextPanel: no speaker found');
    return null;
  }

  function detectActScene(textLines, startIndex) {
    let act = null;
    let scene = null;
    
    // Look backwards from the current line to find act/scene
    for (let i = startIndex; i >= 0; i--) {
      const line = textLines[i].trim();
      
      // Match ACT patterns like "ACT I", "ACT II", "ACT 1", "ACT 2"
      if (/^ACT\s+(I{1,3}|IV|V|VI|VII|VIII|IX|X|\d+)/i.test(line)) {
        act = line.toUpperCase();
        break;
      }
      
      // Match SCENE patterns like "SCENE I", "SCENE II", "SCENE 1", "SCENE 2"
      if (/^SCENE\s+(I{1,3}|IV|V|VI|VII|VIII|IX|X|\d+)/i.test(line)) {
        scene = line.toUpperCase();
        break;
      }
    }
    
    return { act, scene };
  }

  function detectCharactersOnStage(textLines, startIndex, speaker) {
    const characters = new Set();
    const exitedCharacters = new Set();
    
    // Look backwards from the current line to find recent character entries and exits
    for (let i = startIndex; i >= Math.max(0, startIndex - 50); i--) {
      const line = textLines[i].trim();
      
      // Skip scene headers and act headers
      if (/^(ACT|SCENE)\s+/i.test(line)) {
        break;
      }
      
      // Check for character exits in stage directions (e.g., "[_Exit Lepidus._]", "Exit Lepidus", "Lepidus exits", "Exit")
      const stageExitMatch = line.match(/\[.*?(?:Exit|Exeunt)\s+([A-Z][A-Z\s\-\.']{1,30}).*?\]/i);
      if (stageExitMatch) {
        const exitedCharacter = stageExitMatch[1].trim().replace(/\.$/, ''); // Remove trailing period
        console.log('TextPanel: Character exited (stage direction):', exitedCharacter, 'from line:', line);
        exitedCharacters.add(exitedCharacter);
        continue; // Skip adding this character to the on-stage list
      }
      
      // Also check for the specific format [_Exit Lepidus._]
      const specificExitMatch = line.match(/\[_Exit\s+([A-Z][A-Z\s\-\.']{1,30})\._\]/i);
      if (specificExitMatch) {
        const exitedCharacter = specificExitMatch[1].trim();
        console.log('TextPanel: Character exited (specific format):', exitedCharacter, 'from line:', line);
        exitedCharacters.add(exitedCharacter);
        continue; // Skip adding this character to the on-stage list
      }
      
      // Check for character exits (e.g., "Exit Lepidus", "Lepidus exits", "Exit")
      const exitMatch = line.match(/^(Exit|Exeunt)\s+([A-Z][A-Z\s\-\.']{1,30})/i);
      if (exitMatch) {
        const exitedCharacter = exitMatch[2].trim();
        console.log('TextPanel: Character exited:', exitedCharacter);
        exitedCharacters.add(exitedCharacter);
        continue; // Skip adding this character to the on-stage list
      }
      
      // Also check for "Character exits" pattern
      const exitsMatch = line.match(/^([A-Z][A-Z\s\-\.']{1,30})\s+exits?/i);
      if (exitsMatch) {
        const exitedCharacter = exitsMatch[1].trim();
        console.log('TextPanel: Character exited:', exitedCharacter);
        exitedCharacters.add(exitedCharacter);
        continue; // Skip adding this character to the on-stage list
      }
      
      // Match character names (all caps, can end with period) - but not scene headers
      if (/^[A-Z][A-Z\s\-\.']{1,30}[\.:]?$/.test(line) && line.length < 40 && !line.includes('SCENE') && !line.includes('ACT')) {
        const character = line.replace(/[\.:]$/, '').trim();
        if (character && character !== speaker && character !== 'SCENE' && character !== 'ACT' && 
            !Array.from(exitedCharacters).some(exited => exited.toUpperCase() === character.toUpperCase())) {
          characters.add(character);
        }
      }
      
      // Match character names followed by dialogue
      const characterMatch = line.match(/^([A-Z][A-Z\s\-\.']{1,30})\s+(.+)$/);
      if (characterMatch && characterMatch[1].length < 32) {
        const character = characterMatch[1].trim();
        if (character && character !== speaker && character !== 'SCENE' && character !== 'ACT' && 
            !Array.from(exitedCharacters).some(exited => exited.toUpperCase() === character.toUpperCase())) {
          characters.add(character);
        }
      }
    }
    
    const result = Array.from(characters).slice(0, 5); // Limit to 5 most recent characters
    console.log('TextPanel: Characters on stage:', result, 'Exited characters:', Array.from(exitedCharacters));
    return result;
  }

  // Function to render line content
  const renderLineContent = useCallback((line, lineIndex) => {
    const trimmed = line.trim();
    
    // Title and author styling (first few lines)
    if (lineIndex === 1) {
      // Main title
      return <span style={{ 
        display: 'block', 
        textAlign: 'center', 
        fontWeight: 700, 
        fontSize: '24px', 
        margin: '8px 0 16px 0', 
        color: '#1e293b', 
        lineHeight: '1.4', 
        padding: '8px 0',
        fontFamily: fontSettings.fontFamily
      }}>{trimmed}</span>;
    }
    if (lineIndex === 2) {
      // Author line
      return <span style={{ 
        display: 'block', 
        textAlign: 'center', 
        fontWeight: 500, 
        fontSize: '18px', 
        margin: '0 0 16px 0', 
        color: '#64748b', 
        lineHeight: '1.4', 
        padding: '6px 0',
        fontFamily: fontSettings.fontFamily
      }}>{trimmed}</span>;
    }
    
    if (!isShakespearePlay(title)) {
      // For non-Shakespeare text, apply font settings
      return <span style={{
        fontFamily: fontSettings.fontFamily,
        fontSize: `${fontSettings.fontSize}px`,
        fontWeight: fontSettings.fontWeight,
        lineHeight: '1.5'
      }}>{line}</span>;
    }
    
    // Scene/act headings
    if (/^(act|scene)\b/i.test(trimmed)) {
      return <span style={{ 
        display: 'block', 
        textAlign: 'center', 
        fontWeight: 700, 
        letterSpacing: 2, 
        textTransform: 'uppercase', 
        margin: '16px 0 8px 0',
        fontFamily: fontSettings.fontFamily,
        fontSize: `${fontSettings.fontSize}px`
      }}>{trimmed}</span>;
    }
    // Character names (all caps, centered, can end with period)
    if (/^[A-Z][A-Z\s\-\.']{1,30}$/.test(trimmed) && trimmed.length < 32) {
      return <span className={styles.characterName} style={{ 
        display: 'block', 
        textAlign: 'center', 
        fontWeight: 700, 
        textTransform: 'uppercase', 
        margin: '12px 0 0 0', 
        letterSpacing: 1,
        fontFamily: fontSettings.fontFamily,
        fontSize: `${fontSettings.fontSize}px`
      }}>{trimmed}</span>;
    }
    
    // Character names followed by dialogue (e.g., "CAPULET Go to, go to.")
    const characterMatch = trimmed.match(/^([A-Z][A-Z\s\-\.']{1,30})\s+(.+)$/);
    if (characterMatch && characterMatch[1].length < 32) {
      const characterName = characterMatch[1];
      const dialogue = characterMatch[2];
      return (
        <span>
          <span className={styles.characterName} style={{ 
            display: 'block', 
            textAlign: 'center', 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            margin: '12px 0 0 0', 
            letterSpacing: 1,
            fontFamily: fontSettings.fontFamily,
            fontSize: `${fontSettings.fontSize}px`
          }}>{characterName}</span>
          <span className={styles.dialogue} style={{
            fontFamily: fontSettings.fontFamily,
            fontSize: `${fontSettings.fontSize}px`,
            fontWeight: fontSettings.fontWeight
          }}>{dialogue}</span>
        </span>
      );
    }
    // Stage directions (in brackets or parentheses)
    if (/^\s*\[.*\]\s*$/.test(line) || /^\s*\(.*\)\s*$/.test(line)) {
      return <span style={{ 
        fontStyle: 'italic', 
        marginLeft: 48, 
        color: '#64748b',
        fontFamily: fontSettings.fontFamily,
        fontSize: `${fontSettings.fontSize}px`,
        fontWeight: fontSettings.fontWeight
      }}>{trimmed}</span>;
    }
    // Dialogue (default)
    return <span className={styles.dialogue} style={{
      fontFamily: fontSettings.fontFamily,
      fontSize: `${fontSettings.fontSize}px`,
      fontWeight: fontSettings.fontWeight
    }}>{line}</span>;
  }, [title, fontSettings]);

  // Function to get height for a line
  const getLineHeight = useCallback((text, index) => {
    if (!text || text.trim() === '') {
      return rowHeight; // Empty lines use default height
    }
    
    // For character names in Shakespeare plays, use slightly larger height
    if (isShakespearePlay(title) && /^[A-Z][A-Z\s\-\.']{1,30}$/.test(text.trim()) && text.trim().length < 32) {
      return rowHeight + 8; // Extra space for character names
    }
    
    // For act/scene headers, use larger height
    if (text.trim().match(/^(ACT|SCENE)\s+[IVX]+\.?$/i)) {
      return rowHeight + 16; // Extra space for headers
    }
    
    // For regular lines, use fixed height since we break lines aggressively
    return rowHeight + 4;
  }, [rowHeight, title]);

  // Function to calculate heights for all lines
  const calculateAllLineHeights = useCallback((lines) => {
    return lines.map((line, index) => getLineHeight(line, index));
  }, [getLineHeight]);

  // Function to split text into lines with intelligent line breaking
  const splitLongLines = useCallback((text) => {
    const lines = text.split('\n');
    
    // Check if text is already well-formatted (most lines under 120 chars and not too many fragments)
    const longLines = lines.filter(line => line.trim().length > 120);
    const shortFragments = lines.filter(line => line.trim().length > 0 && line.trim().length < 40);
    const needsSplitting = longLines.length > lines.length * 0.05 || shortFragments.length > lines.length * 0.3;
    
    if (!needsSplitting) {
      console.log('TextPanel: Text appears well-formatted, skipping line splitting');
      return lines;
    }
    
    console.log('TextPanel: Text needs line splitting, processing...');
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
        processedLines.push(trimmed);
        continue;
      }
      
      // If line is already reasonably short (under 100 chars), keep it as is
      if (trimmed.length <= 100) {
        processedLines.push(trimmed);
        continue;
      }
      
      // For longer lines, break them more conservatively to prevent wrapping
      const words = trimmed.split(/\s+/);
      let currentLine = '';
      for (const word of words) {
        const potentialLine = currentLine ? currentLine + ' ' + word : word;
        
        // If adding this word would make the line too long, start a new line
        if (currentLine && potentialLine.length > 100) {
          // Try to find a better break point by looking for sentence endings
          const lastSentenceEnd = currentLine.lastIndexOf('.');
          const lastComma = currentLine.lastIndexOf(',');
          const lastSemicolon = currentLine.lastIndexOf(';');
          const lastColon = currentLine.lastIndexOf(':');
          
          // Prefer breaking at sentence endings, then colons, then semicolons, then commas
          // Only break if the punctuation is near the end of the line (avoid mid-sentence breaks)
          let breakPoint = -1;
          if (lastSentenceEnd > currentLine.length * 0.8) breakPoint = lastSentenceEnd + 1;
          else if (lastColon > currentLine.length * 0.8) breakPoint = lastColon + 1;
          else if (lastSemicolon > currentLine.length * 0.8) breakPoint = lastSemicolon + 1;
          else if (lastComma > currentLine.length * 0.8) breakPoint = lastComma + 1;
          
          if (breakPoint > 0) {
            // Break at the punctuation
            const firstPart = currentLine.substring(0, breakPoint).trim();
            const secondPart = currentLine.substring(breakPoint).trim();
            if (firstPart) processedLines.push(firstPart);
            currentLine = secondPart + ' ' + word;
          } else {
            // No good break point, just break at word boundary
            processedLines.push(currentLine);
            currentLine = word;
          }
        } else {
          currentLine = potentialLine;
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
      const textContainer = document.querySelector(`.${styles.textContainer} > div`);
      if (!textContainer || !textLines.length) return;
      const scrollHeight = textContainer.scrollHeight - textContainer.clientHeight;
      const targetScrollTop = ratio * scrollHeight;
      textContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    },
    scrollToText: (quote) => {
      const textContainer = document.querySelector(`.${styles.textContainer} > div`);
      if (!textContainer || !textLines.length || !quote) return;
      // Try to find the first line that matches the quote (or first line of quote)
      const lines = Array.isArray(quote) ? quote : quote.split('\n');
      const firstLine = lines[0].trim();
      const idx = textLines.findIndex(line => line.trim() === firstLine);
      if (idx >= 0) {
        // Calculate approximate position based on line index
        const lineHeight = rowHeight;
        const targetScrollTop = idx * lineHeight;
        textContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }
  }), [textLines, rowHeight]);

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
  const loadTextContent = useCallback(async () => {
    console.log('TextPanel: loadTextContent called - starting text loading process');
    
    // Set loading state
    setIsTextLoading(true);
    
          // Clear PDF mode and data
      setIsPDFMode(false);
      setPdfData(null);
      setPdfFileName('');
      // Reset text ready flag for new text
      setIsTextReady(false);
    
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
      const newTextLines = [...titleLines, ...lines];
      setTextLines(newTextLines);
      
      // Calculate line heights for the new text
      const newLineHeights = calculateAllLineHeights(newTextLines);
      console.log('TextPanel: Calculated line heights:', newLineHeights.slice(0, 10)); // Debug first 10 heights
      setLineHeights(newLineHeights);
      
      // Immediately set scroll position to prevent flash
      await loadAndValidateBookmark(newTextLines, 'storage');
      setIsTextLoading(false);
      // Mark text as ready for scrolling after a short delay to ensure DOM is rendered
      setTimeout(() => {
        setIsTextReady(true);
        console.log('TextPanel: Text marked as ready for scrolling');
      }, 200);
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
          'Loading...',
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
        .then(async text => {
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
          const newTextLines = [...titleLines, ...lines];
          setTextLines(newTextLines);
          
          // Calculate line heights for the new text
          const newLineHeights = calculateAllLineHeights(newTextLines);
          setLineHeights(newLineHeights);
          
          // Immediately set scroll position to prevent flash
          await loadAndValidateBookmark(newTextLines, 'fetch');
          setIsTextLoading(false);
          // Mark text as ready for scrolling after a short delay to ensure DOM is rendered
          setTimeout(() => {
            setIsTextReady(true);
            console.log('TextPanel: Text marked as ready for scrolling');
          }, 200);
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
    if (!query.trim() || !textLines.length) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results = [];
    const searchTerm = query.toLowerCase();
    
    textLines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchTerm)) {
        results.push({ lineIndex: index, line });
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    // Scroll to first result if found
    if (results.length > 0) {
      const textContainer = document.querySelector(`.${styles.textContainer} > div`);
      if (textContainer) {
        const lineHeight = rowHeight;
        const targetScrollTop = results[0].lineIndex * lineHeight;
        textContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }
  }, [textLines, rowHeight]);

  const goToNextResult = useCallback(() => {
    if (searchResults.length === 0) return;
    
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    
    const textContainer = document.querySelector(`.${styles.textContainer} > div`);
    if (textContainer) {
      const lineHeight = rowHeight;
      const targetScrollTop = searchResults[nextIndex].lineIndex * lineHeight;
      textContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, [searchResults, currentSearchIndex, rowHeight]);

  const goToPreviousResult = useCallback(() => {
    if (searchResults.length === 0) return;
    
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    
    const textContainer = document.querySelector(`.${styles.textContainer} > div`);
    if (textContainer) {
      const lineHeight = rowHeight;
      const targetScrollTop = searchResults[prevIndex].lineIndex * lineHeight;
      textContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, [searchResults, currentSearchIndex, rowHeight]);

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
    const isMobilePhone = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i.test(navigator.userAgent) || 
                         (navigator.userAgent.includes('Safari') && navigator.userAgent.includes('Mobile') && !navigator.userAgent.includes('iPad')) ||
                         (typeof window !== 'undefined' && window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
    console.log('TextPanel: Mobile phone detected:', isMobilePhone);
    
    // Add a timeout to force text loading if nothing happens
    const forceLoadTimeout = setTimeout(() => {
      if (textLines.length <= 5 && !isPDFMode) { // Check for just the fallback text
        console.log('TextPanel: Force loading text due to timeout');
        loadTextContent();
      }
    }, isMobilePhone ? 2000 : 3000); // Shorter timeout for mobile
    
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
        setIsTextReady(false); // Reset for PDF mode
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
          setIsTextReady(false); // Reset for PDF mode
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

  // Effect 2: Listen for storage changes to handle file uploads and layout changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      console.log('TextPanel: Storage change detected:', e.key);
      
      // Handle layout mode changes from profile settings
      if (e.key === 'explainer:profile') {
        try {
          const profile = JSON.parse(e.newValue || '{}');
          if (profile.layoutMode && ['auto', 'two-panel', 'single-panel'].includes(profile.layoutMode)) {
            setLayoutMode(profile.layoutMode);
          }
        } catch (error) {
          console.warn('Failed to parse profile from storage change:', error);
        }
      }
      
      if (e.key === 'explainer:bookText' || e.key === 'explainer:pdfData' || e.key === 'explainer:pdfSource') {
        // Force a reload of content when storage changes
        setTimeout(() => {
          const pdfSource = sessionStorage.getItem('explainer:pdfSource');
          const storedPdfData = sessionStorage.getItem('explainer:pdfData');
          
          if (pdfSource && storedPdfData) {
            // PDF data was added
            setIsPDFMode(true);
            setPdfData(storedPdfData);
            setPdfFileName(sessionStorage.getItem('explainer:bookTitle') || 'PDF Document');
            setIsTextReady(false); // Reset for PDF mode
          } else if (sessionStorage.getItem('explainer:bookText') || localStorage.getItem('explainer:bookText')) {
            // Text data was added
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

  // Function to get current scroll position from native scrolling
  const getCurrentScrollPosition = useCallback(() => {
    try {
      // Find the scrollable container more reliably using the same logic as scroll restoration
      let textContainer = null;
      
      // First try to find the container by looking for the scrollable div
      const textContainerElement = document.querySelector(`.${styles.textContainer}`);
      if (textContainerElement) {
        // Look for the div with overflow: 'auto' inside textContainer
        const scrollableDiv = textContainerElement.querySelector('div[style*="overflow: auto"]');
        if (scrollableDiv) {
          textContainer = scrollableDiv;
        } else {
          // Try using the data attribute as a fallback
          const dataTestIdDiv = textContainerElement.querySelector('[data-testid="scrollable-text-container"]');
          if (dataTestIdDiv) {
            textContainer = dataTestIdDiv;
          } else {
            // Fallback: look for any div inside textContainer that might be scrollable
            const divs = textContainerElement.querySelectorAll('div');
            for (const div of divs) {
              if (div.style.overflow === 'auto' || div.style.overflow === 'scroll') {
                textContainer = div;
                break;
              }
            }
          }
        }
      }
      
      // If we still don't have a container, try to find it by looking for the parent of textContentRef
      if (!textContainer && textContentRef.current) {
        const parent = textContentRef.current.parentElement;
        if (parent && (parent.style.overflow === 'auto' || parent.style.overflow === 'scroll')) {
          textContainer = parent;
        }
      }
      
      if (textContainer) {
        const scrollTop = textContainer.scrollTop;
        
        // Use the actual calculated line heights if available for more accurate positioning
        if (lineHeights.length > 0) {
          // Find the line index by calculating cumulative heights
          let cumulativeHeight = 0;
          for (let i = 0; i < lineHeights.length; i++) {
            cumulativeHeight += lineHeights[i];
                      if (cumulativeHeight > scrollTop) {
            const result = Math.max(0, i - 1);
            return result;
          }
          }
          // If we get here, we're at the end
          const result = Math.max(0, lineHeights.length - 1);
          return result;
        } else {
          // Fall back to using rowHeight
          const index = Math.floor(scrollTop / rowHeight);
          console.log('TextPanel: getCurrentScrollPosition - fallback index:', index, 'from scrollTop:', scrollTop, 'rowHeight:', rowHeight);
          return Math.max(0, index);
        }
      }
    } catch (error) {
      console.warn('Failed to get scroll position from native scrolling:', error);
    }
    
    return currentScrollIndexRef.current;
  }, [lineHeights, rowHeight]);

  // Debounced bookmark saving
  const saveBookmarkDebounced = useCallback((() => {
    let timeoutId = null;
    return (scrollIndex) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        saveBookmark(scrollIndex).catch(error => {
          console.warn('Failed to save bookmark:', error);
        });
      }, 1000); // Increased debounce time for better mobile performance
    };
  })(), [saveBookmark]);



  // Effect 6: Scroll to saved position when component renders (only once)
  useEffect(() => {
    // Don't scroll if bookmark is at or beyond the end of the file
    // Also check that the text is actually rendered in the DOM
    if (textLines.length > 0 && !isTextLoading && isTextReady && currentScrollIndex > 0 && currentScrollIndex < textLines.length) {
      // Early exit: if we're already at the end of the file, don't scroll
      if (currentScrollIndex >= textLines.length - 5) { // Within 5 lines of the end
        return;
      }
      // Additional safety check: ensure currentScrollIndex is reasonable
      if (currentScrollIndex >= textLines.length * 0.9) {
        return; // Don't scroll if we're already at the end
      }
      
      // Additional check: if the bookmark is very close to the end, don't scroll
      const distanceFromEnd = textLines.length - currentScrollIndex;
      if (distanceFromEnd <= 10) { // Within 10 lines of the end
        return;
      }
      // Additional check: ensure the text content is actually rendered
      const hasRenderedText = textContentRef.current && 
                              textContentRef.current.textContent && 
                              textContentRef.current.textContent.length > 100 &&
                              textContentRef.current.textContent.includes(textLines[0] || '');
      
      if (!hasRenderedText) {
        return;
      }
      
      // Additional check: ensure font settings are applied
      const computedStyle = window.getComputedStyle(textContentRef.current);
      const currentFontSize = computedStyle.fontSize;
      const expectedFontSize = `${fontSettings.fontSize}px`;
      
      if (currentFontSize !== expectedFontSize) {
        return;
      }
      
      // Additional check: ensure line heights are consistent with current font settings
      if (lineHeights.length > 0) {
        const expectedRowHeight = getRowHeight(fontSettings.fontSize);
        const actualRowHeight = lineHeights[0];
        const heightDifference = Math.abs(actualRowHeight - expectedRowHeight);
        
        if (heightDifference > 10) {
          return;
        }
      }
    }
  }, [textLines.length, isTextLoading, isTextReady, currentScrollIndex, lineHeights, rowHeight, fontSettings.fontSize]);

  // Debug effect: Log when any of the dependencies change
  useEffect(() => {
    // Removed verbose logging to reduce console noise
  }, [textLines.length, isTextLoading, isTextReady, currentScrollIndex, lineHeights.length, rowHeight]);

  // Effect 6.5: Fallback to ensure loading state is cleared
  useEffect(() => {
    if (textLines.length > 0 && isTextLoading) {
      // If we have text but still loading after 2 seconds, force end loading
      const timeoutId = setTimeout(() => {
        console.log('TextPanel: Fallback timeout - forcing loading to false');
        setIsTextLoading(false);
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [textLines.length, isTextLoading]);

  // Effect 6.6: Fallback scroll restoration for when text is already loaded
  useEffect(() => {
    if (textLines.length > 0 && !isTextLoading && !isTextReady && currentScrollIndex > 0) {
      // If text is loaded but not marked as ready, and we have a bookmark, try to restore it
      console.log('TextPanel: Fallback scroll restoration for already loaded text');
      const timeoutId = setTimeout(() => {
        setIsTextReady(true);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [textLines.length, isTextLoading, isTextReady, currentScrollIndex]);

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
          
          // Also handle layout mode changes
          try {
            const profile = JSON.parse(e.newValue || '{}');
            if (profile.layoutMode && ['auto', 'two-panel', 'single-panel'].includes(profile.layoutMode)) {
              setLayoutMode(profile.layoutMode);
            }
          } catch (error) {
            console.warn('Failed to parse profile from storage change:', error);
          }
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
          // Save to localStorage for immediate access
          saveBookmark(currentPosition).catch(error => {
            console.warn('Failed to save bookmark on unmount:', error);
          });
          // Save to database for persistence
          saveBookmarkToDatabase(currentPosition);
          console.log('TextPanel: 💾💾 Final bookmark save on unmount - line:', currentPosition);
        }
      } catch (error) {
        console.warn('Failed to save bookmark on unmount:', error);
      }
    };
  }, [saveBookmark, saveBookmarkToDatabase, getCurrentScrollPosition]);

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
          // Save to localStorage for immediate access
          saveBookmark(currentPosition).catch(error => {
            console.warn('Failed to save periodic bookmark:', error);
          });
          // Save to database periodically for mobile reliability
          saveBookmarkToDatabase(currentPosition);
        }
      } catch (error) {
        console.warn('Failed to save periodic bookmark:', error);
      }
    }, 10000); // Increased to 10 seconds to reduce frequency
    
    return () => clearInterval(interval);
  }, [isMobile, saveBookmark, saveBookmarkToDatabase, getCurrentScrollPosition]);

  // Effect 9.5: Set up scroll listener for bookmark saving
  useEffect(() => {
    if (!textLines.length || !containerRef.current) return;
    
    const textContainer = containerRef.current.querySelector('[data-testid="scrollable-text-container"]');
    if (!textContainer) return;
    
    const handleScroll = () => {
      const scrollTop = textContainer.scrollTop;
      let currentIndex = 0;
      
      if (lineHeights.length > 0) {
        // Use actual line heights for accurate positioning
        let cumulativeHeight = 0;
        for (let i = 0; i < lineHeights.length; i++) {
          cumulativeHeight += lineHeights[i];
          if (cumulativeHeight > scrollTop) {
            currentIndex = Math.max(0, i - 1);
            break;
          }
        }
      } else {
        // Fallback to using rowHeight
        currentIndex = Math.floor(scrollTop / rowHeight);
      }
      
      if (currentIndex > 0 && currentIndex < textLines.length) {
        saveBookmarkDebounced(currentIndex);
      }
    };
    
    textContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      textContainer.removeEventListener('scroll', handleScroll);
    };
  }, [textLines.length, lineHeights, rowHeight, saveBookmarkDebounced]);

  // Effect: Handle horizontal scroll position tracking and restoration
  useEffect(() => {
    const scrollContainer = containerRef.current?._outerRef;
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
  //   if (!isMobile || !containerRef.current) return;
    
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
  //     if (containerRef.current) {
  //       const rows = containerRef.current.querySelectorAll('[data-index]');
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
      const isShakespeare = isShakespearePlay(title);
      const speaker = isShakespeare ? detectSpeaker(textLines, index) : null;
      const { act, scene } = isShakespeare ? detectActScene(textLines, index) : { act: null, scene: null };
      const charactersOnStage = isShakespeare ? detectCharactersOnStage(textLines, index, speaker) : [];
      
      console.log('TextPanel: Desktop selection:', { 
        title, 
        isShakespeare, 
        speaker, 
        act, 
        scene, 
        charactersOnStage,
        selectedText: selectedText.substring(0, 50) + '...'
      });
      onTextSelection({ 
        text: selectedText, 
        speaker,
        act,
        scene,
        charactersOnStage
      });
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
        const { act, scene } = isShakespearePlay(title) ? detectActScene(textLines, index) : { act: null, scene: null };
        const charactersOnStage = isShakespearePlay(title) ? detectCharactersOnStage(textLines, index, speaker) : [];
        onTextSelection({ 
          text: selectedText, 
          speaker,
          act,
          scene,
          charactersOnStage
        });
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
        const { act, scene } = isShakespearePlay(title) ? detectActScene(textLines, start) : { act: null, scene: null };
        const charactersOnStage = isShakespearePlay(title) ? detectCharactersOnStage(textLines, start, speaker) : [];
        onTextSelection({ 
          text: selectedText, 
          speaker,
          act,
          scene,
          charactersOnStage
        });
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
      const isShakespeare = isShakespearePlay(title);
      const speaker = isShakespeare ? detectSpeaker(textLines, index) : null;
      const { act, scene } = isShakespeare ? detectActScene(textLines, index) : { act: null, scene: null };
      const charactersOnStage = isShakespeare ? detectCharactersOnStage(textLines, index, speaker) : [];
      
      console.log('TextPanel: Desktop selection:', { 
        title, 
        isShakespeare, 
        speaker, 
        act, 
        scene, 
        charactersOnStage,
        selectedText: selectedText.substring(0, 50) + '...'
      });
      
      onTextSelection({ 
        text: selectedText, 
        speaker,
        act,
        scene,
        charactersOnStage
      });
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
      const isShakespeare = isShakespearePlay(title);
      const speaker = isShakespeare ? detectSpeaker(textLines, index) : null;
      const { act, scene } = isShakespeare ? detectActScene(textLines, index) : { act: null, scene: null };
      const charactersOnStage = isShakespeare ? detectCharactersOnStage(textLines, index, speaker) : [];
      
      console.log('TextPanel: Mobile selection:', { 
        title, 
        isShakespeare, 
        speaker, 
        act, 
        scene, 
        charactersOnStage,
        selectedText: selectedText.substring(0, 50) + '...'
      });
      
      onTextSelection({ 
        text: selectedText, 
        speaker,
        act,
        scene,
        charactersOnStage
      });
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
      const isShakespeare = isShakespearePlay(title);
      const speaker = isShakespeare ? detectSpeaker(textLines, start) : null;
      const { act, scene } = isShakespeare ? detectActScene(textLines, start) : { act: null, scene: null };
      const charactersOnStage = isShakespeare ? detectCharactersOnStage(textLines, start, speaker) : [];
      
      console.log('TextPanel: Mobile range selection:', { 
        title, 
        isShakespeare, 
        speaker, 
        act, 
        scene, 
        charactersOnStage,
        selectedText: selectedText.substring(0, 50) + '...'
      });
      
      onTextSelection({ 
        text: selectedText, 
        speaker,
        act,
        scene,
        charactersOnStage
      });
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
        // For drag selection, try to detect speaker from the first line
        const firstLineIndex = Math.min(...Array.from(selectedLines));
        const isShakespeare = isShakespearePlay(title);
        const speaker = isShakespeare ? detectSpeaker(textLines, firstLineIndex) : null;
        const { act, scene } = isShakespeare ? detectActScene(textLines, firstLineIndex) : { act: null, scene: null };
        const charactersOnStage = isShakespeare ? detectCharactersOnStage(textLines, firstLineIndex, speaker) : [];
        
        console.log('TextPanel: Drag selection:', { 
          title, 
          isShakespeare, 
          speaker, 
          act, 
          scene, 
          charactersOnStage,
          selectedText: selectedText.substring(0, 50) + '...'
        });
        
        onTextSelection({ 
          text: selectedText, 
          speaker, // Try to detect speaker from first line
          act,
          scene,
          charactersOnStage
        });
        setSelectedLines(new Set());
        setIsDragging(false);
        setDragStartIndex(null);
        setFirstClickIndex(null);
      }, 300);
    } else if (!mouseMoved.current && dragStartIndex !== null) {
      // Simple click - no drag detected
      const selectedText = textLines[dragStartIndex];
      const isShakespeare = isShakespearePlay(title);
      const speaker = isShakespeare ? detectSpeaker(textLines, dragStartIndex) : null;
      const { act, scene } = isShakespeare ? detectActScene(textLines, dragStartIndex) : { act: null, scene: null };
      const charactersOnStage = isShakespeare ? detectCharactersOnStage(textLines, dragStartIndex, speaker) : [];
      
      console.log('TextPanel: Desktop mouse selection:', { 
        title, 
        isShakespeare, 
        speaker, 
        act, 
        scene, 
        charactersOnStage,
        selectedText: selectedText.substring(0, 50) + '...'
      });
      
      onTextSelection({ 
        text: selectedText, 
        speaker,
        act,
        scene,
        charactersOnStage
      });
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

  // Handler for PDF text selection
  const handlePDFTextSelection = useCallback((selectedText, metadata) => {
    if (selectedText && selectedText.trim().length > 0) {
      // Clean the text as a backup (in case it wasn't cleaned in PDFViewer)
      const cleanedText = cleanPDFText(selectedText.trim());
          // PDF text selection processed
      
      if (cleanedText.length > 0 && onTextSelection) {
        // For PDF text, we can't easily detect context, but we can try
        const isShakespeare = isShakespearePlay(title);
        console.log('TextPanel: PDF selection - title:', title, 'isShakespeare:', isShakespeare);
        
        onTextSelection({
          text: cleanedText,
          speaker: null, // PDF text doesn't have line-based speaker detection
          act: null, // PDF text doesn't have line-based act detection
          scene: null, // PDF text doesn't have line-based scene detection
          charactersOnStage: null, // PDF text doesn't have line-based character detection
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
  const isMobilePhone = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i.test(navigator.userAgent) || 
                       (navigator.userAgent.includes('Safari') && navigator.userAgent.includes('Mobile') && !navigator.userAgent.includes('iPad')) ||
                       (typeof window !== 'undefined' && window.innerWidth <= 768 && window.innerHeight > window.innerWidth);
  
  // Desktop mode override - can be triggered by adding ?desktop=1 to URL
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const forceDesktopMode = urlParams ? urlParams.get('desktop') === '1' : false;
  
  const shouldUseMobileBypass = isMobilePhone && !forceDesktopMode;
  
  // Only bypass loading screen for mobile phones (not tablets) unless desktop mode is forced
  // TEMPORARILY DISABLED: if (shouldUseMobileBypass && textLines.length === 0 && !isPDFMode) {
  if (false && shouldUseMobileBypass && textLines.length === 0 && !isPDFMode) {
    console.log('TextPanel: Mobile phone - showing content instead of loading screen');
    console.log('TextPanel: Mobile bypass details:', {
      shouldUseMobileBypass,
      textLinesLength: textLines.length,
      isPDFMode,
      userAgent: navigator.userAgent,
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'undefined',
      windowHeight: typeof window !== 'undefined' ? window.innerHeight : 'undefined'
    });
    
    // Force text loading immediately in mobile bypass
    setTimeout(() => {
      console.log('TextPanel: Mobile bypass - forcing text load');
      loadTextContent();
    }, 500);
    
    return (
      <div 
        key={`text-${title}-${textLines.length}`}
        className={`${styles.panel} ${isShakespearePlay(title) ? `${styles.screenplayFormat} ${styles.shakespeare}` : ''}`}
        style={{ 
          '--panel-width': `${width}%`,
          fontFamily: fontSettings.fontFamily,
          fontSize: `${fontSettings.fontSize}px`,
          fontWeight: fontSettings.fontWeight
        }}
        ref={containerRef}
      >
        <div className={styles.textContainer}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h3>Romeo and Juliet</h3>
            <p>by William Shakespeare</p>
            <p>Loading text...</p>
            <p>If this doesn't load, please refresh the page.</p>
            <p><small>Mobile mode active. Add ?desktop=1 to URL to force desktop mode.</small></p>
            <p><small>Debug: textLines.length = {textLines.length}</small></p>
          </div>
        </div>
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
    <>
    <div 
      key={`text-${title}-${textLines.length}`}
      className={`${styles.panel} ${isShakespearePlay(title) ? `${styles.screenplayFormat} ${styles.shakespeare}` : ''}`}
        style={{ 
          '--panel-width': effectiveLayoutMode() === 'single-panel' ? '100%' : `${width}%`,
          fontFamily: fontSettings.fontFamily,
          fontSize: `${fontSettings.fontSize}px`,
          fontWeight: fontSettings.fontWeight
        }}
      ref={containerRef}
    >
      {/* Title Bar with Navigation and Search */}
      <div className={styles.titleBar}>
        <div className={styles.titleBarContent}>
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.titleBarRow}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Search text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${styles.searchInput} ${isSearchFocused ? styles.searchInputFocused : ''}`}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
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
          <div className={styles.navigation}>
            <button
              onClick={() => router.push('/library')}
              className={styles.navButton}
              title="Browse and load books from our library of classic literature"
            >
              <BookOpen size={16} />
              <span className={styles.navButtonText}>Library</span>
            </button>
            <button
              onClick={() => router.push('/profile')}
              className={styles.navButton}
              title="Profile and settings"
            >
              <Settings size={16} />
              <span className={styles.navButtonText}>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Message for First-Time Users */}
      {!hasInteracted && effectiveLayoutMode() === 'single-panel' && (
        <div className={styles.welcomeOverlay}>
          <div className={styles.welcomeContent}>
            <div className={styles.welcomeIcon}>📖</div>
            <h3>Welcome to The Explainer!</h3>
            <p>To get started:</p>
                             <ol>
                   <li><strong>Select some text</strong> by dragging your finger or mouse</li>
                   <li>The chat interface will slide in from the right</li>
                   <li>Ask questions about the selected text</li>
                   <li>Use the green slide handle on the left to return to reading</li>
                 </ol>
                             <p><em>Tip: Use the slide handles on the left and right edges to switch between text and chat</em></p>
            <button 
              onClick={() => setHasInteracted(true)}
              className={styles.welcomeDismissButton}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      

      
      <div className={styles.textContainer}>
        {!isTextLoading && textLines.length > 0 ? (
          <div 
            data-testid="scrollable-text-container"
            style={{ 
              height: listHeight, 
              overflow: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f1f5f9'
            }}
            onScroll={(e) => {
              // Update scroll progress for the divider (if needed)
              if (onScrollProgress && textLines.length > 0) {
                const scrollTop = e.target.scrollTop;
                const scrollHeight = e.target.scrollHeight;
                const clientHeight = e.target.clientHeight;
                const progress = Math.min(1, Math.max(0, scrollTop / (scrollHeight - clientHeight)));
                onScrollProgress(progress);
              }
              
              // Save bookmark when scrolling
              if (textLines.length > 0) {
                const scrollTop = e.target.scrollTop;
                // Calculate current line index from scroll position
                let currentIndex = 0;
                if (lineHeights.length > 0) {
                  // Use actual line heights for accurate positioning
                  let cumulativeHeight = 0;
                  for (let i = 0; i < lineHeights.length; i++) {
                    cumulativeHeight += lineHeights[i];
                    if (cumulativeHeight > scrollTop) {
                      currentIndex = Math.max(0, i - 1);
                      break;
                    }
                  }
                } else {
                  // Fallback to using rowHeight
                  currentIndex = Math.floor(scrollTop / rowHeight);
                }
                
                if (currentIndex > 0 && currentIndex < textLines.length) {
                  saveBookmarkDebounced(currentIndex);
                }
              }
            }}
            onMouseUp={() => {
              // Handle native text selection
              const selection = window.getSelection();
              if (selection && selection.toString().trim()) {
                const selectedText = selection.toString().trim();
                if (selectedText && onTextSelection) {
                  onTextSelection(selectedText);
                  setCurrentSelectedText(selectedText);
                  setHasInteracted(true); // Mark that user has interacted
                  // In single-panel mode, show the chat panel
                  if (effectiveLayoutMode() === 'single-panel') {
                    setShowChatPanel(true);
                  }
                }
              }
            }}
            onTouchEnd={() => {
              // Handle native text selection on mobile
              setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.toString().trim()) {
                  const selectedText = selection.toString().trim();
                  if (selectedText && onTextSelection) {
                    onTextSelection(selectedText);
                    setCurrentSelectedText(selectedText);
                    setHasInteracted(true); // Mark that user has interacted
                    // In single-panel mode, show the chat panel
                    if (effectiveLayoutMode() === 'single-panel') {
                      setShowChatPanel(true);
                    }
                  }
                }
              }, 100); // Small delay to ensure selection is complete
            }}
          >
            <div
              ref={textContentRef}
              style={{
                padding: '8px',
                fontFamily: fontSettings.fontFamily,
                fontSize: `${fontSettings.fontSize}px`,
                fontWeight: fontSettings.fontWeight,
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                userSelect: 'text',
                cursor: 'text'
              }}
            >
              {textLines.join('\n')}
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Loading...</p>
          </div>
        )}
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
    
    {/* Slide Handle for Chat Panel */}
    {effectiveLayoutMode() === 'single-panel' && !showChatPanel && (
      <div 
        className={styles.chatSlideHandle}
        onClick={() => setShowChatPanel(true)}
        title="Click or drag to open chat panel"
      >
        <MessageSquare size={20} />
        <span className={styles.slideHandleText}>Chat</span>
        {messages && messages.length > 0 && (
          <span className={styles.slideHandleMessageCount}>{messages.length}</span>
        )}
      </div>
    )}

    {/* Slide Handle to Return to Text Panel */}
    {effectiveLayoutMode() === 'single-panel' && showChatPanel && (
      <div 
        className={styles.textSlideHandle}
        onClick={() => setShowChatPanel(false)}
        title="Click or drag to return to text panel"
      >
        <span className={styles.slideHandleText}>Text</span>
        <div className={styles.textIcon}>📖</div>
      </div>
    )}

               {/* Slide-in Chat Panel for Single-Panel Mode */}
           {effectiveLayoutMode() === 'single-panel' && showChatPanel && (
             <div className={styles.slideInChatPanel}>
               <div className={styles.chatPanelContent}>
                 <ChatPanel
                   width={100}
                   messages={messages}
                   isLoading={chatIsLoading}
                   onFollowUpQuestion={onFollowUpQuestion}
                   selectedText={currentSelectedText}
                   scrollToText={scrollToText}
                   bookTitle={title}
                   scrollProgress={scrollProgress}
                 />
               </div>
             </div>
           )}
    </>
  );
});

export default TextPanel; 




