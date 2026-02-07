import React from 'react';
import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { EntityInspector } from './EntityInspector';
import { TableInspector } from './TableInspector';
import { RelationshipInspector } from './RelationshipInspector';
import { GroupInspector } from './GroupInspector';

export const RightPanel: React.FC = () => {
  const selectedId = useModelStore(state => state.selectedId);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const relationships = useModelStore(state => state.relationships);
  const foreignKeys = useModelStore(state => state.foreignKeys);
  const entityGroups = useModelStore(state => state.entityGroups);
  const viewMode = useModelStore(state => state.viewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const multiSelectedEntityIds = useModelStore(state => state.multiSelectedEntityIds);
  const multiSelectedTableIds = useModelStore(state => state.multiSelectedTableIds);

  const isDark = colorMode === 'dark';

  // Determine what's selected
  const selectedEntity = useMemo(() => entities.find(e => e.id === selectedId), [entities, selectedId]);
  const selectedTable = useMemo(() => tables.find(t => t.id === selectedId), [tables, selectedId]);
  const selectedRelationship = useMemo(() => relationships.find(r => r.id === selectedId), [relationships, selectedId]);
  const selectedForeignKey = useMemo(() => foreignKeys.find(fk => fk.id === selectedId), [foreignKeys, selectedId]);
  const selectedGroup = useMemo(() => entityGroups.find(g => g.id === selectedId), [entityGroups, selectedId]);

  // For multi-selected entities/tables, show the first one in the panel
  const firstMultiSelectedEntity = useMemo(() => {
    if (multiSelectedEntityIds.length > 0) {
      return entities.find(e => e.id === multiSelectedEntityIds[0]);
    }
    return undefined;
  }, [entities, multiSelectedEntityIds]);

  const firstMultiSelectedTable = useMemo(() => {
    if (multiSelectedTableIds.length > 0) {
      return tables.find(t => t.id === multiSelectedTableIds[0]);
    }
    return undefined;
  }, [tables, multiSelectedTableIds]);

  // Hide panel if nothing is selected
  const hasSelection = selectedEntity || selectedTable || selectedRelationship || selectedForeignKey || selectedGroup || firstMultiSelectedEntity || firstMultiSelectedTable;
  if (!hasSelection) {
    return null;
  }

  // Empty state (nothing selected)
  const EmptyState = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '32px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        background: isDark ? 'rgba(99, 102, 241, 0.1)' : '#eef2ff',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <Sparkles size={28} style={{ color: '#6366f1' }} />
      </div>
      <h3 style={{
        fontSize: '15px',
        fontWeight: 600,
        color: isDark ? '#e6edf3' : '#1f2937',
        marginBottom: '8px',
      }}>
        No Selection
      </h3>
      <p style={{
        fontSize: '13px',
        color: isDark ? '#8b949e' : '#9ca3af',
        lineHeight: 1.5,
        maxWidth: '220px',
      }}>
        Select an {viewMode === 'conceptual' ? 'entity, group, or relationship' : 'table or foreign key'} on the canvas to view and edit its properties.
      </p>
      
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: isDark ? '#0d1117' : '#f9fafb',
        borderRadius: '12px',
        width: '100%',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: isDark ? '#8b949e' : '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
        }}>
          Quick Tips
        </div>
        <ul style={{
          fontSize: '12px',
          color: isDark ? '#8b949e' : '#6b7280',
          textAlign: 'left',
          paddingLeft: '16px',
          margin: 0,
          lineHeight: 1.8,
        }}>
          <li>Double-click an entity to edit inline</li>
          <li>Shift+click to multi-select entities</li>
          <li>Drag from entity edge to create relationships</li>
          <li>Press Delete to remove selected items</li>
        </ul>
      </div>
    </div>
  );

  return (
    <aside
      style={{
        width: '320px',
        minWidth: '320px',
        maxWidth: '320px',
        height: '100%',
        background: isDark 
          ? 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        borderLeft: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {selectedGroup && <GroupInspector group={selectedGroup} />}
      {selectedEntity && <EntityInspector entity={selectedEntity} />}
      {selectedTable && <TableInspector table={selectedTable} />}
      {!selectedEntity && !selectedTable && firstMultiSelectedEntity && <EntityInspector entity={firstMultiSelectedEntity} />}
      {!selectedEntity && !selectedTable && firstMultiSelectedTable && <TableInspector table={firstMultiSelectedTable} />}
      {selectedRelationship && <RelationshipInspector relationship={selectedRelationship} />}
      {!selectedEntity && !selectedTable && !selectedRelationship && !selectedForeignKey && !selectedGroup && !firstMultiSelectedEntity && !firstMultiSelectedTable && <EmptyState />}
    </aside>
  );
};

export { EntityInspector } from './EntityInspector';
export { TableInspector } from './TableInspector';
export { RelationshipInspector } from './RelationshipInspector';
export { GroupInspector } from './GroupInspector';
export { InspectorHeader } from './InspectorHeader';
export { FormField, TextInput, SelectInput } from './FormComponents';
