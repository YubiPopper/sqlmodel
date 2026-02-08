import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Box, 
  Table, 
  FolderOpen, 
  Link,
  ExternalLink
} from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';

interface ModelTreeProps {
  searchQuery?: string;
}

export const ModelTree: React.FC<ModelTreeProps> = ({ searchQuery = '' }) => {
  const {
    entities,
    tables,
    relationships,
    entityGroups,
    selectedId,
    setSelected,
    viewMode,
    setViewMode,
    colorMode,
  } = useModelStore();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  const isDark = colorMode === 'dark';

  // Conceptual View - Filter entities, groups, and relationships based on search
  const filteredConceptualData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      return { entities, entityGroups, relationships };
    }
    
    // Filter entities by name or description
    const matchingEntities = entities.filter(e => 
      e.name.toLowerCase().includes(query) ||
      (e.description && e.description.toLowerCase().includes(query))
    );
    const matchingEntityIds = new Set(matchingEntities.map(e => e.id));
    
    // Filter groups - include if group name matches OR if any entity in group matches
    const matchingGroups = entityGroups.filter(g => {
      if (g.name.toLowerCase().includes(query)) return true;
      return g.entityIds.some(entityId => matchingEntityIds.has(entityId));
    });
    
    // Filter relationships - include if label matches OR if connected entities match
    const matchingRelationships = relationships.filter(rel => {
      if (rel.label && rel.label.toLowerCase().includes(query)) return true;
      return matchingEntityIds.has(rel.fromEntityId) || matchingEntityIds.has(rel.toEntityId);
    });
    
    return { 
      entities: matchingEntities, 
      entityGroups: matchingGroups,
      relationships: matchingRelationships 
    };
  }, [entities, entityGroups, relationships, searchQuery]);

  // Get entities that are not in any group (based on filtered data)
  const ungroupedEntities = useMemo(() => {
    const groupedIds = new Set(filteredConceptualData.entityGroups.flatMap(g => g.entityIds));
    return filteredConceptualData.entities.filter(e => !groupedIds.has(e.id));
  }, [filteredConceptualData.entities, filteredConceptualData.entityGroups]);

  // Physical View - Filter tables and entities based on search
  const filteredTablesAndEntities = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      return { tables, entities };
    }
    
    // Filter tables by name
    const matchingTables = tables.filter(t => 
      t.name.toLowerCase().includes(query)
    );
    
    // Get entities that either match by name or have matching tables
    const matchingEntityIds = new Set<string>();
    matchingTables.forEach(t => {
      if (t.entityId) matchingEntityIds.add(t.entityId);
    });
    entities.forEach(e => {
      if (e.name.toLowerCase().includes(query)) {
        matchingEntityIds.add(e.id);
      }
    });
    
    const matchingEntities = entities.filter(e => matchingEntityIds.has(e.id));
    
    return { 
      tables: matchingTables, 
      entities: matchingEntities 
    };
  }, [tables, entities, searchQuery]);

  // Group tables by entity
  const entitiesWithTables = useMemo(() => {
    return filteredTablesAndEntities.entities.map(entity => ({
      entity,
      tables: filteredTablesAndEntities.tables.filter(t => t.entityId === entity.id),
    }));
  }, [filteredTablesAndEntities]);

  const orphanTables = useMemo(() => {
    return filteredTablesAndEntities.tables.filter(t => !t.entityId);
  }, [filteredTablesAndEntities]);

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEntityExpand = (id: string) => {
    setExpandedEntities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTablesForEntity = (entityId: string) => 
    tables.filter(t => t.entityId === entityId);

  const TreeItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    selected?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onExpand?: () => void;
    onNavigate?: () => void;
    expanded?: boolean;
    hasChildren?: boolean;
    level?: number;
    badge?: string | number;
    secondaryLabel?: string;
  }> = ({ icon, label, selected, onClick, onDoubleClick, onExpand, onNavigate, expanded, hasChildren, level = 0, badge, secondaryLabel }) => (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 8px',
        paddingLeft: `${8 + level * 14}px`,
        cursor: 'pointer',
        background: selected 
          ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff')
          : 'transparent',
        borderRadius: '6px',
        margin: '1px 6px',
        transition: 'all 0.15s',
        borderLeft: selected ? '2px solid #6366f1' : '2px solid transparent',
      }}
    >
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: 'pointer',
            display: 'flex',
            color: isDark ? '#8b949e' : '#6b7280',
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <div style={{ width: '18px' }} />
      )}
      
      <span style={{ 
        color: selected ? '#6366f1' : (isDark ? '#8b949e' : '#6b7280'),
        display: 'flex',
        flexShrink: 0,
      }}>
        {icon}
      </span>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: selected ? 600 : 500,
          color: selected 
            ? (isDark ? '#a5b4fc' : '#4338ca')
            : (isDark ? '#e6edf3' : '#374151'),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label}
        </div>
        {secondaryLabel && (
          <div style={{
            fontSize: '10px',
            color: isDark ? '#8b949e' : '#9ca3af',
            marginTop: '0px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {secondaryLabel}
          </div>
        )}
      </div>

      {onNavigate && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          title="Open in Physical View"
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#8b949e' : '#9ca3af',
            borderRadius: '4px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
            e.currentTarget.style.color = '#6366f1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = isDark ? '#8b949e' : '#9ca3af';
          }}
        >
          <ExternalLink size={12} />
        </button>
      )}

      {badge !== undefined && (
        <span style={{
          fontSize: '9px',
          fontWeight: 600,
          color: isDark ? '#8b949e' : '#6b7280',
          background: isDark ? '#30363d' : '#e5e7eb',
          padding: '1px 5px',
          borderRadius: '8px',
        }}>
          {badge}
        </span>
      )}
    </div>
  );

  if (viewMode === 'conceptual') {
    return (
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '8px' }}>
        {/* Empty State - No Entities */}
        {entities.length === 0 && entityGroups.length === 0 && (
          <div style={{ 
            padding: '32px 16px', 
            textAlign: 'center', 
            color: isDark ? '#8b949e' : '#9ca3af' 
          }}>
            <Box size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '13px' }}>No entities yet</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              Click "Entity" below to add one
            </div>
          </div>
        )}

        {/* No Search Results */}
        {searchQuery && filteredConceptualData.entities.length === 0 && 
         filteredConceptualData.entityGroups.length === 0 && 
         filteredConceptualData.relationships.length === 0 && 
         (entities.length > 0 || entityGroups.length > 0 || relationships.length > 0) && (
          <div style={{ 
            padding: '32px 16px', 
            textAlign: 'center', 
            color: isDark ? '#8b949e' : '#9ca3af' 
          }}>
            <div style={{ fontSize: '13px' }}>No matches found</div>
          </div>
        )}

        {/* Groups */}
        {filteredConceptualData.entityGroups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const groupEntities = group.entityIds
            .map(id => filteredConceptualData.entities.find(e => e.id === id))
            .filter(Boolean) as typeof entities;

          return (
            <div key={group.id}>
              <TreeItem
                icon={<FolderOpen size={12} />}
                label={group.name}
                selected={selectedId === group.id}
                onClick={() => setSelected(group.id)}
                onExpand={() => toggleGroupExpand(group.id)}
                expanded={isExpanded}
                hasChildren={groupEntities.length > 0}
                badge={groupEntities.length}
              />
              
              {isExpanded && groupEntities.map(entity => {
                const entityTables = getTablesForEntity(entity.id);
                const isEntityExpanded = expandedEntities.has(entity.id);
                
                return (
                  <div key={entity.id}>
                    <TreeItem
                      icon={<Box size={12} />}
                      label={entity.name}
                      secondaryLabel={entity.description}
                      selected={selectedId === entity.id}
                      onClick={() => setSelected(entity.id)}
                      onExpand={() => toggleEntityExpand(entity.id)}
                      expanded={isEntityExpanded}
                      hasChildren={entityTables.length > 0}
                      level={1}
                      badge={entityTables.length > 0 ? entityTables.length : undefined}
                    />
                    
                    {isEntityExpanded && entityTables.map(table => (
                      <TreeItem
                        key={table.id}
                        icon={<Table size={12} />}
                        label={table.name}
                        selected={selectedId === table.id}
                        onClick={() => { setViewMode('physical'); setSelected(table.id); }}
                        onDoubleClick={() => { setViewMode('physical'); setSelected(table.id); }}
                        onNavigate={() => { setViewMode('physical'); setSelected(table.id); }}
                        level={2}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Ungrouped Entities */}
        {ungroupedEntities.length > 0 && (
          <>
            {entityGroups.length > 0 && (
              <div style={{
                padding: '8px 20px 4px',
                fontSize: '10px',
                fontWeight: 600,
                color: isDark ? '#8b949e' : '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Ungrouped
              </div>
            )}
            {ungroupedEntities.map(entity => {
              const entityTables = getTablesForEntity(entity.id);
              const isEntityExpanded = expandedEntities.has(entity.id);
              
              return (
                <div key={entity.id}>
                  <TreeItem
                    icon={<Box size={12} />}
                    label={entity.name}
                    secondaryLabel={entity.description}
                    selected={selectedId === entity.id}
                    onClick={() => setSelected(entity.id)}
                    onExpand={() => toggleEntityExpand(entity.id)}
                    expanded={isEntityExpanded}
                    hasChildren={entityTables.length > 0}
                    badge={entityTables.length > 0 ? entityTables.length : undefined}
                  />
                  
                  {isEntityExpanded && entityTables.map(table => (
                    <TreeItem
                      key={table.id}
                      icon={<Table size={12} />}
                      label={table.name}
                      selected={selectedId === table.id}
                      onClick={() => { setViewMode('physical'); setSelected(table.id); }}
                      onDoubleClick={() => { setViewMode('physical'); setSelected(table.id); }}
                      onNavigate={() => { setViewMode('physical'); setSelected(table.id); }}
                      level={1}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}

        {/* Relationships Section */}
        {filteredConceptualData.relationships.length > 0 && (
          <>
            <div style={{
              padding: '16px 20px 4px',
              fontSize: '10px',
              fontWeight: 600,
              color: isDark ? '#8b949e' : '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              marginTop: '8px',
            }}>
              Relationships ({filteredConceptualData.relationships.length})
            </div>
            {filteredConceptualData.relationships.map(rel => {
              const fromEntity = entities.find(e => e.id === rel.fromEntityId);
              const toEntity = entities.find(e => e.id === rel.toEntityId);
              
              return (
                <TreeItem
                  key={rel.id}
                  icon={<Link size={12} />}
                  label={rel.label || `${fromEntity?.name || '?'} → ${toEntity?.name || '?'}`}
                  secondaryLabel={`${rel.fromCardinality} : ${rel.toCardinality}`}
                  selected={selectedId === rel.id}
                  onClick={() => setSelected(rel.id)}
                />
              );
            })}
          </>
        )}
      </div>
    );
  }

  // Physical View - Show Tables Grouped by Entity
  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingTop: '8px' }}>
      {tables.length === 0 && (
        <div style={{ 
          padding: '32px 16px', 
          textAlign: 'center', 
          color: isDark ? '#8b949e' : '#9ca3af' 
        }}>
          <Table size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: '13px' }}>No tables yet</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>
            Add tables to entities in Conceptual view
          </div>
        </div>
      )}

      {searchQuery && entitiesWithTables.length === 0 && orphanTables.length === 0 && tables.length > 0 && (
        <div style={{ 
          padding: '32px 16px', 
          textAlign: 'center', 
          color: isDark ? '#8b949e' : '#9ca3af' 
        }}>
          <div style={{ fontSize: '13px' }}>No matches found</div>
        </div>
      )}

      {/* Entities with their tables */}
      {entitiesWithTables.map(({ entity, tables: entityTables }) => {
        const isEntityExpanded = expandedEntities.has(entity.id);
        
        return (
          <div key={entity.id}>
            <TreeItem
              icon={<Box size={12} />}
              label={entity.name}
              secondaryLabel={entity.description}
              selected={selectedId === entity.id}
              onClick={() => setSelected(entity.id)}
              onExpand={() => toggleEntityExpand(entity.id)}
              expanded={isEntityExpanded}
              hasChildren={entityTables.length > 0}
              badge={entityTables.length}
            />
            
            {isEntityExpanded && entityTables.map(table => (
              <TreeItem
                key={table.id}
                icon={<Table size={12} />}
                label={table.name}
                selected={selectedId === table.id}
                onClick={() => setSelected(table.id)}
                level={1}
                badge={table.attributes.length}
              />
            ))}
          </div>
        );
      })}

      {/* Orphan tables (no entity) */}
      {orphanTables.length > 0 && (
        <>
          {entitiesWithTables.length > 0 && (
            <div style={{
              padding: '8px 20px 4px',
              fontSize: '10px',
              fontWeight: 600,
              color: isDark ? '#8b949e' : '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Unlinked Tables
            </div>
          )}
          {orphanTables.map(table => (
            <TreeItem
              key={table.id}
              icon={<Table size={12} />}
              label={table.name}
              selected={selectedId === table.id}
              onClick={() => setSelected(table.id)}
              badge={table.attributes.length}
            />
          ))}
        </>
      )}
    </div>
  );
};
