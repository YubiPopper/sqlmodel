import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { Entity } from '../../model/schemas';
import { useModelStore } from '../../store/useModelStore';
import clsx from 'clsx';

type HoverSide = 'top' | 'right' | 'bottom' | 'left' | null;

const DEFAULT_ENTITY_WIDTH = 220;
const DEFAULT_ENTITY_HEIGHT = 120;

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

  // Check if this entity is multi-selected (determines color: green for multi, blue for single)
  const isMultiSelected = multiSelectedEntityIds.includes(data.id);

  const handleCreateLinkedEntity = useCallback((side: HoverSide) => {
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
    const newEntityId = addEntity();
    setNodePosition(newEntityId, newX, newY);
    addRelationship(data.id, newEntityId);
    
    // If parent entity is in a group, add new entity to the same group
    const parentGroup = entityGroups.find(g => g.entityIds.includes(data.id));
    if (parentGroup) {
      addEntityToGroup(parentGroup.id, newEntityId);
    }
  }, [data.id, nodeLayouts, addEntity, addRelationship, setNodePosition, entityGroups, addEntityToGroup]);

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
    const canvasElement = event.currentTarget.closest('.react-flow');
    if (!canvasElement) return;
    
    const dragZone = event.currentTarget as HTMLElement;
    const entityElement = dragZone.closest('[data-entity-id]') as HTMLElement;
    if (!entityElement) return;
    
    const entityRect = entityElement.getBoundingClientRect();
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Determine which side we're dragging from based on drag zone position
    const dragZoneRect = dragZone.getBoundingClientRect();
    const centerX = entityRect.left + entityRect.width / 2 - canvasRect.left;
    const centerY = entityRect.top + entityRect.height / 2 - canvasRect.top;
    
    let dynamicStartSide: 'top' | 'right' | 'bottom' | 'left';
    let endX = 0, endY = 0;
    
    // Determine which side based on drag zone position relative to entity
    if (dragZoneRect.top < entityRect.top + 5) {
      dynamicStartSide = 'top';
    } else if (dragZoneRect.right > entityRect.right - 5) {
      dynamicStartSide = 'right';
    } else if (dragZoneRect.bottom > entityRect.bottom - 5) {
      dynamicStartSide = 'bottom';
    } else {
      dynamicStartSide = 'left';
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
      
      // Build path - place the turn in the gap between source and target
      let pathD: string;
      
      // Get source entity bounds
      const sourceNodeRect = entityElement.getBoundingClientRect();
      const sourceLeft = sourceNodeRect.left - canvasRect.left;
      const sourceRight = sourceNodeRect.right - canvasRect.left;
      const sourceTop = sourceNodeRect.top - canvasRect.top;
      const sourceBottom = sourceNodeRect.bottom - canvasRect.top;
      
      // Get target entity bounds if snapped
      const targetNodeRect = snappedTargetEntity 
        ? (snappedTargetEntity.querySelector('.entity-node') as HTMLElement)?.getBoundingClientRect() 
        : null;
      
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

  const renderAddButton = (side: HoverSide) => {
    if (hoverSide !== side) return null;
    
    const positions: Record<string, React.CSSProperties> = {
      top: { top: '-28px', left: '50%', transform: 'translateX(-50%)' },
      bottom: { bottom: '-28px', left: '50%', transform: 'translateX(-50%)' },
      left: { left: '-28px', top: '50%', transform: 'translateY(-50%)' },
      right: { right: '-28px', top: '50%', transform: 'translateY(-50%)' },
    };
    
    // Triangle pointing outward from the side
    const triangleRotation: Record<string, string> = {
      top: 'rotate(-90deg)',
      bottom: 'rotate(90deg)',
      left: 'rotate(180deg)',
      right: 'rotate(0deg)',
    };
    
    return (
      <button
        className="nodrag nopan"
        onClick={(e) => {
          e.stopPropagation();
          handleCreateLinkedEntity(side);
        }}
        onMouseEnter={() => handleSideHover(side, true)}
        onMouseLeave={() => handleSideHover(side, false)}
        style={{
          position: 'absolute',
          ...positions[side!],
          width: '32px',
          height: '32px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
          padding: 0,
        }}
        title="Create linked entity"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 44 44"
          style={{
            transform: triangleRotation[side!],
            filter: colorMode === 'dark' 
              ? 'drop-shadow(0 3px 8px rgba(100, 116, 139, 0.8))'
              : 'drop-shadow(0 3px 8px rgba(71, 85, 105, 0.6))',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `${triangleRotation[side!]} scale(1.15)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = triangleRotation[side!];
          }}
        >
          <defs>
            <linearGradient id={`gradient-${side}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorMode === 'dark' ? '#64748b' : '#475569'} />
              <stop offset="100%" stopColor={colorMode === 'dark' ? '#94a3b8' : '#64748b'} />
            </linearGradient>
          </defs>
          <polygon
            points="4,12 32,22 4,32"
            fill={`url(#gradient-${side})`}
            stroke={colorMode === 'dark' ? '#94a3b8' : '#64748b'}
            strokeWidth="1"
            opacity="0.95"
          />
        </svg>
      </button>
    );
  };

  const renderHoverZone = (side: HoverSide) => {
    // Only show hover zones when entity is selected to avoid blocking group selection
    if (!selected) return null;
    
    const zoneStyles: Record<string, React.CSSProperties> = {
      top: { top: '-24px', left: '25%', right: '25%', height: '28px', cursor: 'default' },
      bottom: { bottom: '-24px', left: '25%', right: '25%', height: '28px', cursor: 'default' },
      left: { left: '-24px', top: '25%', bottom: '25%', width: '28px', cursor: 'default' },
      right: { right: '-24px', top: '25%', bottom: '25%', width: '28px', cursor: 'default' },
    };
    
    return (
      <div
        className="nodrag"
        style={{
          position: 'absolute',
          ...zoneStyles[side!],
          zIndex: 5,
        }}
        onMouseEnter={() => handleSideHover(side, true)}
        onMouseLeave={() => handleSideHover(side, false)}
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
    <div style={{ position: 'relative' }} ref={nodeRef}>
      {/* Hover zones for add buttons */}
      {renderHoverZone('top')}
      {renderHoverZone('right')}
      {renderHoverZone('bottom')}
      {renderHoverZone('left')}
      
      {/* Add entity buttons */}
      {renderAddButton('top')}
      {renderAddButton('right')}
      {renderAddButton('bottom')}
      {renderAddButton('left')}
      
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
        {/* Drag handle zones on all sides for creating connections */}
        {/* Top */}
        <div
          className="nodrag"
          onMouseDown={handleEntityDragStart}
          style={{
            position: 'absolute',
            top: 0,
            left: '25%',
            right: '25%',
            height: '24px',
            cursor: 'crosshair',
            zIndex: 15,
            opacity: 0,
            background: colorMode === 'dark' 
              ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 100%)' 
              : 'linear-gradient(180deg, rgba(96, 165, 250, 0.25) 0%, rgba(96, 165, 250, 0.12) 50%, transparent 100%)',
            borderRadius: '16px 16px 0 0',
            transition: 'opacity 0.3s ease',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            if (!isResizing && !isEditing) {
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing && !isEditing) {
              e.currentTarget.style.opacity = '0';
            }
          }}
          title="Drag to connect to another entity"
        />
        {/* Right */}
        <div
          className="nodrag"
          onMouseDown={handleEntityDragStart}
          style={{
            position: 'absolute',
            right: 0,
            top: '25%',
            bottom: '25%',
            width: '24px',
            cursor: 'crosshair',
            zIndex: 15,
            opacity: 0,
            background: colorMode === 'dark' 
              ? 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.15) 50%, rgba(59, 130, 246, 0.3) 100%)' 
              : 'linear-gradient(90deg, transparent 0%, rgba(96, 165, 250, 0.12) 50%, rgba(96, 165, 250, 0.25) 100%)',
            borderRadius: '0 16px 16px 0',
            transition: 'opacity 0.3s ease',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            if (!isResizing && !isEditing) {
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing && !isEditing) {
              e.currentTarget.style.opacity = '0';
            }
          }}
          title="Drag to connect to another entity"
        />
        {/* Bottom */}
        <div
          className="nodrag"
          onMouseDown={handleEntityDragStart}
          style={{
            position: 'absolute',
            bottom: 0,
            left: '25%',
            right: '25%',
            height: '24px',
            cursor: 'crosshair',
            zIndex: 15,
            opacity: 0,
            background: colorMode === 'dark' 
              ? 'linear-gradient(0deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 100%)' 
              : 'linear-gradient(0deg, rgba(96, 165, 250, 0.25) 0%, rgba(96, 165, 250, 0.12) 50%, transparent 100%)',
            borderRadius: '0 0 16px 16px',
            transition: 'opacity 0.3s ease',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            if (!isResizing && !isEditing) {
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing && !isEditing) {
              e.currentTarget.style.opacity = '0';
            }
          }}
          title="Drag to connect to another entity"
        />
        {/* Left */}
        <div
          className="nodrag"
          onMouseDown={handleEntityDragStart}
          style={{
            position: 'absolute',
            left: 0,
            top: '25%',
            bottom: '25%',
            width: '24px',
            cursor: 'crosshair',
            zIndex: 15,
            opacity: 0,
            background: colorMode === 'dark' 
              ? 'linear-gradient(270deg, transparent 0%, rgba(59, 130, 246, 0.15) 50%, rgba(59, 130, 246, 0.3) 100%)' 
              : 'linear-gradient(270deg, transparent 0%, rgba(96, 165, 250, 0.12) 50%, rgba(96, 165, 250, 0.25) 100%)',
            borderRadius: '16px 0 0 16px',
            transition: 'opacity 0.3s ease',
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            if (!isResizing && !isEditing) {
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing && !isEditing) {
              e.currentTarget.style.opacity = '0';
            }
          }}
          title="Drag to connect to another entity"
        />
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
            border: colorMode === 'dark'
              ? (isMultiSelected ? '2px solid #22c55e' : selected ? '2px solid #3b82f6' : `2px solid ${getEntityColorStyles(data.color, true, selected).border}`)
              : (isMultiSelected ? '2px solid #22c55e' : selected ? '2px solid #3b82f6' : `2px solid ${getEntityColorStyles(data.color, false, selected).border}`),
            borderRadius: '12px',
            width: `${nodeSize.width}px`,
            minHeight: `${nodeSize.height}px`,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            boxShadow: selected
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
                marginBottom: data.description ? '6px' : '0',
                textShadow: data.color && data.color !== 'default' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
              }}>
                {data.name}
              </div>
              
              {data.description && (
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
              
              {data.description && (
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
