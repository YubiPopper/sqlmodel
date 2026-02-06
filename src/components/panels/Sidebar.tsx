import { useState, useMemo, useEffect } from 'react';
import { useModelStore } from '../../store/useModelStore';
import { type Cardinality, type Attribute, type Entity, type PhysicalTable, type Relationship, type ForeignKey } from '../../model/schemas';
import { 
  Plus, Trash2, ChevronDown, ChevronRight, Box, Table, Link, Key, 
  Settings, Layers, X, GripVertical, ArrowRight, FolderOpen
} from 'lucide-react';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

const CARDINALITY_OPTIONS: Cardinality[] = ['1', '0..1', '1..*', '0..*'];
const DATA_TYPES = ['int', 'bigint', 'varchar', 'text', 'boolean', 'date', 'timestamp', 'uuid', 'decimal', 'float'];

export const Sidebar = () => {
  const { 
    entities, 
    tables,
    relationships,
    foreignKeys,
    entityGroups,
    selectedId, 
    setSelected, 
    viewMode,
    colorMode,
    setViewMode,
    addEntity,
    deleteEntity,
    updateEntity,
    addTable,
    deleteTable,
    updateTable,
    addTableAttribute,
    updateTableAttribute,
    deleteTableAttribute,
    updateRelationship,
    deleteRelationship,
    updateForeignKey,
    deleteForeignKey,
    deleteEntityGroup,
    updateEntityGroup
  } = useModelStore();
  
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'entity' | 'table' | 'relationship' | 'foreignKey' | 'group'; name: string } | null>(null);

  // Auto-expand newly created groups
  useEffect(() => {
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      entityGroups.forEach(g => {
        if (g.entityIds.length > 0) {
          newExpanded.add(g.id);
        }
      });
      return newExpanded;
    });
  }, [entityGroups]);

  // Find selected items
  const selectedEntity = useMemo(() => entities.find(e => e.id === selectedId), [entities, selectedId]);
  const selectedGroup = useMemo(() => entityGroups.find(g => g.id === selectedId), [entityGroups, selectedId]);
  const selectedTable = useMemo(() => tables.find(t => t.id === selectedId), [tables, selectedId]);
  const selectedRel = useMemo(() => relationships.find(r => r.id === selectedId), [relationships, selectedId]);
  const selectedFK = useMemo(() => foreignKeys.find(fk => fk.id === selectedId), [foreignKeys, selectedId]);

  const toggleExpand = (id: string) => {
    setExpandedEntities(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getTablesForEntity = (entityId: string) => tables.filter(t => t.entityId === entityId);
  
  // Get entities that are not in any group
  const ungroupedEntities = useMemo(() => {
    const groupedIds = new Set(entityGroups.flatMap(g => g.entityIds));
    return entities.filter(e => !groupedIds.has(e.id));
  }, [entities, entityGroups]);

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    if (type === 'entity') deleteEntity(id);
    else if (type === 'table') deleteTable(id);
    else if (type === 'relationship') deleteRelationship(id);
    else if (type === 'foreignKey') deleteForeignKey(id);
    else if (type === 'group') deleteEntityGroup(id);
    setDeleteConfirm(null);
    setEditingId(null);
    setEditingGroupId(null);
  };

  const isEditing = editingId === selectedId && selectedId !== null;
  const isEditingGroup = editingGroupId === selectedId && selectedId !== null;

  return (
    <>
      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        title={`Delete ${deleteConfirm?.type === 'entity' ? 'Entity' : deleteConfirm?.type === 'table' ? 'Table' : deleteConfirm?.type === 'relationship' ? 'Relationship' : deleteConfirm?.type === 'group' ? 'Group' : 'Foreign Key'}`}
        message={deleteConfirm?.type === 'group' 
          ? `Delete group "${deleteConfirm?.name}"? The entities will remain but will be ungrouped.`
          : `Delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
      
      <div style={{
        width: '300px',
        background: colorMode === 'dark' ? '#161b22' : '#ffffff',
        borderRight: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: colorMode === 'dark' ? '2px 0 8px rgba(0,0,0,0.2)' : '2px 0 8px rgba(0,0,0,0.04)'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '16px',
          borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={18} style={{ color: '#6366f1' }} />
            <span style={{ fontWeight: 600, fontSize: '14px', color: colorMode === 'dark' ? '#e6edf3' : '#1f2937' }}>
              {viewMode === 'conceptual' ? 'Model' : 'Schema'}
            </span>
          </div>
          {viewMode === 'conceptual' && (
            <button
              onClick={() => addEntity()}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: '#6366f1',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              title="Add Entity"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {viewMode === 'conceptual' ? (
            entities.length === 0 && entityGroups.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af' }}>
                <Box size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: '13px' }}>No entities yet</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Click + to add one</div>
              </div>
            ) : (
              <>
                {/* Groups Section */}
                {entityGroups.map(group => {
                  const isGroupSelected = selectedId === group.id;
                  const isGroupExpanded = expandedGroups.has(group.id);
                  const isEditingThisGroup = isEditingGroup && isGroupSelected;
                  const groupEntities = group.entityIds.map(id => entities.find(e => e.id === id)).filter(Boolean) as typeof entities;

                  return (
                    <div key={group.id} style={{ marginBottom: '4px' }}>
                      <div
                        onClick={() => { setSelected(group.id); setEditingId(null); setEditingGroupId(null); }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background: isGroupSelected 
                            ? (colorMode === 'dark' ? '#1e3a5f' : '#f0f9ff') 
                            : (colorMode === 'dark' ? '#21262d' : '#f3f4f6'),
                          border: isGroupSelected 
                            ? (colorMode === 'dark' ? '1px solid #3b82f6' : '1px solid #bfdbfe') 
                            : (colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e5e7eb'),
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.15s'
                        }}
                      >
                        {groupEntities.length > 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGroupExpand(group.id); }}
                            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex' }}
                          >
                            {isGroupExpanded ? <ChevronDown size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} /> : <ChevronRight size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />}
                          </button>
                        ) : (
                          <div style={{ width: '18px' }} />
                        )}
                        
                        <FolderOpen size={16} style={{ color: isGroupSelected ? '#3b82f6' : (colorMode === 'dark' ? '#8b949e' : '#6b7280'), flexShrink: 0 }} />
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '13px', 
                            fontWeight: 500, 
                            color: isGroupSelected 
                              ? (colorMode === 'dark' ? '#58a6ff' : '#1e40af') 
                              : (colorMode === 'dark' ? '#e6edf3' : '#374151'),
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {group.name}
                          </div>
                        </div>

                        <span style={{ fontSize: '10px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', background: colorMode === 'dark' ? '#30363d' : '#e5e7eb', padding: '2px 6px', borderRadius: '10px' }}>
                          {groupEntities.length}
                        </span>

                        {isGroupSelected && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingGroupId(group.id); }}
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                              title="Edit Group"
                            >
                              <Settings size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: group.id, type: 'group', name: group.name }); }}
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                              title="Delete Group"
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Inline Edit Panel for Group */}
                      {isEditingThisGroup && selectedGroup && (
                        <div style={{ 
                          margin: '4px 0 4px 26px',
                          padding: '12px',
                          background: colorMode === 'dark' ? '#0d1117' : '#f8fafc',
                          borderRadius: '8px',
                          border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: colorMode === 'dark' ? '#8b949e' : '#64748b', textTransform: 'uppercase' }}>Edit Group</span>
                            <button onClick={() => setEditingGroupId(null)} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer' }}>
                              <X size={14} color={colorMode === 'dark' ? '#8b949e' : '#94a3b8'} />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={selectedGroup.name}
                            onChange={(e) => updateEntityGroup(selectedGroup.id, { name: e.target.value })}
                            placeholder="Group Name"
                            style={{ 
                              width: '100%', 
                              padding: '8px', 
                              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0', 
                              borderRadius: '6px', 
                              fontSize: '13px',
                              background: colorMode === 'dark' ? '#161b22' : 'white',
                              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
                            }}
                          />
                        </div>
                      )}

                      {/* Nested Entities in Group */}
                      {isGroupExpanded && groupEntities.map(entity => {
                        const entityTables = getTablesForEntity(entity.id);
                        const isEntityExpanded = expandedEntities.has(entity.id);
                        const isEntitySelected = selectedId === entity.id;
                        const isEditingThisEntity = isEditing && isEntitySelected;

                        return (
                          <div key={entity.id} style={{ marginLeft: '16px' }}>
                            <div
                              onClick={() => { setSelected(entity.id); setEditingId(null); setEditingGroupId(null); }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: isEntitySelected 
                                  ? (colorMode === 'dark' ? '#1e3a5f' : '#f0f9ff') 
                                  : 'transparent',
                                border: isEntitySelected 
                                  ? (colorMode === 'dark' ? '1px solid #3b82f6' : '1px solid #bfdbfe') 
                                  : '1px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.15s'
                              }}
                            >
                              {entityTables.length > 0 ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(entity.id); }}
                                  style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex' }}
                                >
                                  {isEntityExpanded ? <ChevronDown size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} /> : <ChevronRight size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />}
                                </button>
                              ) : (
                                <div style={{ width: '18px' }} />
                              )}
                              
                              <Box size={14} style={{ color: isEntitySelected ? '#3b82f6' : (colorMode === 'dark' ? '#8b949e' : '#6b7280'), flexShrink: 0 }} />
                              
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '12px', 
                                  fontWeight: 500, 
                                  color: isEntitySelected 
                                    ? (colorMode === 'dark' ? '#58a6ff' : '#1e40af') 
                                    : (colorMode === 'dark' ? '#e6edf3' : '#374151'),
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {entity.name}
                                </div>
                                {entity.description && (
                                  <div style={{ fontSize: '10px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {entity.description}
                                  </div>
                                )}
                              </div>

                              {entityTables.length > 0 && (
                                <span style={{ fontSize: '9px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', background: colorMode === 'dark' ? '#30363d' : '#f3f4f6', padding: '1px 5px', borderRadius: '8px' }}>
                                  {entityTables.length}
                                </span>
                              )}

                              {isEntitySelected && (
                                <div style={{ display: 'flex', gap: '2px' }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingId(entity.id); }}
                                    style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                                    title="Edit"
                                  >
                                    <Settings size={12} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); addTable(entity.id); }}
                                    style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                                    title="Add Table"
                                  >
                                    <Table size={12} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: entity.id, type: 'entity', name: entity.name }); }}
                                    style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                                    title="Delete"
                                  >
                                    <Trash2 size={12} color="#ef4444" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Inline Edit Panel for Entity in Group */}
                            {isEditingThisEntity && selectedEntity && (
                              <div style={{ 
                                margin: '4px 0 4px 26px',
                                padding: '12px',
                                background: colorMode === 'dark' ? '#0d1117' : '#f8fafc',
                                borderRadius: '8px',
                                border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: colorMode === 'dark' ? '#8b949e' : '#64748b', textTransform: 'uppercase' }}>Edit Entity</span>
                                  <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer' }}>
                                    <X size={14} color={colorMode === 'dark' ? '#8b949e' : '#94a3b8'} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={selectedEntity.name}
                                  onChange={(e) => updateEntity(selectedEntity.id, { name: e.target.value })}
                                  placeholder="Name"
                                  style={{ 
                                    width: '100%', 
                                    padding: '8px', 
                                    border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0', 
                                    borderRadius: '6px', 
                                    fontSize: '13px', 
                                    marginBottom: '8px',
                                    background: colorMode === 'dark' ? '#161b22' : 'white',
                                    color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
                                  }}
                                />
                                <textarea
                                  value={selectedEntity.description || ''}
                                  onChange={(e) => updateEntity(selectedEntity.id, { description: e.target.value })}
                                  placeholder="Description..."
                                  rows={2}
                                  style={{ 
                                    width: '100%', 
                                    padding: '8px', 
                                    border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0', 
                                    borderRadius: '6px', 
                                    fontSize: '12px', 
                                    resize: 'none',
                                    background: colorMode === 'dark' ? '#161b22' : 'white',
                                    color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
                                  }}
                                />
                              </div>
                            )}

                            {/* Nested Tables in Entity */}
                            {isEntityExpanded && entityTables.map(table => {
                              const isTableSelected = selectedId === table.id;

                              return (
                                <div key={table.id}>
                                  <div
                                    onClick={() => { setSelected(table.id); }}
                                    onDoubleClick={() => {
                                      setSelected(table.id);
                                      setViewMode('physical');
                                    }}
                                    style={{
                                      marginLeft: '26px',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      background: isTableSelected 
                                        ? (colorMode === 'dark' ? '#0f2e1f' : '#f0fdf4') 
                                        : 'transparent',
                                      border: isTableSelected 
                                        ? (colorMode === 'dark' ? '1px solid #22c55e' : '1px solid #bbf7d0') 
                                        : '1px solid transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontSize: '11px'
                                    }}
                                    title="Double-click to edit in Physical view"
                                  >
                                    <Table size={12} style={{ color: isTableSelected ? '#22c55e' : (colorMode === 'dark' ? '#8b949e' : '#9ca3af') }} />
                                    <span style={{ flex: 1, color: isTableSelected ? (colorMode === 'dark' ? '#4ade80' : '#15803d') : (colorMode === 'dark' ? '#c9d1d9' : '#6b7280'), fontFamily: 'monospace' }}>{table.name}</span>
                                    <span style={{ fontSize: '9px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af' }}>{table.attributes.length}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Ungrouped Entities */}
                {ungroupedEntities.length > 0 && entityGroups.length > 0 && (
                  <div style={{ 
                    padding: '8px 12px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '8px',
                    borderTop: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e5e7eb',
                    paddingTop: '12px'
                  }}>
                    Ungrouped
                  </div>
                )}
                
                {ungroupedEntities.map(entity => {
                const entityTables = getTablesForEntity(entity.id);
                const isExpanded = expandedEntities.has(entity.id);
                const isSelected = selectedId === entity.id;
                const isEditingThis = isEditing && isSelected;

                return (
                  <div key={entity.id} style={{ marginBottom: '4px' }}>
                    <div
                      onClick={() => { setSelected(entity.id); setEditingId(null); setEditingGroupId(null); }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected 
                          ? (colorMode === 'dark' ? '#1e3a5f' : '#f0f9ff') 
                          : 'transparent',
                        border: isSelected 
                          ? (colorMode === 'dark' ? '1px solid #3b82f6' : '1px solid #bfdbfe') 
                          : '1px solid transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s'
                      }}
                    >
                      {entityTables.length > 0 ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(entity.id); }}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex' }}
                        >
                          {isExpanded ? <ChevronDown size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} /> : <ChevronRight size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />}
                        </button>
                      ) : (
                        <div style={{ width: '18px' }} />
                      )}
                      
                      <Box size={16} style={{ color: isSelected ? '#3b82f6' : (colorMode === 'dark' ? '#8b949e' : '#6b7280'), flexShrink: 0 }} />
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: 500, 
                          color: isSelected 
                            ? (colorMode === 'dark' ? '#58a6ff' : '#1e40af') 
                            : (colorMode === 'dark' ? '#e6edf3' : '#374151'),
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {entity.name}
                        </div>
                        {entity.description && (
                          <div style={{ fontSize: '11px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {entity.description}
                          </div>
                        )}
                      </div>

                      {entityTables.length > 0 && (
                        <span style={{ fontSize: '10px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', background: colorMode === 'dark' ? '#30363d' : '#f3f4f6', padding: '2px 6px', borderRadius: '10px' }}>
                          {entityTables.length}
                        </span>
                      )}

                      {isSelected && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(entity.id); }}
                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                            title="Edit"
                          >
                            <Settings size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); addTable(entity.id); }}
                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                            title="Add Table"
                          >
                            <Table size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: entity.id, type: 'entity', name: entity.name }); }}
                            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '4px', display: 'flex' }}
                            title="Delete"
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Edit Panel */}
                    {isEditingThis && selectedEntity && (
                      <div style={{ 
                        margin: '4px 0 4px 26px',
                        padding: '12px',
                        background: colorMode === 'dark' ? '#0d1117' : '#f8fafc',
                        borderRadius: '8px',
                        border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: colorMode === 'dark' ? '#8b949e' : '#64748b', textTransform: 'uppercase' }}>Edit Entity</span>
                          <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer' }}>
                            <X size={14} color={colorMode === 'dark' ? '#8b949e' : '#94a3b8'} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={selectedEntity.name}
                          onChange={(e) => updateEntity(selectedEntity.id, { name: e.target.value })}
                          placeholder="Name"
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0', 
                            borderRadius: '6px', 
                            fontSize: '13px', 
                            marginBottom: '8px',
                            background: colorMode === 'dark' ? '#161b22' : 'white',
                            color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
                          }}
                        />
                        <textarea
                          value={selectedEntity.description || ''}
                          onChange={(e) => updateEntity(selectedEntity.id, { description: e.target.value })}
                          placeholder="Description..."
                          rows={2}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0', 
                            borderRadius: '6px', 
                            fontSize: '12px', 
                            resize: 'none',
                            background: colorMode === 'dark' ? '#161b22' : 'white',
                            color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
                          }}
                        />
                      </div>
                    )}

                    {/* Nested Tables */}
                    {isExpanded && entityTables.map(table => {
                      const isTableSelected = selectedId === table.id;

                      return (
                        <div key={table.id}>
                          <div
                            onClick={() => { setSelected(table.id); }}
                            onDoubleClick={() => {
                              setSelected(table.id);
                              setViewMode('physical');
                            }}
                            style={{
                              marginLeft: '26px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: isTableSelected 
                                ? (colorMode === 'dark' ? '#0f2e1f' : '#f0fdf4') 
                                : 'transparent',
                              border: isTableSelected 
                                ? (colorMode === 'dark' ? '1px solid #22c55e' : '1px solid #bbf7d0') 
                                : '1px solid transparent',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px'
                            }}
                            title="Double-click to edit in Physical view"
                          >
                            <Table size={14} style={{ color: isTableSelected ? '#22c55e' : (colorMode === 'dark' ? '#8b949e' : '#9ca3af') }} />
                            <span style={{ flex: 1, color: isTableSelected ? (colorMode === 'dark' ? '#4ade80' : '#15803d') : (colorMode === 'dark' ? '#c9d1d9' : '#6b7280'), fontFamily: 'monospace' }}>{table.name}</span>
                            <span style={{ fontSize: '10px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af' }}>{table.attributes.length}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              </>
            )
          ) : (
            // Physical View - Show tables grouped by entity
            entities.map(entity => {
              const entityTables = getTablesForEntity(entity.id);
              if (entityTables.length === 0) return null;

              return (
                <div key={entity.id} style={{ marginBottom: '12px' }}>
                  <div 
                    onClick={() => { 
                      setViewMode('conceptual'); 
                      setSelected(entity.id); 
                    }}
                    style={{ 
                      padding: '6px 12px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colorMode === 'dark' ? '#21262d' : '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title="Click to view entity in conceptual view"
                  >
                    <Box size={12} />
                    {entity.name}
                    <ArrowRight size={10} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  </div>
                  {entityTables.map(table => {
                    const isTableSelected = selectedId === table.id;
                    const isEditingTable = isEditing && isTableSelected;

                    return (
                      <div key={table.id}>
                        <div
                          onClick={() => { setSelected(table.id); setEditingId(null); }}
                          style={{
                            marginLeft: '8px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: isTableSelected 
                              ? (colorMode === 'dark' ? '#0f2e1f' : '#f0fdf4') 
                              : 'transparent',
                            border: isTableSelected 
                              ? (colorMode === 'dark' ? '1px solid #22c55e' : '1px solid #bbf7d0') 
                              : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Table size={16} style={{ color: isTableSelected ? '#22c55e' : (colorMode === 'dark' ? '#8b949e' : '#6b7280') }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: isTableSelected ? (colorMode === 'dark' ? '#4ade80' : '#15803d') : (colorMode === 'dark' ? '#e6edf3' : '#374151'), fontFamily: 'monospace' }}>{table.name}</div>
                          </div>
                          <span style={{ fontSize: '10px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', background: colorMode === 'dark' ? '#30363d' : '#f3f4f6', padding: '2px 6px', borderRadius: '10px' }}>
                            {table.attributes.length} cols
                          </span>

                          {isTableSelected && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={(e) => { e.stopPropagation(); setEditingId(table.id); }} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                                <Settings size={14} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: table.id, type: 'table', name: table.name }); }} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                                <Trash2 size={14} color="#ef4444" />
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditingTable && selectedTable && (
                          <TableEditor 
                            table={selectedTable} 
                            onClose={() => setEditingId(null)}
                            updateTable={updateTable}
                            addTableAttribute={addTableAttribute}
                            updateTableAttribute={updateTableAttribute}
                            deleteTableAttribute={deleteTableAttribute}
                            colorMode={colorMode}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}

          {/* Relationships / Foreign Keys Section */}
          {(viewMode === 'conceptual' ? relationships.length > 0 : foreignKeys.length > 0) && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e5e7eb' }}>
              <div style={{ 
                padding: '6px 12px',
                fontSize: '10px',
                fontWeight: 600,
                color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Link size={12} />
                {viewMode === 'conceptual' ? 'Relationships' : 'Foreign Keys'}
              </div>

              {viewMode === 'conceptual' ? (
                relationships.map(rel => {
                  const from = entities.find(e => e.id === rel.fromEntityId);
                  const to = entities.find(e => e.id === rel.toEntityId);
                  const isSelected = selectedId === rel.id;
                  const isEditingRel = isEditing && isSelected;

                  return (
                    <div key={rel.id}>
                      <div
                        onClick={() => { setSelected(rel.id); setEditingId(null); }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isSelected 
                            ? (colorMode === 'dark' ? '#422006' : '#fef3c7') 
                            : 'transparent',
                          border: isSelected 
                            ? (colorMode === 'dark' ? '1px solid #d97706' : '1px solid #fcd34d') 
                            : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px'
                        }}
                      >
                        <ArrowRight size={14} style={{ color: isSelected ? '#d97706' : (colorMode === 'dark' ? '#8b949e' : '#9ca3af') }} />
                        <span style={{ color: colorMode === 'dark' ? '#e6edf3' : '#374151', fontWeight: 500 }}>{from?.name}</span>
                        <span style={{ color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', fontSize: '10px' }}>{rel.label || '→'}</span>
                        <span style={{ color: colorMode === 'dark' ? '#e6edf3' : '#374151', fontWeight: 500 }}>{to?.name}</span>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: '10px', color: colorMode === 'dark' ? '#8b949e' : '#9ca3af' }}>{rel.fromCardinality}:{rel.toCardinality}</span>

                        {isSelected && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(rel.id); }} style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer' }}>
                              <Settings size={12} color={colorMode === 'dark' ? '#8b949e' : '#6b7280'} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: rel.id, type: 'relationship', name: `${from?.name} → ${to?.name}` }); }} style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer' }}>
                              <Trash2 size={12} color="#ef4444" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditingRel && selectedRel && (
                        <RelationshipEditor
                          rel={selectedRel}
                          entities={entities}
                          onClose={() => setEditingId(null)}
                          updateRelationship={updateRelationship}
                          colorMode={colorMode}
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                foreignKeys.map(fk => {
                  const fromTable = tables.find(t => t.id === fk.fromTableId);
                  const toTable = tables.find(t => t.id === fk.toTableId);
                  const isSelected = selectedId === fk.id;
                  const isEditingFK = isEditing && isSelected;

                  return (
                    <div key={fk.id}>
                      <div
                        onClick={() => { setSelected(fk.id); setEditingId(null); }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isSelected 
                            ? (colorMode === 'dark' ? '#1e3a5f' : '#dbeafe') 
                            : 'transparent',
                          border: isSelected 
                            ? (colorMode === 'dark' ? '1px solid #3b82f6' : '1px solid #93c5fd') 
                            : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px'
                        }}
                      >
                        <Key size={14} style={{ color: isSelected ? '#3b82f6' : (colorMode === 'dark' ? '#8b949e' : '#9ca3af') }} />
                        <span style={{ color: colorMode === 'dark' ? '#e6edf3' : '#374151', fontFamily: 'monospace', fontSize: '11px' }}>{fromTable?.name}</span>
                        <ArrowRight size={12} color={colorMode === 'dark' ? '#8b949e' : '#9ca3af'} />
                        <span style={{ color: colorMode === 'dark' ? '#e6edf3' : '#374151', fontFamily: 'monospace', fontSize: '11px' }}>{toTable?.name}</span>
                        <div style={{ flex: 1 }} />

                        {isSelected && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(fk.id); }} style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer' }}>
                              <Settings size={12} color="#6b7280" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: fk.id, type: 'foreignKey', name: `${fromTable?.name} → ${toTable?.name}` }); }} style={{ background: 'none', border: 'none', padding: '3px', cursor: 'pointer' }}>
                              <Trash2 size={12} color="#ef4444" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditingFK && selectedFK && (
                        <ForeignKeyEditor
                          fk={selectedFK}
                          tables={tables}
                          onClose={() => setEditingId(null)}
                          updateForeignKey={updateForeignKey}
                          colorMode={colorMode}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Sub-components for inline editing

const TableEditor = ({ table, onClose, updateTable, addTableAttribute, updateTableAttribute, deleteTableAttribute, colorMode }: {
  table: PhysicalTable;
  onClose: () => void;
  updateTable: (id: string, data: Partial<PhysicalTable>) => void;
  addTableAttribute: (tableId: string) => void;
  updateTableAttribute: (tableId: string, attrId: string, data: Partial<Attribute>) => void;
  deleteTableAttribute: (tableId: string, attrId: string) => void;
  colorMode: 'light' | 'dark';
}) => (
  <div style={{ 
    margin: '4px 8px 4px 34px',
    padding: '12px',
    background: colorMode === 'dark' ? '#21262d' : '#f8fafc',
    borderRadius: '8px',
    border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: colorMode === 'dark' ? '#8b949e' : '#64748b', textTransform: 'uppercase' }}>Edit Table</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer' }}>
        <X size={14} color={colorMode === 'dark' ? '#8b949e' : '#94a3b8'} />
      </button>
    </div>

    <input
      type="text"
      value={table.name}
      onChange={(e) => updateTable(table.id, { name: e.target.value })}
      placeholder="Table name"
      style={{ 
        width: '100%', 
        padding: '8px', 
        border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0', 
        borderRadius: '6px', 
        fontSize: '12px', 
        fontFamily: 'monospace', 
        marginBottom: '12px',
        background: colorMode === 'dark' ? '#0d1117' : 'white',
        color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
      }}
    />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '10px', fontWeight: 600, color: colorMode === 'dark' ? '#8b949e' : '#64748b' }}>COLUMNS</span>
      <button
        onClick={() => addTableAttribute(table.id)}
        style={{ background: '#6366f1', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <Plus size={10} /> Add
      </button>
    </div>

    {table.attributes.length === 0 ? (
      <div style={{ 
        padding: '12px', 
        textAlign: 'center', 
        color: colorMode === 'dark' ? '#8b949e' : '#9ca3af', 
        fontSize: '11px', 
        border: colorMode === 'dark' ? '1px dashed #30363d' : '1px dashed #e2e8f0', 
        borderRadius: '6px' 
      }}>
        No columns
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {table.attributes.map((attr: Attribute) => (
          <div key={attr.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <GripVertical size={10} color={colorMode === 'dark' ? '#484f58' : '#cbd5e1'} />
            <input
              type="text"
              value={attr.name}
              onChange={(e) => updateTableAttribute(table.id, attr.id, { name: e.target.value })}
              style={{ 
                flex: 1, 
                padding: '6px', 
                border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0', 
                borderRadius: '4px', 
                fontSize: '11px', 
                fontFamily: 'monospace',
                background: colorMode === 'dark' ? '#0d1117' : 'white',
                color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
              }}
            />
            <select
              value={attr.dataType}
              onChange={(e) => updateTableAttribute(table.id, attr.id, { dataType: e.target.value })}
              style={{ 
                width: '80px', 
                padding: '6px', 
                border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #e2e8f0', 
                borderRadius: '4px', 
                fontSize: '10px',
                background: colorMode === 'dark' ? '#0d1117' : 'white',
                color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
              }}
            >
              {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={() => updateTableAttribute(table.id, attr.id, { isPrimaryKey: !attr.isPrimaryKey })}
              style={{ background: attr.isPrimaryKey ? (colorMode === 'dark' ? '#422006' : '#fef3c7') : (colorMode === 'dark' ? '#21262d' : '#f3f4f6'), border: 'none', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}
              title="Primary Key"
            >
              <Key size={12} color={attr.isPrimaryKey ? '#d97706' : (colorMode === 'dark' ? '#8b949e' : '#9ca3af')} />
            </button>
            <button
              onClick={() => deleteTableAttribute(table.id, attr.id)}
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}
            >
              <Trash2 size={12} color="#ef4444" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

const RelationshipEditor = ({ rel, entities, onClose, updateRelationship, colorMode }: {
  rel: Relationship;
  entities: Entity[];
  onClose: () => void;
  updateRelationship: (id: string, data: Partial<Relationship>) => void;
  colorMode: 'light' | 'dark';
}) => {
  const from = entities.find((e) => e.id === rel.fromEntityId);
  const to = entities.find((e) => e.id === rel.toEntityId);

  return (
    <div style={{ 
      margin: '4px 8px',
      padding: '12px',
      background: colorMode === 'dark' ? '#2d2006' : '#fffbeb',
      borderRadius: '8px',
      border: colorMode === 'dark' ? '1px solid #78350f' : '1px solid #fde68a'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: colorMode === 'dark' ? '#fbbf24' : '#92400e', textTransform: 'uppercase' }}>Edit Relationship</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer' }}>
          <X size={14} color="#d97706" />
        </button>
      </div>

      <div style={{ fontSize: '11px', color: colorMode === 'dark' ? '#fcd34d' : '#78350f', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontWeight: 600 }}>{from?.name}</span>
        <ArrowRight size={12} />
        <span style={{ fontWeight: 600 }}>{to?.name}</span>
      </div>

      <input
        type="text"
        value={rel.label}
        onChange={(e) => updateRelationship(rel.id, { label: e.target.value })}
        placeholder="Label (e.g., has many)"
        style={{ 
          width: '100%', 
          padding: '8px', 
          border: colorMode === 'dark' ? '1px solid #78350f' : '1px solid #fde68a', 
          borderRadius: '6px', 
          fontSize: '12px', 
          marginBottom: '8px', 
          background: colorMode === 'dark' ? '#0d1117' : 'white',
          color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
        }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '10px', color: colorMode === 'dark' ? '#fbbf24' : '#78350f', display: 'block', marginBottom: '4px' }}>From</label>
          <select
            value={rel.fromCardinality}
            onChange={(e) => updateRelationship(rel.id, { fromCardinality: e.target.value as Cardinality })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #78350f' : '1px solid #fde68a', 
              borderRadius: '4px', 
              fontSize: '11px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          >
            {CARDINALITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '10px', color: colorMode === 'dark' ? '#fbbf24' : '#78350f', display: 'block', marginBottom: '4px' }}>To</label>
          <select
            value={rel.toCardinality}
            onChange={(e) => updateRelationship(rel.id, { toCardinality: e.target.value as Cardinality })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #78350f' : '1px solid #fde68a', 
              borderRadius: '4px', 
              fontSize: '11px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          >
            {CARDINALITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

const ForeignKeyEditor = ({ fk, tables, onClose, updateForeignKey, colorMode }: {
  fk: ForeignKey;
  tables: PhysicalTable[];
  onClose: () => void;
  updateForeignKey: (id: string, data: Partial<ForeignKey>) => void;
  colorMode: 'light' | 'dark';
}) => {
  const fromTable = tables.find((t) => t.id === fk.fromTableId);
  const toTable = tables.find((t) => t.id === fk.toTableId);

  return (
    <div style={{ 
      margin: '4px 8px',
      padding: '12px',
      background: colorMode === 'dark' ? '#0c1929' : '#eff6ff',
      borderRadius: '8px',
      border: colorMode === 'dark' ? '1px solid #1e40af' : '1px solid #bfdbfe'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: colorMode === 'dark' ? '#60a5fa' : '#1e40af', textTransform: 'uppercase' }}>Edit Foreign Key</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer' }}>
          <X size={14} color="#3b82f6" />
        </button>
      </div>

      <div style={{ fontSize: '11px', color: colorMode === 'dark' ? '#93c5fd' : '#1e3a8a', marginBottom: '12px', fontFamily: 'monospace' }}>
        {fromTable?.name} → {toTable?.name}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '10px', color: colorMode === 'dark' ? '#60a5fa' : '#1e40af', display: 'block', marginBottom: '4px' }}>From Cardinality</label>
          <select
            value={fk.fromCardinality}
            onChange={(e) => updateForeignKey(fk.id, { fromCardinality: e.target.value as Cardinality })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #1e40af' : '1px solid #bfdbfe', 
              borderRadius: '4px', 
              fontSize: '11px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          >
            {CARDINALITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '10px', color: colorMode === 'dark' ? '#60a5fa' : '#1e40af', display: 'block', marginBottom: '4px' }}>To Cardinality</label>
          <select
            value={fk.toCardinality}
            onChange={(e) => updateForeignKey(fk.id, { toCardinality: e.target.value as Cardinality })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #1e40af' : '1px solid #bfdbfe', 
              borderRadius: '4px', 
              fontSize: '11px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          >
            {CARDINALITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};
