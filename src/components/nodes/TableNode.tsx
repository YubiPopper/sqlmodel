import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { PhysicalTable } from '../../model/schemas';
import { useModelStore } from '../../store/useModelStore';
import clsx from 'clsx';
import { Key, Link2, Diamond, Table2, Code } from 'lucide-react';
import { DDLDialog } from '../ui/DDLDialog';

type HoverSide = 'top' | 'right' | 'bottom' | 'left' | null;

// Helper function to get color styles for tables
const getTableColorStyles = (color: string | undefined, isDark: boolean) => {
  const colorValue = color || 'default';
  
  const colorMap: Record<string, { background: string; border: string; borderSelected: string; headerBg: string; headerText: string; headerBorder: string }> = {
    default: {
      background: isDark ? '#0d1117' : '#ffffff',
      border: isDark ? '#22c55e' : '#86efac',
      borderSelected: isDark ? '#22c55e' : '#16a34a',
      headerBg: isDark ? '#161b22' : '#f0fdf4',
      headerText: isDark ? '#e6edf3' : '#166534',
      headerBorder: isDark ? '#30363d' : '#bbf7d0',
    },
    bronze: {
      background: 'linear-gradient(135deg, #8b5a3c 0%, #6d4c41 100%)',
      border: '#8b5a3c',
      borderSelected: '#8b5a3c',
      headerBg: 'rgba(139, 90, 60, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    silver: {
      background: 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)',
      border: '#a0aec0',
      borderSelected: '#a0aec0',
      headerBg: 'rgba(160, 174, 192, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    gold: {
      background: 'linear-gradient(135deg, #d4af37 0%, #b8960c 100%)',
      border: '#d4af37',
      borderSelected: '#d4af37',
      headerBg: 'rgba(212, 175, 55, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    red: {
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      border: '#dc2626',
      borderSelected: '#dc2626',
      headerBg: 'rgba(220, 38, 38, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    orange: {
      background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      border: '#ea580c',
      borderSelected: '#ea580c',
      headerBg: 'rgba(234, 88, 12, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    green: {
      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      border: '#16a34a',
      borderSelected: '#16a34a',
      headerBg: 'rgba(22, 163, 74, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    teal: {
      background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
      border: '#0d9488',
      borderSelected: '#0d9488',
      headerBg: 'rgba(13, 148, 136, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    blue: {
      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      border: '#2563eb',
      borderSelected: '#2563eb',
      headerBg: 'rgba(37, 99, 235, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    indigo: {
      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
      border: '#4f46e5',
      borderSelected: '#4f46e5',
      headerBg: 'rgba(79, 70, 229, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    purple: {
      background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
      border: '#9333ea',
      borderSelected: '#9333ea',
      headerBg: 'rgba(147, 51, 234, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
    pink: {
      background: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
      border: '#db2777',
      borderSelected: '#db2777',
      headerBg: 'rgba(219, 39, 119, 0.2)',
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    },
  };

  // If it's a predefined color, use it
  if (colorMap[colorValue]) {
    return colorMap[colorValue];
  }
  
  // If it's a hex color, create gradient and styles from it
  if (colorValue.startsWith('#')) {
    return {
      background: `linear-gradient(135deg, ${colorValue} 0%, ${colorValue}dd 100%)`,
      border: colorValue,
      borderSelected: colorValue,
      headerBg: `${colorValue}33`,
      headerText: '#ffffff',
      headerBorder: 'rgba(255, 255, 255, 0.2)',
    };
  }
  
  return colorMap.default;
};

