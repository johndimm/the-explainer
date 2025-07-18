import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Global variables for PDF.js
let pdfjsLib = null;

const PDFViewer = ({ 
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
  const [scale, setScale] = useState(1.0); // Start with 1.0x scale and adjust based on container
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectedTextElements, setSelectedTextElements] = useState(new Set());
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const [renderTextLayerLoaded, setRenderTextLayerLoaded] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Add CSS for text layer styling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        .textLayer {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          overflow: hidden !important;
          opacity: 1 !important;
          mix-blend-mode: multiply !important;
          pointer-events: auto !important;
        }
        .textLayer > div {
          color: rgba(0, 0, 0, 0.01) !important;
          position: absolute !important;
          white-space: pre !important;
          cursor: text !important;
          transform-origin: 0% 0% !important;
          user-select: none !important;
          transition: background-color 0.1s ease !important;
          pointer-events: auto !important;
        }
        .pdf-text-element {
          color: rgba(0, 0, 0, 0.01) !important;
          cursor: text !important;
          user-select: none !important;
          transition: background-color 0.1s ease !important;
          pointer-events: auto !important;
        }
        .pdf-text-element:hover {
          background-color: rgba(0, 123, 255, 0.05) !important;
        }
        .pdf-text-element.selected {
          background-color: rgba(0, 123, 255, 0.2) !important;
          color: rgba(0, 0, 0, 0.8) !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Load PDF.js library
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('Viewer: Starting library import...');
    
    import('pdfjs-dist').then((module) => {
      console.log('Viewer: Library module loaded', { moduleKeys: Object.keys(module) });
      pdfjsLib = module;
      // Try using the worker from the installed package
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      console.log('Viewer: Using local worker from public directory');
      console.log('Viewer: GlobalWorkerOptions:', pdfjsLib.GlobalWorkerOptions);
      
      console.log('Viewer: Library fully loaded and ready');
      
      // Update React state
      setPdfjsLoaded(true);
      setRenderTextLayerLoaded(true); // We don't need the viewer module anymore
    }).catch(error => {
      console.error('Failed to load PDF.js library:', error);
      console.error('Error details:', error.message, error.stack);
    });
  }, []);

  // Load PDF document
  useEffect(() => {
    console.log('Viewer: useEffect triggered', { 
      hasPdfData: !!pdfData, 
      pdfDataLength: pdfData ? pdfData.length : 0,
      hasPdfjsLib: !!pdfjsLib, 
      pdfjsLoaded,
      renderTextLayerLoaded
    });
    
    // Clean up previous PDF state when pdfData changes or becomes null
    if (!pdfData) {
      console.log('Viewer: No PDF data, cleaning up state');
      setPdfDocument(null);
      setCurrentPage(1);
      setNumPages(0);
      setScale(1.0);
      setLoading(false);
      setError(null);
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectedTextElements(new Set());
      
      // Clear any existing text layer
      const textElements = document.querySelectorAll('.pdf-text-element');
      textElements.forEach(el => {
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseup', handleMouseUp);
      });
      
      // Remove text layer div
      const textLayer = document.querySelector('.textLayer');
      if (textLayer) {
        textLayer.remove();
      }
      
      return;
    }
    
    if (!pdfjsLib || !pdfjsLoaded) {
      console.log('Viewer: Missing library or not loaded, returning');
      return;
    }

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Validate PDF data
        if (!pdfData || pdfData.length === 0) {
          throw new Error('PDF data is empty or null');
        }
        
        // Convert base64 to Uint8Array
        console.log('Viewer: Converting document data', { 
          pdfDataLength: pdfData.length,
          pdfDataStart: pdfData.substring(0, 50) + '...'
        });
        
        let pdfBytes;
        try {
          const decodedData = atob(pdfData);
          console.log('Viewer: Base64 decoded successfully, length:', decodedData.length);
          
          // Check if it looks like a valid document (should start with %PDF)
          console.log('Viewer: Document header check:', decodedData.substring(0, 10));
          
          if (!decodedData.startsWith('%PDF')) {
            console.warn('Viewer: Document data does not start with expected header');
          }
          
          pdfBytes = new Uint8Array(
            decodedData
              .split('')
              .map(char => char.charCodeAt(0))
          );
        } catch (decodeError) {
          console.error('PDFViewer: Error decoding base64 PDF data:', decodeError);
          throw new Error('Invalid PDF data format (base64 decoding failed)');
        }
        
        console.log('Viewer: Document bytes created', { 
          bytesLength: pdfBytes.length,
          firstBytes: Array.from(pdfBytes.slice(0, 10))
        });
        
        console.log('Viewer: Creating document loading task...');
        console.log('Viewer: Current GlobalWorkerOptions:', pdfjsLib.GlobalWorkerOptions);
        console.log('Viewer: Current workerSrc:', pdfjsLib.GlobalWorkerOptions.workerSrc);
        
        // Try using the CDN worker with standard configuration
        console.log('Viewer: Attempting to load document with worker...');
        
        // Use standard configuration with CDN worker
        const loadingTask = pdfjsLib.getDocument({
          data: pdfBytes,
          verbosity: 1
        });
        
        // Add progress callback
        loadingTask.onProgress = (progress) => {
          console.log('Viewer: Loading progress:', progress);
        };
        
        console.log('Viewer: Loading task created, waiting for promise...');
        
        console.log('Viewer: About to await document promise...');
        
        // Try to get more information about the loading task
        console.log('Viewer: Loading task object:', loadingTask);
        console.log('Viewer: Loading task promise:', loadingTask.promise);
        
        // Use the promise directly - no timeout needed since it's working
        let pdf;
        console.log('Viewer: Starting direct promise await...');
        pdf = await loadingTask.promise;
        console.log('Viewer: Document promise resolved successfully');
        
        console.log('Viewer: Document loaded successfully', { 
          numPages: pdf.numPages,
          pdfDataLength: pdfData ? pdfData.length : 0,
          pdfObject: pdf
        });
        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        
        // Calculate appropriate scale to fit container
        if (containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth - 64; // Account for padding
          const firstPage = await pdf.getPage(1);
          const viewport = firstPage.getViewport({ scale: 1.0 });
          const scaleToFit = Math.min(1.0, (containerWidth - 32) / viewport.width); // Leave some margin
          console.log('Viewer: Scale calculation', {
            containerWidth,
            viewportWidth: viewport.width,
            scaleToFit,
            originalScale: scale
          });
          setScale(scaleToFit);
        }
        
        if (onLoadComplete) {
          onLoadComplete({ numPages: pdf.numPages, fileName });
        }
      } catch (err) {
        console.error('PDFViewer: Error loading PDF:', err);
        console.error('PDFViewer: Error details:', err.message, err.stack);
        console.error('PDFViewer: Error name:', err.name);
        console.error('PDFViewer: Error constructor:', err.constructor.name);
        
        // Check if it's a timeout error
        if (err.message.includes('timeout')) {
          console.error('PDFViewer: PDF loading timed out - this suggests the PDF.js library is hanging');
          setError('PDF loading timed out. The file may be corrupted or too complex.');
        } else if (err.name === 'InvalidPDFException') {
          console.error('PDFViewer: Invalid PDF exception - file is corrupted or not a valid PDF');
          setError('Invalid PDF file. The file may be corrupted or not a valid PDF.');
        } else if (err.name === 'PasswordException') {
          console.error('PDFViewer: Password protected PDF');
          setError('This PDF is password protected.');
        } else {
          console.error('PDFViewer: Unknown PDF loading error');
          setError('Failed to load PDF. The file may be corrupted or password-protected.');
        }
      } finally {
        console.log('Viewer: Document loading completed, setting loading to false');
        setLoading(false);
      }
    };

    loadPDF();
    
    // Cleanup function to reset state when pdfData changes
    return () => {
      console.log('Viewer: Cleaning up PDF viewer state');
      setPdfDocument(null);
      setCurrentPage(1);
      setNumPages(0);
      setScale(1.0);
      setLoading(false);
      setError(null);
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectedTextElements(new Set());
      
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      
      // Clear any existing text layer
      const textElements = document.querySelectorAll('.pdf-text-element');
      textElements.forEach(el => {
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseup', handleMouseUp);
      });
      
      // Remove text layer div
      const textLayer = document.querySelector('.textLayer');
      if (textLayer) {
        textLayer.remove();
      }
    };
  }, [pdfData, onLoadComplete, fileName, pdfjsLib, pdfjsLoaded, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Clean extracted text from PDF - simplified to avoid removing valid words
  const cleanPDFText = useCallback((text) => {
    if (!text) return '';
    
    // For now, just return the text with minimal cleaning to test
    return text.trim();
  }, []);

  // Text selection handlers - defined before renderTextLayer
  const handleMouseDown = useCallback((e) => {
    console.log('Viewer: Mouse down event triggered', e.target);
    const target = e.target;
    console.log('Viewer: Target element:', target);
    console.log('Viewer: Target classes:', target ? target.className : 'no target');
    if (target && target.classList.contains('pdf-text-element')) {
      console.log('Viewer: Text element clicked:', target.textContent);
      setIsSelecting(true);
      setSelectionStart(target);
      setSelectedTextElements(new Set([target]));
      target.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
      target.style.color = 'rgba(0, 0, 0, 0.8)';
    } else {
      console.log('Viewer: Clicked element is not a text element');
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isSelecting || !selectionStart) return;
    
    const target = e.target;
    if (target && target.classList.contains('pdf-text-element')) {
      // Find all text elements between selectionStart and current target
      const textElements = Array.from(document.querySelectorAll('.pdf-text-element'));
      const startIndex = textElements.indexOf(selectionStart);
      const endIndex = textElements.indexOf(target);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        
        // Clear previous selection
        textElements.forEach(el => {
          el.style.backgroundColor = '';
          el.style.color = '';
        });
        
        // Highlight selected range
        const selectedElements = textElements.slice(minIndex, maxIndex + 1);
        selectedElements.forEach(el => {
          el.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
          el.style.color = 'rgba(0, 0, 0, 0.8)';
        });
        
        setSelectedTextElements(new Set(selectedElements));
      }
    }
  }, [isSelecting, selectionStart]);

  const handleMouseUp = useCallback((e) => {
    if (isSelecting && selectedTextElements.size > 0) {
      // Get selected text
      const selectedText = Array.from(selectedTextElements)
        .map(el => el.textContent)
        .join(' ')
        .trim();
      
      if (selectedText.length > 0) {
        const cleanedText = cleanPDFText(selectedText);
        
        if (cleanedText.length > 0 && onTextSelection) {
          onTextSelection(cleanedText, {
            page: currentPage,
            selectionType: 'range',
            elementCount: selectedTextElements.size
          });
        }
      }
      
      // Clear selection after a short delay
      setTimeout(() => {
        selectedTextElements.forEach(el => {
          el.style.backgroundColor = '';
          el.style.color = '';
        });
        setSelectedTextElements(new Set());
        setIsSelecting(false);
        setSelectionStart(null);
      }, 500);
    } else if (!isSelecting) {
      // Single click - collect text from adjacent elements on same line
      const target = e.target;
      if (target && target.classList.contains('pdf-text-element')) {
        const allElements = Array.from(document.querySelectorAll('.pdf-text-element'));
        const targetIndex = allElements.indexOf(target);
        
        // Get elements on the same line (similar y position) and nearby elements
        const targetTop = target.offsetTop;
        const targetLeft = target.offsetLeft;
        const tolerance = 15; // Even more tolerance for same line
        const horizontalRange = 200; // Look for elements within 200px to the left
        
        const sameLineElements = allElements.filter(el => 
          Math.abs(el.offsetTop - targetTop) <= tolerance &&
          el.offsetLeft <= targetLeft + 10 // Include elements up to 10px to the right
        ).sort((a, b) => a.offsetLeft - b.offsetLeft); // Sort by horizontal position
        
        console.log('Viewer: Found elements on same line:', sameLineElements.map(el => ({
          text: el.textContent,
          left: el.offsetLeft,
          top: el.offsetTop
        })));
        
        // Collect text from all elements on the same line
        const lineText = sameLineElements
          .map(el => el.textContent)
          .join('')
          .trim();
          
        console.log('Viewer: Complete line text:', lineText);
        
        if (lineText.length > 0) {
          const cleanedText = cleanPDFText(lineText);
          console.log('Viewer: Text before cleaning:', `"${lineText}"`);
          console.log('Viewer: Text after cleaning:', `"${cleanedText}"`);
          
          if (cleanedText.length > 0 && onTextSelection) {
            console.log('Viewer: Calling onTextSelection with:', `"${cleanedText}"`);
            console.log('Viewer: onTextSelection function:', onTextSelection);
            console.log('Viewer: About to call onTextSelection...');
            onTextSelection(cleanedText, {
              page: currentPage,
              selectionType: 'line',
              elementCount: sameLineElements.length
            });
            console.log('Viewer: onTextSelection call completed');
          }
        }
      }
    }
  }, [isSelecting, selectedTextElements, cleanPDFText, onTextSelection, currentPage]);

  // Render current page
  useEffect(() => {
    console.log('Viewer: Page rendering effect triggered', {
      hasPdfDocument: !!pdfDocument,
      hasCanvasRef: !!canvasRef.current,
      hasPdfjsLib: !!pdfjsLib,
      currentPage,
      scale
    });
    
    if (!pdfDocument || !canvasRef.current || !pdfjsLib) {
      console.log('Viewer: Missing dependencies for page rendering, returning');
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

        // Test canvas rendering with a simple rectangle
        context.fillStyle = '#ff0000';
        context.fillRect(10, 10, 100, 50);
        console.log('Viewer: Test rectangle drawn on canvas');

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        if (!isCancelled) {
          // Cancel any existing render task
          if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
          }
          
                  console.log('Viewer: Starting page render', { 
          pageNumber: currentPage, 
          scale, 
          viewportWidth: viewport.width, 
          viewportHeight: viewport.height,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          canvasStyleWidth: canvas.style.width,
          canvasStyleHeight: canvas.style.height
        });
          
          // Start new render task
          renderTaskRef.current = page.render(renderContext);
          await renderTaskRef.current.promise;
          
          console.log('Viewer: Page render completed');
        }
      } catch (err) {
        setError('Failed to render PDF page.');
      }
    };

    renderPage();

    // Cleanup function to cancel rendering if component unmounts or dependencies change
    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDocument, currentPage, scale, pdfjsLib]);

  // Render text layer for selection using simple positioned text elements
  // VERSION 2.0 - Simple text element approach (not TextLayerBuilder)
  const renderTextLayerForSelection = useCallback(async () => {
    console.log('Viewer: NEW CODE - renderTextLayerForSelection called');
    if (!pdfDocument || !canvasRef.current || !containerRef.current || !pdfjsLib) return;

    try {
      const page = await pdfDocument.getPage(currentPage);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale });
      
      let textLayerDiv = textLayerRef.current;
      if (!textLayerDiv) {
        textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerRef.current = textLayerDiv;
      }

      // Clear previous content
      textLayerDiv.innerHTML = '';

      // Style the text layer to match canvas exactly
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      textLayerDiv.style.position = 'absolute';
      textLayerDiv.style.left = `${canvasRect.left - containerRect.left}px`;
      textLayerDiv.style.top = `${canvasRect.top - containerRect.top}px`;
      textLayerDiv.style.width = `${canvasRect.width}px`;
      textLayerDiv.style.height = `${canvasRect.height}px`;
      textLayerDiv.style.pointerEvents = 'auto';
      textLayerDiv.style.opacity = 1;
      textLayerDiv.style.color = 'transparent';
      textLayerDiv.style.userSelect = 'none';
      textLayerDiv.style.transform = 'scale(1)';
      textLayerDiv.style.transformOrigin = 'top left';
      textLayerDiv.style.overflow = 'hidden';
      textLayerDiv.style.zIndex = '1000';

      console.log('Viewer: Creating text elements for', textContent.items.length, 'text items');
      
      // Create text elements for each text item
      textContent.items.forEach((item, index) => {
        console.log('Viewer: Creating text element for item', index, 'with text:', `"${item.str}"`, 'width:', item.width, 'transform:', item.transform);
        const textElement = document.createElement('div');
        textElement.className = 'pdf-text-element';
        textElement.textContent = item.str;
        
        // Position the text element using PDF coordinates
        const transform = item.transform;
        const [a, b, c, d, e, f] = transform;
        
        // Calculate scale ratio between canvas display size and viewport
        const canvas = canvasRef.current;
        const scaleX = canvas.offsetWidth / viewport.width;
        const scaleY = canvas.offsetHeight / viewport.height;
        
        // Calculate proper coordinates using the viewport and canvas relationship
        // The PDF viewport coordinates need to be scaled to match canvas display size
        const canvasRect = canvas.getBoundingClientRect();
        const textLayerRect = textLayerDiv.getBoundingClientRect();
        
        // Apply transform-aware positioning
        const x = (e * scaleX);
        const y = (viewport.height - f) * scaleY;
        
        textElement.style.position = 'absolute';
        textElement.style.left = `${x}px`;
        textElement.style.top = `${y}px`;
        textElement.style.width = `${(item.width * scaleX) + 30}px`; // Extend width to cover more text
        textElement.style.height = `${Math.abs(d) * scaleY}px`;
        textElement.style.fontSize = `${Math.abs(d) * scaleY}px`;
        textElement.style.fontFamily = item.fontName || 'sans-serif';
        textElement.style.color = 'rgba(0, 0, 0, 0.01)'; // Nearly transparent
        textElement.style.backgroundColor = 'transparent'; // No debugging background
        textElement.style.cursor = 'text';
        textElement.style.userSelect = 'none';
        textElement.style.pointerEvents = 'auto';
        textElement.style.whiteSpace = 'pre';
        textElement.style.zIndex = '1001';
        textElement.style.lineHeight = '1';
        textElement.style.transformOrigin = 'left top';
        
        // Add event listeners
        textElement.addEventListener('mousedown', handleMouseDown);
        textElement.addEventListener('mousemove', handleMouseMove);
        textElement.addEventListener('mouseup', handleMouseUp);
        
        // Store text data for selection
        textElement.dataset.text = item.str;
        textElement.dataset.index = index;
        
        textLayerDiv.appendChild(textElement);
      });
      
      console.log('Viewer: Created', textContent.items.length, 'text elements');

      // Remove any previous text layer
      const container = containerRef.current;
      const prev = container.querySelector('.textLayer');
      if (prev && prev !== textLayerDiv) {
        container.removeChild(prev);
      }

      // Find the canvas container div and add text layer
      const canvasContainer = container.querySelector('div[style*="position: relative"]');
      if (canvasContainer) {
        if (!canvasContainer.contains(textLayerDiv)) {
          canvasContainer.appendChild(textLayerDiv);
        }
        
        // Update text layer positioning to match canvas exactly
        const canvas = canvasRef.current;
        if (canvas) {
          console.log('Viewer: Positioning text layer over canvas');
          textLayerDiv.style.left = '0px';
          textLayerDiv.style.top = '0px';
          textLayerDiv.style.width = `${canvas.style.width}`;
          textLayerDiv.style.height = `${canvas.style.height}`;
          textLayerDiv.style.position = 'absolute';
          textLayerDiv.style.zIndex = '10';
          textLayerDiv.style.pointerEvents = 'auto';
        }
      } else {
        // Fallback to main container
        if (!container.contains(textLayerDiv)) {
          container.appendChild(textLayerDiv);
        }
      }
    } catch (error) {
      console.error('Error setting up text selection:', error);
    }
  }, [pdfDocument, currentPage, scale, onTextSelection, pdfjsLib]);

  // Set up text selection when page changes
  useEffect(() => {
    if (pdfDocument && canvasRef.current && containerRef.current && pdfjsLib) {
      // Small delay to ensure canvas is rendered
      setTimeout(() => {
        console.log('Viewer: Rendering text layer for page', currentPage);
        renderTextLayerForSelection();
      }, 200);
    }
    
    // Cleanup function to remove event listeners
    return () => {
      const textElements = document.querySelectorAll('.pdf-text-element');
      textElements.forEach(el => {
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseup', handleMouseUp);
      });
    };
  }, [pdfDocument, currentPage, scale, pdfjsLib, renderTextLayerForSelection, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Handle container resize and recalculate scale
  useEffect(() => {
    if (!pdfDocument || !containerRef.current) return;

    const handleResize = async () => {
      try {
        const containerWidth = containerRef.current.offsetWidth - 64; // Account for padding
        const firstPage = await pdfDocument.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        const scaleToFit = Math.min(1.0, (containerWidth - 32) / viewport.width); // Leave some margin
        setScale(scaleToFit);
      } catch (error) {
        console.error('Error recalculating scale on resize:', error);
      }
    };

    // Debounce resize events
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [pdfDocument]);

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

  // Handler for PDF text selection
  const handlePDFTextSelection = useCallback((selectedText, metadata) => {
    if (selectedText && selectedText.trim().length > 0) {
      if (onTextSelection) {
        onTextSelection({
          text: selectedText.trim(),
          speaker: null,
          source: 'pdf',
          metadata
        });
      }
    }
  }, [onTextSelection]);

  // Handler for PDF load completion
  const handlePDFLoadComplete = useCallback((info) => {
    // PDF loaded successfully
  }, []);

  console.log('Viewer: Loading check', { 
    loading, 
    hasPdfjsLib: !!pdfjsLib, 
    pdfjsLoaded, 
    renderTextLayerLoaded,
    hasPdfData: !!pdfData,
    shouldShowLoading: loading || !pdfjsLib || !pdfjsLoaded || !renderTextLayerLoaded
  });
  
  // Don't render anything if there's no PDF data
  if (!pdfData) {
    return null;
  }
  
  if (loading || !pdfjsLib || !pdfjsLoaded || !renderTextLayerLoaded) {
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
            {!pdfjsLib || !pdfjsLoaded || !renderTextLayerLoaded ? 'Loading viewer...' : 'Loading document...'}
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

  console.log('Viewer: Rendering component', { 
    loading, 
    hasPdfjsLib: !!pdfjsLib, 
    error, 
    numPages, 
    currentPage,
    hasPdfDocument: !!pdfDocument 
  });

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
                backgroundColor: '#f8f9fa',
                pointerEvents: 'none' // Allow clicks to pass through to text layer
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
        💡 Click and drag to select text, or click on individual words
      </div>
    </div>
  );
};

export default PDFViewer; 