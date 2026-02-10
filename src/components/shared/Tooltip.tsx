import React, { useState, useRef, useEffect } from 'react';
import { useModelStore } from '../../store/useModelStore';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, disabled = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    // Position tooltip below the trigger, centered
    const left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
    const top = triggerRect.bottom + 8;

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible]);

  if (disabled || !content) {
    return <>{children}</>;
  }

  // Clone the child element and add event handlers directly
  const childElement = React.Children.only(children) as React.ReactElement;
  const clonedChild = React.cloneElement(childElement, {
    onMouseEnter: () => setIsVisible(true),
    onMouseLeave: () => setIsVisible(false),
    onMouseDown: () => setIsVisible(false),
    ref: triggerRef,
  } as any);

  return (
    <>
      {clonedChild}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            background: isDark ? '#1f2937' : '#374151',
            color: '#ffffff',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            zIndex: 10000,
            pointerEvents: 'none',
            boxShadow: isDark 
              ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};
