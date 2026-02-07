import { memo, useState, useCallback, useRef } from 'react';
import { type NodeProps } from 'reactflow';
import { useModelStore } from '../../store/useModelStore';
import type { EntityGroup } from '../../model/schemas';

interface ConceptualGroupNodeData extends EntityGroup {
  width: number;
  height: number;
  hasEntities?: boolean; // Flag for whether group has entities (affects pointer events)
  isDropTarget?: boolean; // Flag for when entity is dragged over this group
}

const ConceptualGroupNode = memo(({ data, selected }: NodeProps<ConceptualGroupNodeData>) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [localSize, setLocalSize] = useState({ width: data.width, height: data.height });
  const nodeRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const colorMode = useModelStore(state => state.colorMode);
  const updateEntityGroup = useModelStore(state => state.updateEntityGroup);
  const setSelected = useModelStore(state => state.setSelected);
  const setNodeSize = useModelStore(state => state.setNodeSize);
  const setNodePosition = useModelStore(state => state.setNodePosition);
  const nodeLayouts = useModelStore(state => state.nodeLayouts);
  const editingGroupId = useModelStore(state => state.editingGroupId);
  const setEditingGroupId = useModelStore(state => state.setEditingGroupId);

  // Trigger editing when editingGroupId matches this group
  if (editingGroupId === data.id && !isEditing) {
    setIsEditing(true);
    setEditName(data.name);
    setEditingGroupId(null); // Clear the trigger
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  // Handle clicking on group to select it
  const handleGroupClick = useCallback(() => {
    // Don't stop propagation - React Flow needs the events for dragging
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
    const currentLayout = nodeLayouts[data.id];
    const startPosX = currentLayout?.x || 0;
    const startPosY = currentLayout?.y || 0;
    
    // For groups with entities, position is calculated from entities
    // We can only resize from right/bottom edges
    const hasEntities = data.hasEntities;
    
    // Track final size
    let finalWidth = startWidth;
    let finalHeight = startHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newPosX = startPosX;
      let newPosY = startPosY;
      
      // Clamp to minimum size
      const minWidth = 200;
      const minHeight = 100;
      
      if (corner.includes('right')) {
        newWidth = Math.max(minWidth, startWidth + deltaX);
      }
      if (corner.includes('left') && !hasEntities) {
        // Only allow left resize for empty groups
        const widthChange = Math.max(minWidth, startWidth - deltaX);
        const maxLeftMove = startPosX;
        const actualWidthChange = Math.min(widthChange, startWidth + maxLeftMove);
        newWidth = Math.max(minWidth, actualWidthChange);
        newPosX = Math.max(0, startPosX + (startWidth - newWidth));
      }
      if (corner.includes('bottom')) {
        newHeight = Math.max(minHeight, startHeight + deltaY);
      }
      if (corner.includes('top') && !hasEntities) {
        // Only allow top resize for empty groups
        const heightChange = Math.max(minHeight, startHeight - deltaY);
        const maxTopMove = startPosY;
        const actualHeightChange = Math.min(heightChange, startHeight + maxTopMove);
        newHeight = Math.max(minHeight, actualHeightChange);
        newPosY = Math.max(0, startPosY + (startHeight - newHeight));
      }
      
      // Update final size tracking
      finalWidth = newWidth;
      finalHeight = newHeight;
      
      setLocalSize({ width: newWidth, height: newHeight });
      // Only update position for empty groups when resizing from left/top
      if (!hasEntities && (corner.includes('left') || corner.includes('top'))) {
        setNodePosition(data.id, newPosX, newPosY);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      // Persist the final size to the store
      setNodeSize(data.id, finalWidth, finalHeight);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [localSize, nodeLayouts, data.id, data.hasEntities, setNodePosition, setNodeSize]);

  // Default colors
  const defaultBorderColor = colorMode === 'dark' ? '#475569' : '#94a3b8';
  const defaultBackgroundColor = colorMode === 'dark' ? 'rgba(30, 41, 59, 0.15)' : 'rgba(241, 245, 249, 0.3)';
  
  const borderColor = data.borderColor || defaultBorderColor;
  const backgroundColor = data.backgroundColor || defaultBackgroundColor;
  
  // Border style mapping
  const borderStyleValue = data.borderStyle === 'dashed' ? 'dashed' 
    : data.borderStyle === 'dotted' ? 'dotted' 
    : 'solid';

  // Show resize handles when hovered or selected
  const showResizeHandles = isHovered || selected;

  // Render resize handles
  const renderResizeHandle = (corner: string) => {
    if (!showResizeHandles) return null;
    
    const cornerStyles: Record<string, React.CSSProperties> = {
      'top-left': { top: '-3px', left: '-3px', cursor: 'nw-resize' },
      'top-right': { top: '-3px', right: '-3px', cursor: 'ne-resize' },
      'bottom-left': { bottom: '-3px', left: '-3px', cursor: 'sw-resize' },
      'bottom-right': { bottom: '-3px', right: '-3px', cursor: 'se-resize' },
    };
    
    return (
      <div
        className="nodrag nopan"
        onMouseDown={(e) => handleResizeStart(e, corner)}
        style={{
          position: 'absolute',
          ...cornerStyles[corner],
          width: '6px',
          height: '6px',
          background: colorMode === 'dark' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(37, 99, 235, 0.9)',
          border: `1px solid ${colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.9)'}`,
          borderRadius: '2px',
          opacity: 0.7,
          transition: 'opacity 0.15s, transform 0.15s',
          zIndex: 100,
          pointerEvents: 'all',
          boxShadow: colorMode === 'dark' 
            ? '0 1px 3px rgba(0,0,0,0.5)' 
            : '0 1px 2px rgba(0,0,0,0.15)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.5)';
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.opacity = '0.7';
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: localSize.width,
        height: localSize.height,
        background: data.isDropTarget 
          ? (colorMode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(199, 210, 254, 0.3)')
          : backgroundColor,
        border: data.isDropTarget
          ? `${data.borderWidth + 1}px ${borderStyleValue} #6366f1`
          : (selected 
            ? `${data.borderWidth + 1}px ${borderStyleValue} #3b82f6`
            : `${data.borderWidth}px ${borderStyleValue} ${borderColor}`),
        borderRadius: '12px',
        position: 'relative',
        cursor: 'grab',
        transition: isResizing ? 'none' : 'all 0.2s ease',
        boxShadow: data.isDropTarget
          ? (colorMode === 'dark' 
              ? '0 0 0 2px rgba(99, 102, 241, 0.5), 0 0 24px rgba(99, 102, 241, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3)'
              : '0 0 0 2px rgba(99, 102, 241, 0.5), 0 0 24px rgba(99, 102, 241, 0.3), 0 8px 16px rgba(0, 0, 0, 0.1)')
          : (selected 
            ? (colorMode === 'dark' 
                ? '0 0 0 1px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(59, 130, 246, 0.3)'
                : '0 0 0 1px rgba(59, 130, 246, 0.5), 0 4px 12px rgba(59, 130, 246, 0.2)')
            : 'none'),
      }}
    >
      {/* Background area - for empty groups, make fully draggable */}
      {!data.hasEntities && (
        <div
          onClick={handleGroupClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '12px',
            cursor: 'grab',
            zIndex: 0,
          }}
        />
      )}
      
      {/* Background area for groups with entities - entities have higher z-index */}
      {data.hasEntities && (
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
            zIndex: 0,
          }}
        />
      )}
      
      {/* Label in top left - this IS clickable */}
      <div
        className={isEditing ? "nodrag nopan" : "conceptual-group-drag-handle"}
        onClick={!isEditing ? handleGroupClick : undefined}
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
      {/* Only add drag handles on borders for groups with entities */}
      {data.hasEntities && (
        <>
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
            }}
            title={`Click to select or drag group: ${data.name}`}
          />
        </>
      )}

      {/* Resize handles */}
      {/* For groups with entities: only show bottom-right (position is calculated from entities) */}
      {/* For empty groups: show all 4 corners */}
      {!data.hasEntities && renderResizeHandle('top-left')}
      {!data.hasEntities && renderResizeHandle('top-right')}
      {!data.hasEntities && renderResizeHandle('bottom-left')}
      {renderResizeHandle('bottom-right')}
    </div>
  );
});

export default ConceptualGroupNode;
