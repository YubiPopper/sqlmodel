import React from 'react';
import { Search } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
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
      </div>
    </div>
  );
};
