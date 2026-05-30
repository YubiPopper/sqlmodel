import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { Entity } from '../../model/schemas';
import { useModelStore } from '../../store/useModelStore';
import clsx from 'clsx';

type HoverSide = 'top' | 'right' | 'bottom' | 'left' | null;

const ENTITY_SIZE_MAP = {
  compact: { width: 140, height: 80 },
  normal: { width: 220, height: 120 },
  large: { width: 280, height: 160 },
};

// Helper function to get color gradients based on color scheme
const getEntityColorStyles = (color: string | undefined, isDark: boolean, selected: boolean) => {
  const colorValue = color || 'default';
  
  const colorMap: Record<string, { background: string; border: string }> = {
    default: {
      background: isDark
        ? (selected
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)')
        : (selected
            ? 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)'),
      border: isDark ? '#334155' : '#e5e7eb',
    },
    bronze: {
      background: 'linear-gradient(135deg, #8b5a3c 0%, #6d4c41 100%)',
      border: '#8b5a3c',
    },
    silver: {
      background: 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)',
      border: '#a0aec0',
    },
    gold: {
      background: 'linear-gradient(135deg, #d4af37 0%, #b8960c 100%)',
      border: '#d4af37',
    },
    red: {
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      border: '#dc2626',
    },
    orange: {
      background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      border: '#ea580c',
    },
    green: {
      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      border: '#16a34a',
    },
    teal: {
      background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      border: '#0d9488',
    },
    blue: {
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      border: '#2563eb',
    },
    indigo: {
      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
      border: '#4f46e5',
    },
    purple: {
      background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
      border: '#9333ea',
    },
    pink: {
      background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
      border: '#db2777',
    },
  };

  // If it's a predefined color, use it
  if (colorMap[colorValue]) {
    return colorMap[colorValue];
  }
  
  // If it's a hex color, create gradient from it
  if (colorValue.startsWith('#')) {
    return {
      background: `linear-gradient(135deg, ${colorValue} 0%, ${colorValue}dd 100%)`,
      border: colorValue,
    };
  }
  
  return colorMap.default;
};