const TableNode = memo(({ data, selected }: NodeProps<PhysicalTable>) => {
  const [hoverSide, setHoverSide] = useState<HoverSide>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [showDDL, setShowDDL] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const addForeignKey = useModelStore(state => state.addForeignKey);
  const foreignKeys = useModelStore(state => state.foreignKeys);
  const addTable = useModelStore(state => state.addTable);
  const updateTable = useModelStore(state => state.updateTable);
  const tableLayouts = useModelStore(state => state.tableLayouts);
  const setTablePosition = useModelStore(state => state.setTablePosition);
  const colorMode = useModelStore(state => state.colorMode);
  const multiSelectedTableIds = useModelStore(state => state.multiSelectedTableIds);
  const toggleTableMultiSelect = useModelStore(state => state.toggleTableMultiSelect);
  const setSelected = useModelStore(state => state.setSelected);
  const tableFieldsDisplay = useModelStore(state => state.tableFieldsDisplay);

  // Check if this table is multi-selected
  const isMultiSelected = multiSelectedTableIds.includes(data.id);

  const handleCreateLinkedTable = useCallback((side: HoverSide) => {
    if (!side) return;
    
    const currentLayout = tableLayouts[data.id];
    if (!currentLayout) return;
    
    // Calculate position for new table based on clicked side
    let newX = currentLayout.x;
    let newY = currentLayout.y;
    const horizontalOffset = 300;
    const verticalOffset = 200; // Reduced spacing for top/bottom
    
    switch (side) {
      case 'top': newY -= verticalOffset; break;
      case 'bottom': newY += verticalOffset; break;
      case 'left': newX -= horizontalOffset; break;
      case 'right': newX += horizontalOffset; break;
    }
    
    // Create new table linked to the same entity (user can drag field to create FK)
    const newTableId = addTable(data.entityId);
    setTablePosition(newTableId, newX, newY);
  }, [data.id, data.entityId, tableLayouts, addTable, setTablePosition]);

  const handleSideHover = useCallback((side: HoverSide, isEntering: boolean) => {
    if (!isEditing) {
      setHoverSide(isEntering ? side : null);
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(data.name);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }, [data.name]);

  const handleSaveEdit = useCallback(() => {
    updateTable(data.id, { name: editName.trim() || 'unnamed_table' });
    setIsEditing(false);
  }, [data.id, editName, updateTable]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(data.name);
    }
  }, [handleSaveEdit, data.name]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.stopPropagation();
      e.preventDefault();
      toggleTableMultiSelect(data.id);
    } else {
      // Normal click - set as selected
      e.stopPropagation();
      e.preventDefault();
      setSelected(data.id);
    }
  }, [data.id, toggleTableMultiSelect, setSelected]);

  const renderAddButton = (side: HoverSide) => {
    if (hoverSide !== side) return null;
    
    const positions: Record<string, React.CSSProperties> = {
      top: { top: '-24px', left: '50%', transform: 'translateX(-50%)' },
      bottom: { bottom: '-24px', left: '50%', transform: 'translateX(-50%)' },
      left: { left: '-24px', top: '50%', transform: 'translateY(-50%)' },
      right: { right: '-24px', top: '50%', transform: 'translateY(-50%)' },
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
          handleCreateLinkedTable(side);
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
        title="Create new table (drag field to link)"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          style={{
            transform: triangleRotation[side!],
            filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.5))',
            transition: 'transform 0.15s',
          }}
        >
          <polygon
            points="2,6 22,14 2,22"
            fill="#10b981"
          />
        </svg>
      </button>
    );
  };

  const renderHoverZone = (side: HoverSide) => {
    const zoneStyles: Record<string, React.CSSProperties> = {
      top: { top: '-28px', left: '10%', right: '10%', height: '36px', cursor: 'default' },
      bottom: { bottom: '-28px', left: '10%', right: '10%', height: '36px', cursor: 'default' },
      left: { left: '-28px', top: '10%', bottom: '10%', width: '36px', cursor: 'default' },
      right: { right: '-28px', top: '10%', bottom: '10%', width: '36px', cursor: 'default' },
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

  const handleFieldDragStart = (tableId: string, fieldId: string, event: React.MouseEvent) => {
    const canvasElement = event.currentTarget.closest('.react-flow');
    if (!canvasElement) return;
    
    const fieldElement = event.currentTarget as HTMLElement;
    const fieldRect = fieldElement.getBoundingClientRect();
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Store both left and right exit points
    const startRightX = fieldRect.right - canvasRect.left;
    const startLeftX = fieldRect.left - canvasRect.left;
    const startY = fieldRect.top + fieldRect.height / 2 - canvasRect.top;
    const fieldCenterX = (fieldRect.left + fieldRect.right) / 2 - canvasRect.left;
    
    canvasElement.setAttribute('data-connection-source-table', tableId);
    canvasElement.setAttribute('data-connection-source-field', fieldId);
    
    fieldElement.style.background = '#bbdefb';
    
    // Track currently snapped target
    let snappedTargetField: HTMLElement | null = null;
    let snappedTargetFieldId: string | null = null;
    let snappedTargetTableId: string | null = null;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'temp-connection-line');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1000';
    
    // Use path for orthogonal routing instead of diagonal line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${startRightX} ${startY} L ${startRightX} ${startY}`);
    path.setAttribute('stroke', '#2563eb');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '6,4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    
    svg.appendChild(path);
    canvasElement.appendChild(svg);
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX - canvasRect.left;
      const currentY = e.clientY - canvasRect.top;
      
      // Determine if cursor is to the left or right of the source field
      const exitLeft = currentX < fieldCenterX;
      const startX = exitLeft ? startLeftX : startRightX;
      
      // Find the closest field in other tables to snap to
      const allFieldElements = canvasElement.querySelectorAll('[data-field-id]');
      let closestField: HTMLElement | null = null;
      let closestDistance = 80; // Snap threshold in pixels
      let closestFieldRect: DOMRect | null = null;
      
      allFieldElements.forEach((el) => {
        const fieldEl = el as HTMLElement;
        const parentTable = fieldEl.closest('[data-id]') as HTMLElement;
        const parentTableId = parentTable?.getAttribute('data-id');
        
        // Skip fields in the same table
        if (parentTableId === tableId) return;
        
        const rect = fieldEl.getBoundingClientRect();
        const fieldCenterY = rect.top + rect.height / 2;
        const fieldLeftX = rect.left;
        const fieldRightX = rect.right;
        
        // Calculate distance to either edge of the field
        const distanceToLeft = Math.sqrt(
          Math.pow(e.clientX - fieldLeftX, 2) + 
          Math.pow(e.clientY - fieldCenterY, 2)
        );
        const distanceToRight = Math.sqrt(
          Math.pow(e.clientX - fieldRightX, 2) + 
          Math.pow(e.clientY - fieldCenterY, 2)
        );
        const distance = Math.min(distanceToLeft, distanceToRight);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestField = fieldEl;
          closestFieldRect = rect;
        }
      });
      
      // Update snapped target styling
      if (snappedTargetField && snappedTargetField !== closestField) {
        snappedTargetField.style.background = '';
      }
      
      let endX = currentX;
      let endY = currentY;
      
      if (closestField !== null && closestFieldRect !== null) {
        const targetField = closestField as HTMLElement;
        const targetRect = closestFieldRect as DOMRect;
        
        targetField.style.background = '#c8e6c9'; // Green highlight for snap target
        snappedTargetField = targetField;
        snappedTargetFieldId = targetField.getAttribute('data-field-id');
        const parentTable = targetField.closest('[data-id]') as HTMLElement;
        snappedTargetTableId = parentTable?.getAttribute('data-id') || null;
        
        // Snap to the appropriate edge of the target field
        const targetCenterY = targetRect.top + targetRect.height / 2 - canvasRect.top;
        
        // Determine which side of target to connect to (opposite of source exit)
        if (exitLeft) {
          // Source exits left, connect to target's right
          endX = targetRect.right - canvasRect.left;
        } else {
          // Source exits right, connect to target's left
          endX = targetRect.left - canvasRect.left;
        }
        endY = targetCenterY;
        
        // Make path solid when snapped
        path.setAttribute('stroke-dasharray', '');
        path.setAttribute('stroke', '#16a34a'); // Green when snapped
      } else {
        snappedTargetField = null;
        snappedTargetFieldId = null;
        snappedTargetTableId = null;
        path.setAttribute('stroke-dasharray', '6,4');
        path.setAttribute('stroke', '#2563eb');
      }
      
      // Create orthogonal path
      const midX = startX + (endX - startX) / 2;
      
      const pathD = `M ${startX} ${startY} ` +
                    `L ${midX} ${startY} ` +
                    `L ${midX} ${endY} ` +
                    `L ${endX} ${endY}`;
      
      path.setAttribute('d', pathD);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      // Use snapped target if available, otherwise check what's under cursor
      let targetFieldId = snappedTargetFieldId;
      let targetTableId = snappedTargetTableId;
      
      if (!targetFieldId) {
        const target = e.target as HTMLElement;
        const targetField = target.closest('[data-field-id]') as HTMLElement;
        
        if (targetField) {
          targetFieldId = targetField.getAttribute('data-field-id');
          const targetTableNode = targetField.closest('[data-id]') as HTMLElement;
          targetTableId = targetTableNode?.getAttribute('data-id') || null;
        }
      }
      
      if (targetTableId && targetFieldId && targetTableId !== tableId) {
        // Check if FK already exists
        const existingFK = foreignKeys.find(
          fk => fk.fromTableId === tableId && 
                fk.toTableId === targetTableId &&
                fk.fromAttributeId === fieldId &&
                fk.toAttributeId === targetFieldId
        );
        
        if (!existingFK) {
          addForeignKey(tableId, targetTableId, fieldId, targetFieldId);
        }
      }
      
      // Clean up styling
      if (snappedTargetField) {
        snappedTargetField.style.background = '';
      }
      fieldElement.style.background = '';
      canvasElement.removeAttribute('data-connection-source-table');
      canvasElement.removeAttribute('data-connection-source-field');
      svg.remove();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Table-level handles for when fields are hidden */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="table-target-left" 
        style={{ opacity: 0, left: 0, top: '50%', transform: 'translateY(-50%)' }} 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="table-source-left" 
        style={{ opacity: 0, left: 0, top: '50%', transform: 'translateY(-50%)' }} 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="table-target-right" 
        style={{ opacity: 0, right: 0, top: '50%', transform: 'translateY(-50%)' }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="table-source-right" 
        style={{ opacity: 0, right: 0, top: '50%', transform: 'translateY(-50%)' }} 
      />
      
      {/* Hover zones for add buttons */}
      {renderHoverZone('top')}
      {renderHoverZone('right')}
      {renderHoverZone('bottom')}
      {renderHoverZone('left')}
      
      {/* Add table buttons */}
      {renderAddButton('top')}
      {renderAddButton('right')}
      {renderAddButton('bottom')}
      {renderAddButton('left')}
      
      <div
        className={clsx('table-node', selected && 'selected')}
        onClick={handleClick}
        onMouseDown={(e) => {
          // Prevent React Flow from handling shift-click
          if (e.shiftKey) {
            e.stopPropagation();
          }
        }}
        style={{
          background: getTableColorStyles(data.color, colorMode === 'dark').background,
          border: colorMode === 'dark' 
            ? (isMultiSelected ? '2px solid #22c55e' : selected ? `2px solid ${getTableColorStyles(data.color, true).borderSelected}` : `2px solid ${getTableColorStyles(data.color, true).border}`) 
            : (isMultiSelected ? '2px solid #22c55e' : selected ? `2px solid ${getTableColorStyles(data.color, false).borderSelected}` : `2px solid ${getTableColorStyles(data.color, false).border}`),
          borderRadius: '8px',
          minWidth: '240px',
          boxShadow: (selected || isMultiSelected)
            ? (colorMode === 'dark' 
                ? '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2)' 
                : '0 0 20px rgba(22, 163, 74, 0.3), 0 4px 12px rgba(0,0,0,0.1)')
            : (colorMode === 'dark' 
                ? '0 0 15px rgba(34, 197, 94, 0.25), 0 4px 12px rgba(0,0,0,0.4)' 
                : '0 4px 12px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)'),
          overflow: 'hidden',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          position: 'relative',
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
          zIndex: 10,
        }} />
      )}
      {/* Header */}
      <div
        onDoubleClick={handleDoubleClick}
        style={{
          background: getTableColorStyles(data.color, colorMode === 'dark').headerBg,
          color: getTableColorStyles(data.color, colorMode === 'dark').headerText,
          padding: '12px 14px',
          fontWeight: 600,
          fontSize: '15px',
          borderBottom: `1px solid ${getTableColorStyles(data.color, colorMode === 'dark').headerBorder}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: isEditing ? 'text' : 'grab',
        }}
      >
        <Table2 size={16} style={{ 
          color: data.color && data.color !== 'default' 
            ? '#ffffff' 
            : (colorMode === 'dark' ? '#22c55e' : '#16a34a'), 
          flexShrink: 0 
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {isEditing ? (
            <input
              ref={nameInputRef}
              className="nodrag"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: getTableColorStyles(data.color, colorMode === 'dark').headerText,
                border: data.color && data.color !== 'default' 
                  ? '2px solid rgba(255,255,255,0.5)' 
                  : (colorMode === 'dark' ? '2px solid #22c55e' : '2px solid #16a34a'),
                borderRadius: '4px',
                padding: '4px 8px',
                outline: 'none',
                width: '100%',
                background: data.color && data.color !== 'default' 
                  ? 'rgba(255,255,255,0.1)' 
                  : (colorMode === 'dark' ? '#0d1117' : '#ffffff'),
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              }}
            />
          ) : (
            <span style={{ textShadow: data.color && data.color !== 'default' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}>{data.name}</span>
          )}
        </div>
        <button
          className="nodrag nopan"
          onClick={(e) => {
            e.stopPropagation();
            setShowDDL(true);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: data.color && data.color !== 'default' 
              ? '#ffffff' 
              : (colorMode === 'dark' ? '#22c55e' : '#16a34a'),
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: 0.7,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = data.color && data.color !== 'default'
              ? 'rgba(255, 255, 255, 0.1)'
              : (colorMode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.background = 'transparent';
          }}
          title="View DDL"
        >
          <Code size={16} />
        </button>
      </div>

      {/* Body / Columns */}
      {tableFieldsDisplay !== 'name' && (
        <div className="nodrag" style={{ 
          background: data.color && data.color !== 'default' 
            ? 'rgba(0, 0, 0, 0.15)' 
            : (colorMode === 'dark' ? '#0d1117' : '#ffffff') 
        }}>
          {data.attributes && data.attributes.length > 0 ? (
            // Filter attributes based on tableFieldsDisplay mode
            data.attributes
              .filter(attr => {
                if (tableFieldsDisplay === 'keys') {
                  // Only show primary keys and foreign keys
                  return attr.isPrimaryKey || attr.isForeignKey;
                }
                // 'all' mode - show all attributes
                return true;
              })
              .map((attr, index, filteredArray) => (
            <div 
              key={attr.id} 
              data-field-id={attr.id}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  e.stopPropagation();
                  handleFieldDragStart(data.id, attr.id, e);
                }
              }}
              style={{ 
                padding: '10px 14px', 
                borderBottom: index < filteredArray.length - 1 
                  ? (data.color && data.color !== 'default' 
                      ? '1px solid rgba(255, 255, 255, 0.1)' 
                      : (colorMode === 'dark' ? '1px solid #21262d' : '1px solid #e5e7eb'))
                  : 'none', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: data.color && data.color !== 'default' 
                  ? 'rgba(255, 255, 255, 0.95)' 
                  : (colorMode === 'dark' ? '#e6edf3' : '#374151'),
                position: 'relative',
                cursor: 'crosshair',
                transition: 'background 0.15s',
                background: attr.isPrimaryKey 
                  ? (data.color && data.color !== 'default' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : (colorMode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)'))
                  : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = data.color && data.color !== 'default' 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : (colorMode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)');
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = attr.isPrimaryKey 
                  ? (data.color && data.color !== 'default' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : (colorMode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)'))
                  : 'transparent';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
                {attr.isPrimaryKey && (
                  <Key size={14} style={{ 
                    color: data.color && data.color !== 'default' 
                      ? '#ffffff' 
                      : (colorMode === 'dark' ? '#22c55e' : '#16a34a') 
                  }} />
                )}
                {attr.isForeignKey && !attr.isPrimaryKey && (
                  <Link2 size={14} style={{ 
                    color: data.color && data.color !== 'default' 
                      ? '#ffffff' 
                      : (colorMode === 'dark' ? '#22c55e' : '#16a34a') 
                  }} />
                )}
                {!attr.isPrimaryKey && !attr.isForeignKey && (
                  <Diamond 
                    size={14} 
                    style={{ 
                      color: data.color && data.color !== 'default' 
                        ? 'rgba(255, 255, 255, 0.5)' 
                        : (colorMode === 'dark' ? '#8b949e' : '#9ca3af') 
                    }} 
                    fill={attr.isNullable 
                      ? 'transparent' 
                      : (data.color && data.color !== 'default' 
                          ? 'rgba(255, 255, 255, 0.5)' 
                          : (colorMode === 'dark' ? '#8b949e' : '#9ca3af'))}
                  />
                )}
                <span style={{ 
                  fontWeight: attr.isPrimaryKey ? 600 : 400,
                  textShadow: data.color && data.color !== 'default' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                }}>
                  {attr.name}
                </span>
              </span>
              <span style={{ 
                color: data.color && data.color !== 'default' 
                  ? 'rgba(255, 255, 255, 0.6)' 
                  : (colorMode === 'dark' ? '#8b949e' : '#9ca3af'), 
                fontSize: '12px', 
                pointerEvents: 'none',
                textShadow: data.color && data.color !== 'default' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
              }}>
                {attr.dataType}
              </span>
              
              {/* Hidden handles for React Flow connections - all four sides */}
              {/* Left side handles */}
              <Handle 
                type="target" 
                position={Position.Left} 
                id={`target-${attr.id}`} 
                style={{ 
                  opacity: 0, 
                  left: 0, 
                  width: '8px', 
                  height: '8px',
                  background: '#3b82f6',
                  transform: 'translateX(-50%)',
                }} 
              />
              <Handle 
                type="source" 
                position={Position.Left} 
                id={`source-left-${attr.id}`} 
                style={{ 
                  opacity: 0, 
                  left: 0, 
                  width: '8px', 
                  height: '8px',
                  background: '#3b82f6',
                  transform: 'translateX(-50%)',
                }} 
              />
              {/* Right side handles */}
              <Handle 
                type="target" 
                position={Position.Right} 
                id={`target-right-${attr.id}`} 
                style={{ 
                  opacity: 0, 
                  right: 0, 
                  width: '8px', 
                  height: '8px',
                  background: '#3b82f6',
                  transform: 'translateX(50%)',
                }} 
              />
              <Handle 
                type="source" 
                position={Position.Right} 
                id={`source-${attr.id}`} 
                style={{ 
                  opacity: 0, 
                  right: 0, 
                  width: '8px', 
                  height: '8px',
                  background: '#3b82f6',
                  transform: 'translateX(50%)',
                }} 
              />
            </div>
          ))
        ) : (
          <div style={{ 
            padding: '16px 14px', 
            fontSize: '12px', 
            color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', 
            fontStyle: 'italic',
            textAlign: 'center',
            background: colorMode === 'dark' ? '#0d1117' : '#ffffff'
          }}>
            No columns defined
          </div>
        )}
        </div>
      )}
      </div>
      
      <DDLDialog 
        isOpen={showDDL}
        table={data}
        onClose={() => setShowDDL(false)}
      />
    </div>
  );
});

export default TableNode;
