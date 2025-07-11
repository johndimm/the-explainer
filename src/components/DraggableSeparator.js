import { useState, useCallback, useEffect, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import styles from '@/styles/DraggableSeparator.module.css';

function isMobile() {
  const mobile = typeof window !== 'undefined' && (window.innerWidth <= 768 || 'ontouchstart' in window);
  console.log('isMobile check:', window.innerWidth, 'ontouchstart:', 'ontouchstart' in window, mobile);
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
    console.log('handleTouchStart called, isMobile:', isMobile());
    if (!isMobile()) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    console.log('Touch started, orientation:', window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape');
    
    // Add touch move listener immediately
    const handleTouchMoveGlobal = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const orientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
      
      let newLeftWidth;
      if (orientation === 'portrait') {
        newLeftWidth = (touch.clientY / window.innerHeight) * 100;
      } else {
        newLeftWidth = (touch.clientX / window.innerWidth) * 100;
      }
      const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
      console.log('Resizing to:', constrainedWidth, 'orientation:', orientation);
      onResize(constrainedWidth);
    };
    
    const handleTouchEndGlobal = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.removeEventListener('touchmove', handleTouchMoveGlobal);
      document.removeEventListener('touchend', handleTouchEndGlobal);
    };
    
    document.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false });
    document.addEventListener('touchend', handleTouchEndGlobal);
  }, [onResize]);



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



  useEffect(() => {
    if (isDragging && !isMobile()) {
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
      style={{ touchAction: 'none' }}
    >
      <div className={styles.handle}>
        <GripVertical size={20} />
      </div>
    </div>
  );
};

export default DraggableSeparator; 