import { useState, useCallback, useEffect, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import styles from '@/styles/DraggableSeparator.module.css';

function isMobile() {
  if (typeof window === 'undefined') return false;
  
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check for mobile screen size
  const isSmallScreen = window.innerWidth <= 768;
  
  // Check for mobile user agent
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const mobile = hasTouch || isSmallScreen || isMobileUA;
  console.log('isMobile check:', {
    width: window.innerWidth,
    hasTouch,
    isSmallScreen,
    isMobileUA,
    maxTouchPoints: navigator.maxTouchPoints,
    userAgent: navigator.userAgent,
    mobile
  });
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
    console.log('=== TOUCH START ===');
    
    if (!isMobile()) {
      console.log('Not mobile, returning');
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    
    // Get touch/pointer position
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined && e.clientY !== undefined) {
      // Pointer event
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      console.log('No valid touch/pointer position found');
      return;
    }
    
    const orientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
    
    let newLeftWidth;
    if (orientation === 'portrait') {
      newLeftWidth = (clientY / window.innerHeight) * 100;
    } else {
      newLeftWidth = (clientX / window.innerWidth) * 100;
    }
    const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
    console.log('Initial resize to:', constrainedWidth, 'orientation:', orientation);
    onResize(constrainedWidth);
    
    // Add a simple touch/pointer move handler
    const handleMove = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Get touch/pointer position
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        // Touch event
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.clientX !== undefined && e.clientY !== undefined) {
        // Pointer event
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }
      
      const orientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
      
      let newLeftWidth;
      if (orientation === 'portrait') {
        newLeftWidth = (clientY / window.innerHeight) * 100;
      } else {
        newLeftWidth = (clientX / window.innerWidth) * 100;
      }
      const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
      onResize(constrainedWidth);
    };
    
    const handleEnd = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.removeEventListener('touchmove', handleMove, { passive: false });
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
    
    // Add multiple event listeners for better compatibility
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleEnd);
    document.addEventListener('pointercancel', handleEnd);
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
      onPointerDown={handleTouchStart}
      onClick={() => console.log('=== CLICK === Separator clicked!')}
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <div className={styles.handle}>
        <GripVertical size={20} />
      </div>
    </div>
  );
};

export default DraggableSeparator; 