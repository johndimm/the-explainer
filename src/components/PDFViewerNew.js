import { useState, useEffect, useRef, useCallback } from 'react';

// Global variables for PDF.js
let pdfjsLib = null;

const PDFViewerNew = ({ 
  pdfData, 
  fileName, 
  onTextSelection, 
  onLoadComplete,
  width = '100%',
  height = '100%'
}) => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Load PDF.js library
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('ViewerNew: Starting library import...');
    
    import('pdfjs-dist').then((module) => {
      console.log('ViewerNew: Library module loaded');
      pdfjsLib = module;
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('ViewerNew: Library fully loaded and ready');
      setPdfjsLoaded(true);
    }).catch(error => {
      console.error('Failed to load PDF.js library:', error);
    });
  }, []);

  // Load PDF document
  useEffect(() => {
    console.log('ViewerNew: useEffect triggered', { 
      hasPdfData: !!pdfData, 
      pdfDataLength: pdfData ? pdfData.length : 0,
      hasPdfjsLib: !!pdfjsLib, 
      pdfjsLoaded
    });
    
    // Clean up previous PDF state when pdfData changes or becomes null
    if (!pdfData) {
      console.log('ViewerNew: No PDF data, cleaning up state');
      setPdfDocument(null);
      setCurrentPage(1);
      setNumPages(0);
      setScale(1.0);
      setLoading(false);
      setError(null);
      
      // Clear any existing text layer
      const textElements = document.querySelectorAll('.pdf-text-element');
      textElements.forEach(el => {
        el.removeEventListener('mousedown', () => {});
        el.removeEventListener('mousemove', () => {});
        el.removeEventListener('mouseup', () => {});
        el.removeEventListener('click', () => {});
      });
      
      // Remove text layer div
      const textLayer = document.querySelector('.textLayer');
      if (textLayer) {
        textLayer.remove();
      }
      
      return;
    }
    
    if (!pdfjsLib || !pdfjsLoaded) {
      console.log('ViewerNew: Missing library or not loaded, returning');
      return;
    }

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Convert base64 to Uint8Array
        const decodedData = atob(pdfData);
        const pdfBytes = new Uint8Array(
          decodedData
            .split('')
            .map(char => char.charCodeAt(0))
        );
        
        const loadingTask = pdfjsLib.getDocument({
          data: pdfBytes,
          verbosity: 1
        });
        
        const pdf = await loadingTask.promise;
        console.log('ViewerNew: Document loaded successfully', { numPages: pdf.numPages });
        
        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        
        // Calculate appropriate scale to fit container
        if (containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth - 64;
          const firstPage = await pdf.getPage(1);
          const viewport = firstPage.getViewport({ scale: 1.0 });
          const scaleToFit = Math.min(1.0, (containerWidth - 32) / viewport.width);
          setScale(scaleToFit);
        }
        
        if (onLoadComplete) {
          onLoadComplete({ numPages: pdf.numPages, fileName });
        }
      } catch (err) {
        console.error('PDFViewerNew: Error loading PDF:', err);
        setError('Failed to load PDF. The file may be corrupted.');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
    
    // Cleanup function to reset state when pdfData changes
    return () => {
      console.log('ViewerNew: Cleaning up viewer state');
      setPdfDocument(null);
      setCurrentPage(1);
      setNumPages(0);
      setScale(1.0);
      setLoading(false);
      setError(null);
      
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      
      // Clear any existing text layer
      const textElements = document.querySelectorAll('.pdf-text-element');
      textElements.forEach(el => {
        el.removeEventListener('mousedown', () => {});
        el.removeEventListener('mousemove', () => {});
        el.removeEventListener('mouseup', () => {});
        el.removeEventListener('click', () => {});
      });
      
      // Remove text layer div
      const textLayer = document.querySelector('.textLayer');
      if (textLayer) {
        textLayer.remove();
      }
    };
  }, [pdfData, onLoadComplete, fileName, pdfjsLib, pdfjsLoaded]);

  // Render current page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !pdfjsLib) {
      return;
    }

    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(currentPage);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale });
        
        // Get device pixel ratio for crisp rendering
        const pixelRatio = window.devicePixelRatio || 1;
        const canvasWidth = viewport.width;
        const canvasHeight = viewport.height;
        
        // Set canvas size accounting for pixel ratio
        canvas.width = canvasWidth * pixelRatio;
        canvas.height = canvasHeight * pixelRatio;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        
        // Scale the context to account for pixel ratio
        context.scale(pixelRatio, pixelRatio);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        if (!isCancelled) {
          // Cancel any existing render task
          if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
          }
          
          console.log('PDFViewerNew: Starting page render', { 
            pageNumber: currentPage, 
            scale, 
            viewportWidth: viewport.width, 
            viewportHeight: viewport.height
          });
          
          // Start new render task
          renderTaskRef.current = page.render(renderContext);
          await renderTaskRef.current.promise;
          
          console.log('PDFViewerNew: Page render completed');
        }
      } catch (err) {
        console.error('PDFViewerNew: Error rendering page:', err);
        setError('Failed to render PDF page.');
      }
    };

    renderPage();

    // Cleanup function
    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDocument, currentPage, scale, pdfjsLib]);

  // Render text layer using PDF.js's proper TextLayer functionality
  const renderTextLayerForSelection = useCallback(async () => {
    console.log('PDFViewerNew: Rendering proper PDF.js TextLayer');
    if (!pdfDocument || !canvasRef.current || !containerRef.current || !pdfjsLib) return;

    try {
      const page = await pdfDocument.getPage(currentPage);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale });
      
      // Fallback to manual text layer creation since renderTextLayer import is failing
      let textLayerDiv = textLayerRef.current;
      if (!textLayerDiv) {
        textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerRef.current = textLayerDiv;
      }

      // Clear previous content
      textLayerDiv.innerHTML = '';

      // Position text layer to match canvas exactly using getBoundingClientRect
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.left = `${canvasRect.left - containerRect.left}px`;
      textLayerDiv.style.top = `${canvasRect.top - containerRect.top}px`;
      textLayerDiv.style.width = `${canvasRect.width}px`;
      textLayerDiv.style.height = `${canvasRect.height}px`;
      textLayerDiv.style.pointerEvents = 'auto';
      textLayerDiv.style.zIndex = '10';
      textLayerDiv.style.overflow = 'hidden';
      
      console.log('PDFViewerNew: Text layer positioning:', {
        canvasRect: { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height },
        containerRect: { left: containerRect.left, top: containerRect.top },
        textLayerStyle: { 
          left: textLayerDiv.style.left, 
          top: textLayerDiv.style.top, 
          width: textLayerDiv.style.width, 
          height: textLayerDiv.style.height 
        }
      });

      // Create text elements using adaptive positioning that works across PDFs
      const scaleX = canvas.offsetWidth / viewport.width;
      const scaleY = canvas.offsetHeight / viewport.height;
      
      // Calculate average font size to determine dynamic adjustment
      const fontSizes = textContent.items
        .filter(item => item.str.trim())
        .map(item => Math.abs(item.transform[3]));
      const avgFontSize = fontSizes.length > 0 ? fontSizes.reduce((a, b) => a + b) / fontSizes.length : 12;
      
      // Dynamic adjustment factor based on font size and scale
      const baseAdjustment = avgFontSize * scaleY;
      const adjustmentFactor = Math.max(2, Math.min(8, avgFontSize / 3)); // Adaptive factor between 2-8
      
      console.log('PDFViewerNew: Font analysis:', {
        avgFontSize,
        scaleY,
        baseAdjustment,
        adjustmentFactor,
        finalAdjustment: baseAdjustment * adjustmentFactor
      });
      
      // Advanced text reconstruction for heavily fragmented PDFs
      console.log('PDFViewerNew: Raw text items:', textContent.items.map(item => ({ 
        text: item.str, 
        x: item.transform[4], 
        y: item.transform[5] 
      })));
      
      // First, filter out items that are clearly meaningless (only punctuation, whitespace, or very short)
      const cleanItems = textContent.items.filter(item => {
        const text = item.str.trim();
        if (!text || text.length === 0) return false;
        
        // Keep items that have at least one letter or are reasonable punctuation
        const hasLetter = /[a-zA-Z]/.test(text);
        const isReasonablePunctuation = /^[.,!?;:\-()"]$/.test(text);
        const isNumber = /^\d+$/.test(text);
        
        return hasLetter || isReasonablePunctuation || isNumber;
      });
      
      console.log('PDFViewerNew: Clean items:', cleanItems.map(item => ({ 
        text: item.str, 
        x: item.transform[4], 
        y: item.transform[5] 
      })));
      
      // Group items by approximate line position with tighter threshold
      const lineGroups = [];
      const lineThreshold = 3; // Much tighter threshold
      
      cleanItems.forEach(item => {
        const y = item.transform[5];
        let addedToGroup = false;
        
        // Try to add to existing group
        for (let group of lineGroups) {
          const groupY = group[0].transform[5];
          if (Math.abs(y - groupY) <= lineThreshold) {
            group.push(item);
            addedToGroup = true;
            break;
          }
        }
        
        // Create new group if not added to existing
        if (!addedToGroup) {
          lineGroups.push([item]);
        }
      });
      
      console.log('PDFViewerNew: Line groups:', lineGroups.map(group => 
        group.map(item => item.str).join(' ')
      ));
      
      // Process each line group to create meaningful word elements
      const meaningfulItems = [];
      
      lineGroups.forEach(group => {
        // Sort group by x position (left to right)
        const sortedGroup = group.sort((a, b) => a.transform[4] - b.transform[4]);
        
        // Try to reconstruct words by grouping nearby characters
        const words = [];
        let currentWord = [];
        let lastX = null;
        const wordSpacing = avgFontSize * 0.3; // Adaptive spacing based on font size
        
        sortedGroup.forEach(item => {
          const x = item.transform[4];
          
          if (lastX !== null && (x - lastX) > wordSpacing && currentWord.length > 0) {
            // End current word and start new one
            const wordText = currentWord.map(w => w.str).join('').trim();
            if (wordText.length > 0) {
              words.push({
                str: wordText,
                transform: currentWord[0].transform,
                width: currentWord.reduce((sum, w) => sum + w.width, 0),
                fontName: currentWord[0].fontName
              });
            }
            currentWord = [item];
          } else {
            currentWord.push(item);
          }
          
          lastX = x + item.width;
        });
        
        // Add the last word
        if (currentWord.length > 0) {
          const wordText = currentWord.map(w => w.str).join('').trim();
          if (wordText.length > 0) {
            words.push({
              str: wordText,
              transform: currentWord[0].transform,
              width: currentWord.reduce((sum, w) => sum + w.width, 0),
              fontName: currentWord[0].fontName
            });
          }
        }
        
        // Add valid words to meaningful items
        words.forEach(word => {
          // Only keep words that have some meaningful content
          const text = word.str;
          const hasLetters = /[a-zA-Z]/.test(text);
          const isReasonableLength = text.length >= 1;
          const notAllPunctuation = !/^[.,!?;:\-()""''<>~`]*$/.test(text);
          
          if (hasLetters && isReasonableLength && notAllPunctuation) {
            meaningfulItems.push(word);
          }
        });
      });
      
      console.log('PDFViewerNew: Filtered items:', {
        total: textContent.items.length,
        meaningful: meaningfulItems.length,
        filtered: meaningfulItems.map(item => item.str)
      });
      
      meaningfulItems.forEach((item, index) => {
        const textElement = document.createElement('span');
        textElement.className = 'pdf-text-element';
        textElement.textContent = item.str;
        textElement.setAttribute('role', 'presentation');
        textElement.dataset.index = index;
        textElement.dataset.text = item.str;
        
        // Use adaptive coordinate transformation
        const transform = item.transform;
        const [a, b, c, d, e, f] = transform;
        
        // Dynamic positioning with bounds checking
        const x = e * scaleX;
        const itemFontSize = Math.abs(d);
        const rawY = (viewport.height - f) * scaleY;
        
        // Try multiple adjustment strategies
        const adjustments = [
          itemFontSize * scaleY * adjustmentFactor,  // Adaptive
          itemFontSize * scaleY * 5,                 // Fixed multiplier (what worked before)
          itemFontSize * scaleY * 3,                 // Conservative
          itemFontSize * scaleY                      // Minimal
        ];
        
        let y = rawY;
        // Use the first adjustment that keeps the element in visible bounds
        for (const adj of adjustments) {
          const testY = rawY - adj;
          if (testY >= 0 && testY <= (canvasRect.height - itemFontSize * scaleY)) {
            y = testY;
            break;
          }
        }
        
        console.log('PDFViewerNew: Positioning element:', {
          text: item.str,
          rawY,
          finalY: y,
          adjustment: rawY - y,
          bounds: { min: 0, max: canvasRect.height }
        });
        
        textElement.style.position = 'absolute';
        textElement.style.left = `${x}px`;
        textElement.style.top = `${y}px`;
        textElement.style.width = `${(item.width * scaleX) + 20}px`; // Extend width to cover more area
        textElement.style.height = `${(Math.abs(d) * scaleY) + 10}px`; // Extend height slightly
        textElement.style.fontSize = `${Math.abs(d) * scaleY}px`;
        textElement.style.fontFamily = item.fontName || 'sans-serif';
        textElement.style.whiteSpace = 'pre';
        textElement.style.color = 'transparent';
        textElement.style.cursor = 'text';
        textElement.style.backgroundColor = 'transparent'; // No debugging background
        textElement.style.pointerEvents = 'auto';
        textElement.style.lineHeight = '1';
        
        textLayerDiv.appendChild(textElement);
      });
      
      console.log('PDFViewerNew: Manual text layer created successfully');

      // Add selection handlers to all text elements we created
      const textElements = textLayerDiv.querySelectorAll('.pdf-text-element');
      console.log('PDFViewerNew: Found', textElements.length, 'text elements');
      
      let isSelecting = false;
      let selectionStart = null;
      let selectedElements = new Set();
      
      textElements.forEach((element, index) => {
        // Mouse down - start selection
        element.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          isSelecting = true;
          selectionStart = element;
          selectedElements.clear();
          selectedElements.add(element);
          
          // Highlight the starting element
          element.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
          
          console.log('PDFViewerNew: Selection started:', element.textContent);
        });
        
        // Mouse move - extend selection
        element.addEventListener('mouseenter', (e) => {
          if (!isSelecting || !selectionStart) return;
          
          // Find all elements between start and current
          const allElements = Array.from(textElements);
          const startIndex = allElements.indexOf(selectionStart);
          const currentIndex = allElements.indexOf(element);
          
          if (startIndex !== -1 && currentIndex !== -1) {
            const minIndex = Math.min(startIndex, currentIndex);
            const maxIndex = Math.max(startIndex, currentIndex);
            
            // Clear previous selection highlighting
            allElements.forEach(el => {
              el.style.backgroundColor = 'transparent';
            });
            
            // Highlight selected range
            selectedElements.clear();
            for (let i = minIndex; i <= maxIndex; i++) {
              selectedElements.add(allElements[i]);
              allElements[i].style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
            }
          }
        });
        
        // Single click handler (when not dragging)
        element.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (!isSelecting) {
            const text = element.textContent.trim();
            if (text && onTextSelection) {
              console.log('PDFViewerNew: Text clicked:', `"${text}"`);
              
              onTextSelection(text, {
                page: currentPage,
                selectionType: 'element',
                elementCount: 1
              });
            }
          }
        });
      });
      
      // Global mouse up handler for ending selection
      document.addEventListener('mouseup', (e) => {
        if (isSelecting && selectedElements.size > 0) {
          // Sort selected elements by position (top to bottom, left to right)
          const sortedElements = Array.from(selectedElements).sort((a, b) => {
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            
            // Sort by vertical position first (top to bottom)
            if (Math.abs(aRect.top - bRect.top) > 5) {
              return aRect.top - bRect.top;
            }
            
            // Then by horizontal position (left to right)
            return aRect.left - bRect.left;
          });
          
          // Advanced text reconstruction for selected elements
          const textFragments = sortedElements.map(el => el.textContent);
          
          console.log('PDFViewerNew: Selected fragments:', textFragments);
          
          // Aggressive text cleaning to extract readable words
          const extractedWords = [];
          
          textFragments.forEach(fragment => {
            // Extract potential words using multiple strategies
            
            // Strategy 1: Extract sequences of letters (ignoring punctuation)
            const letterSequences = fragment.match(/[a-zA-Z]{2,}/g) || [];
            extractedWords.push(...letterSequences);
            
            // Strategy 2: Extract letter-number combinations
            const alphanumeric = fragment.match(/[a-zA-Z][a-zA-Z0-9]*[a-zA-Z]/g) || [];
            extractedWords.push(...alphanumeric);
            
            // Strategy 3: Try to salvage words with minimal punctuation
            const wordsWithMinimalPunct = fragment.match(/[a-zA-Z]+[']?[a-zA-Z]*/g) || [];
            extractedWords.push(...wordsWithMinimalPunct);
          });
          
          // Deduplicate and filter extracted words
          const uniqueWords = [...new Set(extractedWords)].filter(word => {
            // Only keep words that are:
            // - At least 2 characters long
            // - Contain mostly letters
            // - Not just repeated characters
            const letterRatio = (word.match(/[a-zA-Z]/g) || []).length / word.length;
            const hasRepeatedChar = /(.)\1{2,}/.test(word);
            
            return word.length >= 2 && letterRatio >= 0.7 && !hasRepeatedChar;
          });
          
          console.log('PDFViewerNew: Extracted words:', uniqueWords);
          
          // Also keep cleaned fragments as fallback
          const cleanedFragments = textFragments.map(fragment => {
            // Remove excessive punctuation clusters and fix common encoding issues
            return fragment
              .replace(/[.,]{3,}/g, ' ') // Replace multiple dots with space
              .replace(/["'"]{2,}/g, '"') // Fix quote clusters
              .replace(/[<>~`!]{1,}/g, '') // Remove encoding artifacts
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
          }).filter(fragment => {
            // Only keep fragments with meaningful content
            return fragment.length > 0 && /[a-zA-Z0-9]/.test(fragment);
          });
          
          // Try different reconstruction approaches
          const reconstructions = [
            uniqueWords.join(' '), // Extracted words with spaces (best approach)
            cleanedFragments.join(' '), // Cleaned fragments with spaces
            uniqueWords.join(''), // Extracted words without spaces
            cleanedFragments.join(''), // Cleaned fragments without spaces
            cleanedFragments.filter(f => f.length > 2).join(' '), // Only longer fragments with spaces
            uniqueWords.filter(w => w.length > 3).join(' ') // Only longer extracted words
          ];
          
          // Score each reconstruction based on readability
          const scores = reconstructions.map((text, index) => {
            if (!text || text.length === 0) {
              return { text, score: -1000 };
            }
            
            const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
            const words = text.split(/\s+/).filter(word => /[a-zA-Z]/.test(word));
            const wordCount = words.length;
            const punctuationRatio = (text.match(/[^\w\s]/g) || []).length / text.length;
            const avgWordLength = wordCount > 0 ? letterCount / wordCount : 0;
            const hasSpaces = text.includes(' ');
            const isExtractedWords = index === 0 || index === 2 || index === 5; // Uses extracted words
            const isSpacedExtractedWords = index === 0 || index === 5; // Spaced extracted words
            
            // Base score calculation
            let score = letterCount * 2 + wordCount * 5 - (punctuationRatio * 20) + (avgWordLength * 3);
            
            // HUGE bonus for spaced extracted words (this should be the best option)
            if (isSpacedExtractedWords && wordCount > 1) {
              score += 100; // Massive bonus for readable spaced words
            }
            
            // Medium bonus for any extracted words
            if (isExtractedWords && wordCount > 0) {
              score += 30;
            }
            
            // Bonus for having spaces (readability)
            if (hasSpaces && wordCount > 1) {
              score += 25;
            }
            
            // Bonus for multiple distinct words
            if (wordCount >= 3) {
              score += 20;
            }
            
            // Bonus for reasonable word lengths
            if (avgWordLength >= 2 && avgWordLength <= 8) {
              score += 15;
            }
            
            // Penalty for concatenated text without spaces when we have multiple words
            if (!hasSpaces && letterCount > 10) {
              score -= 30;
            }
            
            // Penalty for very short or very long text
            if (text.length < 3) {
              score -= 30;
            }
            if (text.length > 100) {
              score -= 15;
            }
            
            return {
              text,
              score,
              isExtractedWords,
              isSpacedExtractedWords,
              wordCount,
              hasSpaces
            };
          });
          
          // Choose the best reconstruction
          const bestReconstruction = scores.reduce((best, current) => 
            current.score > best.score ? current : best
          );
          
          const selectedText = bestReconstruction.text;
          
          console.log('PDFViewerNew: Text reconstruction:', {
            originalFragments: textFragments,
            extractedWords: uniqueWords,
            cleanedFragments: cleanedFragments,
            reconstructions: reconstructions,
            scores: scores.map(s => ({ 
              text: s.text, 
              score: s.score, 
              isExtractedWords: s.isExtractedWords,
              isSpacedExtractedWords: s.isSpacedExtractedWords,
              wordCount: s.wordCount,
              hasSpaces: s.hasSpaces
            })),
            chosen: selectedText
          });
          
          if (selectedText.length > 0 && onTextSelection) {
            console.log('PDFViewerNew: Selection completed:', `"${selectedText}"`);
            
            onTextSelection(selectedText, {
              page: currentPage,
              selectionType: 'range',
              elementCount: selectedElements.size
            });
          }
          
          // Clear selection after a short delay
          setTimeout(() => {
            selectedElements.forEach(el => {
              el.style.backgroundColor = 'transparent';
            });
            selectedElements.clear();
          }, 500);
        }
        
        isSelecting = false;
        selectionStart = null;
      });

      // Add text layer to container
      const container = containerRef.current;
      const canvasContainer = container.querySelector('div[style*="position: relative"]');
      if (canvasContainer && !canvasContainer.contains(textLayerDiv)) {
        canvasContainer.appendChild(textLayerDiv);
      }

    } catch (error) {
      console.error('PDFViewerNew: Error setting up PDF.js TextLayer:', error);
    }
  }, [pdfDocument, currentPage, scale, onTextSelection, pdfjsLib]);

  // Set up text selection when page changes
  useEffect(() => {
    if (pdfDocument && canvasRef.current && containerRef.current && pdfjsLib) {
      // Small delay to ensure canvas is rendered
      setTimeout(() => {
        console.log('PDFViewerNew: Rendering text layer for page', currentPage);
        renderTextLayerForSelection();
      }, 200);
    }
  }, [pdfDocument, currentPage, scale, pdfjsLib, renderTextLayerForSelection]);

  // Navigation functions
  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= numPages) {
      setCurrentPage(pageNum);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // Zoom functions
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  console.log('ViewerNew: Loading check', { 
    loading, 
    hasPdfjsLib: !!pdfjsLib, 
    pdfjsLoaded,
    hasPdfData: !!pdfData,
    shouldShowLoading: loading || !pdfjsLib || !pdfjsLoaded
  });
  
  // Don't render anything if there's no PDF data
  if (!pdfData) {
    return null;
  }
  
  if (loading || !pdfjsLib || !pdfjsLoaded) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            {!pdfjsLib || !pdfjsLoaded ? 'Loading viewer...' : 'Loading document...'}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>{fileName}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center', color: '#dc3545' }}>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>Error</div>
          <div style={{ fontSize: '14px' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        width, 
        height, 
        display: 'flex', 
        flexDirection: 'column',
        background: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'white',
        borderBottom: '1px solid #e9ecef',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            style={{
              padding: '6px 12px',
              border: '1px solid #dee2e6',
              background: currentPage <= 1 ? '#f8f9fa' : 'white',
              borderRadius: '4px',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '14px', color: '#6c757d' }}>
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage >= numPages}
            style={{
              padding: '6px 12px',
              border: '1px solid #dee2e6',
              background: currentPage >= numPages ? '#f8f9fa' : 'white',
              borderRadius: '4px',
              cursor: currentPage >= numPages ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Next →
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={zoomOut}
            style={{
              padding: '6px 12px',
              border: '1px solid #dee2e6',
              background: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Zoom Out
          </button>
          <span style={{ fontSize: '14px', color: '#6c757d', minWidth: '60px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            style={{
              padding: '6px 12px',
              border: '1px solid #dee2e6',
              background: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Zoom In
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0px',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          minHeight: '100%',
          position: 'relative',
          padding: '16px'
        }}>
          <div style={{
            position: 'relative',
            display: 'inline-block'
          }}>
            <canvas
              ref={canvasRef}
              style={{
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                backgroundColor: '#f8f9fa'
              }}
            />
            {/* The text layer will be positioned absolutely over the canvas */}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: '12px 16px',
        background: 'white',
        borderTop: '1px solid #e9ecef',
        fontSize: '14px',
        color: '#6c757d',
        textAlign: 'center',
        flexShrink: 0
      }}>
        💡 Click on text to select it for explanation
      </div>
    </div>
  );
};

export default PDFViewerNew;