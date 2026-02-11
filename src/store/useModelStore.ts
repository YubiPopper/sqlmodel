import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import dagre from 'dagre';
import type { 
  Entity, 
  Relationship, 
  Viewport, 
  NodeLayout, 
  ConceptualData, 
  LayoutData,
  PhysicalTable,
  ForeignKey,
  Attribute,
  EntityGroup,
  TableGroup
} from '../model/schemas';

interface ModelState {
  // Conceptual layer
  entities: Entity[];
  relationships: Relationship[];
  entityGroups: EntityGroup[];
  
  // Physical layer
  tables: PhysicalTable[];
  foreignKeys: ForeignKey[];
  tableGroups: TableGroup[];
  
  // Layout: Map nodeId (entityId or tableId) -> layout info
  nodeLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>>;
  tableLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>>;
  
  viewport: Viewport;
  selectedId: string | null; // entityId, relationshipId, tableId, foreignKeyId, or groupId
  multiSelectedEntityIds: string[]; // For shift-click multi-selection in conceptual view
  multiSelectedTableIds: string[]; // For shift-click multi-selection in physical view
  editingGroupId: string | null; // For triggering inline editing of group name
  hiddenEntityIds: Set<string>; // Hidden entities in conceptual view
  hiddenTableIds: Set<string>; // Hidden tables in physical view
  emptyDatabases: Set<string>; // Empty databases with no tables (for physical view hierarchy)
  emptySchemas: Set<string>; // Empty schemas with no tables (for physical view hierarchy)
  viewMode: 'conceptual' | 'physical';
  colorMode: 'light' | 'dark';
  showEntityOverlay: boolean; // Show entity groupings in physical view
  tableFieldsDisplay: 'all' | 'name' | 'keys'; // Table display mode in physical view
  physicalHierarchyMode: 'entity' | 'database'; // Physical sidebar hierarchy: by entity or by database/schema
  layoutAlgorithm: 'left-right' | 'snowflake' | 'compact'; // Auto-layout algorithm
  
