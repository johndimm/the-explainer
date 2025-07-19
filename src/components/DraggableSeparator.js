import { useState, useCallback, useEffect, useRef } from 'react';

import { GripVertical } from 'lucide-react';
import styles from '@/styles/DraggableSeparator.module.css';

function isMobile() {
  if (typeof window === 'undefined') return false;
  const result = window.innerWidth <= 768;
  // Mobile detection completed
  return result;
}

function isPortrait() {
  if (typeof window === 'undefined') return false;
  // Check orientation using both media query and aspect ratio
  const mediaQueryPortrait = window.matchMedia('(orientation: portrait)').matches;
  const aspectRatioPortrait = window.innerHeight > window.innerWidth;
  const result = mediaQueryPortrait || aspectRatioPortrait;
  // Reduced logging to avoid spam
  return result;
}

const DraggableSeparator = ({ onResize, leftWidth, onScrollDivider, progress = 0 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [debug, setDebug] = useState({ orientation: '', value: 0 });
  const [thumbPosition, setThumbPosition] = useState(0);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef('landscape'); // 'portrait' or 'landscape'
  const dragActionRef = useRef(null); // 'resize' or 'scroll'
  const dragStartRef = useRef({ x: 0, y: 0 });
  const thumbRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    // Reduced logging to avoid spam
    e.preventDefault();
    e.stopPropagation();
    dragModeRef.current = isPortrait() ? 'portrait' : 'landscape';
    dragActionRef.current = null;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const updateThumbPosition = useCallback((clientX, clientY, shouldScroll = true) => {
    if (!thumbRef.current) return 0;
    
    // Get the container bounds for relative positioning
    const containerRect = thumbRef.current.parentElement.getBoundingClientRect();
    
    let ratio;
    let pixelPosition;
    
    if (isPortrait()) {
      // horizontal drag in portrait - calculate relative to container width
      pixelPosition = Math.max(0, Math.min(containerRect.width, clientX - containerRect.left));
      ratio = pixelPosition / containerRect.width;
    } else {
      // vertical drag in landscape - calculate relative to container height  
      pixelPosition = Math.max(0, Math.min(containerRect.height, clientY - containerRect.top));
      ratio = pixelPosition / containerRect.height;
    }
    
    // Setting thumb position
    
    // 1. Update thumb position immediately in DOM using pixel position (instant visual feedback)
    if (isPortrait()) {
      thumbRef.current.style.left = `${pixelPosition - 25}px`;
      thumbRef.current.style.top = '4px';
    } else {
      thumbRef.current.style.top = `${pixelPosition - 15}px`;
      thumbRef.current.style.left = '4px';
    }
    
    // 2. Update React state (for consistency)
    setThumbPosition(ratio);
    
    // 3. Trigger scroll operation asynchronously if requested
    if (shouldScroll && typeof onScrollDivider === 'function') {
      // Use setTimeout to ensure DOM update happens first
      setTimeout(() => {
        onScrollDivider(ratio);
      }, 0);
    }
    
    return ratio;
  }, [onScrollDivider]);

  const handleThumbMouseDown = useCallback((e) => {
    // Thumb-specific mouse down - force scroll mode
    // Thumb clicked
    e.preventDefault();
    e.stopPropagation();
    dragModeRef.current = isPortrait() ? 'portrait' : 'landscape';
    dragActionRef.current = 'scroll'; // Force scroll mode immediately
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    isDraggingRef.current = true;
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, []);

  const handleThumbTouchStart = useCallback((e) => {
    // Thumb-specific touch start - force scroll mode
    // Only prevent default if we can (non-passive listener)
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (error) {
      // Ignore preventDefault errors in passive listeners
    }
    dragModeRef.current = isPortrait() ? 'portrait' : 'landscape';
    dragActionRef.current = 'scroll'; // Force scroll mode immediately
    if (e.touches && e.touches.length > 0) {
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      dragStartRef.current = { x: 0, y: 0 };
    }
    setIsDragging(true);
    isDraggingRef.current = true;
    document.body.style.userSelect = 'none';

    // Set up the same move/end handlers as the main touch handler
    const calcSize = evt => {
      let clientX, clientY;
      if (evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
      } else if (evt.clientX !== undefined && evt.clientY !== undefined) {
        clientX = evt.clientX;
        clientY = evt.clientY;
      } else {
        return null;
      }
      
      // Adjust constraints based on screen size for landscape mode
      let minConstraint = 20;
      let maxConstraint = 80;
      
      if (!isPortrait() && window.innerWidth < 1024) {
        minConstraint = 20;
        maxConstraint = 70;
      }
      
      if (isPortrait()) {
        const result = Math.max(minConstraint, Math.min(maxConstraint, 100 - (clientY / window.innerHeight) * 100));
        return result;
      } else {
        const result = Math.max(minConstraint, Math.min(maxConstraint, (clientX / window.innerWidth) * 100));
        return result;
      }
    };

    const handleMove = evt => {
      // Only prevent default if we can (non-passive listener)
      try {
        evt.preventDefault();
        evt.stopPropagation();
      } catch (error) {
        // Ignore preventDefault errors in passive listeners
      }
      let clientX, clientY;
      if (evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
      } else if (evt.clientX !== undefined && evt.clientY !== undefined) {
        clientX = evt.clientX;
        clientY = evt.clientY;
      } else {
        return;
      }
      
      updateThumbPosition(clientX, clientY);
    };

    const handleEnd = evt => {
      if (evt) {
        // Only prevent default if we can (non-passive listener)
        try {
          evt.preventDefault();
          evt.stopPropagation();
        } catch (error) {
          // Ignore preventDefault errors in passive listeners
        }
      }
      setIsDragging(false);
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.removeEventListener('touchmove', handleMove, { passive: false });
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleEnd);
      document.removeEventListener('pointercancel', handleEnd);
    };

    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleEnd);
    document.addEventListener('pointercancel', handleEnd);
  }, [onResize]);

  const handleTouchStart = useCallback((e) => {
    // Touch start detected
    // Don't prevent default immediately - wait to see if this is actually a resize gesture
    dragModeRef.current = isPortrait() ? 'portrait' : 'landscape';
    dragActionRef.current = null;
    if (e.touches && e.touches.length > 0) {
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      dragStartRef.current = { x: 0, y: 0 };
    }
    setIsDragging(true);
    document.body.style.userSelect = 'none';

    const calcSize = evt => {
      let clientX, clientY;
      if (evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
      } else if (evt.clientX !== undefined && evt.clientY !== undefined) {
        clientX = evt.clientX;
        clientY = evt.clientY;
      } else {
        return null;
      }
      // Calculating size
      
      // Adjust constraints based on screen size for landscape mode
      let minConstraint = 20;
      let maxConstraint = 80;
      
      if (!isPortrait() && window.innerWidth < 1024) {
        // For landscape on smaller screens, be more restrictive to ensure chat panel has enough space
        minConstraint = 20;
        maxConstraint = 70; // Don't let text panel take more than 70% on smaller screens
      }
      
      if (isPortrait()) {
        // In portrait mode, chat is on top, so dragging up should make chat smaller
        // We invert the calculation: 100 - (clientY / window.innerHeight) * 100
        const result = Math.max(minConstraint, Math.min(maxConstraint, 100 - (clientY / window.innerHeight) * 100));
        // Portrait calculation completed
        return result;
      } else {
        const result = Math.max(minConstraint, Math.min(maxConstraint, (clientX / window.innerWidth) * 100));
        // Landscape calculation completed
        return result;
      }
    };

    const orientation = isPortrait() ? 'portrait' : 'landscape';
    const initialSize = calcSize(e);
    // Initial size calculated
    setDebug({ orientation, value: initialSize });
    if (initialSize !== null) onResize(initialSize);

    const handleMove = evt => {
      // Only prevent default if we're actually resizing
      if (dragActionRef.current === 'resize') {
        try {
          evt.preventDefault();
          evt.stopPropagation();
        } catch (error) {
          // Ignore preventDefault errors in passive listeners
        }
      }
      let clientX, clientY;
      if (evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX;
        clientY = evt.touches[0].clientY;
      } else if (evt.clientX !== undefined && evt.clientY !== undefined) {
        clientX = evt.clientX;
        clientY = evt.clientY;
      } else {
        return;
      }
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      if (!dragActionRef.current) {
        if (dragModeRef.current === 'landscape') {
          // In landscape mode, ONLY allow horizontal movement for resize
          // No scroll functionality on desktop
          if (Math.abs(dx) > 10) {
            dragActionRef.current = 'resize';
          } else {
            return; // not enough movement yet
          }
        } else {
          // In portrait mode, only vertical movement should trigger resize
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 2) {
            dragActionRef.current = 'resize';
          } else if (Math.abs(dx) > 10) {
            // Horizontal movement should be ignored/passed through for scrolling
            return;
          } else {
            return; // not enough movement yet
          }
        }
      }
      if (dragActionRef.current === 'resize') {
        // Adjust constraints based on screen size for landscape mode
        let minConstraint = 20;
        let maxConstraint = 80;
        
        if (dragModeRef.current === 'landscape' && window.innerWidth < 1024) {
          // For landscape on smaller screens, be more restrictive to ensure chat panel has enough space
          minConstraint = 20;
          maxConstraint = 70; // Don't let text panel take more than 70% on smaller screens
        }
        
        if (dragModeRef.current === 'landscape') {
          const newSize = Math.max(minConstraint, Math.min(maxConstraint, (clientX / window.innerWidth) * 100));
          if (typeof onResize === 'function') onResize(newSize);
        } else {
          // portrait: vertical drag resizes
          // In portrait mode, chat is on top, so dragging up should make chat smaller
          const newSize = Math.max(minConstraint, Math.min(maxConstraint, 100 - (clientY / window.innerHeight) * 100));
          if (typeof onResize === 'function') onResize(newSize);
        }
      } else if (dragActionRef.current === 'scroll') {
        updateThumbPosition(clientX, clientY);
      }
      // Log CSS variables
      const root = document.querySelector('.container');
      if (root) {
        const w = root.style.getPropertyValue('--panel-width');
        const h = root.style.getPropertyValue('--panel-height');
        // Orientation debug info
      }
    };
    const handleEnd = evt => {
      if (evt) {
        // Only prevent default if we can (non-passive listener)
        try {
          evt.preventDefault();
          evt.stopPropagation();
        } catch (error) {
          // Ignore preventDefault errors in passive listeners
        }
      }
      setIsDragging(false);
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.removeEventListener('touchmove', handleMove, { passive: false });
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleEnd);
      document.removeEventListener('pointercancel', handleEnd);
    };
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleEnd);
    document.addEventListener('pointercancel', handleEnd);
  }, [onResize, onScrollDivider]);

  const handleMouseMove = useCallback((e) => {
    // Mouse move detected
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!dragActionRef.current) {
      if (dragModeRef.current === 'landscape') {
        // In landscape mode, ONLY allow horizontal dragging for resize
        // No scroll functionality on desktop
        if (Math.abs(dx) > 8) {
          dragActionRef.current = 'resize';
        } else {
          return; // not enough movement yet
        }
      } else {
        // PORTRAIT MODE
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          dragActionRef.current = 'resize';
        } else if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          dragActionRef.current = 'scroll';
        } else {
          return; // not enough movement yet
        }
      }
    }
    if (dragActionRef.current === 'resize') {
      // Adjust constraints based on screen size for landscape mode
      let minConstraint = 20;
      let maxConstraint = 80;
      
      if (dragModeRef.current === 'landscape' && window.innerWidth < 1024) {
        // For landscape on smaller screens, be more restrictive to ensure chat panel has enough space
        minConstraint = 20;
        maxConstraint = 70; // Don't let text panel take more than 70% on smaller screens
      }
      
      if (dragModeRef.current === 'landscape') {
        const newSize = Math.max(minConstraint, Math.min(maxConstraint, (e.clientX / window.innerWidth) * 100));
        if (typeof onResize === 'function') onResize(newSize);
      } else {
        // portrait: vertical drag resizes
        // In portrait mode, chat is on top, so dragging up should make chat smaller
        const newSize = Math.max(minConstraint, Math.min(maxConstraint, 100 - (e.clientY / window.innerHeight) * 100));
        if (typeof onResize === 'function') onResize(newSize);
      }
    } else if (dragActionRef.current === 'scroll') {
      updateThumbPosition(e.clientX, e.clientY);
    }
    // Log CSS variables
    const root = document.querySelector('.container');
    if (root) {
      const w = root.style.getPropertyValue('--panel-width');
      const h = root.style.getPropertyValue('--panel-height');
      // Landscape orientation debug
    }
  }, [isDragging, onResize, onScrollDivider]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Sync thumb position with progress prop, but only when progress actually changes and not dragging
  useEffect(() => {
    if (!isDraggingRef.current && Math.abs(thumbPosition - progress) > 0.01) {
      // Syncing thumb position
      setThumbPosition(progress);
    }
  }, [progress, thumbPosition]);

      // Rendering thumb
  
      
  return (
    <div 
      className={`${styles.separator} ${isDragging ? styles.dragging : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onPointerDown={handleTouchStart}
      style={{ 
        touchAction: isPortrait() ? 'pan-x' : 'pan-y', // Allow scrolling in the non-resize direction
        userSelect: 'none', 
        zIndex: 1000,
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      <div className={styles.handle} style={{ opacity: isDragging ? 0.3 : 1 }}>
        <GripVertical size={20} />
      </div>
      <div 
        ref={thumbRef}
        className={styles.fingerIndicator} 
        style={{ 
          position: 'absolute',
          width: isPortrait() ? '50px' : '16px',
          height: isPortrait() ? '12px' : '30px',
          top: isPortrait() ? '4px' : `calc(${thumbPosition * 100}% - 15px)`,
          left: isPortrait() ? `calc(${thumbPosition * 100}% - 25px)` : '4px',
          zIndex: 2000
        }}
        onMouseDown={handleThumbMouseDown}
        onTouchStart={handleThumbTouchStart}
        onPointerDown={handleThumbTouchStart}
      />
    </div>
  );
};

export default DraggableSeparator; 