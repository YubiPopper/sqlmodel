import React, { useState } from 'react';
import { Layers, Trash2, MoreVertical } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput } from './FormComponents';
import { ConfirmationDialog } from '../../ui/ConfirmationDialog';

interface SchemaInspectorProps {
  dbName: string;
  schemaName: string;
}

export const SchemaInspector: React.FC<SchemaInspectorProps> = ({ dbName, schemaName }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const tables = useModelStore(state => state.tables);
  const updateTable = useModelStore(state => state.updateTable);
  const deleteTable = useModelStore(state => state.deleteTable);
  const setSelected = useModelStore(state => state.setSelected);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';
  
  // Find all tables in this schema
  const schemaTables = tables.filter(t => 
    (t.database || 'unassigned') === dbName && 
    (t.schema || 'unassigned') === schemaName
  );

  const handleNameChange = (newName: string) => {
    // Update all tables in this schema
    schemaTables.forEach(table => {
      updateTable(table.id, { schema: newName });
    });
  };

  const handleDelete = () => {
    // Delete all tables in this schema
    schemaTables.forEach(table => {
      deleteTable(table.id);
    });
    setSelected(null);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <InspectorHeader
        title={schemaName}
        subtitle={`in ${dbName} • ${schemaTables.length} table${schemaTables.length !== 1 ? 's' : ''}`}
        icon={<Layers size={18} />}
        actions={
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: isDark ? '#8b949e' : '#9ca3af',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div
                  onClick={() => setShowMenu(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    background: isDark ? '#161b22' : '#ffffff',
                    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
                    minWidth: '160px',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteDialog(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#ef4444',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark ? '#21262d' : '#fef2f2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Trash2 size={14} />
                    Delete Schema
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />
      
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FormField label="Schema Name">
          <TextInput
            value={schemaName}
            onChange={handleNameChange}
            placeholder="schema_name"
          />
        </FormField>

        <div style={{
          padding: '12px',
          background: isDark ? '#0d1117' : '#f9fafb',
          borderRadius: '8px',
          fontSize: '12px',
          color: isDark ? '#8b949e' : '#6b7280',
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            Contains {schemaTables.length} table{schemaTables.length !== 1 ? 's' : ''}
          </div>
          <div style={{ marginTop: '8px', color: isDark ? '#6e7681' : '#9ca3af' }}>
            Database: <span style={{ fontFamily: 'monospace', color: isDark ? '#8b949e' : '#6b7280' }}>{dbName}</span>
          </div>
          {schemaTables.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              Qualified name: <span style={{ fontFamily: 'monospace' }}>{dbName !== 'unassigned' ? dbName : '(none)'}.{schemaName !== 'unassigned' ? schemaName : '(none)'}</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Schema"
        message={`Are you sure you want to delete "${schemaName}" in "${dbName}"? This will delete ${schemaTables.length} table${schemaTables.length !== 1 ? 's' : ''} and cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        confirmLabel="Delete"
        isDestructive={true}
      />
    </>
  );
};
