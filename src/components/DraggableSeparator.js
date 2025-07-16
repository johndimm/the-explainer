import { useState, useCallback, useEffect, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import styles from '@/styles/DraggableSeparator.module.css';

function isMobile() {
  if (typeof window === 'undefined') return false;
  const result = window.innerWidth <= 768;
  console.log('isMobile() called, window.innerWidth:', window.innerWidth, 'result:', result);
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
  const [fingerPosition, setFingerPosition] = useState(0);
  const [clickedPosition, setClickedPosition] = useState(null);
  const dragModeRef = useRef('landscape'); // 'portrait' or 'landscape'
  const dragActionRef = useRef(null); // 'resize' or 'scroll'
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    // Reduced logging to avoid spam
    e.preventDefault();
    e.stopPropagation();
    dragModeRef.current = isPortrait() ? 'portrait' : 'landscape';
    dragActionRef.current = null;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    setClickedPosition(null); // Clear clicked position when dragging starts
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    let ratio;
    if (isPortrait()) {
      // In portrait mode, calculate ratio based on horizontal position
      const rect = e.currentTarget.getBoundingClientRect();
      ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    } else {
      // In landscape mode, calculate ratio based on vertical position
      const rect = e.currentTarget.getBoundingClientRect();
      ratio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    }
    
    // Set clicked position to show indicator
    setClickedPosition(ratio);
    
    // Jump to that position in the text
    if (typeof onScrollDivider === 'function') {
      onScrollDivider(ratio);
    }
  }, [isPortrait, onScrollDivider]);

  const handleTouchStart = useCallback((e) => {
    console.log('handleTouchStart called, isMobile:', isMobile(), 'isPortrait:', isPortrait());
    // Don't prevent default immediately - wait to see if this is actually a resize gesture
    dragModeRef.current = isPortrait() ? 'portrait' : 'landscape';
    dragActionRef.current = null;
    if (e.touches && e.touches.length > 0) {
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      dragStartRef.current = { x: 0, y: 0 };
    }
    setIsDragging(true);
    setClickedPosition(null); // Clear clicked position when dragging starts
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
      console.log('calcSize - clientX:', clientX, 'clientY:', clientY, 'window.innerWidth:', window.innerWidth, 'window.innerHeight:', window.innerHeight);
      
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
        console.log('Portrait calculation:', result);
        return result;
      } else {
        const result = Math.max(minConstraint, Math.min(maxConstraint, (clientX / window.innerWidth) * 100));
        console.log('Landscape calculation:', result);
        return result;
      }
    };

    const orientation = isPortrait() ? 'portrait' : 'landscape';
    const initialSize = calcSize(e);
    console.log('Initial size calculated:', initialSize, 'orientation:', orientation);
    setDebug({ orientation, value: initialSize });
    if (initialSize !== null) onResize(initialSize);

    const handleMove = evt => {
      // Only prevent default if we're actually resizing
      if (dragActionRef.current === 'resize') {
        evt.preventDefault();
        evt.stopPropagation();
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
          // In landscape mode, only horizontal movement should trigger resize
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 2) {
            dragActionRef.current = 'resize';
          } else if (Math.abs(dy) > 10) {
            // Vertical movement should be ignored/passed through for scrolling
            return;
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
        let ratio;
        if (dragModeRef.current === 'landscape') {
          // vertical drag in landscape
          ratio = Math.max(0, Math.min(1, clientY / window.innerHeight));
          setFingerPosition(ratio);
        } else {
          // horizontal drag in portrait
          ratio = Math.max(0, Math.min(1, clientX / window.innerWidth));
          setFingerPosition(ratio);
        }
        if (typeof onScrollDivider === 'function') onScrollDivider(ratio);
      }
      // Log CSS variables
      const root = document.querySelector('.container');
      if (root) {
        const w = root.style.getPropertyValue('--panel-width');
        const h = root.style.getPropertyValue('--panel-height');
        console.log('DEBUG: orientation', isPortrait() ? 'portrait' : 'landscape', 'panel-width', w, 'panel-height', h);
      }
    };
    const handleEnd = evt => {
      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      setIsDragging(false);
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
    console.log('handleMouseMove called, isDragging:', isDragging, 'isMobile:', isMobile(), 'isPortrait:', isPortrait());
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!dragActionRef.current) {
      if (dragModeRef.current === 'landscape') {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          dragActionRef.current = 'resize';
        } else if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          dragActionRef.current = 'scroll';
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
      let ratio;
      if (dragModeRef.current === 'landscape') {
        // vertical drag in landscape
        ratio = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
        setFingerPosition(ratio);
      } else {
        // horizontal drag in portrait
        ratio = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
        setFingerPosition(ratio);
      }
      if (typeof onScrollDivider === 'function') onScrollDivider(ratio);
    }
    // Log CSS variables
    const root = document.querySelector('.container');
    if (root) {
      const w = root.style.getPropertyValue('--panel-width');
      const h = root.style.getPropertyValue('--panel-height');
      console.log('DEBUG: orientation landscape panel-width', w, 'panel-height', h);
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

  return (
    <div 
      className={`${styles.separator} ${isDragging ? styles.dragging : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onPointerDown={handleTouchStart}
      onClick={handleClick}
      style={{ 
        touchAction: isPortrait() ? 'pan-x' : 'pan-y', // Allow scrolling in the non-resize direction
        userSelect: 'none', 
        zIndex: 1000,
        width: isPortrait() ? '100%' : '24px',
        height: isPortrait() ? '20px' : '100%'
      }}
    >
      <div className={styles.fingerIndicator} style={{ 
        width: isPortrait() ? '4px' : '100%',
        height: isPortrait() ? '100%' : '4px',
        top: isPortrait() ? '0' : `${(dragActionRef.current === 'scroll' && fingerPosition > 0 ? fingerPosition : (clickedPosition !== null ? clickedPosition : progress)) * 100}%`,
        left: isPortrait() ? `${(dragActionRef.current === 'scroll' && fingerPosition > 0 ? fingerPosition : (clickedPosition !== null ? clickedPosition : progress)) * 100}%` : '0'
      }} />
      <div className={styles.handle}>
        <GripVertical size={20} />
      </div>
    </div>
  );
};

export default DraggableSeparator; 