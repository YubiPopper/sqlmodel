import React, { useState } from 'react';
import { Database, Trash2, MoreVertical } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput } from './FormComponents';
import { ConfirmationDialog } from '../../ui/ConfirmationDialog';

interface DatabaseInspectorProps {
  dbName: string;
}

export const DatabaseInspector: React.FC<DatabaseInspectorProps> = ({ dbName }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const tables = useModelStore(state => state.tables);
  const updateTable = useModelStore(state => state.updateTable);
  const deleteTable = useModelStore(state => state.deleteTable);
  const setSelected = useModelStore(state => state.setSelected);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';
  
  // Find all tables in this database
  const databaseTables = tables.filter(t => (t.database || 'unassigned') === dbName);

  const handleNameChange = (newName: string) => {
    // Update all tables in this database
    databaseTables.forEach(table => {
      updateTable(table.id, { database: newName });
    });
  };

  const handleDelete = () => {
    // Delete all tables in this database
    databaseTables.forEach(table => {
      deleteTable(table.id);
    });
    setSelected(null);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <InspectorHeader
        title={dbName}
        subtitle={`${databaseTables.length} table${databaseTables.length !== 1 ? 's' : ''}`}
        icon={<Database size={18} />}
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
                    Delete Database
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />
      
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FormField label="Database Name">
          <TextInput
            value={dbName}
            onChange={handleNameChange}
            placeholder="database_name"
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
            Contains {databaseTables.length} table{databaseTables.length !== 1 ? 's' : ''}
          </div>
          {databaseTables.length > 0 && (
            <div>
              Tables will be renamed to: <span style={{ fontFamily: 'monospace' }}>{dbName !== 'unassigned' ? dbName : '(none)'}</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Database"
        message={`Are you sure you want to delete "${dbName}"? This will delete ${databaseTables.length} table${databaseTables.length !== 1 ? 's' : ''} and cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        confirmLabel="Delete"
        isDestructive={true}
      />
    </>
  );
};
