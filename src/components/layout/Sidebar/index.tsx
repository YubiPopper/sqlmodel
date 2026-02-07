import React, { useState } from 'react';
import { Layers, Box, Table } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { SearchBox } from './SearchBox';
import { ModelTree } from './ModelTree';
import { QuickActions } from './QuickActions';

export const LeftSidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const viewMode = useModelStore(state => state.viewMode);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';

  return (
    <aside
      style={{
        width: '280px',
        minWidth: '280px',
        maxWidth: '280px',
        height: '100%',
        background: isDark 
          ? 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        borderRight: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <Layers size={18} style={{ color: '#6366f1' }} />
        <span style={{ 
          fontWeight: 600, 
          fontSize: '14px',
          color: isDark ? '#e6edf3' : '#1f2937',
        }}>
          {viewMode === 'conceptual' ? 'Model' : 'Schema'}
        </span>
        <span style={{
          fontSize: '10px',
          fontWeight: 500,
          color: isDark ? '#8b949e' : '#9ca3af',
          background: isDark ? '#30363d' : '#e5e7eb',
          padding: '2px 8px',
          borderRadius: '10px',
          marginLeft: 'auto',
        }}>
          {viewMode === 'conceptual' ? <Box size={10} style={{ display: 'inline', marginRight: '4px' }} /> : <Table size={10} style={{ display: 'inline', marginRight: '4px' }} />}
          {viewMode}
        </span>
      </div>

      {/* Search */}
      <SearchBox 
        value={searchQuery} 
        onChange={setSearchQuery} 
        placeholder={viewMode === 'conceptual' ? 'Search entities...' : 'Search tables...'}
      />

      {/* Tree View */}
      <ModelTree />

      {/* Quick Actions (bottom) */}
      <QuickActions />
    </aside>
  );
};

export { SearchBox } from './SearchBox';
export { ModelTree } from './ModelTree';
export { QuickActions } from './QuickActions';
