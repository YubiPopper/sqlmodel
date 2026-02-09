import React from 'react';
import { Sun, Moon, Layers, Github } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { IconButton } from '../../shared/IconButton';

interface GlobalSettingsProps {
  isMobile?: boolean;
  onActionComplete?: () => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ isMobile = false, onActionComplete }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const setColorMode = useModelStore(state => state.setColorMode);
  const viewMode = useModelStore(state => state.viewMode);
  const showEntityOverlay = useModelStore(state => state.showEntityOverlay);
  const setShowEntityOverlay = useModelStore(state => state.setShowEntityOverlay);

  const isDark = colorMode === 'dark';

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center', 
      gap: isMobile ? '6px' : '4px',
      paddingLeft: isMobile ? '0' : '16px',
      borderLeft: isMobile ? 'none' : `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
      marginLeft: isMobile ? '0' : '8px',
      width: isMobile ? '100%' : 'auto',
    }}>
      {/* GitHub Link */}
      {isMobile ? (
        <a
          href="https://github.com/sqlmodel/sqlmodel"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background: isDark ? '#21262d' : '#f3f4f6',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '6px',
            textDecoration: 'none',
            color: isDark ? '#e6edf3' : '#1f2937',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
          }}
        >
          <Github size={18} />
          <span>View on GitHub</span>
        </a>
      ) : (
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
      )}

      {/* Entity Overlay Toggle - Only in Physical view */}
      {viewMode === 'physical' && (
        isMobile ? (
          <button
            onClick={() => { setShowEntityOverlay(!showEntityOverlay); onActionComplete?.(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: showEntityOverlay 
                ? (isDark ? '#30363d' : '#e5e7eb')
                : (isDark ? '#21262d' : '#f3f4f6'),
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#1f2937',
              transition: 'all 0.15s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = showEntityOverlay 
                ? (isDark ? '#30363d' : '#e5e7eb')
                : (isDark ? '#21262d' : '#f3f4f6');
            }}
          >
            <Layers size={18} />
            <span>{showEntityOverlay ? 'Hide Entity Groupings' : 'Show Entity Groupings'}</span>
          </button>
        ) : (
          <IconButton
            icon={<Layers size={16} />}
            onClick={() => setShowEntityOverlay(!showEntityOverlay)}
            title={showEntityOverlay ? 'Hide Entity Groupings' : 'Show Entity Groupings'}
            active={showEntityOverlay}
            variant="ghost"
          />
        )
      )}

      {/* Theme Toggle */}
      {isMobile ? (
        <button
          onClick={() => { setColorMode(isDark ? 'light' : 'dark'); onActionComplete?.(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            background: isDark ? '#21262d' : '#f3f4f6',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: isDark ? '#e6edf3' : '#1f2937',
            transition: 'all 0.15s ease',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
          }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      ) : (
        <IconButton
          icon={isDark ? <Sun size={16} /> : <Moon size={16} />}
          onClick={() => setColorMode(isDark ? 'light' : 'dark')}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          variant="ghost"
        />
      )}
    </div>
  );
};
