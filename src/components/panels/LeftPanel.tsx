import { useState } from 'react';
import { useModelStore } from '../../store/useModelStore';
import { Plus, Trash2, Table, Box, ChevronDown, ChevronRight, Group } from 'lucide-react';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

export const LeftPanel = () => {
  const { 
    entities, 
    tables,
    entityGroups,
    addEntity, 
    selectedId, 
    setSelected, 
    deleteEntity,
    deleteTable,
    deleteEntityGroup,
    viewMode,
    colorMode
  } = useModelStore();
  
  const [entityToDelete, setEntityToDelete] = useState<{ id: string, name: string } | null>(null);
  const [tableToDelete, setTableToDelete] = useState<{ id: string, name: string } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string, name: string } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleDeleteEntityClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setEntityToDelete({ id, name });
  };

  const handleDeleteTableClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setTableToDelete({ id, name });
  };

  const handleDeleteGroupClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setGroupToDelete({ id, name });
  };

  const confirmDeleteEntity = () => {
    if (entityToDelete) {
      deleteEntity(entityToDelete.id);
      setEntityToDelete(null);
    }
  };

  const confirmDeleteTable = () => {
    if (tableToDelete) {
      deleteTable(tableToDelete.id);
      setTableToDelete(null);
    }
  };

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      deleteEntityGroup(groupToDelete.id);
      setGroupToDelete(null);
    }
  };

  const toggleGroupExpand = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Get tables for an entity
  const getTablesForEntity = (entityId: string) => {
    return tables.filter(t => t.entityId === entityId);
  };

  return (
    <>
      <ConfirmationDialog
        isOpen={!!entityToDelete}
        title="Delete Entity"
        message={`Are you sure you want to delete "${entityToDelete?.name}"? All relationships and tables connected to this entity will also be removed.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={confirmDeleteEntity}
        onCancel={() => setEntityToDelete(null)}
      />
      <ConfirmationDialog
        isOpen={!!tableToDelete}
        title="Delete Table"
        message={`Are you sure you want to delete table "${tableToDelete?.name}"? All foreign keys connected to this table will also be removed.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={confirmDeleteTable}
        onCancel={() => setTableToDelete(null)}
      />
      <ConfirmationDialog
        isOpen={!!groupToDelete}
        title="Delete Entity Group"
        message={`Are you sure you want to delete group "${groupToDelete?.name}"? The entities will not be deleted.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={confirmDeleteGroup}
        onCancel={() => setGroupToDelete(null)}
      />
      <div style={{
        width: '280px',
        background: colorMode === 'dark' ? '#161b22' : '#fafafa',
        borderRight: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '12px 14px', 
          borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
          fontWeight: 600, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: colorMode === 'dark' ? '#0d1117' : '#f5f5f5',
          fontSize: '13px',
          letterSpacing: '0.5px',
          color: colorMode === 'dark' ? '#e6edf3' : '#374151'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {viewMode === 'conceptual' ? <Box size={16} /> : <Table size={16} />}
            {viewMode === 'conceptual' ? 'ENTITIES' : 'TABLES'}
          </div>
          {viewMode === 'conceptual' && (
            <button 
              onClick={() => addEntity()} 
              style={{ 
                padding: '4px 10px', 
                fontSize: '11px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Add Entity"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {viewMode === 'conceptual' ? (
            // Conceptual View: Show groups first, then ungrouped entities
            <>
              {/* GROUPS Section - Show First */}
              {entityGroups.length > 0 && (
                <>
                  <div style={{ 
                    padding: '10px 12px', 
                    borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
                    fontWeight: 600, 
                    background: colorMode === 'dark' ? '#0d1117' : '#f5f5f5',
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                    color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Group size={14} />
                    GROUPS ({entityGroups.length})
                  </div>
                  {entityGroups.map(group => {
                    const isSelected = selectedId === group.id;
                    const isExpanded = expandedGroups.has(group.id);
                    return (
                      <div key={group.id}>
                        <div
                          onClick={() => setSelected(group.id)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            background: isSelected 
                              ? (colorMode === 'dark' ? '#1e3a5f' : '#dbeafe') 
                              : 'transparent',
                            borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = colorMode === 'dark' ? '#21262d' : '#f3f4f6';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {group.entityIds.length > 0 && (
                              <button
                                onClick={(e) => toggleGroupExpand(group.id, e)}
                                style={{
                                  padding: '2px',
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
                                }}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                            <Group size={14} style={{ color: colorMode === 'dark' ? '#8b949e' : '#6b7280' }} />
                            <span style={{ fontWeight: 500, fontSize: '13px', color: colorMode === 'dark' ? '#e6edf3' : 'inherit' }}>{group.name}</span>
                            <span style={{ 
                              fontSize: '10px', 
                              color: colorMode === 'dark' ? '#8b949e' : '#9ca3af',
                              background: colorMode === 'dark' ? '#30363d' : '#e5e7eb',
                              padding: '1px 5px',
                              borderRadius: '8px'
                            }}>
                              {group.entityIds.length}
                            </span>
                          </div>
                          {isSelected && (
                            <Trash2 
                              size={14} 
                              color="#dc2626" 
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => handleDeleteGroupClick(e, group.id, group.name)} 
                            />
                          )}
                        </div>
                        {/* Nested Entities in Group */}
                        {isExpanded && group.entityIds.map(entityId => {
                          const entity = entities.find(e => e.id === entityId);
                          if (!entity) return null;
                          return (
                            <div
                              key={entityId}
                              onClick={() => setSelected(entityId)}
                              style={{
                                padding: '8px 12px 8px 44px',
                                cursor: 'pointer',
                                background: selectedId === entityId 
                                  ? (colorMode === 'dark' ? '#1e3a5f' : '#dbeafe') 
                                  : (colorMode === 'dark' ? '#0d1117' : '#fafafa'),
                                borderBottom: colorMode === 'dark' ? '1px solid #21262d' : '1px solid #f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px'
                              }}
                            >
                              <Box size={12} style={{ color: colorMode === 'dark' ? '#8b949e' : '#9ca3af' }} />
                              <span style={{ color: colorMode === 'dark' ? '#c9d1d9' : '#4b5563' }}>{entity.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
              
              {/* UNGROUPED ENTITIES Section */}
              {(() => {
                const groupedEntityIds = new Set(entityGroups.flatMap(g => g.entityIds));
                const ungroupedEntities = entities.filter(e => !groupedEntityIds.has(e.id));
                
                if (ungroupedEntities.length === 0 && entities.length > 0) return null;
                
                return (
                  <>
                    {ungroupedEntities.length > 0 && (
                      <>
                        <div style={{ 
                          padding: '10px 12px', 
                          borderTop: entityGroups.length > 0 ? (colorMode === 'dark' ? '2px solid #30363d' : '2px solid #ddd') : 'none',
                          borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
                          fontWeight: 600, 
                          background: colorMode === 'dark' ? '#0d1117' : '#f5f5f5',
                          fontSize: '11px',
                          letterSpacing: '0.5px',
                          color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                          marginTop: entityGroups.length > 0 ? '8px' : '0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Box size={14} />
                          UNGROUPED ({ungroupedEntities.length})
                        </div>
                        {ungroupedEntities.map(entity => {
                const isSelected = selectedId === entity.id;
                
                return (
                  <div
                    key={entity.id}
                    onClick={() => setSelected(entity.id)}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      background: isSelected 
                        ? (colorMode === 'dark' ? '#1e3a5f' : '#dbeafe') 
                        : 'transparent',
                      borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = colorMode === 'dark' ? '#21262d' : '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box size={14} style={{ color: colorMode === 'dark' ? '#8b949e' : '#6b7280' }} />
                      <span style={{ fontWeight: 500, fontSize: '13px', color: colorMode === 'dark' ? '#e6edf3' : 'inherit' }}>{entity.name}</span>
                      {entity.description && (
                        <span style={{ 
                          fontSize: '10px', 
                          color: colorMode === 'dark' ? '#8b949e' : '#9ca3af',
                          fontStyle: 'italic',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {entity.description}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Trash2 
                        size={14} 
                        color="#dc2626" 
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => handleDeleteEntityClick(e, entity.id, entity.name)} 
                      />
                    )}
                  </div>
                );
              })}
                      </>
                    )}
                  </>
                );
              })()}
              
              {entities.length === 0 && entityGroups.length === 0 && (
                <div style={{ padding: '20px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', textAlign: 'center', fontSize: '13px' }}>
                  No entities yet. Click \"Add\" to create one.
                </div>
              )}
            </>
          ) : (
            // Physical View: Show tables grouped by entity
            <>
              {entities.map(entity => {
                const entityTables = getTablesForEntity(entity.id);
                if (entityTables.length === 0) return null;
                
                return (
                  <div key={entity.id}>
                    <div style={{
                      padding: '8px 12px',
                      background: colorMode === 'dark' ? '#0d1117' : '#f0f0f0',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                      borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Box size={12} />
                      {entity.name}
                    </div>
                    {entityTables.map(table => (
                      <div
                        key={table.id}
                        onClick={() => setSelected(table.id)}
                        style={{
                          padding: '10px 12px 10px 24px',
                          cursor: 'pointer',
                          background: selectedId === table.id 
                            ? (colorMode === 'dark' ? '#1e3a5f' : '#dbeafe') 
                            : 'transparent',
                          borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #eee',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Table size={14} style={{ color: colorMode === 'dark' ? '#8b949e' : '#6b7280' }} />
                          <span style={{ fontWeight: 500, fontSize: '13px', color: colorMode === 'dark' ? '#e6edf3' : 'inherit' }}>{table.name}</span>
                          <span style={{ fontSize: '10px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af' }}>
                            {table.attributes.length} columns
                          </span>
                        </div>
                        {selectedId === table.id && (
                          <Trash2 
                            size={14} 
                            color="#dc2626" 
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => handleDeleteTableClick(e, table.id, table.name)} 
                          />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {tables.length === 0 && (
                <div style={{ padding: '20px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', textAlign: 'center', fontSize: '13px' }}>
                  No tables yet. Switch to Conceptual view and add tables to entities.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
