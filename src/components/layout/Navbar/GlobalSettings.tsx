import React from 'react';
import { Sun, Moon, Layers, Github } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { IconButton } from '../../shared/IconButton';

export const GlobalSettings: React.FC = () => {
  const colorMode = useModelStore(state => state.colorMode);
  const setColorMode = useModelStore(state => state.setColorMode);
  const viewMode = useModelStore(state => state.viewMode);
  const showEntityOverlay = useModelStore(state => state.showEntityOverlay);
  const setShowEntityOverlay = useModelStore(state => state.setShowEntityOverlay);

  const isDark = colorMode === 'dark';

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '4px',
      paddingLeft: '16px',
      borderLeft: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
      marginLeft: '8px',
    }}>
      {/* GitHub Link */}
      <a
        href="https://github.com/sqlmodel/sqlmodel"
        target="_blank"
        rel="noopener noreferrer"
        title="View on GitHub"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          color: isDark ? '#e6edf3' : '#1f2937',
        }}
      >
        <IconButton
          icon={<Github size={16} />}
          onClick={() => {}}
          title="View on GitHub"
          variant="ghost"
        />
      </a>

      {/* Entity Overlay Toggle - Only in Physical view */}
      {viewMode === 'physical' && (
        <IconButton
          icon={<Layers size={16} />}
          onClick={() => setShowEntityOverlay(!showEntityOverlay)}
          title={showEntityOverlay ? 'Hide Entity Groupings' : 'Show Entity Groupings'}
          active={showEntityOverlay}
          variant="ghost"
        />
      )}

      {/* Theme Toggle */}
      <IconButton
        icon={isDark ? <Sun size={16} /> : <Moon size={16} />}
        onClick={() => setColorMode(isDark ? 'light' : 'dark')}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        variant="ghost"
      />
    </div>
  );
};
