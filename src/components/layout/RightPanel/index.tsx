import React from 'react';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Sparkles, X, ChevronLeft } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { EntityInspector } from './EntityInspector';
import { TableInspector } from './TableInspector';
import { RelationshipInspector } from './RelationshipInspector';
import { ForeignKeyInspector } from './ForeignKeyInspector';
import { GroupInspector } from './GroupInspector';
import { DatabaseInspector } from './DatabaseInspector';
import { SchemaInspector } from './SchemaInspector';
import { DataModelInspector } from './DataModelInspector';
import { ProjectInspector } from './ProjectInspector';

export const RightPanel: React.FC = () => {
  const selectedId = useModelStore(state => state.selectedId);
  const entities = useModelStore(state => state.entities);
  const projects = useModelStore(state => state.projects);
  const dataModels = useModelStore(state => state.dataModels);
  const tables = useModelStore(state => state.tables);
  const relationships = useModelStore(state => state.relationships);
  const foreignKeys = useModelStore(state => state.foreignKeys);
  const entityGroups = useModelStore(state => state.entityGroups);
  const viewMode = useModelStore(state => state.viewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const multiSelectedEntityIds = useModelStore(state => state.multiSelectedEntityIds);
  const multiSelectedTableIds = useModelStore(state => state.multiSelectedTableIds);
  const rightPanelMobileOpen = useModelStore(state => state.rightPanelMobileOpen);
  const setRightPanelMobileOpen = useModelStore(state => state.setRightPanelMobileOpen);

  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isDark = colorMode === 'dark';

  // Detect mobile screen size and handle transitions
  useEffect(() => {
    const handleResize = () => {
      const wasMobile = isMobile;
      const nowMobile = window.innerWidth <= 1024;
      setIsMobile(nowMobile);
      
      // When transitioning from mobile to desktop with selection, panel should show
      // When transitioning from desktop to mobile, close the panel
      if (wasMobile && !nowMobile) {
        // Mobile -> Desktop: panel will show automatically (no drawer mode)
        setRightPanelMobileOpen(false);
      } else if (!wasMobile && nowMobile) {
        // Desktop -> Mobile: close the drawer
        setRightPanelMobileOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, setRightPanelMobileOpen]);

  // Close panel when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !rightPanelMobileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setRightPanelMobileOpen(false);
      }
    };

    // Small delay to prevent immediate close when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, rightPanelMobileOpen, setRightPanelMobileOpen]);

  // Determine what's selected
  const selectedProject = useMemo(() => projects.find(project => project.id === selectedId), [projects, selectedId]);
  const selectedEntity = useMemo(() => entities.find(e => e.id === selectedId), [entities, selectedId]);
  const selectedDataModel = useMemo(() => dataModels.find(model => model.id === selectedId), [dataModels, selectedId]);
  const selectedTable = useMemo(() => tables.find(t => t.id === selectedId), [tables, selectedId]);
  const selectedRelationship = useMemo(() => relationships.find(r => r.id === selectedId), [relationships, selectedId]);
  const selectedForeignKey = useMemo(() => foreignKeys.find(fk => fk.id === selectedId), [foreignKeys, selectedId]);
  const selectedGroup = useMemo(() => entityGroups.find(g => g.id === selectedId), [entityGroups, selectedId]);
  
  // Check if selected is a database or schema
  const selectedDatabase = useMemo(() => {
    if (selectedId?.startsWith('db-')) {
      const dbName = selectedId.substring(3);
      return { name: dbName };
    }
    return null;
  }, [selectedId]);
  
  const selectedSchema = useMemo(() => {
    if (selectedId?.startsWith('schema-')) {
      const parts = selectedId.substring(7).split('-');
      const dbName = parts[0];
      const schemaName = parts.slice(1).join('-');
      return { dbName, schemaName };
    }
    return null;
  }, [selectedId]);

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
  const hasSelection = selectedProject || selectedDataModel || selectedEntity || selectedTable || selectedRelationship || selectedForeignKey || selectedGroup || selectedDatabase || selectedSchema || firstMultiSelectedEntity || firstMultiSelectedTable;
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
        Select an {viewMode === 'physical' ? 'table or foreign key' : (viewMode === 'data-model' ? 'data model, entity, group, or model relationship' : 'entity, group, or relationship')} on the canvas to view and edit its properties.
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
    <>
      {/* Floating Tab Button - Only show on mobile when there's something selected */}
      {isMobile && hasSelection && !rightPanelMobileOpen && (
        <button
          onClick={() => setRightPanelMobileOpen(true)}
          style={{
            position: 'fixed',
            top: '50%',
            right: '-10px',
            transform: 'translateY(-50%) translateX(10px)',
            padding: '20px 16px 20px 10px',
            width: '48px',
            background: isDark 
              ? 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)'
              : 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            boxShadow: isDark
              ? '-2px 0 8px rgba(0, 0, 0, 0.3)'
              : '-2px 0 8px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '6px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%) translateX(0px)';
            e.currentTarget.style.boxShadow = isDark
              ? '-4px 0 12px rgba(0, 0, 0, 0.4)'
              : '-4px 0 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(-50%) translateX(10px)';
            e.currentTarget.style.boxShadow = isDark
              ? '-2px 0 8px rgba(0, 0, 0, 0.3)'
              : '-2px 0 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          <ChevronLeft size={20} style={{ color: isDark ? '#8b949e' : '#6b7280', marginLeft: '-4px' }} />
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: isDark ? '#8b949e' : '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}>
            Details
          </div>
        </button>
      )}

      {/* Backdrop for mobile drawer */}
      {isMobile && rightPanelMobileOpen && (
        <div
          onClick={() => setRightPanelMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 98,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Right Panel - Drawer on mobile, fixed sidebar on desktop */}
      <aside
        ref={panelRef}
        style={{
          width: '320px',
          minWidth: '320px',
          maxWidth: '320px',
          height: '100%',
          background: isDark 
            ? 'linear-gradient(180deg, #161b22 0%, #0d1117 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
          borderLeft: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          display: isMobile && !rightPanelMobileOpen ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ...(isMobile ? {
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
            boxShadow: isDark
              ? '-4px 0 16px rgba(0, 0, 0, 0.4)'
              : '-4px 0 16px rgba(0, 0, 0, 0.15)',
            animation: 'slideInRight 0.2s ease',
          } : {}),
        }}
      >
        {/* Close button for mobile */}
        {isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            background: isDark ? '#0d1117' : '#fafafa',
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: isDark ? '#e6edf3' : '#1f2937',
            }}>
              Properties
            </div>
            <button
              onClick={() => setRightPanelMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: isDark ? '#8b949e' : '#6b7280',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        {selectedProject && <ProjectInspector project={selectedProject} />}
        {selectedDataModel && <DataModelInspector dataModel={selectedDataModel} />}
        {selectedGroup && <GroupInspector group={selectedGroup} />}
        {selectedEntity && <EntityInspector entity={selectedEntity} />}
        {selectedTable && <TableInspector table={selectedTable} />}
        {selectedDatabase && <DatabaseInspector dbName={selectedDatabase.name} />}
        {selectedSchema && <SchemaInspector dbName={selectedSchema.dbName} schemaName={selectedSchema.schemaName} />}
        {!selectedEntity && !selectedTable && firstMultiSelectedEntity && <EntityInspector entity={firstMultiSelectedEntity} />}
        {!selectedEntity && !selectedTable && firstMultiSelectedTable && <TableInspector table={firstMultiSelectedTable} />}
        {selectedRelationship && <RelationshipInspector relationship={selectedRelationship} />}
        {selectedForeignKey && <ForeignKeyInspector foreignKey={selectedForeignKey} />}
        {!selectedProject && !selectedDataModel && !selectedEntity && !selectedTable && !selectedRelationship && !selectedForeignKey && !selectedGroup && !selectedDatabase && !selectedSchema && !firstMultiSelectedEntity && !firstMultiSelectedTable && <EmptyState />}
      </aside>
    </>
  );
};

export { EntityInspector } from './EntityInspector';
export { TableInspector } from './TableInspector';
export { RelationshipInspector } from './RelationshipInspector';
export { ForeignKeyInspector } from './ForeignKeyInspector';
export { GroupInspector } from './GroupInspector';
export { DatabaseInspector } from './DatabaseInspector';
export { SchemaInspector } from './SchemaInspector';
export { DataModelInspector } from './DataModelInspector';
export { ProjectInspector } from './ProjectInspector';
export { InspectorHeader } from './InspectorHeader';
export { FormField, TextInput, SelectInput } from './FormComponents';
