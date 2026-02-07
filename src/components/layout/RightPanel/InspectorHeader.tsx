import React from 'react';
import { X } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';

interface InspectorHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  actions?: React.ReactNode;
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({
  title,
  subtitle,
  icon,
  onClose,
  actions,
}) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  return (
    <div style={{
      padding: '16px',
      borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      {icon && (
        <div style={{
          width: '36px',
          height: '36px',
          background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6366f1',
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: isDark ? '#e6edf3' : '#1f2937',
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '11px',
            color: isDark ? '#8b949e' : '#9ca3af',
            marginTop: '2px',
          }}>
            {subtitle}
          </div>
        )}
      </div>
      {actions}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: isDark ? '#8b949e' : '#9ca3af',
            borderRadius: '4px',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
