import React, { useState } from 'react';
import { Layers, Database, Box, Settings } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { SearchBox } from './SearchBox';
import { ModelTree } from './ModelTree';
import { QuickActions } from './QuickActions';
import { ConceptualSettingsDialog } from '../../ui/ConceptualSettingsDialog';

export const LeftSidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showConceptualSettings, setShowConceptualSettings] = useState(false);
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
        {viewMode === 'conceptual' && (
          <button
            onClick={() => setShowConceptualSettings(true)}
            title="View Settings"
            style={{
              marginLeft: 'auto',
              padding: '6px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: isDark ? '#8b949e' : '#6b7280',
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
            <Settings size={16} />
          </button>
        )}
        {viewMode === 'physical' && (
          <div 
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: isDark ? 'rgba(48, 54, 61, 0.3)' : 'rgba(243, 244, 246, 0.5)',
              borderRadius: '8px',
            }}
            title={physicalHierarchyMode === 'entity' ? 'Click to group by Database/Schema' : 'Click to group by Entity'}
          >
            {/* Entity label/icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: physicalHierarchyMode === 'entity' ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}>
              <Box size={11} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                color: isDark ? '#8b949e' : '#6b7280',
              }}>
                Entity
              </span>
            </div>

            {/* Switch */}
            <div
              onClick={() => setPhysicalHierarchyMode(physicalHierarchyMode === 'entity' ? 'database' : 'entity')}
              style={{
                width: '32px',
                height: '16px',
                background: physicalHierarchyMode === 'database' 
                  ? '#6366f1'
                  : isDark ? '#30363d' : '#cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: physicalHierarchyMode === 'database' ? '16px' : '2px',
                width: '12px',
                height: '12px',
                background: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s ease-in-out',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </div>

            {/* Database label/icon */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: physicalHierarchyMode === 'database' ? 1 : 0.4,
              transition: 'opacity 0.2s',
            }}>
              <Database size={11} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                color: isDark ? '#8b949e' : '#6b7280',
              }}>
                DB
              </span>
            </div>
          </div>
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
      
      {/* Conceptual Settings Dialog */}
      <ConceptualSettingsDialog 
        isOpen={showConceptualSettings}
        onClose={() => setShowConceptualSettings(false)}
      />
    </aside>
  );
};

export { SearchBox } from './SearchBox';
export { ModelTree } from './ModelTree';
export { QuickActions } from './QuickActions';
