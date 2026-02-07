import React, { useEffect, useRef } from 'react';
import { useModelStore } from '../../store/useModelStore';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  items,
  onClose,
}) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Small delay to prevent immediate close from the same click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }
    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [isOpen, position]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 2000,
        minWidth: '180px',
        background: isDark ? '#161b22' : '#ffffff',
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        borderRadius: '8px',
        boxShadow: isDark
          ? '0 8px 24px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)'
          : '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        padding: '4px',
        overflow: 'hidden',
      }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={index}
              style={{
                height: '1px',
                background: isDark ? '#30363d' : '#e5e7eb',
                margin: '4px 8px',
              }}
            />
          );
        }

        return (
          <button
            key={index}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              color: item.disabled
                ? (isDark ? '#484f58' : '#9ca3af')
                : item.danger
                  ? '#ef4444'
                  : (isDark ? '#e6edf3' : '#374151'),
              textAlign: 'left',
              opacity: item.disabled ? 0.5 : 1,
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {item.icon && (
              <span style={{ 
                display: 'flex', 
                alignItems: 'center',
                color: item.danger ? '#ef4444' : (isDark ? '#8b949e' : '#6b7280'),
              }}>
                {item.icon}
              </span>
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span style={{
                fontSize: '11px',
                color: isDark ? '#484f58' : '#9ca3af',
                fontFamily: 'monospace',
              }}>
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
