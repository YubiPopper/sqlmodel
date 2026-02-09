import { useReactFlow } from 'reactflow';
import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Maximize2, Grid3x3 } from 'lucide-react';
import { useModelStore } from '../store/useModelStore';

export const CanvasControls = () => {
  const { setViewport, fitView, getZoom, getViewport } = useReactFlow();
  const colorMode = useModelStore(state => state.colorMode);
  const viewMode = useModelStore(state => state.viewMode);
  const tableFieldsDisplay = useModelStore(state => state.tableFieldsDisplay);
  const setTableFieldsDisplay = useModelStore(state => state.setTableFieldsDisplay);
  const autoLayout = useModelStore(state => state.autoLayout);
  
  const [displayZoom, setDisplayZoom] = useState(Math.round(getZoom() * 100));
  const debounceTimer = useRef<number | null>(null);

  // Update display zoom with debounce
  useEffect(() => {
    const currentZoom = Math.round(getZoom() * 100);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      setDisplayZoom(currentZoom);
    }, 150);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [getZoom()]);

  const adjustZoom = (delta: number) => {
    const viewport = getViewport();
    const newZoom = Math.max(0.1, Math.min(4, viewport.zoom + delta));
    setViewport({ ...viewport, zoom: newZoom });
  };

  const containerStyle = {
    background: colorMode === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    border: colorMode === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    height: '28px',
    boxShadow: colorMode === 'dark' 
      ? '0 4px 12px rgba(0, 0, 0, 0.5)' 
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    position: 'relative' as const,
  };

  const buttonStyle = {
    background: 'transparent',
    border: 'none',
    color: colorMode === 'dark' ? '#e2e8f0' : '#1e293b',
    padding: '0 8px',
    height: '100%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    fontSize: '13px',
    fontWeight: 500,
    lineHeight: '1',
    outline: 'none',
    boxShadow: 'none',
    WebkitTapHighlightColor: 'transparent',
  };

  const separatorStyle = {
    width: '1px',
    height: '16px',
    background: colorMode === 'dark' ? '#334155' : '#e2e8f0',
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        pointerEvents: 'auto',
      }}
    >
      <div style={containerStyle}>
        {/* Zoom Out */}
        <button
          onClick={() => adjustZoom(-0.1)}
          style={{ ...buttonStyle, padding: '0 6px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(241, 245, 249, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Zoom out"
        >
          <Minus size={14} />
        </button>

        {/* Zoom Display */}
        <div
          style={{
            ...buttonStyle,
            minWidth: '38px',
            fontWeight: 600,
            cursor: 'default',
            padding: '0 2px',
          }}
        >
          {displayZoom}%
        </div>

        {/* Zoom In */}
        <button
          onClick={() => adjustZoom(0.1)}
          style={{ ...buttonStyle, padding: '0 6px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(241, 245, 249, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Zoom in"
        >
          <Plus size={14} />
        </button>

        {/* Separator */}
        <div style={separatorStyle} />

        {/* Fit View */}
        <button
          onClick={() => fitView({ padding: 0.2 })}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(241, 245, 249, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Fit to view"
        >
          <Maximize2 size={14} />
        </button>

        {/* Auto Layout */}
        <button
          onClick={autoLayout}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colorMode === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(241, 245, 249, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title="Auto layout"
        >
          <Grid3x3 size={14} />
        </button>

        {/* Show All Fields - Only in Physical View */}
        {viewMode === 'physical' && (
          <>
            {/* Separator */}
            <div style={separatorStyle} />

            {/* Show All Fields Dropdown */}
            <div style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center',
              height: '100%',
            }}>
              <span style={{ 
                padding: '0 8px',
                fontSize: '13px',
                color: colorMode === 'dark' ? '#94a3b8' : '#64748b',
                fontWeight: 500,
                flexShrink: 0,
              }}>
                show
              </span>
              <select
                value={tableFieldsDisplay}
                onChange={(e) => setTableFieldsDisplay(e.target.value as 'all' | 'name' | 'keys')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: colorMode === 'dark' ? '#e2e8f0' : '#1e293b',
                  padding: '0 20px 0 6px',
                  height: '100%',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  lineHeight: '1',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  maxWidth: '120px',
                  boxShadow: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <option value="all">All Fields</option>
                <option value="name">Table Name</option>
                <option value="keys">Key Only</option>
              </select>
              {/* Dropdown Arrow */}
              <div
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: colorMode === 'dark' ? '#94a3b8' : '#64748b',
                  fontSize: '11px',
                }}
              >
                ▾
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
