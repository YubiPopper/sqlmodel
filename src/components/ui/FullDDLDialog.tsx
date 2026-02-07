import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';
import { X, Copy, Check } from 'lucide-react';

interface FullDDLDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const generateFullDDL = (): string => {
  const lines: string[] = [];
  const state = useModelStore.getState();
  
  // Generate CREATE TABLE statements
  state.tables.forEach((table, index) => {
    if (index > 0) lines.push('');
    lines.push(`CREATE TABLE ${table.name} (`);
    
    const columnLines: string[] = [];
    const constraints: string[] = [];
    
    table.attributes.forEach((attr) => {
      const parts = [`  ${attr.name}`];
      parts.push(attr.dataType.toUpperCase());
      if (!attr.isNullable) parts.push('NOT NULL');
      columnLines.push(parts.join(' '));
    });
    
    const pkColumns = table.attributes.filter(a => a.isPrimaryKey).map(a => a.name);
    if (pkColumns.length > 0) {
      constraints.push(`  PRIMARY KEY (${pkColumns.join(', ')})`);
    }
    
    const allLines = [...columnLines, ...constraints];
    lines.push(allLines.join(',\n'));
    lines.push(');');
  });
  
  // Generate ALTER TABLE statements for foreign keys
  if (state.foreignKeys.length > 0) {
    lines.push('');
    lines.push('-- Foreign Keys');
    state.foreignKeys.forEach((fk) => {
      const sourceTable = state.tables.find(t => t.id === fk.fromTableId);
      const targetTable = state.tables.find(t => t.id === fk.toTableId);
      const sourceAttr = sourceTable?.attributes.find(a => a.id === fk.fromAttributeId);
      const targetAttr = targetTable?.attributes.find(a => a.id === fk.toAttributeId);
      
      if (sourceTable && targetTable && sourceAttr && targetAttr) {
        lines.push('');
        lines.push(`ALTER TABLE ${sourceTable.name}`);
        lines.push(`  ADD CONSTRAINT fk_${sourceTable.name}_${sourceAttr.name}`);
        lines.push(`  FOREIGN KEY (${sourceAttr.name})`);
        lines.push(`  REFERENCES ${targetTable.name}(${targetAttr.name});`);
      }
    });
  }
  
  return lines.join('\n');
};

export const FullDDLDialog: React.FC<FullDDLDialogProps> = ({ isOpen, onClose }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const [ddlText, setDdlText] = useState('');
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setDdlText(generateFullDDL());
      // Reset position when dialog opens
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);
  
  // Prevent canvas wheel events when dialog is open
  useEffect(() => {
    if (!isOpen) return;
    
    const handleWheel = (e: WheelEvent) => {
      // If the wheel event is on or inside the dialog, stop it from reaching canvas
      if (dialogRef.current && dialogRef.current.contains(e.target as Node)) {
        e.stopPropagation();
      }
    };
    
    // Use capture phase to intercept before React Flow
    document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [isOpen]);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate offset at the start of drag
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      setPosition({
        x: moveEvent.clientX - dragOffsetRef.current.x,
        y: moveEvent.clientY - dragOffsetRef.current.y,
      });
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
    
    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });
  };
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ddlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy DDL:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([ddlText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      ref={dialogRef}
      className="nodrag nopan"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        width: '650px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div 
        style={{
          background: colorMode === 'dark' ? '#161b22' : 'white',
          borderRadius: '8px',
          padding: '0',
          boxShadow: colorMode === 'dark' 
            ? '0 8px 24px rgba(0, 0, 0, 0.6)' 
            : '0 8px 24px rgba(0, 0, 0, 0.25)',
          border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #d1d5db',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          height: '550px',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          onMouseDown={handleDragStart}
          style={{
            padding: '14px 18px',
            borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '15px', 
              fontWeight: 600,
              color: colorMode === 'dark' ? '#e6edf3' : '#111827',
              marginBottom: '2px',
            }}>
              Database Schema (SQL DDL)
            </h3>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
            }}>
              All tables and foreign key constraints
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="nodrag nopan"
              onClick={handleDownload}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: colorMode === 'dark' ? '#2563eb' : '#3b82f6',
                border: 'none',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colorMode === 'dark' ? '#1d4ed8' : '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colorMode === 'dark' ? '#2563eb' : '#3b82f6';
              }}
            >
              Download .sql
            </button>
            <button
              className="nodrag nopan"
              onClick={handleCopy}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: colorMode === 'dark' ? '#21262d' : '#f3f4f6',
                border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #d1d5db',
                color: colorMode === 'dark' ? '#e6edf3' : '#374151',
                padding: '5px 10px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colorMode === 'dark' ? '#30363d' : '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colorMode === 'dark' ? '#21262d' : '#f3f4f6';
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              className="nodrag nopan"
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: 'transparent',
                border: 'none',
                color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                padding: '5px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colorMode === 'dark' ? '#21262d' : '#f3f4f6';
                e.currentTarget.style.color = colorMode === 'dark' ? '#e6edf3' : '#111827';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colorMode === 'dark' ? '#8b949e' : '#6b7280';
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* DDL Content */}
        <div 
          style={{
            flex: 1,
            overflow: 'hidden',
            padding: '14px 18px',
            borderRadius: '0 0 8px 8px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <textarea
            className="nodrag nopan"
            value={ddlText}
            readOnly
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              flex: 1,
              background: colorMode === 'dark' ? '#0d1117' : '#f9fafb',
              color: colorMode === 'dark' ? '#e6edf3' : '#111827',
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e5e7eb',
              borderRadius: '5px',
              padding: '10px',
              fontSize: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
              lineHeight: '1.4',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              overflow: 'auto',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = colorMode === 'dark' 
                ? '1px solid #22c55e' 
                : '1px solid #16a34a';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = colorMode === 'dark' 
                ? '1px solid #30363d' 
                : '1px solid #e5e7eb';
            }}
          />
          <p style={{
            marginTop: '8px',
            marginBottom: '0',
            fontSize: '10px',
            color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
            fontStyle: 'italic',
          }}>
            Read-only view of the complete database schema
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
