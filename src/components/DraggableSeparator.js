import { useState, useCallback, useEffect, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import styles from '@/styles/DraggableSeparator.module.css';

function isMobile() {
  const mobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  console.log('isMobile check:', window.innerWidth, mobile);
  return mobile;
}

const DraggableSeparator = ({ onResize, leftWidth, onScrollDivider }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragMode = useRef(null); // 'scroll' or 'resize'

  const handleMouseDown = useCallback((e) => {
    if (isMobile()) return; // Only allow on desktop
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (!isMobile()) return;
    e.preventDefault();
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    dragMode.current = null;
    console.log('handleTouchStart fired, orientation:', window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape');
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !isMobile()) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const orientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
    // Threshold to determine gesture direction
    const threshold = 10;
    if (!dragMode.current) {
      if (absDx > threshold || absDy > threshold) {
        dragMode.current = (absDy > absDx) ? 'scroll' : 'resize';
        console.log('Gesture detected:', dragMode.current, 'dx:', dx, 'dy:', dy);
      } else {
        // Not enough movement yet
        return;
      }
    }
    if (dragMode.current === 'scroll') {
      // Always use vertical drag (Y) for scrolling on mobile
      const containerHeight = window.innerHeight;
      let ratio = touch.clientY / containerHeight;
      ratio = Math.max(0, Math.min(1, ratio));
      console.log('handleTouchMove (scroll) called, isMobile:', isMobile(), 'orientation:', orientation, 'ratio:', ratio);
      if (onScrollDivider) onScrollDivider(ratio);
    } else if (dragMode.current === 'resize') {
      // Use horizontal drag for resizing
      const containerWidth = window.innerWidth;
      const newLeftWidth = (touch.clientX / containerWidth) * 100;
      const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
      console.log('handleTouchMove (resize) called, isMobile:', isMobile(), 'orientation:', orientation, 'leftWidth:', constrainedWidth);
      onResize(constrainedWidth);
    }
  }, [isDragging, onResize, onScrollDivider]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || isMobile()) return;
    const containerWidth = window.innerWidth;
    const newLeftWidth = (e.clientX / containerWidth) * 100;
    const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
    onResize(constrainedWidth);
  }, [isDragging, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      if (isMobile()) {
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        return () => {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        };
      } else {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div 
      className={`${styles.separator} ${isDragging ? styles.dragging : ''}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className={styles.handle}>
        <GripVertical size={20} />
      </div>
    </div>
  );
};

export default DraggableSeparator; 