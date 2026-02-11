import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  disabled?: boolean;
  placement?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, disabled = false, placement = 'bottom' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    // Center horizontally
    const left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
    
    // Position based on placement prop
    let top;
    if (placement === 'top') {
      top = triggerRect.top - tooltipRect.height - 8;
    } else {
      top = triggerRect.bottom + 8;
    }

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      // Delay to ensure tooltip is rendered and we have dimensions
      setTimeout(updatePosition, 0);
    }
  }, [isVisible]);

  if (disabled || !content) {
    return children;
  }

  // Clone child and add handlers
  const childProps = children.props as { onMouseEnter?: (e: React.MouseEvent) => void; onMouseLeave?: (e: React.MouseEvent) => void };
  const clonedChild = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      setIsVisible(true);
      childProps.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      setIsVisible(false);
      childProps.onMouseLeave?.(e);
    },
  } as any);

  return (
    <>
      {clonedChild}
      
      {isVisible && createPortal(
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
            zIndex: 99999,
            pointerEvents: 'none',
            boxShadow: isDark 
              ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
              : '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};
