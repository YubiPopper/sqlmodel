import React from 'react';
import { useModelStore } from '../../store/useModelStore';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  title,
  active = false,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const colorMode = useModelStore(state => state.colorMode);
  
  const sizeStyles = {
    sm: { width: '28px', height: '28px', padding: '4px' },
    md: { width: '32px', height: '32px', padding: '6px' },
    lg: { width: '40px', height: '40px', padding: '8px' },
  };

  const getVariantStyles = () => {
    const isDark = colorMode === 'dark';
    
    switch (variant) {
      case 'primary':
        return {
          background: active ? '#4f46e5' : '#6366f1',
          color: 'white',
          border: 'none',
        };
      case 'danger':
        return {
          background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        };
      case 'ghost':
        return {
          background: active 
            ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)')
            : 'transparent',
          color: active 
            ? '#6366f1' 
            : (isDark ? '#9ca3af' : '#6b7280'),
          border: 'none',
        };
      default:
        return {
          background: active 
            ? (isDark ? '#30363d' : '#e5e7eb')
            : (isDark ? '#21262d' : '#f3f4f6'),
          color: active 
            ? (isDark ? '#e6edf3' : '#1f2937')
            : (isDark ? '#9ca3af' : '#6b7280'),
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        };
    }
  };

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={className}
      style={{
        ...sizeStyles[size],
        ...getVariantStyles(),
        borderRadius: '6px',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
    </button>
  );
};
