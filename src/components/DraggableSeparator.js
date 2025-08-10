import { useState, useCallback, useEffect, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import styles from '@/styles/DraggableSeparator.module.css';

function isMobile() {
  if (typeof window === 'undefined') return false;
  const result = window.innerWidth <= 768;
  return result;
}

function isPortrait() {
  if (typeof window === 'undefined') return false;
  const mediaQueryPortrait = window.matchMedia('(orientation: portrait)').matches;
  const aspectRatioPortrait = window.innerHeight > window.innerWidth;
  const result = mediaQueryPortrait || aspectRatioPortrait;
  return result;
}

const DraggableSeparator = ({ onResize, leftWidth }) => {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef('landscape');
  const dragActionRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragModeRef.current = isPortrait() ? 'portrait' : 'landscape';
    dragActionRef.current = null;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleTouchStart = useCallback((e) => {
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
          if (Math.abs(dx) > 10) {
            dragActionRef.current = 'resize';
          } else {
            return;
          }
        } else {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 2) {
            dragActionRef.current = 'resize';
          } else if (Math.abs(dx) > 10) {
            return;
          } else {
            return;
          }
        }
      }
      if (dragActionRef.current === 'resize') {
        let minConstraint = 20;
        let maxConstraint = 80;
        
        if (dragModeRef.current === 'landscape' && window.innerWidth < 1024) {
          minConstraint = 20;
          maxConstraint = 70;
        }
        
        if (dragModeRef.current === 'landscape') {
          const newSize = Math.max(minConstraint, Math.min(maxConstraint, (clientX / window.innerWidth) * 100));
          if (typeof onResize === 'function') onResize(newSize);
        } else {
          const newSize = Math.max(minConstraint, Math.min(maxConstraint, 100 - (clientY / window.innerHeight) * 100));
          if (typeof onResize === 'function') onResize(newSize);
        }
      }
    };

    const handleEnd = evt => {
      if (evt) {
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

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!dragActionRef.current) {
      if (dragModeRef.current === 'landscape') {
        if (Math.abs(dx) > 8) {
          dragActionRef.current = 'resize';
        } else {
          return;
        }
      } else {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          dragActionRef.current = 'resize';
        } else {
          return;
        }
      }
    }
    if (dragActionRef.current === 'resize') {
      let minConstraint = 20;
      let maxConstraint = 80;
      
      if (dragModeRef.current === 'landscape' && window.innerWidth < 1024) {
        minConstraint = 20;
        maxConstraint = 70;
      }
      
      if (dragModeRef.current === 'landscape') {
        const newSize = Math.max(minConstraint, Math.min(maxConstraint, (e.clientX / window.innerWidth) * 100));
        if (typeof onResize === 'function') onResize(newSize);
      } else {
        const newSize = Math.max(minConstraint, Math.min(maxConstraint, 100 - (e.clientY / window.innerHeight) * 100));
        if (typeof onResize === 'function') onResize(newSize);
      }
    }
  }, [isDragging, onResize]);

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
      style={{ 
        touchAction: isPortrait() ? 'pan-x' : 'pan-y',
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
    </div>
  );
};

export default DraggableSeparator; 