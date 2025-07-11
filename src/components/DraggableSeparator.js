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
  const result = window.matchMedia('(orientation: portrait)').matches;
  console.log('isPortrait() called, result:', result);
  return result;
}

const DraggableSeparator = ({ onResize, leftWidth, onScrollDivider }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [debug, setDebug] = useState({ orientation: '', value: 0 });

  const handleMouseDown = useCallback((e) => {
    console.log('handleMouseDown called, isMobile:', isMobile(), 'isPortrait:', isPortrait());
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleTouchStart = useCallback((e) => {
    console.log('handleTouchStart called, isMobile:', isMobile(), 'isPortrait:', isPortrait());
    e.preventDefault();
    e.stopPropagation();
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
      console.log('calcSize - clientX:', clientX, 'clientY:', clientY, 'window.innerWidth:', window.innerWidth, 'window.innerHeight:', window.innerHeight);
      if (isPortrait()) {
        const result = Math.max(20, Math.min(80, (clientY / window.innerHeight) * 100));
        console.log('Portrait calculation:', result);
        return result;
      } else {
        const result = Math.max(20, Math.min(80, (clientX / window.innerWidth) * 100));
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
      evt.preventDefault();
      evt.stopPropagation();
      const newSize = calcSize(evt);
      console.log('handleMove - newSize:', newSize, 'orientation:', isPortrait() ? 'portrait' : 'landscape');
      setDebug({ orientation: isPortrait() ? 'portrait' : 'landscape', value: newSize });
      if (newSize !== null) onResize(newSize);
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
  }, [onResize]);

  const handleMouseMove = useCallback((e) => {
    console.log('handleMouseMove called, isDragging:', isDragging, 'isMobile:', isMobile(), 'isPortrait:', isPortrait());
    if (!isDragging) return;
    const newLeftWidth = (e.clientX / window.innerWidth) * 100;
    console.log('Mouse move - clientX:', e.clientX, 'window.innerWidth:', window.innerWidth, 'newLeftWidth:', newLeftWidth);
    setDebug({ orientation: 'landscape', value: newLeftWidth });
    const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
    console.log('Constrained width:', constrainedWidth);
    onResize(constrainedWidth);
    // Log CSS variables
    const root = document.querySelector('.container');
    if (root) {
      const w = root.style.getPropertyValue('--panel-width');
      const h = root.style.getPropertyValue('--panel-height');
      console.log('DEBUG: orientation landscape panel-width', w, 'panel-height', h);
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
        touchAction: 'none', 
        userSelect: 'none', 
        zIndex: 1000,
        width: isPortrait() ? '100%' : '24px',
        height: isPortrait() ? '20px' : '100%'
      }}
    >
      <div className={styles.handle}>
        <GripVertical size={20} />
      </div>
    </div>
  );
};

export default DraggableSeparator; 