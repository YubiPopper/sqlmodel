import React from 'react';
import { useModelStore } from '../../../store/useModelStore';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, children, hint }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        color: isDark ? '#8b949e' : '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '6px',
      }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{
          fontSize: '11px',
          color: isDark ? '#8b949e' : '#9ca3af',
          marginTop: '4px',
          fontStyle: 'italic',
        }}>
          {hint}
        </div>
      )}
    </div>
  );
};

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
}) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  const baseStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    fontSize: '13px',
    color: isDark ? '#e6edf3' : '#374151',
    background: isDark ? '#0d1117' : '#ffffff',
    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  };

  const focusStyle = {
    borderColor: '#6366f1',
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.15)',
  };

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{ ...baseStyle, resize: 'vertical', minHeight: '60px' }}
        onFocus={(e) => Object.assign(e.target.style, focusStyle)}
        onBlur={(e) => {
          e.target.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
          e.target.style.boxShadow = 'none';
        }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={baseStyle}
      onFocus={(e) => Object.assign(e.target.style, focusStyle)}
      onBlur={(e) => {
        e.target.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
};

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export const SelectInput: React.FC<SelectInputProps> = ({
  value,
  onChange,
  options,
}) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '10px 12px',
        fontSize: '13px',
        color: isDark ? '#e6edf3' : '#374151',
        background: isDark ? '#0d1117' : '#ffffff',
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        borderRadius: '8px',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

interface ColorPickerProps {
  value?: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value = 'default', onChange }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';
  const [showCustomInput, setShowCustomInput] = React.useState(false);
  const [customColor, setCustomColor] = React.useState('');
  
  // Load saved custom colors from localStorage on mount
  const [savedCustomColors, setSavedCustomColors] = React.useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sqlmodel-custom-colors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const colors = [
    { value: 'default', label: 'Default', bg: isDark ? '#1e293b' : '#f1f5f9', border: isDark ? '#334155' : '#cbd5e1' },
    { value: 'bronze', label: 'Bronze', bg: '#8b5a3c', border: '#6d4c41' },
    { value: 'silver', label: 'Silver', bg: '#94a3b8', border: '#64748b' },
    { value: 'gold', label: 'Gold', bg: '#ca8a04', border: '#a16207' },
    { value: 'red', label: 'Red', bg: '#dc2626', border: '#b91c1c' },
    { value: 'orange', label: 'Orange', bg: '#ea580c', border: '#c2410c' },
    
    { value: 'green', label: 'Green', bg: '#16a34a', border: '#15803d' },
    { value: 'teal', label: 'Teal', bg: '#0d9488', border: '#0f766e' },
    { value: 'blue', label: 'Blue', bg: '#2563eb', border: '#1d4ed8' },
    { value: 'indigo', label: 'Indigo', bg: '#4f46e5', border: '#4338ca' },
    { value: 'purple', label: 'Purple', bg: '#9333ea', border: '#7e22ce' },
    { value: 'pink', label: 'Pink', bg: '#db2777', border: '#be185d' },
  ];

  // Check if current value is a custom hex color
  const isCustomColor = value && !colors.some(c => c.value === value);
  
  // Add current custom color to saved list if not already there
  React.useEffect(() => {
    if (isCustomColor && typeof value === 'string' && !savedCustomColors.includes(value)) {
      const newColors = [...savedCustomColors, value];
      setSavedCustomColors(newColors);
      localStorage.setItem('sqlmodel-custom-colors', JSON.stringify(newColors));
    }
  }, [value, isCustomColor]); // Remove savedCustomColors from deps to prevent infinite loop

  const handleCustomColorSubmit = () => {
    const trimmedColor = customColor.trim();
    if (trimmedColor.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
      // Normalize 3-digit hex to 6-digit
      let normalizedColor = trimmedColor;
      if (trimmedColor.length === 4) {
        normalizedColor = '#' + trimmedColor[1] + trimmedColor[1] + trimmedColor[2] + trimmedColor[2] + trimmedColor[3] + trimmedColor[3];
      }
      
      // Check if color already exists (case-insensitive)
      const lowerColor = normalizedColor.toLowerCase();
      const alreadyExists = colors.some(c => c.value === lowerColor) || 
                           savedCustomColors.some(c => c.toLowerCase() === lowerColor);
      
      if (!alreadyExists) {
        onChange(normalizedColor);
      } else {
        // If it exists, just select it
        onChange(normalizedColor);
      }
      setShowCustomInput(false);
      setCustomColor('');
    }
  };

  return (
    <div>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '4px',
      }}>
        {colors.map(color => {
          const isSelected = value === color.value;
          return (
            <button
              key={color.value}
              onClick={() => onChange(color.value)}
              title={color.label}
              style={{
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
                transition: 'transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: '100%',
                height: '28px',
                background: color.bg,
                border: `2px solid ${isSelected ? '#6366f1' : color.border}`,
                borderRadius: '5px',
                position: 'relative',
                boxShadow: isSelected 
                  ? '0 0 0 2px rgba(99, 102, 241, 0.15)'
                  : 'none',
                transition: 'all 0.15s ease',
              }}>
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="6" height="6" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
        
        {/* Display saved custom colors */}
        {savedCustomColors.map((customColorValue) => {
          const isSelected = value === customColorValue;
          return (
            <button
              key={customColorValue}
              onClick={() => onChange(customColorValue)}
              title={customColorValue}
              style={{
                padding: 0,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                outline: 'none',
                transition: 'transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: '100%',
                height: '28px',
                background: customColorValue,
                border: `2px solid ${isSelected ? '#6366f1' : customColorValue}`,
                borderRadius: '5px',
                position: 'relative',
                boxShadow: isSelected 
                  ? '0 0 0 2px rgba(99, 102, 241, 0.15)'
                  : 'none',
                transition: 'all 0.15s ease',
              }}>
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="6" height="6" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Custom color section */}
      <div style={{ marginTop: '8px' }}>
        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '11px',
              color: isDark ? '#94a3b8' : '#64748b',
              background: isDark ? '#0d1117' : '#ffffff',
              border: `1px dashed ${isDark ? '#30363d' : '#cbd5e1'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6366f1';
              e.currentTarget.style.color = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isDark ? '#30363d' : '#cbd5e1';
              e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
            }}
          >
            + Add Custom Hex Color
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#1a2b3c"
              maxLength={7}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '12px',
                color: isDark ? '#e6edf3' : '#374151',
                background: isDark ? '#0d1117' : '#ffffff',
                border: `1px solid ${isDark ? '#30363d' : '#cbd5e1'}`,
                borderRadius: '6px',
                outline: 'none',
                fontFamily: 'monospace',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomColorSubmit();
                if (e.key === 'Escape') {
                  setShowCustomInput(false);
                  setCustomColor('');
                }
              }}
              autoFocus
            />
            <button
              onClick={handleCustomColorSubmit}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#ffffff',
                background: '#6366f1',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              ✓
            </button>
            <button
              onClick={() => {
                setShowCustomInput(false);
                setCustomColor('');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                color: isDark ? '#94a3b8' : '#64748b',
                background: isDark ? '#0d1117' : '#ffffff',
                border: `1px solid ${isDark ? '#30363d' : '#cbd5e1'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
