import React, { useState } from 'react';
import { Database, Trash2, MoreVertical, Plus } from 'lucide-react';
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
  const addTable = useModelStore(state => state.addTable);
  const setSelected = useModelStore(state => state.setSelected);
  const emptyDatabases = useModelStore(state => state.emptyDatabases);
  const emptySchemas = useModelStore(state => state.emptySchemas);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';
  
  // Find all tables in this database
  const databaseTables = tables.filter(t => (t.database || 'unassigned') === dbName);

  const handleNameChange = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || newName === dbName) return;

    // Update all tables in this database
    databaseTables.forEach(table => {
      updateTable(table.id, { database: newName });
    });

    // Update empty database/schema placeholders so rename works for empty DBs too.
    const nextEmptyDatabases = new Set(emptyDatabases);
    nextEmptyDatabases.delete(dbName);
    if (databaseTables.length === 0) {
      nextEmptyDatabases.add(newName);
    }

    const nextEmptySchemas = new Set<string>();
    emptySchemas.forEach((key) => {
      if (key.startsWith(`${dbName}.`)) {
        nextEmptySchemas.add(`${newName}.${key.split('.').slice(1).join('.')}`);
      } else {
        nextEmptySchemas.add(key);
      }
    });

    useModelStore.setState({
      emptyDatabases: nextEmptyDatabases,
      emptySchemas: nextEmptySchemas,
      selectedId: `db-${newName}`,
    });
  };

  const handleDelete = () => {
    // Delete all tables in this database
    databaseTables.forEach(table => {
      deleteTable(table.id);
    });

    // Also remove empty hierarchy placeholders for this database.
    const nextEmptyDatabases = new Set(emptyDatabases);
    nextEmptyDatabases.delete(dbName);

    const nextEmptySchemas = new Set(emptySchemas);
    Array.from(nextEmptySchemas).forEach((key) => {
      if (key.startsWith(`${dbName}.`)) {
        nextEmptySchemas.delete(key);
      }
    });

    useModelStore.setState({
      emptyDatabases: nextEmptyDatabases,
      emptySchemas: nextEmptySchemas,
    });

    setSelected(null);
    setShowDeleteDialog(false);
  };

  const handleAddTable = () => {
    const newTableId = addTable();
    const nextIndex = databaseTables.length + 1;
    const nextName = nextIndex === 1 ? 'new_table' : `new_table_${nextIndex}`;
    updateTable(newTableId, {
      name: nextName,
      database: dbName === 'unassigned' ? undefined : dbName,
      schema: undefined,
    });
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
        <button
          onClick={handleAddTable}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: isDark ? '#161b22' : '#ffffff',
            border: `1px dashed ${isDark ? '#30363d' : '#d1d5db'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: isDark ? '#8b949e' : '#6b7280',
            fontSize: '12px',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.color = '#6366f1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
            e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
          }}
        >
          <Plus size={14} />
          Add Table to Database
        </button>

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
