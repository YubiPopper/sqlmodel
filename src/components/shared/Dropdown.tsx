import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  divider?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  onOpenChange?: (isOpen: boolean) => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleOpenChange = (newState: boolean) => {
    setIsOpen(newState);
    onOpenChange?.(newState);
  };
  
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleOpenChange(!isOpen);
  };
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const colorMode = useModelStore(state => state.colorMode);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };

    // Use a small delay to prevent the click that opened the dropdown from immediately closing it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const isDark = colorMode === 'dark';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={handleToggle}>
        {trigger}
      </div>
      
      {isOpen && (
        <>
          {/* Invisible overlay to catch clicks anywhere including canvas */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleOpenChange(false);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              [align]: 0,
              width: 'max-content',
              maxWidth: '180px',
              background: isDark ? '#21262d' : '#ffffff',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              boxShadow: isDark 
                ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
                : '0 8px 24px rgba(0, 0, 0, 0.12)',
              zIndex: 1000,
              overflow: 'hidden',
              padding: '4px',
              pointerEvents: 'auto',
            }}
          >
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.divider && (
                <div style={{
                  height: '1px',
                  background: isDark ? '#30363d' : '#e5e7eb',
                  margin: '4px 0',
                }} />
              )}
              {!item.divider && (
                <button
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick();
                      handleOpenChange(false);
                    }
                  }}
                  disabled={item.disabled}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    outline: 'none',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    opacity: item.disabled ? 0.5 : 1,
                    color: isDark ? '#e6edf3' : '#374151',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!item.disabled) {
                      e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
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
                      color: isDark ? '#8b949e' : '#6b7280',
                    }}>
                      {item.icon}
                    </span>
                  )}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.shortcut && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: isDark ? '#8b949e' : '#9ca3af',
                      fontFamily: 'monospace',
                    }}>
                      {item.shortcut}
                    </span>
                  )}
                </button>
              )}
            </React.Fragment>
          ))}
          </div>
        </>
      )}
    </div>
  );
};

interface DropdownButtonProps {
  label: string;
  items: DropdownItem[];
  icon?: React.ReactNode;
  fullWidth?: boolean;
  compact?: boolean;
  title?: string;
  variant?: 'default' | 'ghost';
  align?: 'left' | 'right';
  onOpenChange?: (isOpen: boolean) => void;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  items,
  icon,
  fullWidth = false,
  compact = false,
  title,
  variant = 'default',
  align = 'left',
  onOpenChange,
}) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  const padding = compact ? '12px 14px' : (fullWidth ? '14px 16px' : '6px 12px');
  const fontSize = compact ? '14px' : (fullWidth ? '15px' : '13px');
  const gap = compact ? '12px' : (fullWidth ? '12px' : '6px');
  const iconSize = compact ? 18 : (fullWidth ? 20 : 14);

  return (
    <Dropdown
      items={items}
      align={align}
      onOpenChange={onOpenChange}
      trigger={
        <button
          title={title}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap,
            padding: variant === 'ghost' ? '8px' : padding,
            minHeight: compact ? '48px' : 'auto',
            background: variant === 'ghost' ? 'transparent' : (isDark ? '#21262d' : '#f3f4f6'),
            border: variant === 'ghost' ? 'none' : `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: compact ? '8px' : '6px',
            outline: 'none',
            color: variant === 'ghost' 
              ? (isDark ? '#9ca3af' : '#6b7280')
              : (isDark ? '#e6edf3' : '#374151'),
            fontSize,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            width: fullWidth ? '100%' : 'auto',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            if (variant === 'ghost') {
              e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (variant === 'ghost') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {icon && <span style={{ display: 'flex' }}>{icon}</span>}
          {label && <span className="navbar-button-text" style={{ flex: 1 }}>{label}</span>}
          {variant !== 'ghost' && <ChevronDown size={iconSize} />}
        </button>
      }
    />
  );
};
