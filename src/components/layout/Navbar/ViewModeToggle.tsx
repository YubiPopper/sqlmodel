import React from 'react';
import { Layers, Box, Table } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { Tooltip } from '../../shared/Tooltip';

export const ViewModeToggle: React.FC = () => {
  const viewMode = useModelStore(state => state.viewMode);
  const setViewMode = useModelStore(state => state.setViewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  const options: Array<{ value: 'data-model' | 'conceptual' | 'physical'; label: string; icon: React.ReactNode }> = [
    { value: 'data-model', label: 'Data Model', icon: <Layers size={14} strokeWidth={2.5} /> },
    { value: 'conceptual', label: 'Conceptual', icon: <Box size={14} strokeWidth={2.5} /> },
    { value: 'physical', label: 'Physical', icon: <Table size={14} strokeWidth={2.5} /> },
  ];

  const getTooltipLabel = () => {
    if (viewMode === 'data-model') return 'Data model';
    if (viewMode === 'conceptual') return 'Conceptual';
    return 'Physical';
  };

  return (
    <Tooltip content={`Current view: ${getTooltipLabel()}`}>
      <div
        style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px',
        borderRadius: '24px',
        border: `2px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        outline: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: isDark ? '#0d1117' : '#f3f4f6',
        boxShadow: isDark
          ? 'inset 0 2px 4px rgba(0,0,0,0.2)'
          : 'inset 0 2px 4px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isDark ? '#3b82f6' : '#60a5fa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
      }}
    >
      {options.map((option) => {
        const isActive = viewMode === option.value;
        return (
          <button
            key={option.value}
            onClick={() => setViewMode(option.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: isActive ? '6px 12px' : '6px 10px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: isActive
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'transparent',
              color: isActive ? '#ffffff' : (isDark ? '#8b949e' : '#6b7280'),
              boxShadow: isActive
                ? (isDark
                    ? '0 2px 8px rgba(59, 130, 246, 0.4), 0 1px 3px rgba(0,0,0,0.2)'
                    : '0 2px 8px rgba(59, 130, 246, 0.3), 0 1px 3px rgba(0,0,0,0.1)')
                : 'none',
              transform: isActive ? 'scale(1)' : 'scale(0.95)',
              outline: 'none',
            }}
          >
            {option.icon}
            {isActive && (
              <span className="view-mode-text" style={{ whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                {option.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
    </Tooltip>
  );
};
