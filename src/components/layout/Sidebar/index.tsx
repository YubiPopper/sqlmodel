import React, { useState } from 'react';
import { Layers, Database } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { SearchBox } from './SearchBox';
import { ModelTree } from './ModelTree';
import { QuickActions } from './QuickActions';

export const LeftSidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const viewMode = useModelStore(state => state.viewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const physicalHierarchyMode = useModelStore(state => state.physicalHierarchyMode);
  const setPhysicalHierarchyMode = useModelStore(state => state.setPhysicalHierarchyMode);

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
        {viewMode === 'physical' && (
          <button
            onClick={() => setPhysicalHierarchyMode(physicalHierarchyMode === 'entity' ? 'database' : 'entity')}
            title={physicalHierarchyMode === 'entity' ? 'Switch to Database View' : 'Switch to Entity View'}
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              background: 'transparent',
              border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isDark ? '#8b949e' : '#6b7280',
              fontSize: '11px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
              e.currentTarget.style.color = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
            }}
          >
            <Database size={12} />
            {physicalHierarchyMode === 'entity' ? 'By Entity' : 'By DB'}
          </button>
        )}
      </div>

      {/* Search */}
      <SearchBox 
        value={searchQuery} 
        onChange={setSearchQuery} 
        placeholder={viewMode === 'conceptual' ? 'Search entities...' : 'Search tables...'}
      />

      {/* Tree View */}
      <ModelTree searchQuery={searchQuery} />

      {/* Quick Actions (bottom) */}
      <QuickActions />
    </aside>
  );
};

export { SearchBox } from './SearchBox';
export { ModelTree } from './ModelTree';
export { QuickActions } from './QuickActions';
