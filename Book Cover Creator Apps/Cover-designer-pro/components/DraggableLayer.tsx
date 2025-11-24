import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayerState } from '../types';

interface DraggableLayerProps {
  layer: LayerState;
  src: string;
  isActive: boolean;
  onUpdate: (updates: Partial<LayerState>) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const DraggableLayer: React.FC<DraggableLayerProps> = ({
  layer,
  src,
  isActive,
  onUpdate,
  containerRef
}) => {
  const elementRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialLeft: 0, initialTop: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    if (!containerRef.current || !elementRef.current) return;
    
    // If we only want the active tab layer to be draggable, uncomment below:
    // if (!isActive) return; 

    setIsDragging(true);
    
    // Store initial positions
    const containerRect = containerRef.current.getBoundingClientRect();
    const elemRect = elementRef.current.getBoundingClientRect();

    // Calculate current % based position to exact pixels for smooth start
    const currentLeft = elemRect.left - containerRect.left;
    const currentTop = elemRect.top - containerRect.top;

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      initialLeft: currentLeft,
      initialTop: currentTop,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    const newLeftPx = dragStartRef.current.initialLeft + deltaX;
    const newTopPx = dragStartRef.current.initialTop + deltaY;

    // Convert back to percentage for responsive state
    // We add half width/height logic in render to center the point, 
    // but here we just map the top-left corner relative to container
    
    // However, our state stores center position (transform -50%), 
    // so we need to adjust calculation.
    
    // Let's recalculate based on the requirement:
    // x/y state is the percentage from left/top of container to center of element.
    
    const newXPercent = (newLeftPx / containerRect.width) * 100;
    const newYPercent = (newTopPx / containerRect.height) * 100;

    // We need to account for the transform translate(-50%, -50%) 
    // The visual left is (x% - width/2). 
    // Actually, simpler: 
    // The mouse moved Delta pixels.
    // Delta % X = (Delta Pixels / Width) * 100
    // New State X = Old State X + Delta % X
    
    // Let's use the delta approach to avoid "jumping" when grabbing non-center
    // But we need the INITIAL state X/Y which we didn't store in ref.
    
    // Reverting to simple visual projection:
    // We want the element center to be at the new position.
    // But the drag anchor might not be the center.
    
    // Robust approach:
    // 1. Calculate the % offset of the mouse relative to the element's top-left at start.
    // 2. Maintain that offset.
    
    // Simplified for this task as per original code logic:
    // original: leftPercent = ((moveX - canvasRect.left) / width) * 100 - offsetX;
    
    // Let's just update based on delta for smoothness.
    const deltaXPercent = (deltaX / containerRect.width) * 100;
    const deltaYPercent = (deltaY / containerRect.height) * 100;
    
    // We need to store initial PERCENTAGE in startRef for this to work perfectly without accumulation errors.
    // Since we don't have it, let's just calculate absolute position from container top-left.
    
    // Current Element Center X relative to container = (newLeftPx + width/2)
    if(elementRef.current) {
        const width = elementRef.current.offsetWidth;
        const height = elementRef.current.offsetHeight;
        const centerX = newLeftPx + (width / 2);
        const centerY = newTopPx + (height / 2);
        
        onUpdate({
            x: (centerX / containerRect.width) * 100,
            y: (centerY / containerRect.height) * 100
        });
    }

  }, [isDragging, onUpdate]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
       // Prevent scrolling while dragging
       if(isDragging) e.preventDefault();
       handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onUp = () => handleEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Style generation
  const style: React.CSSProperties = {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: layer.id === 'background' ? '100%' : `${layer.scale * (layer.id.includes('title') || layer.id.includes('top') ? 4 : 2)}px`, // Dynamic base width logic
    // Using a base width strategy similar to original (200px char, 400px text)
    // Adjusting base width logic:
    // Character: base ~200px
    // Text: base ~400px
    // Since we use scale%, let's fix a base pixel width for types.
    maxWidth: layer.id === 'background' ? 'none' : '90%',
    transform: 'translate(-50%, -50%)',
    zIndex: isDragging ? 9999 : layer.zIndex,
    cursor: isActive ? 'move' : 'pointer',
    position: 'absolute',
    border: isActive ? '2px dashed rgba(147, 51, 234, 0.7)' : 'none',
    boxShadow: isActive ? '0 0 10px rgba(147, 51, 234, 0.3)' : 'none',
  };

  // Override style for background layer to fill container
  if (layer.id === 'background') {
    return (
        <div 
            style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                backgroundImage: `url(${src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0,
                pointerEvents: 'none' // Background isn't draggable
            }}
        />
    );
  }

  // Calculate Base Width for scaling
  // Original logic: Character 200px base, Text 400px base.
  let baseWidth = 300;
  if (layer.id === 'middle') baseWidth = 250; // Character / Title
  if (layer.id === 'top') baseWidth = 400;    // Text / Author

  const finalWidth = (baseWidth * layer.scale) / 100;

  return (
    <img
      ref={elementRef}
      src={src}
      alt={layer.id}
      draggable={false} // Disable native drag
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`transition-transform duration-75 select-none ${isActive ? 'brightness-110' : ''}`}
      style={{
        ...style,
        width: `${finalWidth}px`,
        height: 'auto',
      }}
    />
  );
};

export default DraggableLayer;
