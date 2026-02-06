import { memo, useState, useCallback, useRef } from 'react';
import { type NodeProps } from 'reactflow';
import { useModelStore } from '../../store/useModelStore';
import type { EntityGroup } from '../../model/schemas';

interface ConceptualGroupNodeData extends EntityGroup {
  width: number;
  height: number;
}

const ConceptualGroupNode = memo(({ data, selected }: NodeProps<ConceptualGroupNodeData>) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [localSize, setLocalSize] = useState({ width: data.width, height: data.height });
  const nodeRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const colorMode = useModelStore(state => state.colorMode);
  const updateEntityGroup = useModelStore(state => state.updateEntityGroup);
  const setSelected = useModelStore(state => state.setSelected);

  // Handle clicking on group to select it
  const handleGroupClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(data.id);
  }, [data.id, setSelected]);

  // Update local size when data changes (from recalculation)
  if (!isResizing && (localSize.width !== data.width || localSize.height !== data.height)) {
    setLocalSize({ width: data.width, height: data.height });
  }

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = localSize.width;
    const startHeight = localSize.height;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (corner.includes('right')) {
        newWidth = Math.max(200, startWidth + deltaX);
      }
      if (corner.includes('bottom')) {
        newHeight = Math.max(100, startHeight + deltaY);
      }
      
      setLocalSize({ width: newWidth, height: newHeight });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [localSize]);

  // Default colors
  const defaultBorderColor = colorMode === 'dark' ? '#475569' : '#94a3b8';
  const defaultBackgroundColor = colorMode === 'dark' ? 'rgba(30, 41, 59, 0.15)' : 'rgba(241, 245, 249, 0.3)';
  
  const borderColor = data.borderColor || defaultBorderColor;
  const backgroundColor = data.backgroundColor || defaultBackgroundColor;
  
  // Border style mapping
  const borderStyleValue = data.borderStyle === 'dashed' ? 'dashed' 
    : data.borderStyle === 'dotted' ? 'dotted' 
    : 'solid';

  // Render resize handles if selected
  const renderResizeHandle = (corner: string) => {
    if (!selected) return null;
    
    const cornerStyles: Record<string, React.CSSProperties> = {
      'bottom-right': { bottom: '-4px', right: '-4px', cursor: 'se-resize' },
    };
    
    return (
      <div
        className="nodrag nopan"
        onMouseDown={(e) => handleResizeStart(e, corner)}
        style={{
          position: 'absolute',
          ...cornerStyles[corner],
          width: '8px',
          height: '8px',
          background: colorMode === 'dark' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.8)',
          border: `1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)'}`,
          borderRadius: '2px',
          opacity: 0.6,
          transition: 'opacity 0.2s, transform 0.15s',
          zIndex: 20,
          boxShadow: colorMode === 'dark' 
            ? '0 1px 3px rgba(0,0,0,0.5)' 
            : '0 1px 2px rgba(0,0,0,0.15)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.4)';
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.opacity = '0.6';
        }}
      />
    );
  };

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(data.name);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [data.name]);

  const handleSaveEdit = useCallback(() => {
    updateEntityGroup(data.id, { name: editName.trim() || 'Unnamed Group' });
    setIsEditing(false);
  }, [data.id, editName, updateEntityGroup]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(data.name);
    }
  }, [handleSaveEdit, data.name]);

  return (
    <div
      ref={nodeRef}
      className="conceptual-group-drag-handle"
      style={{
        width: localSize.width,
        height: localSize.height,
        background: backgroundColor,
        border: selected 
          ? `${data.borderWidth + 1}px ${borderStyleValue} #3b82f6`
          : `${data.borderWidth}px ${borderStyleValue} ${borderColor}`,
        borderRadius: '12px',
        position: 'relative',
        cursor: 'grab',
        transition: isResizing ? 'none' : 'border-color 0.2s',
        pointerEvents: 'none', // Allow clicks to pass through to entities inside
        boxShadow: selected 
          ? (colorMode === 'dark' 
              ? '0 0 0 1px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(59, 130, 246, 0.3)'
              : '0 0 0 1px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(59, 130, 246, 0.2)')
          : 'none',
      }}
    >
      {/* Background area - clickable to select group (but entities have higher z-index) */}
      <div
        className="conceptual-group-drag-handle"
        onClick={handleGroupClick}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '12px',
          cursor: 'grab',
          pointerEvents: 'all',
          zIndex: 0,
        }}
      />
      
      {/* Label in top left - this IS clickable */}
      <div
        className={isEditing ? "nodrag nopan" : "conceptual-group-drag-handle"}
        onClick={handleGroupClick}
        onDoubleClick={handleDoubleClick}
        style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          padding: '4px 10px',
          background: selected
            ? (colorMode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)')
            : (colorMode === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(241, 245, 249, 0.95)'),
          border: selected 
            ? `2px solid #3b82f6`
            : `1px solid ${borderColor}`,
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: selected 
            ? (colorMode === 'dark' ? '#60a5fa' : '#2563eb')
            : (colorMode === 'dark' ? '#94a3b8' : '#64748b'),
          cursor: isEditing ? 'text' : 'grab',
          userSelect: isEditing ? 'text' : 'none',
          pointerEvents: 'all', // Label is always clickable
          boxShadow: selected 
            ? '0 2px 6px rgba(59, 130, 246, 0.3)'
            : '0 1px 3px rgba(0, 0, 0, 0.1)',
          zIndex: 10,
        }}
      >
        {isEditing ? (
          <input
            ref={nameInputRef}
            className="nodrag nopan"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveEdit}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: colorMode === 'dark' ? '#60a5fa' : '#2563eb',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              padding: 0,
              width: '150px',
              fontFamily: 'inherit',
            }}
            placeholder="Group name"
          />
        ) : (
          data.name
        )}
      </div>

      {/* Clickable border zones - OUTSIDE the group boundary so they don't block entities */}
      {/* Top edge - outside */}
      <div
        className="conceptual-group-drag-handle"
        onClick={handleGroupClick}
        style={{
          position: 'absolute',
          top: '-20px',
          left: '-20px',
          right: '-20px',
          height: '24px',
          cursor: 'grab',
          pointerEvents: 'all',
          borderRadius: '12px 12px 0 0',
        }}
        title={`Click to select or drag group: ${data.name}`}
      />
      {/* Bottom edge - outside */}
      <div
        className="conceptual-group-drag-handle"
        onClick={handleGroupClick}
        style={{
          position: 'absolute',
          bottom: '-20px',
          left: '-20px',
          right: '-20px',
          height: '24px',
          cursor: 'grab',
          pointerEvents: 'all',
          borderRadius: '0 0 12px 12px',
        }}
        title={`Click to select or drag group: ${data.name}`}
      />
      {/* Left edge - outside */}
      <div
        className="conceptual-group-drag-handle"
        onClick={handleGroupClick}
        style={{
          position: 'absolute',
          top: '4px',
          left: '-20px',
          bottom: '4px',
          width: '24px',
          cursor: 'grab',
          pointerEvents: 'all',
        }}
        title={`Click to select or drag group: ${data.name}`}
      />
      {/* Right edge - outside */}
      <div
        className="conceptual-group-drag-handle"
        onClick={handleGroupClick}
        style={{
          position: 'absolute',
          top: '4px',
          right: '-20px',
          bottom: '4px',
          width: '24px',
          cursor: 'grab',
          pointerEvents: 'all',
        }}
        title={`Click to select or drag group: ${data.name}`}
      />

      {/* Resize handle */}
      {renderResizeHandle('bottom-right')}
    </div>
  );
});

export default ConceptualGroupNode;
