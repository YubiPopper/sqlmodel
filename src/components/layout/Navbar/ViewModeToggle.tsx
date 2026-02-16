import React from 'react';
import { Box, Table } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { Tooltip } from '../../shared/Tooltip';

export const ViewModeToggle: React.FC = () => {
  const viewMode = useModelStore(state => state.viewMode);
  const setViewMode = useModelStore(state => state.setViewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  const toggleViewMode = () => {
    setViewMode(viewMode === 'conceptual' ? 'physical' : 'conceptual');
  };

  const isPhysical = viewMode === 'physical';

  return (
    <Tooltip content={`Switch to ${isPhysical ? 'conceptual' : 'physical'} view`}>
      <button
        onClick={toggleViewMode}
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
      {/* Conceptual option */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: !isPhysical ? '6px 14px' : '6px 10px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: !isPhysical
          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
          : 'transparent',
        color: !isPhysical ? '#ffffff' : (isDark ? '#8b949e' : '#6b7280'),
        boxShadow: !isPhysical
          ? (isDark
              ? '0 2px 8px rgba(59, 130, 246, 0.4), 0 1px 3px rgba(0,0,0,0.2)'
              : '0 2px 8px rgba(59, 130, 246, 0.3), 0 1px 3px rgba(0,0,0,0.1)')
          : 'none',
        transform: !isPhysical ? 'scale(1)' : 'scale(0.95)',
      }}>
        <Box size={14} strokeWidth={2.5} />
        {!isPhysical && (
          <span className="view-mode-text" style={{ 
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}>
            Conceptual
          </span>
        )}
      </div>

      {/* Physical option */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: isPhysical ? '6px 14px' : '6px 10px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: isPhysical
          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
          : 'transparent',
        color: isPhysical ? '#ffffff' : (isDark ? '#8b949e' : '#6b7280'),
        boxShadow: isPhysical
          ? (isDark
              ? '0 2px 8px rgba(59, 130, 246, 0.4), 0 1px 3px rgba(0,0,0,0.2)'
              : '0 2px 8px rgba(59, 130, 246, 0.3), 0 1px 3px rgba(0,0,0,0.1)')
          : 'none',
        transform: isPhysical ? 'scale(1)' : 'scale(0.95)',
      }}>
        <Table size={14} strokeWidth={2.5} />
        {isPhysical && (
          <span className="view-mode-text" style={{ 
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}>
            Physical
          </span>
        )}
      </div>
    </button>
    </Tooltip>
  );
};
