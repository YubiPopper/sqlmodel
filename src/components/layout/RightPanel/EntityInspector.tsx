import React, { useState } from 'react';
import { Box, Trash2, Table, MoreVertical, Copy } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput, ColorPicker } from './FormComponents';
import type { Entity } from '../../../model/schemas';

interface EntityInspectorProps {
  entity: Entity;
}

export const EntityInspector: React.FC<EntityInspectorProps> = ({ entity }) => {
  const [showMenu, setShowMenu] = useState(false);
  const updateEntity = useModelStore(state => state.updateEntity);
  const deleteEntity = useModelStore(state => state.deleteEntity);
  const addTable = useModelStore(state => state.addTable);
  const tables = useModelStore(state => state.tables);
  const entityGroups = useModelStore(state => state.entityGroups);
  const colorMode = useModelStore(state => state.colorMode);
  const setSelected = useModelStore(state => state.setSelected);

  const isDark = colorMode === 'dark';
  const entityTables = tables.filter(t => t.entityId === entity.id);
  const entityGroup = entityGroups.find(g => g.entityIds.includes(entity.id));

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm(`Delete entity "${entity.name}"? This will also delete all connected relationships and tables.`)) {
      deleteEntity(entity.id);
    }
  };

  const handleDuplicateEntity = () => {
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
              onClick={handleDuplicateEntity}
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
              Duplicate Entity
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
              Delete Entity
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InspectorHeader
        icon={<Box size={18} />}
        title="Entity"
        subtitle={entity.name}
        actions={<ActionsMenu />}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <FormField label="Name">
          <TextInput
            value={entity.name}
            onChange={(value) => updateEntity(entity.id, { name: value })}
            placeholder="Entity name"
          />
        </FormField>

        <FormField label="Description">
          <TextInput
            value={entity.description || ''}
            onChange={(value) => updateEntity(entity.id, { description: value })}
            placeholder="Describe this entity..."
            multiline
          />
        </FormField>

        <FormField label="Color">
          <ColorPicker
            value={entity.color || 'default'}
            onChange={(color) => updateEntity(entity.id, { color: color as any })}
          />
        </FormField>

        {entityGroup && (
          <FormField label="Group">
            <div style={{
              padding: '10px 12px',
              background: isDark ? '#0d1117' : '#f3f4f6',
              borderRadius: '8px',
              fontSize: '13px',
              color: isDark ? '#e6edf3' : '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>{entityGroup.name}</span>
            </div>
          </FormField>
        )}

        {/* Tables Section */}
        <div style={{ 
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: isDark ? '#8b949e' : '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Physical Tables ({entityTables.length})
            </span>
            <button
              onClick={() => addTable(entity.id)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Table size={12} /> Add Table
            </button>
          </div>

          {entityTables.length === 0 ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: isDark ? '#8b949e' : '#9ca3af',
              fontSize: '12px',
              background: isDark ? '#0d1117' : '#f9fafb',
              borderRadius: '8px',
              border: `1px dashed ${isDark ? '#30363d' : '#e5e7eb'}`,
            }}>
              No physical tables defined yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {entityTables.map(table => (
                <div
                  key={table.id}
                  onClick={() => setSelected(table.id)}
                  style={{
                    padding: '10px 12px',
                    background: isDark ? '#0d1117' : '#f3f4f6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background 0.15s',
                  }}
                >
                  <Table size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
                  <span style={{
                    flex: 1,
                    fontSize: '13px',
                    color: isDark ? '#e6edf3' : '#374151',
                  }}>
                    {table.name}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: isDark ? '#8b949e' : '#9ca3af',
                  }}>
                    {table.attributes.length} cols
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
