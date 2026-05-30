import React from 'react';
import { Search } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcutLabel?: string;
  onShortcutClick?: () => void;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  shortcutLabel,
  onShortcutClick,
}) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  return (
    <div style={{
      padding: '12px',
      borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: isDark ? '#0d1117' : '#f3f4f6',
        borderRadius: '8px',
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
      }}>
        <Search size={14} style={{ color: isDark ? '#8b949e' : '#9ca3af', flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            color: isDark ? '#e6edf3' : '#374151',
          }}
        />
        {shortcutLabel && (
          <button
            type="button"
            onClick={onShortcutClick}
            style={{
              flexShrink: 0,
              padding: '4px 6px',
              borderRadius: '6px',
              border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
              background: isDark ? '#161b22' : '#ffffff',
              color: isDark ? '#8b949e' : '#6b7280',
              fontSize: '10px',
              fontWeight: 600,
              cursor: onShortcutClick ? 'pointer' : 'default',
            }}
            title="Open jump search"
          >
            {shortcutLabel}
          </button>
        )}
      </div>
    </div>
  );
};
