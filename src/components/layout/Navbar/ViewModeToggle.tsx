import React from 'react';
import { Box, Table } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';

export const ViewModeToggle: React.FC = () => {
  const viewMode = useModelStore(state => state.viewMode);
  const setViewMode = useModelStore(state => state.setViewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  return (
    <div style={{
      display: 'flex',
      background: isDark ? '#0d1117' : '#f3f4f6',
      borderRadius: '8px',
      padding: '3px',
      gap: '2px',
    }}>
      <button
        onClick={() => setViewMode('conceptual')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          background: viewMode === 'conceptual' 
            ? (isDark ? '#21262d' : '#ffffff')
            : 'transparent',
          color: viewMode === 'conceptual'
            ? (isDark ? '#e6edf3' : '#1f2937')
            : (isDark ? '#8b949e' : '#6b7280'),
          boxShadow: viewMode === 'conceptual'
            ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)')
            : 'none',
        }}
      >
        <Box size={14} />
        Conceptual
      </button>
      <button
        onClick={() => setViewMode('physical')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          background: viewMode === 'physical' 
            ? (isDark ? '#21262d' : '#ffffff')
            : 'transparent',
          color: viewMode === 'physical'
            ? (isDark ? '#e6edf3' : '#1f2937')
            : (isDark ? '#8b949e' : '#6b7280'),
          boxShadow: viewMode === 'physical'
            ? (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)')
            : 'none',
        }}
      >
        <Table size={14} />
        Physical
      </button>
    </div>
  );
};
