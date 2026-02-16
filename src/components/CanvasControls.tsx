import { useReactFlow } from 'reactflow';
import { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Maximize2, Grid3x3, Camera, Layers } from 'lucide-react';
import { useModelStore } from '../store/useModelStore';
import { LayoutAlgorithmDialog } from './ui/LayoutAlgorithmDialog';
import { Tooltip } from './shared/Tooltip';
import { toPng } from 'html-to-image';

export const CanvasControls = () => {
  const { setViewport, fitView, getZoom, getViewport } = useReactFlow();
  const colorMode = useModelStore(state => state.colorMode);
  const viewMode = useModelStore(state => state.viewMode);
  const tableFieldsDisplay = useModelStore(state => state.tableFieldsDisplay);
  const setTableFieldsDisplay = useModelStore(state => state.setTableFieldsDisplay);
  const showEntityOverlay = useModelStore(state => state.showEntityOverlay);
  const setShowEntityOverlay = useModelStore(state => state.setShowEntityOverlay);
  
  const [displayZoom, setDisplayZoom] = useState(Math.round(getZoom() * 100));
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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

  const exportToPng = async () => {
    setIsExporting(true);
    try {
      const reactFlowElement = document.querySelector('.react-flow') as HTMLElement;
      if (!reactFlowElement) {
        throw new Error('React Flow element not found');
      }

      // Get current viewport to restore later
      const currentViewport = getViewport();
      
      // Fit view before export for best results
      fitView({ padding: 0.1, duration: 0 });
      
      // Wait a bit for the fitView to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create watermark element
      const watermark = document.createElement('div');
      watermark.className = 'export-watermark';
      watermark.textContent = 'sqlmodel.org';
      watermark.style.cssText = `
        position: absolute;
        bottom: 16px;
        right: 16px;
        font-size: 12px;
        font-weight: 600;
        color: ${colorMode === 'dark' ? 'rgba(148, 163, 184, 0.6)' : 'rgba(100, 116, 139, 0.6)'};
        font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        z-index: 9999;
        pointer-events: none;
      `;
      reactFlowElement.appendChild(watermark);

      const dataUrl = await toPng(reactFlowElement, {
        backgroundColor: colorMode === 'dark' ? '#0a0c10' : '#f8fafc',
        pixelRatio: 2, // Higher quality
        filter: (node) => {
          // Exclude controls, UI elements, and AI buttons
          if (node.classList) {
            return !node.classList.contains('react-flow__controls') &&
                   !node.classList.contains('react-flow__minimap') &&
                   !node.classList.contains('react-flow__attribution') &&
                   !node.classList.contains('canvas-controls') &&
                   !node.classList.contains('ai-button'); // Hide AI buttons in table headers
          }
          return true;
        },
      });

      // Remove watermark
      reactFlowElement.removeChild(watermark);

      // Create download link
      const link = document.createElement('a');
      link.download = `sqlmodel-diagram-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();

      // Restore viewport
      setViewport(currentViewport);
    } catch (error) {
      console.error('Failed to export PNG:', error);
      alert('Failed to export diagram. Please try again.');
    } finally {
      setIsExporting(false);
    }
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
    <>
      <style>
        {`
          .canvas-control-button {
            background: transparent;
            border: none;
            color: ${colorMode === 'dark' ? '#e2e8f0' : '#1e293b'};
            padding: 0 8px;
            height: 100%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            fontSize: 13px;
            font-weight: 500;
            line-height: 1;
            outline: none;
            box-shadow: none;
            -webkit-tap-highlight-color: transparent;
          }
          .canvas-control-button:hover {
            background: ${colorMode === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(241, 245, 249, 0.8)'} !important;
          }
        `}
      </style>
      <div
        className="canvas-controls"
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
        <Tooltip content="Zoom out" placement="top">
          <button
            onClick={() => adjustZoom(-0.1)}
            className="canvas-control-button"
            style={{ padding: '0 6px' }}
          >
            <Minus size={14} />
          </button>
        </Tooltip>

        {/* Zoom Display */}
        <Tooltip content="Current zoom level" placement="top">
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
        </Tooltip>

        {/* Zoom In */}
        <Tooltip content="Zoom in" placement="top">
          <button
            onClick={() => adjustZoom(0.1)}
            className="canvas-control-button"
            style={{ padding: '0 6px' }}
          >
            <Plus size={14} />
          </button>
        </Tooltip>

        {/* Separator */}
        <div style={separatorStyle} />

        {/* Fit View */}
        <Tooltip content="Fit to view" placement="top">
          <button
            onClick={() => fitView({ padding: 0.2 })}
            className="canvas-control-button"
          >
            <Maximize2 size={14} />
          </button>
        </Tooltip>

        {/* Auto Layout */}
        <Tooltip content="Auto layout" placement="top">
          <button
            onClick={() => setIsLayoutDialogOpen(true)}
            className="canvas-control-button"
          >
            <Grid3x3 size={14} />
          </button>
        </Tooltip>

        {/* Separator */}
        <div style={separatorStyle} />

        {/* Export PNG */}
        <Tooltip content="Export as PNG" placement="top">
          <button
            onClick={exportToPng}
            disabled={isExporting}
            className="canvas-control-button"
            style={{ 
              opacity: isExporting ? 0.5 : 1,
              cursor: isExporting ? 'wait' : 'pointer',
            }}
          >
            <Camera size={14} />
          </button>
        </Tooltip>

        {/* Entity Overlay Toggle - Only in Physical View */}
        {viewMode === 'physical' && (
          <>
            {/* Separator */}
            <div style={separatorStyle} />

            {/* Entity Overlay Toggle */}
            <Tooltip content={showEntityOverlay ? 'Hide Entity Groupings' : 'Show Entity Groupings'} placement="top">
              <button
                onClick={() => setShowEntityOverlay(!showEntityOverlay)}
                className="canvas-control-button"
                style={{ 
                  backgroundColor: showEntityOverlay 
                    ? (colorMode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)')
                    : undefined,
                }}
              >
                <Layers size={14} />
              </button>
            </Tooltip>
          </>
        )}

        {/* Show All Fields - Only in Physical View */}
        {viewMode === 'physical' && (
          <>
            {/* Separator */}
            <div style={separatorStyle} />

            {/* Show All Fields Dropdown */}
            <Tooltip content="Toggle table field visibility" placement="top">
              <div style={{ 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center',
                height: '100%',
              }}>
                <span style={{ 
                  padding: '0 8px',
                  fontSize: '12px',
                  color: colorMode === 'dark' ? '#94a3b8' : '#64748b',
                  fontWeight: 500,
                  flexShrink: 0,
                  cursor: 'default',
                }}>
                  show
                </span>
                <select
                  value={tableFieldsDisplay}
                  onChange={(e) => setTableFieldsDisplay(e.target.value as 'all' | 'name' | 'keys')}
                  className="canvas-control-button"
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
            </Tooltip>
          </>
        )}
      </div>
      
      {/* Layout Algorithm Dialog */}
      <LayoutAlgorithmDialog
        isOpen={isLayoutDialogOpen}
        onClose={() => setIsLayoutDialogOpen(false)}
      />
    </div>
    </>
  );
};
