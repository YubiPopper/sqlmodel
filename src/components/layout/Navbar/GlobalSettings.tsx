import React from 'react';
import { Sun, Moon, Github, BookOpen } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { IconButton } from '../../shared/IconButton';
import { Tooltip } from '../../shared/Tooltip';

interface GlobalSettingsProps {
  isMobile?: boolean;
  onActionComplete?: () => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ isMobile = false, onActionComplete }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const setColorMode = useModelStore(state => state.setColorMode);

  const isDark = colorMode === 'dark';

  return (
    <>
      {isMobile ? (
        <>
          {/* Documentation Link */}
          <a
            href="https://docs.sqlmodel.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              height: '48px',
              boxSizing: 'border-box',
              background: isDark ? '#21262d' : '#f3f4f6',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              outline: 'none',
              textDecoration: 'none',
              color: isDark ? '#e6edf3' : '#1f2937',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              width: '100%',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
            }}
          >
            <BookOpen size={18} style={{ flexShrink: 0 }} />
            <span>Documentation</span>
          </a>

          {/* GitHub Link */}
          <a
            href="https://github.com/sqlmodel/sqlmodel"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              height: '48px',
              boxSizing: 'border-box',
              background: isDark ? '#21262d' : '#f3f4f6',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              outline: 'none',
              textDecoration: 'none',
              color: isDark ? '#e6edf3' : '#1f2937',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              width: '100%',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
            }}
          >
            <Github size={18} style={{ flexShrink: 0 }} />
            <span>View on GitHub</span>
          </a>

        {/* Theme Toggle */}
        <button
          onClick={() => { setColorMode(isDark ? 'light' : 'dark'); onActionComplete?.(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px 14px',
            minHeight: '48px',
            height: '48px',
            boxSizing: 'border-box',
            background: isDark ? '#21262d' : '#f3f4f6',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '8px',
            outline: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            color: isDark ? '#e6edf3' : '#1f2937',
            transition: 'all 0.15s ease',
            width: '100%',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
          }}
        >
          {isDark ? <Sun size={18} style={{ flexShrink: 0 }} /> : <Moon size={18} style={{ flexShrink: 0 }} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        </>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row',
          alignItems: 'center', 
          gap: '4px',
          paddingLeft: '16px',
          borderLeft: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          marginLeft: '8px',
        }}>
          {/* Documentation Link */}
          <Tooltip content="View documentation">
            <div>
              <a
                href="https://docs.sqlmodel.org/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  color: isDark ? '#e6edf3' : '#1f2937',
                }}
              >
                <IconButton
                  icon={<BookOpen size={16} />}
                  onClick={() => {}}
                  variant="ghost"
                />
              </a>
            </div>
          </Tooltip>

          {/* GitHub Link */}
          <Tooltip content="View source code on GitHub">
            <div>
              <a
                href="https://github.com/sqlmodel/sqlmodel"
                target="_blank"
                rel="noopener noreferrer"
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
                  variant="ghost"
                />
              </a>
            </div>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip content={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <div>
              <IconButton
                icon={isDark ? <Sun size={16} /> : <Moon size={16} />}
                onClick={() => setColorMode(isDark ? 'light' : 'dark')}
                variant="ghost"
              />
            </div>
          </Tooltip>
        </div>
      )}
    </>
  );
};
