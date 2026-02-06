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
  EntityGroup 
} from '../model/schemas';

interface ModelState {
  // Conceptual layer
  entities: Entity[];
  relationships: Relationship[];
  entityGroups: EntityGroup[];
  
  // Physical layer
  tables: PhysicalTable[];
  foreignKeys: ForeignKey[];
  
  // Layout: Map nodeId (entityId or tableId) -> layout info
  nodeLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>>;
  tableLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>>;
  
  viewport: Viewport;
  selectedId: string | null; // entityId, relationshipId, tableId, foreignKeyId, or groupId
  multiSelectedEntityIds: string[]; // For shift-click multi-selection in conceptual view
  viewMode: 'conceptual' | 'physical';
  colorMode: 'light' | 'dark';
  showEntityOverlay: boolean; // Show entity groupings in physical view
  
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
  addTable: (entityId: string) => string;
  updateTable: (id: string, data: Partial<PhysicalTable>) => void;
  deleteTable: (id: string) => void;
  
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
  setTablePosition: (id: string, x: number, y: number) => void;
  setViewport: (viewport: Viewport) => void;
  setSelected: (id: string | null) => void;
  toggleEntityMultiSelect: (entityId: string) => void;
  clearMultiSelection: () => void;
  setViewMode: (mode: 'conceptual' | 'physical') => void;
  setColorMode: (mode: 'light' | 'dark') => void;
  setShowEntityOverlay: (show: boolean) => void;
  autoLayout: () => void;
  
  // Persistence
  loadModel: (conceptual: ConceptualData, layout: LayoutData) => void;
  clearModel: () => void;
  
  // Helper methods
  getTablesForEntity: (entityId: string) => PhysicalTable[];
  getEntityForTable: (tableId: string) => Entity | undefined;
  
  // Demo
  loadExample: () => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      entities: [],
      relationships: [],
      entityGroups: [],
      tables: [],
      foreignKeys: [],
      nodeLayouts: {},
      tableLayouts: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedId: null,
      multiSelectedEntityIds: [],
      viewMode: 'conceptual',
      colorMode: 'dark',
      showEntityOverlay: false,

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
        set((state) => ({
          entityGroups: [...state.entityGroups, newGroup],
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
        set((state) => ({
          entityGroups: state.entityGroups.map((g) =>
            g.id === groupId && !g.entityIds.includes(entityId)
              ? { ...g, entityIds: [...g.entityIds, entityId] }
              : g
          ),
        }));
      },

      removeEntityFromGroup: (groupId, entityId) => {
        set((state) => ({
          entityGroups: state.entityGroups.map((g) =>
            g.id === groupId
              ? { ...g, entityIds: g.entityIds.filter((id) => id !== entityId) }
              : g
          ),
        }));
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
        const entity = get().entities.find(e => e.id === entityId);
        const existingTables = get().tables.filter(t => t.entityId === entityId);
        const suffix = existingTables.length > 0 ? `_${existingTables.length + 1}` : '';
        
        const newTable: PhysicalTable = {
          id,
          entityId,
          name: entity ? `${entity.name.toLowerCase().replace(/\s+/g, '_')}${suffix}` : `table${suffix}`,
          attributes: [],
        };
        
        // Position table based on entity layout or offset from existing tables
        const entityLayout = get().nodeLayouts[entityId];
        const x = entityLayout ? entityLayout.x + existingTables.length * 50 : 100 + Math.random() * 50;
        const y = entityLayout ? entityLayout.y + existingTables.length * 30 : 100 + Math.random() * 50;

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
          return {
            tables: newTables,
            foreignKeys: newForeignKeys,
            tableLayouts: newTableLayouts,
            selectedId: state.selectedId === id ? null : state.selectedId,
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
      
      setTablePosition: (id, x, y) => {
        set((state) => ({
          tableLayouts: {
            ...state.tableLayouts,
            [id]: { ...state.tableLayouts[id], x, y },
          },
        }));
      },

      setViewport: (viewport) => set({ viewport }),
      
      setSelected: (id) => set({ selectedId: id, multiSelectedEntityIds: [] }),
      
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
      
      clearMultiSelection: () => set({ multiSelectedEntityIds: [] }),
      
      setViewMode: (mode) => set({ viewMode: mode, multiSelectedEntityIds: [] }),
      
      setColorMode: (mode) => set({ colorMode: mode }),
      
      setShowEntityOverlay: (show) => set({ showEntityOverlay: show }),

      autoLayout: () => {
        const { entities, relationships, tables, foreignKeys, viewMode, showEntityOverlay } = get();
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        if (viewMode === 'conceptual') {
          dagreGraph.setGraph({ 
            rankdir: 'LR',
            nodesep: 80,
            ranksep: 120,
            marginx: 120,
            marginy: 120,
          });

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
            dagreGraph.setGraph({ 
              rankdir: 'LR',
              nodesep: 200,
              ranksep: 400,
              marginx: 120,
              marginy: 120,
            });

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
              if (fromTable && toTable && fromTable.entityId !== toTable.entityId) {
                dagreGraph.setEdge(fromTable.entityId, toTable.entityId);
              }
            });

            dagre.layout(dagreGraph);

            // Position tables within their entity groups
            const newTableLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>> = {};
            const newNodeLayouts: Record<string, Omit<NodeLayout, 'entityId' | 'tableId'>> = { ...get().nodeLayouts };
            
            entities.forEach((entity) => {
              const nodeWithPosition = dagreGraph.node(entity.id);
              if (!nodeWithPosition) return;
              
              const entityX = nodeWithPosition.x - nodeWithPosition.width / 2;
              const entityY = nodeWithPosition.y - nodeWithPosition.height / 2;
              
              // Store entity position for empty entities
              newNodeLayouts[entity.id] = { x: entityX, y: entityY };
              
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

            set({ tableLayouts: newTableLayouts, nodeLayouts: newNodeLayouts });
          } else {
            // Standard table layout without entity grouping
            dagreGraph.setGraph({ 
              rankdir: 'LR',
              nodesep: 150,
              ranksep: 300,
              marginx: 120,
              marginy: 120,
            });

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
          },
          {
            id: uuidv4(),
            fromTableId: loansTableId,
            toTableId: booksTableId,
            fromAttributeId: loanBookFKId,
            toAttributeId: bookPKId,
            fromCardinality: '0..*',
            toCardinality: '1',
          },
        ];

        set({
          entities: [entityBorrower, entityLoans, entityBooks],
          relationships,
          entityGroups: [], // Clear any existing groups
          tables: [borrowerTable, loansTable, booksTable],
          foreignKeys,
          nodeLayouts: {},
          tableLayouts: {},
          viewport: { x: 0, y: 0, zoom: 1 },
          selectedId: null,
          multiSelectedEntityIds: [],
          viewMode: 'conceptual'
        });
        
        // Apply auto-layout for conceptual view
        get().autoLayout();
        
        // Apply auto-layout for physical view
        set({ viewMode: 'physical' });
        get().autoLayout();
        
        // Switch back to conceptual view
        set({ viewMode: 'conceptual' });
      }
    }),
    {
      name: 'sqlmodel-storage',
    }
  )
);
