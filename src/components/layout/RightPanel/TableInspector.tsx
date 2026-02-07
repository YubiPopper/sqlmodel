import React, { useState } from 'react';
import { Table, Trash2, Plus, Key, Link, GripVertical, MoreVertical, Copy, FileCode } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput, ColorPicker } from './FormComponents';
import type { PhysicalTable, Attribute } from '../../../model/schemas';
import { DDLDialog } from '../../ui/DDLDialog';

interface TableInspectorProps {
  table: PhysicalTable;
}

const DATA_TYPES = [
  'int', 'bigint', 'smallint', 
  'varchar', 'text', 'char',
  'boolean', 
  'date', 'timestamp', 'time',
  'uuid', 
  'decimal', 'float', 'double',
  'json', 'jsonb',
];

export const TableInspector: React.FC<TableInspectorProps> = ({ table }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDDLDialog, setShowDDLDialog] = useState(false);
  const updateTable = useModelStore(state => state.updateTable);
  const deleteTable = useModelStore(state => state.deleteTable);
  const addTableAttribute = useModelStore(state => state.addTableAttribute);
  const updateTableAttribute = useModelStore(state => state.updateTableAttribute);
  const deleteTableAttribute = useModelStore(state => state.deleteTableAttribute);
  const entities = useModelStore(state => state.entities);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';
  const parentEntity = entities.find(e => e.id === table.entityId);

  const handleGenerateDDL = () => {
    setShowMenu(false);
    setShowDDLDialog(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm(`Delete table "${table.name}"? This will also delete all foreign keys connected to it.`)) {
      deleteTable(table.id);
    }
  };

  const handleDuplicateTable = () => {
    setShowMenu(false);
    // TODO: Implement duplicate
    alert('Duplicate feature coming soon');
  };

  const ActionsMenu = () => (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          background: showMenu ? (isDark ? '#30363d' : '#e5e7eb') : 'transparent',
          border: 'none',
          padding: '6px',
          cursor: 'pointer',
          color: isDark ? '#8b949e' : '#6b7280',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MoreVertical size={16} />
      </button>
      
      {showMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: isDark ? '#161b22' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '8px',
            boxShadow: isDark 
              ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
              : '0 8px 24px rgba(0, 0, 0, 0.12)',
            minWidth: '160px',
            zIndex: 1000,
            overflow: 'hidden',
          }}>
            <button
              onClick={handleDuplicateTable}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: isDark ? '#e6edf3' : '#374151',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Copy size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
              Duplicate Table
            </button>
            <button
              onClick={handleGenerateDDL}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: isDark ? '#e6edf3' : '#374151',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <FileCode size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
              Copy DDL
            </button>
            <div style={{ 
              height: '1px', 
              background: isDark ? '#30363d' : '#e5e7eb',
              margin: '4px 0',
            }} />
            <button
              onClick={handleDelete}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#ef4444',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 size={14} />
              Delete Table
            </button>
          </div>
        </>
      )}
    </div>
  );

  const handleDeleteAttribute = (attrId: string) => {
    deleteTableAttribute(table.id, attrId);
  };

  const AttributeRow: React.FC<{ attr: Attribute; index: number }> = ({ attr }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: isDark ? '#161b22' : '#ffffff',
        borderRadius: '8px',
        marginBottom: '8px',
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        transition: 'all 0.15s',
      }}
    >
      {/* Icon indicator */}
      <div style={{ 
        width: '20px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {attr.isPrimaryKey && <Key size={14} style={{ color: '#eab308' }} />}
        {attr.isForeignKey && !attr.isPrimaryKey && <Link size={14} style={{ color: '#6366f1' }} />}
        {!attr.isPrimaryKey && !attr.isForeignKey && <GripVertical size={14} style={{ color: isDark ? '#484f58' : '#d1d5db' }} />}
      </div>
      
      {/* Column name */}
      <input
        value={attr.name}
        onChange={(e) => updateTableAttribute(table.id, attr.id, { name: e.target.value })}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '6px 10px',
          fontSize: '13px',
          color: isDark ? '#e6edf3' : '#374151',
          background: isDark ? '#0d1117' : '#f9fafb',
          border: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
          borderRadius: '6px',
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 500,
        }}
      />
      
      {/* Data type */}
      <select
        value={attr.dataType}
        onChange={(e) => updateTableAttribute(table.id, attr.id, { dataType: e.target.value })}
        style={{
          width: '90px',
          padding: '6px 8px',
          fontSize: '12px',
          color: isDark ? '#8b949e' : '#6b7280',
          background: isDark ? '#0d1117' : '#f9fafb',
          border: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
          borderRadius: '6px',
          fontFamily: 'ui-monospace, monospace',
          cursor: 'pointer',
        }}
      >
        {DATA_TYPES.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <button
          onClick={() => updateTableAttribute(table.id, attr.id, { isPrimaryKey: !attr.isPrimaryKey })}
          title={attr.isPrimaryKey ? 'Remove Primary Key' : 'Set as Primary Key'}
          style={{
            width: '28px',
            height: '28px',
            padding: 0,
            background: attr.isPrimaryKey 
              ? (isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3') 
              : 'transparent',
            border: `1px solid ${attr.isPrimaryKey ? '#eab308' : (isDark ? '#30363d' : '#e5e7eb')}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <Key size={12} style={{ color: attr.isPrimaryKey ? '#eab308' : (isDark ? '#484f58' : '#9ca3af') }} />
        </button>
        <button
          onClick={() => updateTableAttribute(table.id, attr.id, { isNullable: !attr.isNullable })}
          title={attr.isNullable ? 'Set NOT NULL' : 'Allow NULL'}
          style={{
            width: '28px',
            height: '28px',
            padding: 0,
            background: !attr.isNullable 
              ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7') 
              : 'transparent',
            border: `1px solid ${!attr.isNullable ? '#22c55e' : (isDark ? '#30363d' : '#e5e7eb')}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            color: !attr.isNullable ? '#22c55e' : (isDark ? '#484f58' : '#9ca3af'),
            transition: 'all 0.15s',
          }}
        >
          {attr.isNullable ? 'N' : '!N'}
        </button>
        <button
          onClick={() => handleDeleteAttribute(attr.id)}
          title="Delete column"
          style={{
            width: '28px',
            height: '28px',
            padding: 0,
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#484f58' : '#d1d5db',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#484f58' : '#d1d5db'}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InspectorHeader
        icon={<Table size={18} />}
        title="Table"
        subtitle={table.name}
        actions={<ActionsMenu />}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <FormField label="Table Name">
          <TextInput
            value={table.name}
            onChange={(value) => updateTable(table.id, { name: value })}
            placeholder="table_name"
          />
        </FormField>

        <FormField label="Color">
          <ColorPicker
            value={table.color || 'default'}
            onChange={(color) => updateTable(table.id, { color: color as any })}
          />
        </FormField>

        {parentEntity && (
          <FormField label="Entity">
            <div style={{
              padding: '10px 12px',
              background: isDark ? '#0d1117' : '#f3f4f6',
              borderRadius: '8px',
              fontSize: '13px',
              color: isDark ? '#8b949e' : '#6b7280',
            }}>
              {parentEntity.name}
            </div>
          </FormField>
        )}

        {/* Columns Section */}
        <div style={{ marginTop: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#e6edf3' : '#374151',
            }}>
              Columns <span style={{ 
                color: isDark ? '#8b949e' : '#9ca3af',
                fontWeight: 500,
              }}>({table.attributes.length})</span>
            </span>
            <button
              onClick={() => addTableAttribute(table.id)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#6366f1'}
            >
              <Plus size={14} /> Add Column
            </button>
          </div>

          {table.attributes.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: isDark ? '#8b949e' : '#9ca3af',
              fontSize: '13px',
              background: isDark ? '#0d1117' : '#f9fafb',
              borderRadius: '12px',
              border: `2px dashed ${isDark ? '#30363d' : '#e5e7eb'}`,
            }}>
              <div style={{ marginBottom: '8px' }}>No columns defined yet</div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>
                Click "Add Column" to get started
              </div>
            </div>
          ) : (
            <div>
              {table.attributes.map((attr, index) => (
                <AttributeRow key={attr.id} attr={attr} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>

      <DDLDialog
        isOpen={showDDLDialog}
        table={table}
        onClose={() => setShowDDLDialog(false)}
      />
    </div>
  );
};