const EntityNode = memo(({ data, selected }: NodeProps<Entity>) => {
  const storedNodeLayouts = useModelStore(state => state.nodeLayouts);
  const storedLayout = storedNodeLayouts[data.id];
  const entityCardSize = useModelStore(state => state.entityCardSize);
  
  // Get default dimensions based on card size setting
  const defaultSize = ENTITY_SIZE_MAP[entityCardSize];
  const DEFAULT_ENTITY_WIDTH = defaultSize.width;
  const DEFAULT_ENTITY_HEIGHT = defaultSize.height;
  
  const [hoverSide, setHoverSide] = useState<HoverSide>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [editDescription, setEditDescription] = useState(data.description || '');
  const [nodeSize, setNodeSizeLocal] = useState({ 
    width: storedLayout?.width || DEFAULT_ENTITY_WIDTH, 
    height: storedLayout?.height || DEFAULT_ENTITY_HEIGHT 
  });
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  // Sync local size with stored layout when it changes (e.g., from undo/redo)
  useEffect(() => {
    if (storedLayout?.width && storedLayout?.height && !isResizing) {
      setNodeSizeLocal({ width: storedLayout.width, height: storedLayout.height });
    }
  }, [storedLayout?.width, storedLayout?.height, isResizing]);
  
  const addEntity = useModelStore(state => state.addEntity);
  const addRelationship = useModelStore(state => state.addRelationship);
  const updateRelationship = useModelStore(state => state.updateRelationship);
  const updateEntity = useModelStore(state => state.updateEntity);
  const setNodePosition = useModelStore(state => state.setNodePosition);
  const setNodeSize = useModelStore(state => state.setNodeSize);
  const colorMode = useModelStore(state => state.colorMode);
  const relationships = useModelStore(state => state.relationships);
  const entities = useModelStore(state => state.entities);
  const nodeLayouts = useModelStore(state => state.nodeLayouts);
  const multiSelectedEntityIds = useModelStore(state => state.multiSelectedEntityIds);
  const toggleEntityMultiSelect = useModelStore(state => state.toggleEntityMultiSelect);
  const setSelected = useModelStore(state => state.setSelected);
  const entityGroups = useModelStore(state => state.entityGroups);
  const addEntityToGroup = useModelStore(state => state.addEntityToGroup);
  const showEntityDescriptions = useModelStore(state => state.showEntityDescriptions);
  const viewMode = useModelStore(state => state.viewMode);
  const collaboratorSelections = useModelStore(state => state.collaboratorSelections);

  // Check if this entity is multi-selected (determines color: green for multi, blue for single)
  const isMultiSelected = multiSelectedEntityIds.includes(data.id);

  // Find any collaborator who has this entity selected
  const collaboratorHighlight = Object.values(collaboratorSelections).find(
    (u) => u.selectedId === data.id
  ) ?? null;

  const handleCreateLinkedEntity = useCallback((side: HoverSide) => {
    if (viewMode !== 'conceptual') return;
    if (!side) return;
    
    const currentLayout = nodeLayouts[data.id];
    if (!currentLayout) return;
    
    // Calculate position for new entity based on clicked side
    let newX = currentLayout.x;
    let newY = currentLayout.y;
    const entityWidth = 220;
    const entityHeight = 120;
    const gap = 80; // Gap between entities
    
    switch (side) {
      case 'top': newY -= (entityHeight + gap); break;
      case 'bottom': newY += (entityHeight + gap); break;
      case 'left': newX -= (entityWidth + gap); break;
      case 'right': newX += (entityWidth + gap); break;
    }
    
    // Create new entity and relationship
    const newEntityId = addEntity(data.dataModelId);
    setNodePosition(newEntityId, newX, newY);
    addRelationship(data.id, newEntityId);
    
    // If parent entity is in a group, add new entity to the same group
    const parentGroup = entityGroups.find(g => g.entityIds.includes(data.id));
    if (parentGroup) {
      addEntityToGroup(parentGroup.id, newEntityId);
    }
  }, [viewMode, data.id, nodeLayouts, addEntity, addRelationship, setNodePosition, entityGroups, addEntityToGroup]);

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = nodeSize.width;
    const startHeight = nodeSize.height;
    const currentLayout = nodeLayouts[data.id];
    const startPosX = currentLayout?.x || 0;
    const startPosY = currentLayout?.y || 0;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newPosX = startPosX;
      let newPosY = startPosY;
      
      if (corner.includes('right')) {
        newWidth = Math.max(180, startWidth + deltaX);
      }
      if (corner.includes('left')) {
        const widthChange = Math.max(180, startWidth - deltaX);
        if (widthChange !== newWidth) {
          newWidth = widthChange;
          newPosX = startPosX + (startWidth - widthChange);
        }
      }
      if (corner.includes('bottom')) {
        newHeight = Math.max(80, startHeight + deltaY);
      }
      if (corner.includes('top')) {
        const heightChange = Math.max(80, startHeight - deltaY);
        if (heightChange !== newHeight) {
          newHeight = heightChange;
          newPosY = startPosY + (startHeight - heightChange);
        }
      }
      
      setNodeSizeLocal({ width: newWidth, height: newHeight });
      setNodePosition(data.id, newPosX, newPosY);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      // Persist final size to store so groups can use it
      setNodeSize(data.id, nodeSize.width, nodeSize.height);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [nodeSize, nodeLayouts, data.id, setNodePosition, setNodeSize]);

  const handleSideHover = useCallback((side: HoverSide, isEntering: boolean) => {
    if (!isResizing && !isEditing && !isDraggingConnection) {
      setHoverSide(isEntering ? side : null);
    }
  }, [isResizing, isEditing, isDraggingConnection]);

  const handleEntityDragStart = (event: React.MouseEvent) => {
    if (viewMode !== 'conceptual') return;
    const canvasElement = event.currentTarget.closest('.react-flow');
    if (!canvasElement) return;
    
    // Find the entity element via nodeRef (handles are outside [data-entity-id])
    const entityElement = nodeRef.current?.querySelector('[data-entity-id]') as HTMLElement;
    if (!entityElement) return;
    
    const entityRect = entityElement.getBoundingClientRect();
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Determine which side we're dragging from based on handle position
    const handleRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = entityRect.left + entityRect.width / 2 - canvasRect.left;
    const centerY = entityRect.top + entityRect.height / 2 - canvasRect.top;
    
    let dynamicStartSide: 'top' | 'right' | 'bottom' | 'left';
    let endX = 0, endY = 0;
    
    // Determine which side based on handle position relative to entity
    const handleCenterX = handleRect.left + handleRect.width / 2;
    const handleCenterY = handleRect.top + handleRect.height / 2;
    const entityCenterX = entityRect.left + entityRect.width / 2;
    const entityCenterY = entityRect.top + entityRect.height / 2;
    const dx = handleCenterX - entityCenterX;
    const dy = handleCenterY - entityCenterY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      dynamicStartSide = dx > 0 ? 'right' : 'left';
    } else {
      dynamicStartSide = dy > 0 ? 'bottom' : 'top';
    }
    
    canvasElement.setAttribute('data-connection-source-entity', data.id);
    setIsDraggingConnection(true);
    
    // Track currently snapped target
    let snappedTargetEntity: HTMLElement | null = null;
    let snappedTargetEntityId: string | null = null;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'temp-connection-line');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1000';
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', '#3b82f6');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('stroke-dasharray', '8,4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    
    svg.appendChild(path);
    canvasElement.appendChild(svg);
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX - canvasRect.left;
      const currentY = e.clientY - canvasRect.top;
      
      // Dynamically determine which side to exit from based on cursor direction
      const dx = currentX - centerX;
      const dy = currentY - centerY;
      
      let dynamicStartX: number, dynamicStartY: number, dynamicStartSide: 'top' | 'right' | 'bottom' | 'left';
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal dominates
        if (dx > 0) {
          // Exit right
          dynamicStartSide = 'right';
          dynamicStartX = entityRect.right - canvasRect.left;
          dynamicStartY = centerY;
        } else {
          // Exit left
          dynamicStartSide = 'left';
          dynamicStartX = entityRect.left - canvasRect.left;
          dynamicStartY = centerY;
        }
      } else {
        // Vertical dominates
        if (dy > 0) {
          // Exit bottom
          dynamicStartSide = 'bottom';
          dynamicStartX = centerX;
          dynamicStartY = entityRect.bottom - canvasRect.top;
        } else {
          // Exit top
          dynamicStartSide = 'top';
          dynamicStartX = centerX;
          dynamicStartY = entityRect.top - canvasRect.top;
        }
      }
      
      // Find the closest entity to snap to
      const allEntityElements = canvasElement.querySelectorAll('[data-entity-id]');
      let closestEntity: HTMLElement | null = null;
      let closestDistance = 100;
      let closestEntityRect: DOMRect | null = null;
      
      allEntityElements.forEach((el) => {
        const entityEl = el as HTMLElement;
        const entityId = entityEl.getAttribute('data-entity-id');
        if (entityId === data.id) return;
        
        // Get the actual entity card (not the wrapper or group)
        const innerDiv = entityEl.querySelector('.entity-node') as HTMLElement;
        if (!innerDiv) return; // Skip if no entity card found (might be a group)
        
        const rect = innerDiv.getBoundingClientRect();
        const entityCenterX = rect.left + rect.width / 2;
        const entityCenterY = rect.top + rect.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(e.clientX - entityCenterX, 2) + 
          Math.pow(e.clientY - entityCenterY, 2)
        );
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEntity = entityEl;
          closestEntityRect = rect;
        }
      });
      
      // Clear previous target styling
      if (snappedTargetEntity && snappedTargetEntity !== closestEntity) {
        const innerDiv = snappedTargetEntity.querySelector('.entity-node') as HTMLElement;
        if (innerDiv) innerDiv.style.outline = '';
      }
      
      let endX = currentX;
      let endY = currentY;
      
      if (closestEntity !== null && closestEntityRect !== null) {
        const targetEntity = closestEntity as HTMLElement;
        const innerDiv = targetEntity.querySelector('.entity-node') as HTMLElement;
        
        if (innerDiv) {
          innerDiv.style.outline = '3px solid #3b82f6';
          innerDiv.style.outlineOffset = '4px';
        }
        
        snappedTargetEntity = targetEntity;
        snappedTargetEntityId = targetEntity.getAttribute('data-entity-id');
        
        // Get the actual entity card bounds
        const targetNodeRect = innerDiv ? innerDiv.getBoundingClientRect() : closestEntityRect;
        const targetCenterX = targetNodeRect.left + targetNodeRect.width / 2 - canvasRect.left;
        const targetCenterY = targetNodeRect.top + targetNodeRect.height / 2 - canvasRect.top;
        
        // Determine which side of target to connect to based on cursor proximity
        const distToLeft = Math.abs(currentX - (targetNodeRect.left - canvasRect.left));
        const distToRight = Math.abs(currentX - (targetNodeRect.right - canvasRect.left));
        const distToTop = Math.abs(currentY - (targetNodeRect.top - canvasRect.top));
        const distToBottom = Math.abs(currentY - (targetNodeRect.bottom - canvasRect.top));
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        if (minDist === distToLeft) {
          endX = targetNodeRect.left - canvasRect.left;
          endY = targetCenterY;
        } else if (minDist === distToRight) {
          endX = targetNodeRect.right - canvasRect.left;
          endY = targetCenterY;
        } else if (minDist === distToTop) {
          endX = targetCenterX;
          endY = targetNodeRect.top - canvasRect.top;
        } else {
          endX = targetCenterX;
          endY = targetNodeRect.bottom - canvasRect.top;
        }
        
        path.setAttribute('stroke-dasharray', '');
        path.setAttribute('stroke', '#22c55e');
      } else {
        snappedTargetEntity = null;
        snappedTargetEntityId = null;
        path.setAttribute('stroke-dasharray', '8,4');
        path.setAttribute('stroke', '#3b82f6');
      }
      
      // Build path - use smooth bezier curve
      let pathD: string;
      
      if (dynamicStartSide === 'left' || dynamicStartSide === 'right') {
        // Horizontal exit - use smooth bezier curve
        const controlX = (dynamicStartX + endX) / 2;
        pathD = `M ${dynamicStartX},${dynamicStartY} Q ${controlX},${dynamicStartY} ${controlX},${(dynamicStartY + endY) / 2} T ${endX},${endY}`;
      } else {
        // Vertical exit - use smooth bezier curve
        const controlY = (dynamicStartY + endY) / 2;
        pathD = `M ${dynamicStartX},${dynamicStartY} Q ${dynamicStartX},${controlY} ${(dynamicStartX + endX) / 2},${controlY} T ${endX},${endY}`;
      }
      
      path.setAttribute('d', pathD);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      // Clear outline from any entity that was highlighted during drag
      if (snappedTargetEntity) {
        const innerDiv = snappedTargetEntity.querySelector('.entity-node') as HTMLElement;
        if (innerDiv) innerDiv.style.outline = '';
      }
      
      let targetEntityId = snappedTargetEntityId;
      
      if (!targetEntityId) {
        const target = e.target as HTMLElement;
        const targetEntity = target.closest('[data-entity-id]') as HTMLElement;
        if (targetEntity) {
          targetEntityId = targetEntity.getAttribute('data-entity-id');
        }
      }
      
      if (targetEntityId && targetEntityId !== data.id) {
        const existingRel = relationships.find(
          r => (r.fromEntityId === data.id && r.toEntityId === targetEntityId) ||
               (r.fromEntityId === targetEntityId && r.toEntityId === data.id)
        );
        
        if (!existingRel) {
          const relId = addRelationship(data.id, targetEntityId);
          // Store the handle positions based on the final connection
          const rel = relationships.find(r => r.id === relId);
          if (rel) {
            // Determine source handle based on dynamic start side
            let sourceHandle = `${dynamicStartSide}-s`;
            
            // Determine target handle based on which side the line connected to
            const targetEntity = entities.find(e => e.id === targetEntityId);
            if (targetEntity) {
              const targetLayout = nodeLayouts[targetEntityId];
              if (targetLayout) {
                // Determine which side based on end position
                if (Math.abs(endX - (targetLayout.x + 220)) < 5) {
                  updateRelationship(relId, { sourceHandle, targetHandle: 'right' });
                } else if (Math.abs(endX - targetLayout.x) < 5) {
                  updateRelationship(relId, { sourceHandle, targetHandle: 'left' });
                } else if (Math.abs(endY - targetLayout.y) < 5) {
                  updateRelationship(relId, { sourceHandle, targetHandle: 'top' });
                } else {
                  updateRelationship(relId, { sourceHandle, targetHandle: 'bottom' });
                }
              }
            }
          }
        }
      }
      
      setIsDraggingConnection(false);
      canvasElement.removeAttribute('data-connection-source-entity');
      svg.remove();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(data.name);
    setEditDescription(data.description || '');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [data.name, data.description]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.stopPropagation();
      e.preventDefault();
      toggleEntityMultiSelect(data.id);
    } else {
      // Normal click - set as selected
      e.stopPropagation();
      e.preventDefault();
      setSelected(data.id);
    }
  }, [data.id, toggleEntityMultiSelect, setSelected]);

  const handleSaveEdit = useCallback(() => {
    updateEntity(data.id, { 
      name: editName.trim() || 'Unnamed Entity',
      description: editDescription.trim()
    });
    setIsEditing(false);
  }, [data.id, editName, editDescription, updateEntity]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(data.name);
      setEditDescription(data.description || '');
    }
  }, [handleSaveEdit, data.name, data.description]);

  const renderConnectionHandle = (side: HoverSide) => {
    // Only show when mouse is near this specific side
    if (hoverSide !== side) return null;
    
    const positions: Record<string, React.CSSProperties> = {
      top: { top: '-5px', left: '50%', transform: 'translateX(-50%)' },
      bottom: { bottom: '-5px', left: '50%', transform: 'translateX(-50%)' },
      left: { left: '-5px', top: '50%', transform: 'translateY(-50%)' },
      right: { right: '-5px', top: '50%', transform: 'translateY(-50%)' },
    };

    // Tooltip label offset from the dot, placed on the outward side
    const tooltipStyles: Record<string, React.CSSProperties> = {
      top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px' },
      bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '6px' },
      left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '6px' },
      right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '6px' },
    };
    
    return (
      <div
        className="nodrag nopan"
        onMouseDown={handleEntityDragStart}
        onClick={(e) => {
          e.stopPropagation();
          handleCreateLinkedEntity(side);
        }}
        onMouseEnter={() => handleSideHover(side, true)}
        onMouseLeave={() => handleSideHover(side, false)}
        style={{
          position: 'absolute',
          ...positions[side!],
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: colorMode === 'dark' ? '#4ade80' : '#22c55e',
          border: `1.5px solid ${colorMode === 'dark' ? '#22c55e' : '#16a34a'}`,
          cursor: 'crosshair',
          zIndex: 20,
          pointerEvents: 'auto',
        }}
      >
        {/* Inline tooltip */}
        <div style={{
          position: 'absolute',
          ...tooltipStyles[side!],
          background: colorMode === 'dark' ? '#1f2937' : '#374151',
          color: '#ffffff',
          padding: '4px 8px',
          borderRadius: '5px',
          fontSize: '11px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: colorMode === 'dark'
            ? '0 2px 8px rgba(0, 0, 0, 0.5)'
            : '0 2px 8px rgba(0, 0, 0, 0.25)',
          userSelect: 'none',
        }}>
          Drag to connect · Click to add
        </div>
      </div>
    );
  };

  // Invisible edge trigger zones — placed inside the entity card to detect proximity
  const renderEdgeTrigger = (side: HoverSide) => {
    const zoneStyles: Record<string, React.CSSProperties> = {
      top:    { top: 0, left: '20%', right: '20%', height: '14px', cursor: 'crosshair' },
      bottom: { bottom: 0, left: '20%', right: '20%', height: '14px', cursor: 'crosshair' },
      left:   { left: 0, top: '20%', bottom: '20%', width: '14px', cursor: 'crosshair' },
      right:  { right: 0, top: '20%', bottom: '20%', width: '14px', cursor: 'crosshair' },
    };
    
    return (
      <div
        className="nodrag"
        onMouseEnter={() => handleSideHover(side, true)}
        onMouseLeave={() => handleSideHover(side, false)}
        style={{
          position: 'absolute',
          ...zoneStyles[side!],
          zIndex: 15,
          pointerEvents: 'auto',
          // Invisible — just a hover trigger
        }}
      />
    );
  };


  const renderResizeHandle = (corner: string) => {
    if (!selected) return null;
    
    const cornerStyles: Record<string, React.CSSProperties> = {
      'bottom-right': { bottom: '-4px', right: '-4px', cursor: 'se-resize' },
      'bottom-left': { bottom: '-4px', left: '-4px', cursor: 'sw-resize' },
      'top-right': { top: '-4px', right: '-4px', cursor: 'ne-resize' },
      'top-left': { top: '-4px', left: '-4px', cursor: 'nw-resize' },
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
  return (
    <div
      style={{ position: 'relative' }}
      ref={nodeRef}
      onMouseLeave={() => setHoverSide(null)}
    >
      {/* Connection handles - dot appears only on the side the mouse is near */}
      {renderConnectionHandle('top')}
      {renderConnectionHandle('right')}
      {renderConnectionHandle('bottom')}
      {renderConnectionHandle('left')}
      
      {/* Resize handles */}
      {renderResizeHandle('top-left')}
      {renderResizeHandle('top-right')}
      {renderResizeHandle('bottom-left')}
      {renderResizeHandle('bottom-right')}
      
      {/* Centered handles for clean connections */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        style={{ opacity: 0, top: 0, left: '50%', transform: 'translateX(-50%)' }} 
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top-s" 
        style={{ opacity: 0, top: 0, left: '50%', transform: 'translateX(-50%)' }} 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right" 
        style={{ opacity: 0, right: 0, top: '50%', transform: 'translateY(-50%)' }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-s" 
        style={{ opacity: 0, right: 0, top: '50%', transform: 'translateY(-50%)' }} 
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ opacity: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)' }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom-s" 
        style={{ opacity: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)' }} 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left" 
        style={{ opacity: 0, left: 0, top: '50%', transform: 'translateY(-50%)' }} 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-s" 
        style={{ opacity: 0, left: 0, top: '50%', transform: 'translateY(-50%)' }} 
      />

      {/* Conceptual View - Entity Card */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} data-entity-id={data.id}>
        {/* Invisible edge zones to trigger connection handle dots */}
        {renderEdgeTrigger('top')}
        {renderEdgeTrigger('right')}
        {renderEdgeTrigger('bottom')}
        {renderEdgeTrigger('left')}
        <div
          className={clsx('entity-node', selected && 'selected')}
          onDoubleClick={handleDoubleClick}
          onClick={handleClick}
          onMouseDown={(e) => {
            // Prevent React Flow from handling shift-click
            if (e.shiftKey) {
              e.stopPropagation();
            }
          }}
          style={{
            background: getEntityColorStyles(data.color, colorMode === 'dark', selected).background,
            border: collaboratorHighlight
              ? `2px solid ${collaboratorHighlight.color}`
              : colorMode === 'dark'
                ? (isMultiSelected ? '2px solid #22c55e' : selected ? '2px solid #3b82f6' : `2px solid ${getEntityColorStyles(data.color, true, selected).border}`)
                : (isMultiSelected ? '2px solid #22c55e' : selected ? '2px solid #3b82f6' : `2px solid ${getEntityColorStyles(data.color, false, selected).border}`),
            borderRadius: '12px',
            width: `${nodeSize.width}px`,
            minHeight: `${nodeSize.height}px`,
            padding: entityCardSize === 'compact' ? '12px 16px' : '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: entityCardSize === 'compact' ? '6px' : '10px',
            boxShadow: collaboratorHighlight
              ? `0 0 0 3px ${collaboratorHighlight.color}55, 0 4px 16px rgba(0,0,0,0.3)`
              : selected
                ? (colorMode === 'dark'
                    ? isMultiSelected
                      ? '0 0 0 1px rgba(34, 197, 94, 0.3), 0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(34, 197, 94, 0.2)'
                      : '0 0 0 1px rgba(59, 130, 246, 0.3), 0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(59, 130, 246, 0.2)'
                    : isMultiSelected
                      ? '0 0 0 1px rgba(34, 197, 94, 0.3), 0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(34, 197, 94, 0.15)'
                      : '0 0 0 1px rgba(59, 130, 246, 0.3), 0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(59, 130, 246, 0.15)')
                : (colorMode === 'dark'
                    ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)'
                    : '0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04)'),
            cursor: isResizing ? 'default' : (isEditing ? 'text' : 'move'),
            transition: isResizing ? 'none' : 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!selected && !isResizing && !isEditing) {
              e.currentTarget.style.boxShadow = colorMode === 'dark'
                ? '0 6px 20px rgba(0, 0, 0, 0.6), 0 3px 10px rgba(0, 0, 0, 0.4)'
                : '0 6px 20px rgba(0, 0, 0, 0.08), 0 3px 8px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!selected && !isResizing && !isEditing) {
              e.currentTarget.style.boxShadow = colorMode === 'dark'
                ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)'
                : '0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {/* Multi-selection indicator badge */}
          {isMultiSelected && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }} />
          )}
          
          {isEditing ? (
            <>
              {/* Editing Mode */}
              <input
                ref={nameInputRef}
                className="nodrag"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveEdit}
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: colorMode === 'dark' ? '#60a5fa' : '#1e40af',
                  textAlign: 'center',
                  letterSpacing: '0.3px',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  outline: 'none',
                  width: '100%',
                  background: colorMode === 'dark' ? '#0f172a' : 'white',
                }}
                placeholder="Entity name"
              />
              <textarea
                className="nodrag"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveEdit}
                style={{
                  fontSize: '14px',
                  color: colorMode === 'dark' ? '#cbd5e1' : '#4b5563',
                  textAlign: 'center',
                  lineHeight: '1.6',
                  border: colorMode === 'dark' ? '2px solid #334155' : '2px solid #93c5fd',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  outline: 'none',
                  width: '100%',
                  minHeight: '60px',
                  resize: 'vertical',
                  background: colorMode === 'dark' ? '#0f172a' : 'white',
                  fontFamily: 'inherit',
                }}
                placeholder="Description (optional)"
              />
              <div style={{ fontSize: '11px', color: colorMode === 'dark' ? '#94a3b8' : '#6b7280', fontStyle: 'italic' }}>
                Press Enter to save, Esc to cancel
              </div>
            </>
          ) : (
            <>
              {/* Display Mode */}
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 700,
                color: data.color && data.color !== 'default'
                  ? '#ffffff'
                  : colorMode === 'dark'
                    ? (selected ? '#60a5fa' : '#e2e8f0')
                    : (selected ? '#1e40af' : '#1f2937'),
                textAlign: 'center',
                letterSpacing: '0.3px',
                userSelect: 'none',
                marginBottom: (data.description && showEntityDescriptions) ? '6px' : '0',
                textShadow: data.color && data.color !== 'default' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
              }}>
                {data.name}
              </div>
              
              {showEntityDescriptions && data.description && (
                <div style={{
                  width: '70%',
                  height: '1px',
                  background: data.color && data.color !== 'default'
                    ? 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%)'
                    : colorMode === 'dark'
                      ? (selected
                          ? 'linear-gradient(90deg, transparent 0%, rgba(96, 165, 250, 0.5) 50%, transparent 100%)'
                          : 'linear-gradient(90deg, transparent 0%, rgba(51, 65, 85, 0.5) 50%, transparent 100%)')
                      : (selected
                          ? 'linear-gradient(90deg, transparent 0%, #93c5fd 50%, transparent 100%)'
                          : 'linear-gradient(90deg, transparent 0%, #d1d5db 50%, transparent 100%)'),
                  opacity: 0.6,
                }} />
              )}
              
              {showEntityDescriptions && data.description && (
                <div style={{ 
                  fontSize: '14px', 
                  color: data.color && data.color !== 'default'
                    ? 'rgba(255, 255, 255, 0.95)'
                    : colorMode === 'dark'
                      ? (selected ? '#cbd5e1' : '#94a3b8')
                      : (selected ? '#4b5563' : '#6b7280'),
                  textAlign: 'center', 
                  lineHeight: '1.6', 
                  userSelect: 'none',
                  opacity: 0.95,
                  textShadow: data.color && data.color !== 'default' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                }}>
                  {data.description}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default EntityNode;
