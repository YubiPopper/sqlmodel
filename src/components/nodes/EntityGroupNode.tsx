import { memo, useState, useCallback, useRef } from 'react';
import { type NodeProps } from 'reactflow';
import { useModelStore } from '../../store/useModelStore';
import { Plus, Move } from 'lucide-react';

interface EntityGroupData {
  entityId: string;
  entityName: string;
  entityDescription?: string;
  width: number;
  height: number;
  isDropTarget?: boolean; // Flag for when table is dragged over this entity group
}

const EntityGroupNode = memo(({ data, selected }: NodeProps<EntityGroupData>) => {
  const [isResizing, setIsResizing] = useState(false);
  const [localSize, setLocalSize] = useState({ width: data.width, height: data.height });
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const colorMode = useModelStore(state => state.colorMode);
  const addTable = useModelStore(state => state.addTable);
  const tables = useModelStore(state => state.tables);

  // Update local size when data changes (from recalculation)
  if (!isResizing && (localSize.width !== data.width || localSize.height !== data.height)) {
    setLocalSize({ width: data.width, height: data.height });
  }

  const handleAddTable = (e: React.MouseEvent) => {
    e.stopPropagation();
    addTable(data.entityId);
  };

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

  const entityTables = tables.filter(t => t.entityId === data.entityId);
  const hasNoTables = entityTables.length === 0;

  return (
    <div
      ref={nodeRef}
      className="entity-group-drag-handle"
      style={{
        width: localSize.width,
        height: localSize.height,
        background: data.isDropTarget 
          ? (colorMode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(199, 210, 254, 0.3)')
          : (colorMode === 'dark' 
              ? 'rgba(30, 41, 59, 0.3)' 
              : 'rgba(241, 245, 249, 0.5)'),
        border: data.isDropTarget
          ? `2px dashed #6366f1`
          : (colorMode === 'dark'
              ? (selected ? '2px dashed #3b82f6' : '1.5px dashed #475569')
              : (selected ? '2px dashed #3b82f6' : '1.5px dashed #94a3b8')),
        borderRadius: '12px',
        position: 'relative',
        cursor: 'grab',
        transition: isResizing ? 'none' : 'all 0.2s ease',
        boxShadow: data.isDropTarget
          ? (colorMode === 'dark' 
              ? '0 0 0 2px rgba(99, 102, 241, 0.5), 0 0 24px rgba(99, 102, 241, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3)'
              : '0 0 0 2px rgba(99, 102, 241, 0.5), 0 0 24px rgba(99, 102, 241, 0.3), 0 8px 16px rgba(0, 0, 0, 0.1)')
          : 'none',
        pointerEvents: 'all',
      }}
    >
      {/* Drag Handle Area - Top bar */}
      <div
        className="entity-group-drag-handle"
        style={{
          pointerEvents: 'all',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '28px',
          background: colorMode === 'dark' 
            ? 'rgba(30, 41, 59, 0.5)' 
            : 'rgba(226, 232, 240, 0.5)',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '8px',
          cursor: 'grab',
        }}
      >
        <Move size={12} style={{ color: colorMode === 'dark' ? '#475569' : '#94a3b8' }} />
        <span style={{ 
          fontSize: '9px', 
          color: colorMode === 'dark' ? '#475569' : '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 600,
        }}>
          Entity
        </span>
        <span style={{ 
          fontSize: '12px',
          fontWeight: 500,
          color: colorMode === 'dark' ? '#94a3b8' : '#475569',
        }}>
          {data.entityName}
        </span>
      </div>

      {/* Add Table Button - Only for entities with no tables */}
      {hasNoTables && (
        <button
          className="nodrag"
          onClick={handleAddTable}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '8px 16px',
            borderRadius: '6px',
            background: colorMode === 'dark' ? '#1e293b' : '#e2e8f0',
            border: colorMode === 'dark' ? '1px solid #334155' : '1px solid #cbd5e1',
            color: colorMode === 'dark' ? '#94a3b8' : '#64748b',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colorMode === 'dark' ? '#334155' : '#cbd5e1';
            e.currentTarget.style.color = colorMode === 'dark' ? '#e2e8f0' : '#1e293b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colorMode === 'dark' ? '#1e293b' : '#e2e8f0';
            e.currentTarget.style.color = colorMode === 'dark' ? '#94a3b8' : '#64748b';
          }}
          title="Add table to this entity"
        >
          <Plus size={14} />
          Add Table
        </button>
      )}

      {/* Resize Handle - Bottom Right */}
      <div
        className="nodrag nopan"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '12px',
          height: '12px',
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: selected ? 0.8 : 0.4,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = selected ? '0.8' : '0.4';
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M9 1L1 9M9 5L5 9M9 9L9 9"
            stroke={colorMode === 'dark' ? '#64748b' : '#94a3b8'}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
});

export default EntityGroupNode;