  // Entity Actions
  addEntity: () => string;
  updateEntity: (id: string, data: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  
  // Entity Group Actions (conceptual)
  addEntityGroup: (entityIds: string[], name?: string) => string;
  updateEntityGroup: (id: string, data: Partial<EntityGroup>) => void;
  deleteEntityGroup: (id: string) => void;
  addEntityToGroup: (groupId: string, entityId: string) => void;
  removeEntityFromGroup: (groupId: string, entityId: string) => void;
  
  // Relationship Actions (conceptual)
  addRelationship: (fromId: string, toId: string) => string;
  updateRelationship: (id: string, data: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;
  
  // Table Actions (physical)
  addTable: (entityId?: string) => string;
  updateTable: (id: string, data: Partial<PhysicalTable>) => void;
  deleteTable: (id: string) => void;
  
  // Table Group Actions (physical)
  addTableGroup: (tableIds: string[], name?: string) => string;
  updateTableGroup: (id: string, data: Partial<TableGroup>) => void;
  deleteTableGroup: (id: string) => void;
  addTableToGroup: (groupId: string, tableId: string) => void;
  removeTableFromGroup: (groupId: string, tableId: string) => void;
  
  // Table Attribute Actions
  addTableAttribute: (tableId: string) => void;
  updateTableAttribute: (tableId: string, attrId: string, data: Partial<Attribute>) => void;
  deleteTableAttribute: (tableId: string, attrId: string) => void;
  
  // Foreign Key Actions (physical)
  addForeignKey: (fromTableId: string, toTableId: string, fromAttrId: string, toAttrId: string) => string;
  updateForeignKey: (id: string, data: Partial<ForeignKey>) => void;
  deleteForeignKey: (id: string) => void;
  
  // Layout Actions
  setNodePosition: (id: string, x: number, y: number) => void;
  setNodeSize: (id: string, width: number, height: number) => void;
  setTablePosition: (id: string, x: number, y: number) => void;
  setViewport: (viewport: Viewport) => void;
  setSelected: (id: string | null) => void;
  navigateToNodeCallback: ((nodeId: string) => void) | null;
  setNavigateToNodeCallback: (callback: ((nodeId: string) => void) | null) => void;
  setEditingGroupId: (id: string | null) => void;
  toggleEntityMultiSelect: (entityId: string) => void;
  toggleTableMultiSelect: (tableId: string) => void;
  clearMultiSelection: () => void;
  setViewMode: (mode: 'conceptual' | 'physical') => void;
  setColorMode: (mode: 'light' | 'dark') => void;
  setShowEntityOverlay: (show: boolean) => void;
  setTableFieldsDisplay: (mode: 'all' | 'name' | 'keys') => void;
  setPhysicalHierarchyMode: (mode: 'entity' | 'database') => void;
  setLayoutAlgorithm: (algorithm: 'left-right' | 'snowflake' | 'compact') => void;
  toggleEntityVisibility: (entityId: string) => void;
  toggleTableVisibility: (tableId: string) => void;
  showAllEntities: () => void;
  showAllTables: () => void;
  leftSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
  rightPanelMobileOpen: boolean;
  setRightPanelMobileOpen: (open: boolean) => void;
  autoLayout: () => void;
  
  // Persistence
  loadModel: (conceptual: ConceptualData, layout: LayoutData) => void;
  loadModelFromJSON: (data: any) => void;
  clearModel: () => void;
  
  // Helper methods
  getTablesForEntity: (entityId: string) => PhysicalTable[];
  getEntityForTable: (tableId: string) => Entity | undefined;
  
  // Examples (deprecated - use loadModelFromJSON)
  loadExample: () => void;
  loadEcommerceExample: () => void;
  loadBlogExample: () => void;
  loadProjectExample: () => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      entities: [],
      relationships: [],
      entityGroups: [],
      tables: [],
      foreignKeys: [],
      tableGroups: [],
      nodeLayouts: {},
      tableLayouts: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedId: null,
      multiSelectedEntityIds: [],
      navigateToNodeCallback: null,
      multiSelectedTableIds: [],
      editingGroupId: null,
      hiddenEntityIds: new Set(),
      hiddenTableIds: new Set(),
      emptyDatabases: new Set(),
      emptySchemas: new Set(),
      viewMode: 'conceptual',
      colorMode: 'dark',
      showEntityOverlay: false,
      tableFieldsDisplay: 'all',
      physicalHierarchyMode: 'entity',
      layoutAlgorithm: 'left-right',
      leftSidebarCollapsed: false,
      rightPanelMobileOpen: false,

      // === Entity Actions ===
      addEntity: () => {
        const id = uuidv4();
        const newEntity: Entity = {
          id,
          name: 'New Entity',
          description: '',
        };
        const { viewport } = get();
        const x = -viewport.x / viewport.zoom + 100 + Math.random() * 50;
        const y = -viewport.y / viewport.zoom + 100 + Math.random() * 50;

        set((state) => ({
          entities: [...state.entities, newEntity],
          nodeLayouts: {
            ...state.nodeLayouts,
            [id]: { x, y },
          },
          selectedId: id,
        }));
        return id;
      },

      updateEntity: (id, data) => {
        set((state) => ({
          entities: state.entities.map((e) => (e.id === id ? { ...e, ...data } : e)),
        }));
      },

      deleteEntity: (id) => {
        set((state) => {
          // Cascade delete: relationships, tables (and their FKs)
          const tablesToDelete = state.tables.filter(t => t.entityId === id).map(t => t.id);
          const newRelationships = state.relationships.filter(
            (r) => r.fromEntityId !== id && r.toEntityId !== id
          );
          const newTables = state.tables.filter((t) => t.entityId !== id);
          const newForeignKeys = state.foreignKeys.filter(
            (fk) => !tablesToDelete.includes(fk.fromTableId) && !tablesToDelete.includes(fk.toTableId)
          );
          const newEntities = state.entities.filter((e) => e.id !== id);
          const { [id]: _, ...newNodeLayouts } = state.nodeLayouts;
          
          // Also remove table layouts
          const newTableLayouts = { ...state.tableLayouts };
          tablesToDelete.forEach(tableId => delete newTableLayouts[tableId]);
          
          // Remove entity from any groups
          const newEntityGroups = state.entityGroups.map(group => ({
            ...group,
            entityIds: group.entityIds.filter(eid => eid !== id),
          }));
          
          return {
            entities: newEntities,
            relationships: newRelationships,
            tables: newTables,
            foreignKeys: newForeignKeys,
            nodeLayouts: newNodeLayouts,
            tableLayouts: newTableLayouts,
            entityGroups: newEntityGroups,
            selectedId: state.selectedId === id ? null : state.selectedId,
          };
        });
      },

      // === Entity Group Actions ===
      addEntityGroup: (entityIds, name = 'New Group') => {
        const id = uuidv4();
        const newGroup: EntityGroup = {
          id,
          name,
          entityIds,
          borderStyle: 'dashed',
          borderWidth: 2,
        };
        
        // For empty groups, store a default position so they can be dragged
        const { viewport, nodeLayouts } = get();
        const newLayouts = { ...nodeLayouts };
        if (entityIds.length === 0) {
          // Create group at viewport center
          const x = -viewport.x / viewport.zoom + 200;
          const y = -viewport.y / viewport.zoom + 200;
          newLayouts[id] = { x, y };
        }
        
        set((state) => ({
          entityGroups: [...state.entityGroups, newGroup],
          nodeLayouts: newLayouts,
          selectedId: id,
        }));
        return id;
      },

      updateEntityGroup: (id, data) => {
        set((state) => ({
          entityGroups: state.entityGroups.map((g) =>
            g.id === id ? { ...g, ...data } : g
          ),
        }));
      },

      deleteEntityGroup: (id) => {
        set((state) => ({
          entityGroups: state.entityGroups.filter((g) => g.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        }));
      },

      addEntityToGroup: (groupId, entityId) => {
        console.log('[Store] addEntityToGroup called - groupId:', groupId, 'entityId:', entityId);
        set((state) => {
          const group = state.entityGroups.find(g => g.id === groupId);
          console.log('[Store] Group found:', !!group, 'Already includes entity:', group?.entityIds.includes(entityId));
          return {
            entityGroups: state.entityGroups.map((g) =>
              g.id === groupId && !g.entityIds.includes(entityId)
                ? { ...g, entityIds: [...g.entityIds, entityId] }
                : g
            ),
          };
        });
      },

      removeEntityFromGroup: (groupId, entityId) => {
        set((state) => {
          const group = state.entityGroups.find(g => g.id === groupId);
          if (!group) return state;
          
          const remainingEntityIds = group.entityIds.filter(id => id !== entityId);
          const newNodeLayouts = { ...state.nodeLayouts };
          
          // Always calculate and store current group position when removing entities
          // This prevents the group from jumping/moving as entities are removed
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          let hasPositionedEntities = false;
          
          group.entityIds.forEach(eid => {
            const layout = state.nodeLayouts[eid];
            if (layout) {
              hasPositionedEntities = true;
              minX = Math.min(minX, layout.x);
              minY = Math.min(minY, layout.y);
              maxX = Math.max(maxX, layout.x + 220);
              maxY = Math.max(maxY, layout.y + 120);
            }
          });
          
          // Store the group's position and size (before entity is removed)
          if (hasPositionedEntities) {
            const padding = 60;
            const headerPadding = 60;
            newNodeLayouts[groupId] = { 
              x: minX - padding, 
              y: minY - headerPadding,
              width: maxX - minX + padding * 2,
              height: maxY - minY + padding + headerPadding
            };
          }
          
          return {
            entityGroups: state.entityGroups.map((g) =>
              g.id === groupId
                ? { ...g, entityIds: remainingEntityIds }
                : g
            ),
            nodeLayouts: newNodeLayouts,
          };
        });
      },

      // === Relationship Actions ===
      addRelationship: (fromId, toId) => {
        const id = uuidv4();
        const newRel: Relationship = {
          id,
          fromEntityId: fromId,
          toEntityId: toId,
          label: '',
          fromCardinality: '1',
          toCardinality: '0..*',
        };
        set((state) => ({
          relationships: [...state.relationships, newRel],
          selectedId: id,
        }));
        return id;
      },

      updateRelationship: (id, data) => {
        set((state) => ({
          relationships: state.relationships.map((r) =>
            r.id === id ? { ...r, ...data } : r
          ),
        }));
      },

      deleteRelationship: (id) => {
        set((state) => ({
          relationships: state.relationships.filter((r) => r.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        }));
      },

      // === Table Actions ===
      addTable: (entityId) => {
        const id = uuidv4();
        const { viewport } = get();
        
        let tableName = 'new_table';
        let x = -viewport.x / viewport.zoom + 100 + Math.random() * 50;
        let y = -viewport.y / viewport.zoom + 100 + Math.random() * 50;
        
        if (entityId) {
          const entity = get().entities.find(e => e.id === entityId);
          const existingTables = get().tables.filter(t => t.entityId === entityId);
          const suffix = existingTables.length > 0 ? `_${existingTables.length + 1}` : '';
          tableName = entity ? `${entity.name.toLowerCase().replace(/\s+/g, '_')}${suffix}` : `table${suffix}`;
          
          // Position table based on entity layout or offset from existing tables
          const entityLayout = get().nodeLayouts[entityId];
          x = entityLayout ? entityLayout.x + existingTables.length * 50 : x;
          y = entityLayout ? entityLayout.y + existingTables.length * 30 : y;
        }
        
        const newTable: PhysicalTable = {
          id,
          entityId,
          name: tableName,
          attributes: [],
        };

        set((state) => ({
          tables: [...state.tables, newTable],
          tableLayouts: {
            ...state.tableLayouts,
            [id]: { x, y },
          },
          selectedId: id,
        }));
        return id;
      },

      updateTable: (id, data) => {
        set((state) => ({
          tables: state.tables.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },

      deleteTable: (id) => {
        set((state) => {
          const newForeignKeys = state.foreignKeys.filter(
            (fk) => fk.fromTableId !== id && fk.toTableId !== id
          );
          const newTables = state.tables.filter((t) => t.id !== id);
          const { [id]: _, ...newTableLayouts } = state.tableLayouts;
          
          // Remove table from any groups
          const newTableGroups = state.tableGroups.map(group => ({
            ...group,
            tableIds: group.tableIds.filter(tid => tid !== id),
          }));
          
          return {
            tables: newTables,
            foreignKeys: newForeignKeys,
            tableLayouts: newTableLayouts,
            tableGroups: newTableGroups,
            selectedId: state.selectedId === id ? null : state.selectedId,
          };
        });
      },

      // === Table Group Actions ===
      addTableGroup: (tableIds, name = 'New Group') => {
        const id = uuidv4();
        const newGroup: TableGroup = {
          id,
          name,
          tableIds,
          borderStyle: 'dashed',
          borderWidth: 2,
        };
        
        // For empty groups, store a default position so they can be dragged
        const { viewport, tableLayouts } = get();
        const newLayouts = { ...tableLayouts };
        if (tableIds.length === 0) {
          // Create group at viewport center
          const x = -viewport.x / viewport.zoom + 200;
          const y = -viewport.y / viewport.zoom + 200;
          newLayouts[id] = { x, y };
        }
        
        set((state) => ({
          tableGroups: [...state.tableGroups, newGroup],
          tableLayouts: newLayouts,
          selectedId: id,
        }));
        return id;
      },

      updateTableGroup: (id, data) => {
        set((state) => ({
          tableGroups: state.tableGroups.map((g) =>
            g.id === id ? { ...g, ...data } : g
          ),
        }));
      },

      deleteTableGroup: (id) => {
        set((state) => ({
          tableGroups: state.tableGroups.filter((g) => g.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
        }));
      },

      addTableToGroup: (groupId, tableId) => {
        set((state) => ({
          tableGroups: state.tableGroups.map((g) =>
            g.id === groupId && !g.tableIds.includes(tableId)
              ? { ...g, tableIds: [...g.tableIds, tableId] }
              : g
          ),
        }));
      },

      removeTableFromGroup: (groupId, tableId) => {
        set((state) => {
          const group = state.tableGroups.find(g => g.id === groupId);
          if (!group) return state;
          
          const remainingTableIds = group.tableIds.filter(id => id !== tableId);
          const newTableLayouts = { ...state.tableLayouts };
          
          // Calculate and store current group position when removing tables
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          let hasPositionedTables = false;
          
          group.tableIds.forEach(tid => {
            const layout = state.tableLayouts[tid];
            if (layout) {
              hasPositionedTables = true;
              minX = Math.min(minX, layout.x);
              minY = Math.min(minY, layout.y);
              maxX = Math.max(maxX, layout.x + 280);
              maxY = Math.max(maxY, layout.y + 200);
            }
          });
          
          // Store the group's position and size (before table is removed)
          if (hasPositionedTables) {
            const padding = 60;
            const headerPadding = 60;
            newTableLayouts[groupId] = { 
              x: minX - padding, 
              y: minY - headerPadding,
              width: maxX - minX + padding * 2,
              height: maxY - minY + padding + headerPadding
            };
          }
          
          return {
            tableGroups: state.tableGroups.map((g) =>
              g.id === groupId
                ? { ...g, tableIds: remainingTableIds }
                : g
            ),
            tableLayouts: newTableLayouts,
          };
        });
      },

      // === Table Attribute Actions ===
      addTableAttribute: (tableId) => {
        const newAttr: Attribute = {
          id: uuidv4(),
          name: 'new_column',
          dataType: 'varchar',
          isPrimaryKey: false,
          isNullable: true,
          isForeignKey: false,
        };
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, attributes: [...t.attributes, newAttr] } : t
          ),
        }));
      },

      updateTableAttribute: (tableId, attrId, data) => {
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  attributes: t.attributes.map((a) =>
                    a.id === attrId ? { ...a, ...data } : a
                  ),
                }
              : t
          ),
        }));
      },

      deleteTableAttribute: (tableId, attrId) => {
        set((state) => {
          // Also remove any FKs that reference this attribute
          const newForeignKeys = state.foreignKeys.filter(
            (fk) => fk.fromAttributeId !== attrId && fk.toAttributeId !== attrId
          );
          return {
            tables: state.tables.map((t) =>
              t.id === tableId
                ? { ...t, attributes: t.attributes.filter((a) => a.id !== attrId) }
                : t
            ),
            foreignKeys: newForeignKeys,
          };
        });
      },

      // === Foreign Key Actions ===
      addForeignKey: (fromTableId, toTableId, fromAttrId, toAttrId) => {
        const id = uuidv4();
        const newFK: ForeignKey = {
          id,
          fromTableId,
          toTableId,
          fromAttributeId: fromAttrId,
          toAttributeId: toAttrId,
          fromCardinality: '0..*',
          toCardinality: '1',
        };
        
        // Mark the source attribute as a foreign key
        set((state) => {
          const updatedTables = state.tables.map((t) =>
            t.id === fromTableId
              ? {
                  ...t,
                  attributes: t.attributes.map((a) =>
                    a.id === fromAttrId
                      ? { ...a, isForeignKey: true, referencesTableId: toTableId, referencesAttributeId: toAttrId }
                      : a
                  ),
                }
              : t
          );
          return {
            tables: updatedTables,
            foreignKeys: [...state.foreignKeys, newFK],
            selectedId: id,
          };
        });
        return id;
      },

      updateForeignKey: (id, data) => {
        set((state) => ({
          foreignKeys: state.foreignKeys.map((fk) =>
            fk.id === id ? { ...fk, ...data } : fk
          ),
        }));
      },

      deleteForeignKey: (id) => {
        set((state) => {
          const fkToDelete = state.foreignKeys.find(fk => fk.id === id);
          let updatedTables = state.tables;
          
          // Clear FK flag on the source attribute
          if (fkToDelete) {
            updatedTables = state.tables.map((t) =>
              t.id === fkToDelete.fromTableId
                ? {
                    ...t,
                    attributes: t.attributes.map((a) =>
                      a.id === fkToDelete.fromAttributeId
                        ? { ...a, isForeignKey: false, referencesTableId: undefined, referencesAttributeId: undefined }
                        : a
                    ),
                  }
                : t
            );
          }
          
          return {
            tables: updatedTables,
            foreignKeys: state.foreignKeys.filter((fk) => fk.id !== id),
            selectedId: state.selectedId === id ? null : state.selectedId,
          };
        });
      },

      // === Layout Actions ===
      setNodePosition: (id, x, y) => {
        set((state) => ({
          nodeLayouts: {
            ...state.nodeLayouts,
            [id]: { ...state.nodeLayouts[id], x, y },
          },
        }));
      },

      setNodeSize: (id, width, height) => {
        set((state) => ({
          nodeLayouts: {
            ...state.nodeLayouts,
            [id]: { ...state.nodeLayouts[id], width, height },
          },
        }));
      },
      
      setTablePosition: (id, x, y) => {
        set((state) => ({
          tableLayouts: {
            ...state.tableLayouts,
            [id]: { ...state.tableLayouts[id], x, y },
          },
        }));
      },

      setViewport: (viewport) => set({ viewport }),
      
      setSelected: (id) => set({ selectedId: id, multiSelectedEntityIds: [], multiSelectedTableIds: [] }),
      
      setNavigateToNodeCallback: (callback) => set({ navigateToNodeCallback: callback }),
      
      setEditingGroupId: (id) => set({ editingGroupId: id }),
      
      toggleEntityMultiSelect: (entityId) => {
        set((state) => {
          const isAlreadyMultiSelected = state.multiSelectedEntityIds.includes(entityId);
          
          // If removing from multi-selection
          if (isAlreadyMultiSelected) {
            return {
              multiSelectedEntityIds: state.multiSelectedEntityIds.filter(id => id !== entityId),
              selectedId: null,
            };
          }
          
          // If starting multi-selection from a single selected entity
          if (state.selectedId && !state.multiSelectedEntityIds.length) {
            // Add both the currently selected entity and the new entity to multi-selection
            return {
              multiSelectedEntityIds: [state.selectedId, entityId],
              selectedId: null, // Clear single selection
            };
          }
          
          // Adding to existing multi-selection
          return {
            multiSelectedEntityIds: [...state.multiSelectedEntityIds, entityId],
            selectedId: null,
          };
        });
      },
      
      toggleTableMultiSelect: (tableId) => {
        set((state) => {
          const isAlreadyMultiSelected = state.multiSelectedTableIds.includes(tableId);
          
          // If removing from multi-selection
          if (isAlreadyMultiSelected) {
            return {
              multiSelectedTableIds: state.multiSelectedTableIds.filter(id => id !== tableId),
              selectedId: null,
            };
          }
          
          // If starting multi-selection from a single selected table
          if (state.selectedId && !state.multiSelectedTableIds.length) {
            // Add both the currently selected table and the new table to multi-selection
            return {
              multiSelectedTableIds: [state.selectedId, tableId],
              selectedId: null, // Clear single selection
            };
          }
          
          // Adding to existing multi-selection
          return {
            multiSelectedTableIds: [...state.multiSelectedTableIds, tableId],
            selectedId: null,
          };
        });
      },
      
      clearMultiSelection: () => set({ multiSelectedEntityIds: [], multiSelectedTableIds: [] }),
      
      setViewMode: (mode) => set({ viewMode: mode, multiSelectedEntityIds: [], multiSelectedTableIds: [] }),
      
      setColorMode: (mode) => set({ colorMode: mode }),
      
      setShowEntityOverlay: (show) => set({ showEntityOverlay: show }),
      
      setTableFieldsDisplay: (mode) => set({ tableFieldsDisplay: mode }),
      
      setPhysicalHierarchyMode: (mode) => set({ physicalHierarchyMode: mode }),
      
      setLayoutAlgorithm: (algorithm) => set({ layoutAlgorithm: algorithm }),
      
      toggleEntityVisibility: (entityId) => set((state) => {
        const newHidden = new Set(state.hiddenEntityIds);
        if (newHidden.has(entityId)) {
          newHidden.delete(entityId);
        } else {
          newHidden.add(entityId);
        }
        return { hiddenEntityIds: newHidden };
      }),
      
      toggleTableVisibility: (tableId) => set((state) => {
        const newHidden = new Set(state.hiddenTableIds);
        if (newHidden.has(tableId)) {
          newHidden.delete(tableId);
        } else {
          newHidden.add(tableId);
        }
        return { hiddenTableIds: newHidden };
      }),
      
      showAllEntities: () => set({ hiddenEntityIds: new Set() }),
      
      showAllTables: () => set({ hiddenTableIds: new Set() }),

      toggleLeftSidebar: () => set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),

      setRightPanelMobileOpen: (open) => set({ rightPanelMobileOpen: open }),

      autoLayout: () => {
        const { entities, relationships, tables, foreignKeys, viewMode, showEntityOverlay, layoutAlgorithm } = get();
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        // Configure graph based on selected algorithm
        let graphOptions: dagre.GraphLabel;
        
        switch (layoutAlgorithm) {
          case 'snowflake':
            // Radial/snowflake layout - TB direction optimized for star schemas
            graphOptions = {
              rankdir: 'TB',
              nodesep: 140,
              ranksep: 180,
              marginx: 120,
              marginy: 120,
              ranker: 'network-simplex', // Better for centered/radial layouts
            };
            break;
          case 'compact':
            // Compact layout - TB with minimal spacing and tight clustering
            graphOptions = {
              rankdir: 'TB',
              nodesep: 50,
              ranksep: 80,
              marginx: 40,
              marginy: 40,
              ranker: 'tight-tree', // Minimizes edge length
            };
            break;
          case 'left-right':
          default:
            // Left-right layout (default)
            graphOptions = {
              rankdir: 'LR',
              nodesep: 110,
              ranksep: 160,
              marginx: 130,
              marginy: 130,
            };
            break;
        }

        if (viewMode === 'conceptual') {
          dagreGraph.setGraph(graphOptions);

          // Layout entities with dynamic sizing based on content
          entities.forEach((entity) => {
            // Default entity width
            const width = 220;
            // Better height calculation for description
            const descLines = entity.description ? Math.ceil(entity.description.length / 35) : 0;
            const baseHeight = 120;
            const descHeight = descLines * 22;
            const height = baseHeight + descHeight;
            dagreGraph.setNode(entity.id, { width, height: Math.max(height, 120) });
          });

          relationships.forEach((rel) => {
            dagreGraph.setEdge(rel.fromEntityId, rel.toEntityId);
          });

          dagre.layout(dagreGraph);

          const newNodeLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>> = {};
          entities.forEach((entity) => {
            const nodeWithPosition = dagreGraph.node(entity.id);
            newNodeLayouts[entity.id] = {
              x: nodeWithPosition.x - nodeWithPosition.width / 2,
              y: nodeWithPosition.y - nodeWithPosition.height / 2,
            };
          });

          set({ nodeLayouts: newNodeLayouts });
        } else {
          // Physical view: Layout by entity groups when overlay is enabled
          if (showEntityOverlay) {
            // Adjust graph options for entity grouping
            if (layoutAlgorithm === 'compact') {
              graphOptions.nodesep = 80;
              graphOptions.ranksep = 120;
            } else if (layoutAlgorithm === 'snowflake') {
              graphOptions.nodesep = 130;
              graphOptions.ranksep = 180;
            } else {
              graphOptions.nodesep = 110;
              graphOptions.ranksep = 220;
            }
            
            dagreGraph.setGraph(graphOptions);

            // First, calculate the size of each entity group
            const entitySizes: Record<string, { width: number; height: number }> = {};
            
            entities.forEach((entity) => {
              const entityTables = tables.filter(t => t.entityId === entity.id);
              
              if (entityTables.length === 0) {
                // Empty entity placeholder
                entitySizes[entity.id] = { width: 360, height: 180 };
              } else if (entityTables.length === 1) {
                // Single table with entity group padding
                const table = entityTables[0];
                // More accurate table height calculation: header + (rows * row_height) + padding
                const tableHeight = 44 + (table.attributes.length * 32) + 20;
                entitySizes[entity.id] = { 
                  width: 340, // Fixed width for consistency
                  height: Math.max(tableHeight + 130, 200) // Add padding for entity header and borders
                };
              } else {
                // Multiple tables - arrange vertically within entity group
                let totalHeight = 100; // Header padding
                let maxWidth = 280;
                entityTables.forEach((table) => {
                  const tableHeight = 44 + (table.attributes.length * 32) + 20;
                  totalHeight += tableHeight + 24; // table + gap between tables
                });
                entitySizes[entity.id] = { 
                  width: maxWidth + 120,
                  height: totalHeight + 50
                };
              }
              
              // Add entity as a node in dagre
              dagreGraph.setNode(entity.id, entitySizes[entity.id]);
            });

            // Add edges between entities based on FK relationships
            foreignKeys.forEach((fk) => {
              const fromTable = tables.find(t => t.id === fk.fromTableId);
              const toTable = tables.find(t => t.id === fk.toTableId);
              if (fromTable && toTable && fromTable.entityId && toTable.entityId && fromTable.entityId !== toTable.entityId) {
                dagreGraph.setEdge(fromTable.entityId, toTable.entityId);
              }
            });

            dagre.layout(dagreGraph);

            // Position tables within their entity groups
            const newTableLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>> = {};
            
            entities.forEach((entity) => {
              const nodeWithPosition = dagreGraph.node(entity.id);
              if (!nodeWithPosition) return;
              
              const entityX = nodeWithPosition.x - nodeWithPosition.width / 2;
              const entityY = nodeWithPosition.y - nodeWithPosition.height / 2;
              
              const entityTables = tables.filter(t => t.entityId === entity.id);
              
              // Position tables within entity bounds with better spacing
              let tableY = entityY + 80; // Start below header with more room
              entityTables.forEach((table) => {
                const tableHeight = 44 + (table.attributes.length * 32) + 20;
                newTableLayouts[table.id] = {
                  x: entityX + 50, // Centered padding from entity left edge
                  y: tableY,
                };
                tableY += tableHeight + 24; // Move to next table position with spacing
              });
            });

            set({ tableLayouts: newTableLayouts });
          } else {
            // Standard table layout without entity grouping
            dagreGraph.setGraph(graphOptions);

            tables.forEach((table) => {
              const width = 280;
              const attrCount = table.attributes.length;
              // More accurate height: header + (attributes * row_height) + padding
              const height = 44 + (attrCount * 32) + 20;
              dagreGraph.setNode(table.id, { width, height: Math.max(height, 120) });
            });

            foreignKeys.forEach((fk) => {
              dagreGraph.setEdge(fk.fromTableId, fk.toTableId);
            });

            dagre.layout(dagreGraph);

            const newTableLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>> = {};
            tables.forEach((table) => {
              const nodeWithPosition = dagreGraph.node(table.id);
              if (nodeWithPosition) {
                newTableLayouts[table.id] = {
                  x: nodeWithPosition.x - nodeWithPosition.width / 2,
                  y: nodeWithPosition.y - nodeWithPosition.height / 2,
                };
              }
            });

            set({ tableLayouts: newTableLayouts });
          }
        }
      },

      // === Persistence ===
      loadModel: (conceptual, layout) => {
        const nodeLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>> = {};
        layout.nodes.forEach((n) => {
          if (n.entityId) {
            nodeLayouts[n.entityId] = { x: n.x, y: n.y, width: n.width, height: n.height };
          }
        });

        set({
          entities: conceptual.entities,
          relationships: conceptual.relationships,
          entityGroups: conceptual.groups || [],
          nodeLayouts,
          viewport: layout.viewport,
          selectedId: null,
          multiSelectedEntityIds: [],
        });
      },

      loadModelFromJSON: (data) => {
        // Load model from JSON file format (conceptual + physical structure)
        const hasLayouts = data.nodeLayouts || data.tableLayouts;
        
        set({
          entities: data.conceptual?.entities || [],
          relationships: data.conceptual?.relationships || [],
          entityGroups: data.conceptual?.groups || [],
          tables: data.physical?.tables || [],
          foreignKeys: data.physical?.foreignKeys || [],
          tableGroups: data.physical?.tableGroups || [],
          nodeLayouts: data.nodeLayouts || {},
          tableLayouts: data.tableLayouts || {},
          viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
          selectedId: null,
          multiSelectedEntityIds: [],
          multiSelectedTableIds: [],
          viewMode: data.viewMode || 'conceptual'
        });
        
        // Only apply auto-layout if no layouts were saved
        if (!hasLayouts) {
          get().autoLayout();
          set({ viewMode: 'physical' });
          get().autoLayout();
          set({ viewMode: data.viewMode || 'conceptual' });
        }
      },

      clearModel: () => {
        set({
          entities: [],
          relationships: [],
          entityGroups: [],
          tables: [],
          foreignKeys: [],
          nodeLayouts: {},
          tableLayouts: {},
          selectedId: null,
          multiSelectedEntityIds: [],
        });
      },

      // === Helper Methods ===
      getTablesForEntity: (entityId) => {
        return get().tables.filter(t => t.entityId === entityId);
      },

      getEntityForTable: (tableId) => {
        const table = get().tables.find(t => t.id === tableId);
        if (!table) return undefined;
        return get().entities.find(e => e.id === table.entityId);
      },

      // === Demo ===
      loadExample: () => {
        // Entities
        const borrowerId = uuidv4();
        const loansId = uuidv4();
        const booksId = uuidv4();

        const entityBorrower: Entity = { 
          id: borrowerId, 
          name: 'Borrower', 
          description: 'Registered library member who can borrow books',
        };
        const entityLoans: Entity = { 
          id: loansId, 
          name: 'Loan', 
          description: 'A loan transaction linking borrower to book',
        };
        const entityBooks: Entity = { 
          id: booksId, 
          name: 'Book', 
          description: 'Books available in the library catalog',
        };

        // Physical Tables
        const borrowerTableId = uuidv4();
        const loansTableId = uuidv4();
        const booksTableId = uuidv4();

        const borrowerPKId = uuidv4();
        const loanPKId = uuidv4();
        const bookPKId = uuidv4();
        const loanBorrowerFKId = uuidv4();
        const loanBookFKId = uuidv4();

        const borrowerTable: PhysicalTable = {
          id: borrowerTableId,
          entityId: borrowerId,
          name: 'borrowers',
          attributes: [
            { id: borrowerPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'name', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'email', dataType: 'varchar', isPrimaryKey: false, isNullable: true, isForeignKey: false },
            { id: uuidv4(), name: 'created_at', dataType: 'timestamp', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const booksTable: PhysicalTable = {
          id: booksTableId,
          entityId: booksId,
          name: 'books',
          attributes: [
            { id: bookPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'title', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'author', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'isbn', dataType: 'varchar', isPrimaryKey: false, isNullable: true, isForeignKey: false },
            { id: uuidv4(), name: 'published_year', dataType: 'int', isPrimaryKey: false, isNullable: true, isForeignKey: false },
          ],
        };

        const loansTable: PhysicalTable = {
          id: loansTableId,
          entityId: loansId,
          name: 'loans',
          attributes: [
            { id: loanPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: loanBorrowerFKId, name: 'borrower_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: borrowerTableId, referencesAttributeId: borrowerPKId },
            { id: loanBookFKId, name: 'book_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: booksTableId, referencesAttributeId: bookPKId },
            { id: uuidv4(), name: 'loan_date', dataType: 'date', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'return_date', dataType: 'date', isPrimaryKey: false, isNullable: true, isForeignKey: false },
          ],
        };

        // Conceptual Relationships
        const relationships: Relationship[] = [
          {
            id: uuidv4(),
            fromEntityId: loansId,
            toEntityId: borrowerId,
            label: 'borrowed by',
            fromCardinality: '0..*',
            toCardinality: '1',
          },
          {
            id: uuidv4(),
            fromEntityId: loansId,
            toEntityId: booksId,
            label: 'contains',
            fromCardinality: '0..*',
            toCardinality: '1',
          },
        ];

        // Physical Foreign Keys
        const foreignKeys: ForeignKey[] = [
          {
            id: uuidv4(),
            fromTableId: loansTableId,
            toTableId: borrowerTableId,
            fromAttributeId: loanBorrowerFKId,
            toAttributeId: borrowerPKId,
            fromCardinality: '0..*',
            toCardinality: '1',
            edgeType: 'smoothstep',
          },
          {
            id: uuidv4(),
            fromTableId: loansTableId,
            toTableId: booksTableId,
            fromAttributeId: loanBookFKId,
            toAttributeId: bookPKId,
            fromCardinality: '0..*',
            toCardinality: '1',
            edgeType: 'smoothstep',
          },
        ];

        set({
          entities: [entityBorrower, entityLoans, entityBooks],
          relationships,
          entityGroups: [],
          tables: [borrowerTable, loansTable, booksTable],
          foreignKeys,
          nodeLayouts: {},
          tableLayouts: {},
          viewport: { x: 0, y: 0, zoom: 1 },
          selectedId: null,
          multiSelectedEntityIds: [],
          multiSelectedTableIds: [],
          viewMode: 'conceptual'
        });
        
        get().autoLayout();
        set({ viewMode: 'physical' });
        get().autoLayout();
        set({ viewMode: 'conceptual' });
      },

      loadEcommerceExample: () => {
        // Entities
        const customerId = uuidv4();
        const productId = uuidv4();
        const orderId = uuidv4();
        const orderItemId = uuidv4();
        const paymentId = uuidv4();

        const entityCustomer: Entity = { id: customerId, name: 'Customer', description: 'Online store customers' };
        const entityProduct: Entity = { id: productId, name: 'Product', description: 'Products available for sale' };
        const entityOrder: Entity = { id: orderId, name: 'Order', description: 'Customer orders' };
        const entityOrderItem: Entity = { id: orderItemId, name: 'Order Item', description: 'Individual items in an order' };
        const entityPayment: Entity = { id: paymentId, name: 'Payment', description: 'Payment transactions' };

        // Tables
        const customerTableId = uuidv4();
        const productTableId = uuidv4();
        const orderTableId = uuidv4();
        const orderItemTableId = uuidv4();
        const paymentTableId = uuidv4();

        const customerPKId = uuidv4();
        const productPKId = uuidv4();
        const orderPKId = uuidv4();
        const orderItemPKId = uuidv4();
        const paymentPKId = uuidv4();
        const orderCustomerFKId = uuidv4();
        const orderItemOrderFKId = uuidv4();
        const orderItemProductFKId = uuidv4();
        const paymentOrderFKId = uuidv4();

        const customerTable: PhysicalTable = {
          id: customerTableId,
          entityId: customerId,
          name: 'customers',
          attributes: [
            { id: customerPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'email', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'name', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'address', dataType: 'text', isPrimaryKey: false, isNullable: true, isForeignKey: false },
            { id: uuidv4(), name: 'created_at', dataType: 'timestamp', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const productTable: PhysicalTable = {
          id: productTableId,
          entityId: productId,
          name: 'products',
          attributes: [
            { id: productPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'name', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'description', dataType: 'text', isPrimaryKey: false, isNullable: true, isForeignKey: false },
            { id: uuidv4(), name: 'price', dataType: 'decimal', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'stock', dataType: 'int', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const orderTable: PhysicalTable = {
          id: orderTableId,
          entityId: orderId,
          name: 'orders',
          attributes: [
            { id: orderPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: orderCustomerFKId, name: 'customer_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: customerTableId, referencesAttributeId: customerPKId },
            { id: uuidv4(), name: 'order_date', dataType: 'timestamp', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'status', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'total', dataType: 'decimal', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const orderItemTable: PhysicalTable = {
          id: orderItemTableId,
          entityId: orderItemId,
          name: 'order_items',
          attributes: [
            { id: orderItemPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: orderItemOrderFKId, name: 'order_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: orderTableId, referencesAttributeId: orderPKId },
            { id: orderItemProductFKId, name: 'product_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: productTableId, referencesAttributeId: productPKId },
            { id: uuidv4(), name: 'quantity', dataType: 'int', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'price', dataType: 'decimal', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const paymentTable: PhysicalTable = {
          id: paymentTableId,
          entityId: paymentId,
          name: 'payments',
          attributes: [
            { id: paymentPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: paymentOrderFKId, name: 'order_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: orderTableId, referencesAttributeId: orderPKId },
            { id: uuidv4(), name: 'amount', dataType: 'decimal', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'method', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'paid_at', dataType: 'timestamp', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const relationships: Relationship[] = [
          { id: uuidv4(), fromEntityId: orderId, toEntityId: customerId, label: 'placed by', fromCardinality: '0..*', toCardinality: '1' },
          { id: uuidv4(), fromEntityId: orderItemId, toEntityId: orderId, label: 'belongs to', fromCardinality: '1..*', toCardinality: '1' },
          { id: uuidv4(), fromEntityId: orderItemId, toEntityId: productId, label: 'references', fromCardinality: '0..*', toCardinality: '1' },
          { id: uuidv4(), fromEntityId: paymentId, toEntityId: orderId, label: 'pays for', fromCardinality: '0..*', toCardinality: '1' },
        ];

        const foreignKeys: ForeignKey[] = [
          { id: uuidv4(), fromTableId: orderTableId, toTableId: customerTableId, fromAttributeId: orderCustomerFKId, toAttributeId: customerPKId, fromCardinality: '0..*', toCardinality: '1', edgeType: 'smoothstep' },
          { id: uuidv4(), fromTableId: orderItemTableId, toTableId: orderTableId, fromAttributeId: orderItemOrderFKId, toAttributeId: orderPKId, fromCardinality: '1..*', toCardinality: '1', edgeType: 'smoothstep' },
          { id: uuidv4(), fromTableId: orderItemTableId, toTableId: productTableId, fromAttributeId: orderItemProductFKId, toAttributeId: productPKId, fromCardinality: '0..*', toCardinality: '1', edgeType: 'smoothstep' },
          { id: uuidv4(), fromTableId: paymentTableId, toTableId: orderTableId, fromAttributeId: paymentOrderFKId, toAttributeId: orderPKId, fromCardinality: '0..*', toCardinality: '1', edgeType: 'smoothstep' },
        ];

        set({
          entities: [entityCustomer, entityProduct, entityOrder, entityOrderItem, entityPayment],
          relationships,
          entityGroups: [],
          tables: [customerTable, productTable, orderTable, orderItemTable, paymentTable],
          foreignKeys,
          nodeLayouts: {},
          tableLayouts: {},
          viewport: { x: 0, y: 0, zoom: 1 },
          selectedId: null,
          multiSelectedEntityIds: [],
          multiSelectedTableIds: [],
          viewMode: 'conceptual'
        });
        
        get().autoLayout();
        set({ viewMode: 'physical' });
        get().autoLayout();
        set({ viewMode: 'conceptual' });
      },

      loadBlogExample: () => {
        // Entities
        const authorId = uuidv4();
        const postId = uuidv4();
        const commentId = uuidv4();
        const categoryId = uuidv4();

        const entityAuthor: Entity = { id: authorId, name: 'Author', description: 'Content creators and writers' };
        const entityPost: Entity = { id: postId, name: 'Post', description: 'Blog articles and content' };
        const entityComment: Entity = { id: commentId, name: 'Comment', description: 'User comments on posts' };
        const entityCategory: Entity = { id: categoryId, name: 'Category', description: 'Content categorization' };

        // Tables
        const authorTableId = uuidv4();
        const postTableId = uuidv4();
        const commentTableId = uuidv4();
        const categoryTableId = uuidv4();

        const authorPKId = uuidv4();
        const postPKId = uuidv4();
        const commentPKId = uuidv4();
        const categoryPKId = uuidv4();
        const postAuthorFKId = uuidv4();
        const postCategoryFKId = uuidv4();
        const commentPostFKId = uuidv4();

        const authorTable: PhysicalTable = {
          id: authorTableId,
          entityId: authorId,
          name: 'authors',
          attributes: [
            { id: authorPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'username', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'email', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'bio', dataType: 'text', isPrimaryKey: false, isNullable: true, isForeignKey: false },
            { id: uuidv4(), name: 'joined_at', dataType: 'timestamp', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const categoryTable: PhysicalTable = {
          id: categoryTableId,
          entityId: categoryId,
          name: 'categories',
          attributes: [
            { id: categoryPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'name', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'slug', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'description', dataType: 'text', isPrimaryKey: false, isNullable: true, isForeignKey: false },
          ],
        };

        const postTable: PhysicalTable = {
          id: postTableId,
          entityId: postId,
          name: 'posts',
          attributes: [
            { id: postPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: postAuthorFKId, name: 'author_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: authorTableId, referencesAttributeId: authorPKId },
            { id: postCategoryFKId, name: 'category_id', dataType: 'uuid', isPrimaryKey: false, isNullable: true, isForeignKey: true, referencesTableId: categoryTableId, referencesAttributeId: categoryPKId },
            { id: uuidv4(), name: 'title', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'content', dataType: 'text', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'published_at', dataType: 'timestamp', isPrimaryKey: false, isNullable: true, isForeignKey: false },
          ],
        };

        const commentTable: PhysicalTable = {
          id: commentTableId,
          entityId: commentId,
          name: 'comments',
          attributes: [
            { id: commentPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: commentPostFKId, name: 'post_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: postTableId, referencesAttributeId: postPKId },
            { id: uuidv4(), name: 'author_name', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'content', dataType: 'text', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'created_at', dataType: 'timestamp', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const relationships: Relationship[] = [
          { id: uuidv4(), fromEntityId: postId, toEntityId: authorId, label: 'written by', fromCardinality: '0..*', toCardinality: '1' },
          { id: uuidv4(), fromEntityId: postId, toEntityId: categoryId, label: 'categorized as', fromCardinality: '0..*', toCardinality: '0..1' },
          { id: uuidv4(), fromEntityId: commentId, toEntityId: postId, label: 'on', fromCardinality: '0..*', toCardinality: '1' },
        ];

        const foreignKeys: ForeignKey[] = [
          { id: uuidv4(), fromTableId: postTableId, toTableId: authorTableId, fromAttributeId: postAuthorFKId, toAttributeId: authorPKId, fromCardinality: '0..*', toCardinality: '1', edgeType: 'smoothstep' },
          { id: uuidv4(), fromTableId: postTableId, toTableId: categoryTableId, fromAttributeId: postCategoryFKId, toAttributeId: categoryPKId, fromCardinality: '0..*', toCardinality: '0..1', edgeType: 'smoothstep' },
          { id: uuidv4(), fromTableId: commentTableId, toTableId: postTableId, fromAttributeId: commentPostFKId, toAttributeId: postPKId, fromCardinality: '0..*', toCardinality: '1', edgeType: 'smoothstep' },
        ];

        set({
          entities: [entityAuthor, entityPost, entityComment, entityCategory],
          relationships,
          entityGroups: [],
          tables: [authorTable, postTable, commentTable, categoryTable],
          foreignKeys,
          nodeLayouts: {},
          tableLayouts: {},
          viewport: { x: 0, y: 0, zoom: 1 },
          selectedId: null,
          multiSelectedEntityIds: [],
          multiSelectedTableIds: [],
          viewMode: 'conceptual'
        });
        
        get().autoLayout();
        set({ viewMode: 'physical' });
        get().autoLayout();
        set({ viewMode: 'conceptual' });
      },

      loadProjectExample: () => {
        // Entities
        const projectId = uuidv4();
        const taskId = uuidv4();
        const memberId = uuidv4();
        const milestoneId = uuidv4();

        const entityProject: Entity = { id: projectId, name: 'Project', description: 'Development projects' };
        const entityTask: Entity = { id: taskId, name: 'Task', description: 'Individual work items' };
        const entityMember: Entity = { id: memberId, name: 'Team Member', description: 'Project team members' };
        const entityMilestone: Entity = { id: milestoneId, name: 'Milestone', description: 'Project milestones' };

        // Tables
        const projectTableId = uuidv4();
        const taskTableId = uuidv4();
        const memberTableId = uuidv4();
        const milestoneTableId = uuidv4();

        const projectPKId = uuidv4();
        const taskPKId = uuidv4();
        const memberPKId = uuidv4();
        const milestonePKId = uuidv4();
        const taskProjectFKId = uuidv4();
        const taskAssigneeFKId = uuidv4();
        const taskMilestoneFKId = uuidv4();
        const milestoneProjectFKId = uuidv4();

        const projectTable: PhysicalTable = {
          id: projectTableId,
          entityId: projectId,
          name: 'projects',
          attributes: [
            { id: projectPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'name', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'description', dataType: 'text', isPrimaryKey: false, isNullable: true, isForeignKey: false },
            { id: uuidv4(), name: 'start_date', dataType: 'date', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'end_date', dataType: 'date', isPrimaryKey: false, isNullable: true, isForeignKey: false },
          ],
        };

        const memberTable: PhysicalTable = {
          id: memberTableId,
          entityId: memberId,
          name: 'team_members',
          attributes: [
            { id: memberPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'name', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'email', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'role', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const milestoneTable: PhysicalTable = {
          id: milestoneTableId,
          entityId: milestoneId,
          name: 'milestones',
          attributes: [
            { id: milestonePKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: milestoneProjectFKId, name: 'project_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: projectTableId, referencesAttributeId: projectPKId },
            { id: uuidv4(), name: 'title', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'due_date', dataType: 'date', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const taskTable: PhysicalTable = {
          id: taskTableId,
          entityId: taskId,
          name: 'tasks',
          attributes: [
            { id: taskPKId, name: 'id', dataType: 'uuid', isPrimaryKey: true, isNullable: false, isForeignKey: false },
            { id: taskProjectFKId, name: 'project_id', dataType: 'uuid', isPrimaryKey: false, isNullable: false, isForeignKey: true, referencesTableId: projectTableId, referencesAttributeId: projectPKId },
            { id: taskAssigneeFKId, name: 'assignee_id', dataType: 'uuid', isPrimaryKey: false, isNullable: true, isForeignKey: true, referencesTableId: memberTableId, referencesAttributeId: memberPKId },
            { id: taskMilestoneFKId, name: 'milestone_id', dataType: 'uuid', isPrimaryKey: false, isNullable: true, isForeignKey: true, referencesTableId: milestoneTableId, referencesAttributeId: milestonePKId },
            { id: uuidv4(), name: 'title', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'status', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
            { id: uuidv4(), name: 'priority', dataType: 'varchar', isPrimaryKey: false, isNullable: false, isForeignKey: false },
          ],
        };

        const relationships: Relationship[] = [
          { id: uuidv4(), fromEntityId: taskId, toEntityId: projectId, label: 'part of', fromCardinality: '0..*', toCardinality: '1' },
          { id: uuidv4(), fromEntityId: taskId, toEntityId: memberId, label: 'assigned to', fromCardinality: '0..*', toCardinality: '0..1' },
          { id: uuidv4(), fromEntityId: taskId, toEntityId: milestoneId, label: 'targets', fromCardinality: '0..*', toCardinality: '0..1' },
          { id: uuidv4(), fromEntityId: milestoneId, toEntityId: projectId, label: 'belongs to', fromCardinality: '0..*', toCardinality: '1' },
        ];

        const foreignKeys: ForeignKey[] = [
          { id: uuidv4(), fromTableId: taskTableId, toTableId: projectTableId, fromAttributeId: taskProjectFKId, toAttributeId: projectPKId, fromCardinality: '0..*', toCardinality: '1', edgeType: 'smoothstep' },
          { id: uuidv4(), fromTableId: taskTableId, toTableId: memberTableId, fromAttributeId: taskAssigneeFKId, toAttributeId: memberPKId, fromCardinality: '0..*', toCardinality: '0..1', edgeType: 'smoothstep' },
          { id: uuidv4(), fromTableId: taskTableId, toTableId: milestoneTableId, fromAttributeId: taskMilestoneFKId, toAttributeId: milestonePKId, fromCardinality: '0..*', toCardinality: '0..1', edgeType: 'smoothstep' },
          { id: uuidv4(), fromTableId: milestoneTableId, toTableId: projectTableId, fromAttributeId: milestoneProjectFKId, toAttributeId: projectPKId, fromCardinality: '0..*', toCardinality: '1', edgeType: 'smoothstep' },
        ];

        set({
          entities: [entityProject, entityTask, entityMember, entityMilestone],
          relationships,
          entityGroups: [],
          tables: [projectTable, taskTable, memberTable, milestoneTable],
          foreignKeys,
          nodeLayouts: {},
          tableLayouts: {},
          viewport: { x: 0, y: 0, zoom: 1 },
          selectedId: null,
          multiSelectedEntityIds: [],
          multiSelectedTableIds: [],
          viewMode: 'conceptual'
        });
        
        get().autoLayout();
        set({ viewMode: 'physical' });
        get().autoLayout();
        set({ viewMode: 'conceptual' });
      }
    }),
    {
      name: 'sqlmodel-storage',
      partialize: (state) => ({
        ...state,
        hiddenEntityIds: Array.from(state.hiddenEntityIds),
        hiddenTableIds: Array.from(state.hiddenTableIds),
        emptyDatabases: Array.from(state.emptyDatabases),
        emptySchemas: Array.from(state.emptySchemas),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Sets after rehydration
          state.hiddenEntityIds = new Set(state.hiddenEntityIds as any);
          state.hiddenTableIds = new Set(state.hiddenTableIds as any);
          state.emptyDatabases = new Set(state.emptyDatabases as any);
          state.emptySchemas = new Set(state.emptySchemas as any);
        }
      },
    }
  )
);
