import { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, { 
  Background, 
  ConnectionMode,
  ReactFlowProvider,
  SimpleBezierEdge,
  useReactFlow,
} from 'reactflow';
import type { 
  Connection, 
  Edge, 
  Node, 
  NodeChange, 
  EdgeChange, 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useModelStore } from '../store/useModelStore';
import EntityNode from './nodes/EntityNode';
import TableNode from './nodes/TableNode';
import EntityGroupNode from './nodes/EntityGroupNode';
import ConceptualGroupNode from './nodes/ConceptualGroupNode';
import { MarkerDefs } from './MarkerDefs';
import { CanvasControls } from './CanvasControls';
import { ConfirmationDialog } from './ui/ConfirmationDialog';
import { AddTableDialog } from './ui/AddTableDialog';
import { AISettingsDialog } from './ui/AISettingsDialog';
import { ContextMenu, type ContextMenuItem } from './ui/ContextMenu';
import { Plus, Trash2, Copy, ArrowDownUp, Group, Pencil, Code } from 'lucide-react';

const nodeTypes = {
  entity: EntityNode,
  table: TableNode,
  entityGroup: EntityGroupNode,
  conceptualGroup: ConceptualGroupNode,
};

const edgeTypes = {
  curved: SimpleBezierEdge,
};

const CanvasInner = () => {
  const reactFlowInstance = useReactFlow();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'entity' | 'table' | 'relationship' | 'foreignKey' | 'entityGroup';
    id: string;
    name?: string;
  }>({ isOpen: false, type: 'entity', id: '' });

  const [editingEdge, setEditingEdge] = useState<{
    id: string;
    label: string;
    position: { x: number; y: number };
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    type: 'canvas' | 'entity' | 'table' | 'relationship' | 'foreignKey' | 'group' | 'entityGroup';
    targetId?: string;
  }>({ isOpen: false, position: { x: 0, y: 0 }, type: 'canvas' });

  const [dragHoverGroupId, setDragHoverGroupId] = useState<string | null>(null);
  const [dragHoverEntityGroupId, setDragHoverEntityGroupId] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<typeof tables[0] | undefined>(undefined);
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  const [showAISettingsDialog, setShowAISettingsDialog] = useState(false);

  const { 
    entities, 
    relationships, 
    entityGroups,
    tables,
    foreignKeys,
    nodeLayouts,
    tableLayouts,
    viewport, 
    viewMode,
    colorMode,
    showEntityOverlay,
    tableFieldsDisplay,
    multiSelectedEntityIds,
    multiSelectedTableIds,
    hiddenEntityIds,
    hiddenTableIds,
    
    addEntity,
    addEntityGroup,
    addTable,
    updateTable,
    addRelationship,
    updateRelationship,
    deleteEntity,
    deleteRelationship,
    deleteEntityGroup,
    deleteTable,
    deleteForeignKey,
    updateForeignKey,
    setNodePosition,
    setTablePosition,
    setViewport,
    setSelected,
    selectedId,
    clearMultiSelection,
    autoLayout,
    addEntityToGroup,
    removeEntityFromGroup,
    setNavigateToNodeCallback,
  } = useModelStore();

  // Register navigation callback for sidebar
  useEffect(() => {
    const navigateToNode = (nodeId: string) => {
      const node = reactFlowInstance.getNode(nodeId);
      if (node) {
        reactFlowInstance.setCenter(node.position.x + (node.width || 200) / 2, node.position.y + (node.height || 100) / 2, {
          zoom: 0.7,
          duration: 400,
        });
      }
    };
    setNavigateToNodeCallback(navigateToNode);
    return () => setNavigateToNodeCallback(null);
  }, [reactFlowInstance, setNavigateToNodeCallback]);

  // Ensure hiddenEntityIds and hiddenTableIds are Sets (fallback for localStorage migration)
  const safeHiddenEntityIds = hiddenEntityIds instanceof Set ? hiddenEntityIds : new Set(hiddenEntityIds || []);
  const safeHiddenTableIds = hiddenTableIds instanceof Set ? hiddenTableIds : new Set(hiddenTableIds || []);

  // Compute all transitively connected entity IDs (for conceptual view)
  const connectedEntityIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    
    // Check if selectedId is an entity
    const isEntity = entities.some(e => e.id === selectedId);
    // Check if selectedId is an entity group
    const isGroup = entityGroups.some(g => g.id === selectedId);
    
    if (!isEntity && !isGroup) return new Set<string>();
    
    const connected = new Set<string>();
    const queue: string[] = [];
    
    if (isEntity) {
      queue.push(selectedId);
    } else if (isGroup) {
      // Add all entities in this group to the queue
      const group = entityGroups.find(g => g.id === selectedId);
      if (group) {
        group.entityIds.forEach(entityId => queue.push(entityId));
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (connected.has(current)) continue;
      connected.add(current);
      
      // Find all entities connected via relationships (both directions)
      relationships.forEach(rel => {
        if (rel.fromEntityId === current && !connected.has(rel.toEntityId)) {
          queue.push(rel.toEntityId);
        }
        if (rel.toEntityId === current && !connected.has(rel.fromEntityId)) {
          queue.push(rel.fromEntityId);
        }
      });
    }
    
    return connected;
  }, [selectedId, entities, relationships, entityGroups]);

  // Snapping helper function
  const snapToGrid = useCallback((x: number, y: number, snapSize: number = 20) => {
    return {
      x: Math.round(x / snapSize) * snapSize,
      y: Math.round(y / snapSize) * snapSize,
    };
  }, []);

  // Compute all transitively connected table IDs (downstream from selected table or entity)
  const connectedTableIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    
    // Check if selectedId is a table
    const isTable = tables.some(t => t.id === selectedId);
    // Check if selectedId is an entity (in physical view with overlay)
    const isEntity = viewMode === 'physical' && showEntityOverlay && entities.some(e => e.id === selectedId);
    
    if (!isTable && !isEntity) return new Set<string>();
    
    const connected = new Set<string>();
    const queue: string[] = [];
    
    if (isTable) {
      queue.push(selectedId);
    } else if (isEntity) {
      // Add all tables belonging to this entity to the queue
      const entityTables = tables.filter(t => t.entityId === selectedId);
      entityTables.forEach(t => queue.push(t.id));
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (connected.has(current)) continue;
      connected.add(current);
      
      // Find all tables connected via FK (both directions)
      foreignKeys.forEach(fk => {
        if (fk.fromTableId === current && !connected.has(fk.toTableId)) {
          queue.push(fk.toTableId);
        }
        if (fk.toTableId === current && !connected.has(fk.fromTableId)) {
          queue.push(fk.fromTableId);
        }
      });
    }
    
    return connected;
  }, [selectedId, tables, foreignKeys, viewMode, showEntityOverlay, entities]);

  // Build nodes based on view mode
  const nodes: Node[] = useMemo(() => {
    if (viewMode === 'conceptual') {
      // Filter out hidden entities
      const visibleEntities = entities.filter(e => !safeHiddenEntityIds.has(e.id));
      
      // Entity nodes - higher z-index so they're always clickable above groups
      const entityNodes = visibleEntities.map(e => {
        const isMultiSelected = multiSelectedEntityIds.includes(e.id);
        // Only mark as selected if it's either multi-selected OR single-selected (but not both)
        const isSingleSelected = !isMultiSelected && selectedId === e.id;
        return {
          id: e.id,
          type: 'entity',
          position: nodeLayouts[e.id] || { x: 0, y: 0 },
          data: e,
          selected: isMultiSelected || isSingleSelected,
          selectable: true,
          draggable: true,
          zIndex: 10, // Higher than group nodes (which have -1)
        };
      });

      // Entity group nodes (background)
      const groupNodes: Node[] = entityGroups.map(group => {
        const leftPadding = 40; // Left padding (smaller due to label)
        const rightPadding = 80; // Right padding
        const headerPadding = 70; // Extra space at top for label
        const bottomPadding = 60; // Bottom padding
        
        // Check if group has a stored layout (from manual positioning/resizing)
        const storedGroupLayout = nodeLayouts[group.id];
        
        // Calculate bounding box for all entities in the group
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasEntities = false;
        
        group.entityIds.forEach(entityId => {
          const layout = nodeLayouts[entityId];
          if (layout) {
            hasEntities = true;
            // Use stored dimensions or defaults
            const entityWidth = layout.width || 220;
            const entityHeight = layout.height || 120;
            
            minX = Math.min(minX, layout.x);
            minY = Math.min(minY, layout.y);
            maxX = Math.max(maxX, layout.x + entityWidth);
            maxY = Math.max(maxY, layout.y + entityHeight);
          }
        });

        // Determine group position and size
        let groupX, groupY, groupWidth, groupHeight;
        
        if (hasEntities) {
          const leftMostEntity = minX;
          const topMostEntity = minY;
          const rightMostEntity = maxX;
          const bottomMostEntity = maxY;
          
          // Group position is always calculated from entity positions
          // No stored position is used - it follows the entities
          groupX = leftMostEntity - leftPadding;
          groupY = topMostEntity - headerPadding;
          groupWidth = (rightMostEntity - leftMostEntity) + leftPadding + rightPadding;
          groupHeight = (bottomMostEntity - topMostEntity) + headerPadding + bottomPadding;
        } else if (storedGroupLayout) {
          // Empty group with stored position/size
          groupX = storedGroupLayout.x;
          groupY = storedGroupLayout.y;
          groupWidth = storedGroupLayout.width || 360;
          groupHeight = storedGroupLayout.height || 180;
        } else {
          // Empty group without stored position (shouldn't happen)
          groupX = 100;
          groupY = 100;
          groupWidth = 360;
          groupHeight = 180;
        }

        // Only use passthrough class if group has entities (to allow clicking entities inside)
        // Empty groups should be fully interactive for dragging
        const hasEntitiesInGroup = group.entityIds.length > 0 && group.entityIds.some(id => nodeLayouts[id]);

        return {
          id: group.id,
          type: 'conceptualGroup',
          position: { x: groupX, y: groupY },
          data: {
            ...group,
            width: groupWidth,
            height: groupHeight,
            hasEntities: hasEntitiesInGroup, // Flag for whether group has entities
            isDropTarget: dragHoverGroupId === group.id, // Highlight when entity is dragged over
          },
          zIndex: hasEntitiesInGroup ? -1 : 1, // Empty groups need positive z-index but lower than entities
          selectable: true, // Always allow selection
          draggable: true,
          selected: selectedId === group.id,
          dragHandle: hasEntitiesInGroup ? '.conceptual-group-drag-handle' : undefined,
          className: hasEntitiesInGroup ? 'group-node-passthrough' : '', // Only passthrough if has entities
          // For empty groups, allow dropping entities onto them
          ...((!hasEntitiesInGroup) && {
            style: { pointerEvents: 'all' }
          }),
        };
      });

      // Return group nodes first (lower z-index), then entity nodes on top
      return [...groupNodes, ...entityNodes];
    } else {
      // Filter out hidden tables
      const visibleTables = tables.filter(t => !safeHiddenTableIds.has(t.id));
      
      // Tables are always positioned absolutely (not relative to groups)
      const tableNodes = visibleTables.map(t => {
        const isMultiSelected = multiSelectedTableIds.includes(t.id);
        const isSingleSelected = !isMultiSelected && selectedId === t.id;
        return {
          id: t.id,
          type: 'table',
          position: tableLayouts[t.id] || { x: 0, y: 0 },
          data: t,
          selected: isMultiSelected || isSingleSelected,
          draggable: true,
          zIndex: 5, // Below edges (10) but above entity groups (-1)
        };
      });

      if (!showEntityOverlay) {
        return tableNodes;
      }

      // Create entity group nodes as background containers (independent positioning)
      const entityGroupNodes: Node[] = entities.map(entity => {
        // Find all visible tables belonging to this entity
        const entityTables = visibleTables.filter(t => t.entityId === entity.id);
        
        if (entityTables.length === 0) {
          // No tables yet - create a placeholder group at entity's conceptual position
          const conceptualPos = nodeLayouts[entity.id] || { x: 0, y: 0 };
          return {
            id: `${entity.id}-group`,
            type: 'entityGroup',
            position: conceptualPos,
            data: {
              entityId: entity.id,
              entityName: entity.name,
              entityDescription: entity.description,
              entityColor: entity.color,
              width: 280,
              height: 120,
              isDropTarget: dragHoverEntityGroupId === entity.id,
            },
            zIndex: -1,
            selectable: true,
            draggable: true,
            dragHandle: '.entity-group-drag-handle',
            selected: selectedId === entity.id,
          };
        }

        // Calculate bounding box for all tables in this entity
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        entityTables.forEach(table => {
          const layout = tableLayouts[table.id];
          if (!layout) return; // Skip tables without layout
          
          const tableWidth = 240;
          // Calculate table height based on display mode
          let tableHeight;
          if (tableFieldsDisplay === 'name') {
            // Header only - just title bar
            tableHeight = 44;
          } else if (tableFieldsDisplay === 'keys') {
            // Header + key fields only
            const keyCount = table.attributes.filter(a => a.isPrimaryKey || a.isForeignKey).length;
            tableHeight = 44 + (keyCount * 32) + 20;
          } else {
            // All fields
            tableHeight = 44 + (table.attributes.length * 32) + 20;
          }
          
          minX = Math.min(minX, layout.x);
          minY = Math.min(minY, layout.y);
          maxX = Math.max(maxX, layout.x + tableWidth);
          maxY = Math.max(maxY, layout.y + tableHeight);
        });

        // If no tables have layouts yet, treat like empty entity group
        if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
          const conceptualPos = nodeLayouts[entity.id] || { x: 0, y: 0 };
          return {
            id: `${entity.id}-group`,
            type: 'entityGroup',
            position: conceptualPos,
            data: {
              entityId: entity.id,
              entityName: entity.name,
              entityDescription: entity.description,
              entityColor: entity.color,
              width: 280,
              height: 120,
              isDropTarget: dragHoverEntityGroupId === entity.id,
            },
            zIndex: -1,
            selectable: true,
            draggable: true,
            dragHandle: '.entity-group-drag-handle',
            selected: selectedId === entity.id,
          };
        }

        const padding = 30; // Padding around tables
        const headerPadding = 50; // Extra space at top for entity label

        return {
          id: `${entity.id}-group`,
          type: 'entityGroup',
          position: { x: minX - padding, y: minY - headerPadding },
          data: {
            entityId: entity.id,
            entityName: entity.name,
            entityDescription: entity.description,
            entityColor: entity.color,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding + headerPadding + 16,
            isDropTarget: dragHoverEntityGroupId === entity.id,
          },
          zIndex: -1,
          selectable: true,
          draggable: true,
          dragHandle: '.entity-group-drag-handle',
          selected: selectedId === entity.id,
        };
      }).filter(Boolean);

      // Return group nodes first (lower z-index), then table nodes on top
      return [...entityGroupNodes, ...tableNodes];
    }
  }, [entities, entityGroups, tables, nodeLayouts, tableLayouts, selectedId, viewMode, showEntityOverlay, tableFieldsDisplay, multiSelectedEntityIds, multiSelectedTableIds, dragHoverEntityGroupId, dragHoverGroupId, hiddenEntityIds, hiddenTableIds]);

  // Build edges based on view mode
  const edges: Edge[] = useMemo(() => {
    if (viewMode === 'conceptual') {
      // Filter out relationships where either entity is hidden
      return relationships
        .filter(r => !safeHiddenEntityIds.has(r.fromEntityId) && !safeHiddenEntityIds.has(r.toEntityId))
        .map(r => {
        let sourceHandle = r.sourceHandle || null;
        let targetHandle = r.targetHandle || null;

        // Smart handle selection based on relative positions
        const sourceNode = nodeLayouts[r.fromEntityId];
        const targetNode = nodeLayouts[r.toEntityId];
        
        if (sourceNode && targetNode) {
          const sourceCenterX = sourceNode.x + 110;
          const sourceCenterY = sourceNode.y + 60;
          const targetCenterX = targetNode.x + 110;
          const targetCenterY = targetNode.y + 60;
          
          const dx = targetCenterX - sourceCenterX;
          const dy = targetCenterY - sourceCenterY;
          
          if (!r.sourceHandle) {
            if (Math.abs(dx) > Math.abs(dy)) {
              sourceHandle = dx > 0 ? 'right-s' : 'left-s';
            } else {
              sourceHandle = dy > 0 ? 'bottom-s' : 'top-s';
            }
          } else {
            sourceHandle = r.sourceHandle;
          }
          
          if (!r.targetHandle) {
            if (Math.abs(dx) > Math.abs(dy)) {
              targetHandle = dx > 0 ? 'left' : 'right';
            } else {
              targetHandle = dy > 0 ? 'top' : 'bottom';
            }
          } else {
            targetHandle = r.targetHandle;
          }
        }

        // Check if this relationship is connected to the selected entity (transitively)
        const isConnectedToSelected = connectedEntityIds.has(r.fromEntityId) && connectedEntityIds.has(r.toEntityId);
        const isEdgeSelected = selectedId === r.id;
        
        // Default line color: grey in dark mode, darker grey in light mode
        const defaultColor = colorMode === 'dark' ? '#4b5563' : '#9ca3af';
        
        return {
          id: r.id,
          source: r.fromEntityId,
          target: r.toEntityId,
          label: r.label,
          sourceHandle,
          targetHandle,
          type: 'curved',
          markerEnd: `url(#marker-${r.toCardinality})`,
          markerStart: `url(#marker-${r.fromCardinality})`,
          selected: isEdgeSelected,
          className: (isConnectedToSelected || isEdgeSelected) ? 'pulse' : '',
          data: r,
          interactionWidth: 20,
          style: {
            stroke: (isEdgeSelected || isConnectedToSelected) ? '#4ade80' : defaultColor,
            strokeWidth: (isEdgeSelected || isConnectedToSelected) ? 2.5 : 2,
          },
          labelStyle: {
            fontSize: '12px',
            fontWeight: 500,
            fill: colorMode === 'dark' ? '#94a3b8' : '#475569',
          },
          labelBgStyle: {
            fill: colorMode === 'dark' ? '#0d1117' : '#ffffff',
            fillOpacity: 0.9,
          },
        };
      });
    } else {
      // Physical view: FK edges with smart routing
      const tableFieldsDisplay = useModelStore.getState().tableFieldsDisplay;
      
      // Filter out foreign keys where either table is hidden
      return foreignKeys
        .filter(fk => !safeHiddenTableIds.has(fk.fromTableId) && !safeHiddenTableIds.has(fk.toTableId))
        .map(fk => {
        // Determine which side handles to use based on table positions
        const sourceTable = tableLayouts[fk.fromTableId];
        const targetTable = tableLayouts[fk.toTableId];
        
        let sourceHandle: string;
        let targetHandle: string;
        
        // Use table-level handles when fields are hidden
        const useTableHandles = tableFieldsDisplay === 'name';
        
        // Smart handle selection based on relative positions
        // Source = table with FK column, Target = table with PK being referenced
        if (sourceTable && targetTable) {
          const sourceRight = sourceTable.x + 220; // Right edge of source table
          const targetLeft = targetTable.x; // Left edge of target table
          const sourceLeft = sourceTable.x;
          const targetRight = targetTable.x + 220;
          
          // Determine optimal exit/entry sides
          if (targetLeft >= sourceRight - 20) {
            // Target is to the right of source
            sourceHandle = useTableHandles ? 'table-source-right' : `source-${fk.fromAttributeId}`;
            targetHandle = useTableHandles ? 'table-target-left' : `target-${fk.toAttributeId}`;
          } else if (sourceLeft >= targetRight - 20) {
            // Target is to the left of source
            sourceHandle = useTableHandles ? 'table-source-left' : `source-left-${fk.fromAttributeId}`;
            targetHandle = useTableHandles ? 'table-target-right' : `target-right-${fk.toAttributeId}`;
          } else {
            // Tables are overlapping horizontally - use vertical positioning
            const sourceY = sourceTable.y;
            const targetY = targetTable.y;
            if (targetY < sourceY) {
              // Target is above - exit left, enter right (or vice versa based on x)
              if (useTableHandles) {
                sourceHandle = sourceTable.x < targetTable.x ? 'table-source-right' : 'table-source-left';
                targetHandle = sourceTable.x < targetTable.x ? 'table-target-left' : 'table-target-right';
              } else {
                sourceHandle = sourceTable.x < targetTable.x 
                  ? `source-${fk.fromAttributeId}` 
                  : `source-left-${fk.fromAttributeId}`;
                targetHandle = sourceTable.x < targetTable.x 
                  ? `target-${fk.toAttributeId}` 
                  : `target-right-${fk.toAttributeId}`;
              }
            } else {
              if (useTableHandles) {
                sourceHandle = sourceTable.x < targetTable.x ? 'table-source-right' : 'table-source-left';
                targetHandle = sourceTable.x < targetTable.x ? 'table-target-left' : 'table-target-right';
              } else {
                sourceHandle = sourceTable.x < targetTable.x 
                  ? `source-${fk.fromAttributeId}` 
                  : `source-left-${fk.fromAttributeId}`;
                targetHandle = sourceTable.x < targetTable.x 
                  ? `target-${fk.toAttributeId}` 
                  : `target-right-${fk.toAttributeId}`;
              }
            }
          }
        } else {
          // Fallback
          sourceHandle = useTableHandles ? 'table-source-right' : `source-${fk.fromAttributeId}`;
          targetHandle = useTableHandles ? 'table-target-left' : `target-${fk.toAttributeId}`;
        }
        
        // Check if this FK is connected to the selected table (transitively)
        const isConnectedToSelected = connectedTableIds.has(fk.fromTableId) && connectedTableIds.has(fk.toTableId);
        const isEdgeSelected = selectedId === fk.id;
        
        // Default line color: grey in dark mode, darker grey in light mode
        const defaultColor = colorMode === 'dark' ? '#4b5563' : '#9ca3af';
        
        return {
          id: fk.id,
          source: fk.fromTableId,
          target: fk.toTableId,
          sourceHandle,
          targetHandle,
          type: fk.edgeType || 'curved',
          pathOptions: fk.edgeType === 'smoothstep' ? { borderRadius: 120 } : undefined,
          markerEnd: `url(#marker-${fk.toCardinality})`,
          markerStart: `url(#marker-${fk.fromCardinality})`,
          selected: isEdgeSelected,
          className: (isConnectedToSelected || isEdgeSelected) ? 'pulse' : '',
          data: fk,
          interactionWidth: 20,
          zIndex: 10, // Put edges on top of tables
          style: {
            stroke: (isEdgeSelected || isConnectedToSelected) ? '#4ade80' : defaultColor,
            strokeWidth: (isEdgeSelected || isConnectedToSelected) ? 2.5 : 2,
          },
          labelStyle: {
            fontSize: '16px',
            fontWeight: 600,
            fill: '#22c55e',
            cursor: 'context-menu',
          },
          labelBgStyle: {
            fill: colorMode === 'dark' ? '#1e293b' : '#ffffff',
            fillOpacity: 0.95,
            stroke: '#22c55e',
            strokeWidth: 1.5,
          },
          labelBgPadding: [6, 8],
          labelBgBorderRadius: 6,
        };
      });
    }
  }, [relationships, foreignKeys, selectedId, viewMode, nodeLayouts, tableLayouts, connectedEntityIds, connectedTableIds, colorMode, tableFieldsDisplay, hiddenEntityIds, hiddenTableIds]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(change => {
      if ('id' in change) {
        console.log('[Canvas] onNodesChange - change:', change.type, 'id:', change.id, 'dragging:', (change as any).dragging);
      }
      if (change.type === 'position' && change.position) {
        // Check if this is an entity group node
        const isEntityGroup = change.id.endsWith('-group');
        const isConceptualGroup = entityGroups.some(g => g.id === change.id);
        
        if (isConceptualGroup) {
          // For conceptual groups, move all entities within the group
          const group = entityGroups.find(g => g.id === change.id);
          if (group) {
            if (group.entityIds.length > 0) {
              // Group has entities - move all entities, don't update group position
              const currentGroupNode = nodes.find(n => n.id === change.id);
              if (currentGroupNode) {
                const deltaX = change.position.x - currentGroupNode.position.x;
                const deltaY = change.position.y - currentGroupNode.position.y;
                
                // Apply delta to all entities in this group
                group.entityIds.forEach(entityId => {
                  const currentLayout = nodeLayouts[entityId];
                  if (currentLayout) {
                    const newX = currentLayout.x + deltaX;
                    const newY = currentLayout.y + deltaY;
                    
                    if (change.dragging === false) {
                      const snapped = snapToGrid(newX, newY);
                      setNodePosition(entityId, snapped.x, snapped.y);
                    } else {
                      setNodePosition(entityId, newX, newY);
                    }
                  }
                });
              }
              // IMPORTANT: Don't update the group's position - it recalculates from entities
              return;
            } else {
              // Empty group - store its own position in nodeLayouts
              // Store the position directly as React Flow provides it (already the visual position)
              if (change.dragging === false) {
                const snapped = snapToGrid(change.position.x, change.position.y);
                setNodePosition(change.id, snapped.x, snapped.y);
              } else {
                setNodePosition(change.id, change.position.x, change.position.y);
              }
            }
          }
          return;
        } else if (isEntityGroup) {
          // For entity groups, we need to move all tables within the group
          const entityId = change.id.replace('-group', '');
          const entityTables = tables.filter(t => t.entityId === entityId);
          
          if (entityTables.length > 0) {
            // Calculate the delta from current position
            const currentGroupNode = nodes.find(n => n.id === change.id);
            if (currentGroupNode) {
              const deltaX = change.position.x - currentGroupNode.position.x;
              const deltaY = change.position.y - currentGroupNode.position.y;
              
              // Apply delta to all tables in this entity
              entityTables.forEach(table => {
                const currentLayout = tableLayouts[table.id];
                if (currentLayout) {
                  const newX = currentLayout.x + deltaX;
                  const newY = currentLayout.y + deltaY;
                  
                  if (change.dragging === false) {
                    const snapped = snapToGrid(newX, newY);
                    setTablePosition(table.id, snapped.x, snapped.y);
                  } else {
                    setTablePosition(table.id, newX, newY);
                  }
                }
              });
            }
          } else {
            // Empty entity group - store position in nodeLayouts using entity ID
            if (change.dragging === false) {
              const snapped = snapToGrid(change.position.x, change.position.y);
              setNodePosition(entityId, snapped.x, snapped.y);
            } else {
              setNodePosition(entityId, change.position.x, change.position.y);
            }
          }
        } else {
          // Apply snapping when dragging is complete
          if (change.dragging === false) {
            const snapped = snapToGrid(change.position.x, change.position.y);
            if (viewMode === 'conceptual') {
              setNodePosition(change.id, snapped.x, snapped.y);
            } else {
              setTablePosition(change.id, snapped.x, snapped.y);
            }
          } else if (change.dragging === true || change.dragging === undefined) {
            // Allow free movement while dragging
            if (viewMode === 'conceptual') {
              setNodePosition(change.id, change.position.x, change.position.y);
            } else {
              setTablePosition(change.id, change.position.x, change.position.y);
            }
          }
        }
      }
      if (change.type === 'select') {
        // Handle entity group selection - select the entity instead
        if (change.id.endsWith('-group')) {
          const entityId = change.id.replace('-group', '');
          if (change.selected) setSelected(entityId);
          else if (!change.selected && selectedId === entityId) setSelected(null);
        } else {
          // Handle normal selection (entities, relationships, conceptual groups, etc.)
          const isEntity = entities.some(e => e.id === change.id);
          
          if (isEntity && viewMode === 'conceptual') {
            // For entities in conceptual view, only update our store if it differs
            // This prevents React Flow's multi-select from overriding our single-select logic
            if (change.selected && selectedId !== change.id && !multiSelectedEntityIds.length) {
              // Only select if not already handling multi-selection
              setSelected(change.id);
            } else if (!change.selected && change.id === selectedId) {
              setSelected(null);
            }
            return;
          }
          
          if (change.selected) setSelected(change.id);
          else if (!change.selected && change.id === selectedId) {
               setSelected(null);
          }
        }
      }
    });
  }, [setNodePosition, setTablePosition, setSelected, selectedId, viewMode, snapToGrid, tables, nodes, tableLayouts, entityGroups, entities, addEntityToGroup, dragHoverGroupId, multiSelectedEntityIds, nodeLayouts]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
      changes.forEach(change => {
          if (change.type === 'select') {
              if (change.selected) setSelected(change.id);
              else if (!change.selected && change.id === selectedId) setSelected(null);
          }
      });
  }, [setSelected, selectedId]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      if (params.source === params.target) {
        if (!confirm('Do you really want to create a self-reference?')) {
          return;
        }
      }
      if (viewMode === 'conceptual') {
        addRelationship(params.source, params.target);
      }
      // For physical view, FK connections are handled via TableNode drag interactions
    }
  }, [addRelationship, viewMode]);

  const onNodeDrag = useCallback((_: any, node: any) => {
    // Conceptual view: track entities being dragged over entity groups
    if (viewMode === 'conceptual' && entities.some(e => e.id === node.id)) {
      // Check if entity is over any group
      const entityX = node.position.x + 110; // Entity center
      const entityY = node.position.y + 60;

      console.log('[Canvas] onNodeDrag - entity:', node.id, 'position:', entityX, entityY);
      const hoveredGroup = entityGroups.find(group => {
      // Skip if entity is already in this group
      if (group.entityIds.includes(node.id)) return false;

      // Calculate group bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let hasEntities = false;

      group.entityIds.forEach(entityId => {
        const layout = nodeLayouts[entityId];
        if (layout) {
          hasEntities = true;
          const entityWidth = layout.width || 220;
          const entityHeight = layout.height || 120;
          minX = Math.min(minX, layout.x);
          minY = Math.min(minY, layout.y);
          maxX = Math.max(maxX, layout.x + entityWidth);
          maxY = Math.max(maxY, layout.y + entityHeight);
        }
      });

      // If no entities, use stored group position
      if (!hasEntities) {
        const storedPos = nodeLayouts[group.id];
        if (storedPos) {
          minX = storedPos.x;
          minY = storedPos.y;
          maxX = storedPos.x + 360;
          maxY = storedPos.y + 180;
        } else {
          return false;
        }
      }

      const leftPadding = 40;
      const rightPadding = 80;
      const headerPadding = 70;
      const bottomPadding = 60;
      const groupX = minX - leftPadding;
      const groupY = minY - headerPadding;
      const groupWidth = maxX - minX + leftPadding + rightPadding;
      const groupHeight = maxY - minY + bottomPadding + headerPadding;

      // Check if entity center is within group bounds
      return entityX >= groupX && entityX <= groupX + groupWidth &&
             entityY >= groupY && entityY <= groupY + groupHeight;
    });

    console.log('[Canvas] Hover state changing to:', hoveredGroup?.id || null);
    setDragHoverGroupId(hoveredGroup?.id || null);
    return;
  }

  // Physical view with entity overlay: track tables being dragged over entity groups
  if (viewMode === 'physical' && showEntityOverlay && tables.some(t => t.id === node.id)) {
    const tableX = node.position.x + 110; // Table center
    const tableY = node.position.y + 60;

    // Check if table is over any entity group
    const hoveredEntityId = entities.find(entity => {
      const entityTables = tables.filter(t => t.entityId === entity.id);
      
      if (entityTables.length === 0) {
        // Empty entity group - use stored position
        const storedPos = nodeLayouts[entity.id];
        if (storedPos) {
          const groupX = storedPos.x || 0;
          const groupY = storedPos.y || 0;
          const groupWidth = 280;
          const groupHeight = 120;
          
          return tableX >= groupX && tableX <= groupX + groupWidth &&
                 tableY >= groupY && tableY <= groupY + groupHeight;
        }
        return false;
      }

      // Calculate entity group bounds from its tables
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      entityTables.forEach(table => {
        const layout = tableLayouts[table.id] || { x: 0, y: 0 };
        const tableWidth = 240;
        const tableHeight = 40 + (table.attributes.length * 30) + 40;
        
        minX = Math.min(minX, layout.x);
        minY = Math.min(minY, layout.y);
        maxX = Math.max(maxX, layout.x + tableWidth);
        maxY = Math.max(maxY, layout.y + tableHeight);
      });

      const padding = 40;
      const headerPadding = 60;
      const groupX = minX - padding;
      const groupY = minY - headerPadding;
      const groupWidth = maxX - minX + padding * 2;
      const groupHeight = maxY - minY + padding + headerPadding + 16;

      return tableX >= groupX && tableX <= groupX + groupWidth &&
             tableY >= groupY && tableY <= groupY + groupHeight;
    })?.id;

    console.log('[Canvas] Table drag over entity group:', hoveredEntityId || null);
    setDragHoverEntityGroupId(hoveredEntityId || null);
    return;
  }

  // Clear hover states if not dragging relevant items
  setDragHoverGroupId(null);
  setDragHoverEntityGroupId(null);
}, [viewMode, entities, entityGroups, nodeLayouts, tables, tableLayouts, showEntityOverlay]);

  const onNodeDragStop = useCallback((_: any, node: any) => {
    // Conceptual view: Handle entities dropped into entity groups
    if (viewMode === 'conceptual' && dragHoverGroupId) {
      const entity = entities.find(e => e.id === node.id);
      if (entity) {
        console.log('[Canvas] Drop detected - adding entity:', entity.id, 'to group:', dragHoverGroupId);
        addEntityToGroup(dragHoverGroupId, entity.id);
      }
    }

    // Physical view with entity overlay: Handle tables dropped into entity groups
    if (viewMode === 'physical' && showEntityOverlay && dragHoverEntityGroupId) {
      const table = tables.find(t => t.id === node.id);
      if (table) {
        console.log('[Canvas] Drop detected - assigning table:', table.id, 'to entity:', dragHoverEntityGroupId);
        updateTable(table.id, { entityId: dragHoverEntityGroupId });
      }
    }

    // Clear hover states after handling drop
    setDragHoverGroupId(null);
    setDragHoverEntityGroupId(null);
  }, [viewMode, dragHoverGroupId, dragHoverEntityGroupId, entities, tables, addEntityToGroup, updateTable, showEntityOverlay]);

  const onMoveEnd = useCallback((_: any, viewport: any) => {
    setViewport(viewport);
  }, [setViewport]);

  const onPaneClick = useCallback(() => {
    setSelected(null);
    clearMultiSelection();
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: 'canvas' });
  }, [setSelected, clearMultiSelection]);

  // Context menu handlers
  const handleContextMenu = useCallback((event: React.MouseEvent, nodeId?: string, nodeType?: 'entity' | 'table' | 'group' | 'entityGroup') => {
    event.preventDefault();
    event.stopPropagation();
    
    if (nodeId) {
      setSelected(nodeId);
      setContextMenu({
        isOpen: true,
        position: { x: event.clientX, y: event.clientY },
        type: nodeType || (viewMode === 'conceptual' ? 'entity' : 'table'),
        targetId: nodeId,
      });
    }
  }, [setSelected, viewMode]);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: any) => {
    event.preventDefault();
    event.stopPropagation();
    
    setSelected(edge.id);
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      type: viewMode === 'conceptual' ? 'relationship' : 'foreignKey',
      targetId: edge.id,
    });
  }, [setSelected, viewMode]);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      type: 'canvas',
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, type: 'canvas' });
  }, []);

  // Build context menu items based on type
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    const { type, targetId } = contextMenu;
    
    if (type === 'canvas') {
      return viewMode === 'conceptual'
        ? [
            { label: 'Add Entity', icon: <Plus size={14} />, onClick: () => addEntity() },
            { label: 'Add Group', icon: <Group size={14} />, onClick: () => addEntityGroup([], 'New Group') },
            { label: '', divider: true, onClick: () => {} },
            { label: 'Auto Layout', icon: <ArrowDownUp size={14} />, onClick: autoLayout, shortcut: '⌘L' },
          ]
        : [
            { label: 'Add Table', icon: <Plus size={14} />, onClick: () => setShowAddTableDialog(true) },
            { label: '', divider: true, onClick: () => {} },
            { label: 'Auto Layout', icon: <ArrowDownUp size={14} />, onClick: autoLayout, shortcut: '⌘L' },
          ];
    }

    if (type === 'entity' && targetId) {
      const entity = entities.find(e => e.id === targetId);
      const entityGroup = entityGroups.find(g => g.entityIds.includes(targetId));
      
      const menuItems: ContextMenuItem[] = [
        { label: 'Edit Entity', icon: <Pencil size={14} />, onClick: () => setSelected(targetId) },
        { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => {
          const newId = addEntity();
          if (entity) {
            const state = useModelStore.getState();
            state.updateEntity(newId, { name: `${entity.name} (copy)`, description: entity.description });
            const layout = nodeLayouts[targetId];
            if (layout) {
              setNodePosition(newId, layout.x + 40, layout.y + 40);
            }
          }
        }},
      ];
      
      // Add "Remove from Group" option if entity is in a group
      if (entityGroup) {
        menuItems.push(
          { label: '', divider: true, onClick: () => {} },
          { label: 'Remove from Group', icon: <Group size={14} />, onClick: () => {
            removeEntityFromGroup(entityGroup.id, targetId);
          }}
        );
      }
      
      menuItems.push(
        { label: '', divider: true, onClick: () => {} },
        { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => {
          setDeleteDialog({
            isOpen: true,
            type: 'entity',
            id: targetId,
            name: entity?.name,
          });
        }, danger: true, shortcut: '⌫' }
      );
      
      return menuItems;
    }

    if (type === 'table' && targetId) {
      const table = tables.find(t => t.id === targetId);
      
      return [
        { label: 'Edit Table', icon: <Pencil size={14} />, onClick: () => setSelected(targetId) },
        { label: 'Export SQL', icon: <Code size={14} />, onClick: () => {
          handleCloseContextMenu();
          if (table) {
            setEditingTable(table);
          }
        }},
        { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => {
          if (table) {
            const newId = addTable(table.entityId);
            const state = useModelStore.getState();
            state.updateTable(newId, { 
              name: `${table.name}_copy`,
              attributes: table.attributes.map(attr => ({
                ...attr,
                id: crypto.randomUUID(),
              })),
            });
            const layout = tableLayouts[targetId];
            if (layout) {
              setTablePosition(newId, layout.x + 40, layout.y + 40);
            }
          }
        }},
        { label: '', divider: true, onClick: () => {} },
        { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => {
          setDeleteDialog({
            isOpen: true,
            type: 'table',
            id: targetId,
            name: table?.name,
          });
        }, danger: true, shortcut: '⌫' },
      ];  
    }

    if (type === 'foreignKey' && targetId) {
      const fk = foreignKeys.find(f => f.id === targetId);
      const currentEdgeType = fk?.edgeType || 'curved';
      
      return [
        { label: 'Routing Style', onClick: () => {}, divider: false },
        { label: currentEdgeType === 'curved' ? '✓ Curved' : 'Curved', onClick: () => {
          updateForeignKey(targetId, { edgeType: 'curved' });
        }},
        { label: currentEdgeType === 'step' ? '✓ Step' : 'Step', onClick: () => {
          updateForeignKey(targetId, { edgeType: 'step' });
        }},
        { label: currentEdgeType === 'straight' ? '✓ Straight' : 'Straight', onClick: () => {
          updateForeignKey(targetId, { edgeType: 'straight' });
        }},
        { label: currentEdgeType === 'step' ? '✓ Step' : 'Step', onClick: () => {
          updateForeignKey(targetId, { edgeType: 'step' });
        }},
        { label: '', divider: true, onClick: () => {} },
        { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => {
          setDeleteDialog({
            isOpen: true,
            type: 'foreignKey',
            id: targetId,
          });
        }, danger: true, shortcut: '⌫' },
      ];
    }

    if (type === 'group' && targetId) {
      const group = entityGroups.find(g => g.id === targetId);
      return [
        { label: 'Edit Group', icon: <Pencil size={14} />, onClick: () => {
          setSelected(targetId);
          useModelStore.getState().setEditingGroupId(targetId);
        }},
        { label: '', divider: true, onClick: () => {} },
        { label: 'Delete Group', icon: <Trash2 size={14} />, onClick: () => {
          setDeleteDialog({
            isOpen: true,
            type: 'entityGroup',
            id: targetId,
            name: group?.name,
          });
        }, danger: true, shortcut: '⌫' },
      ];
    }

    // Physical view entity group (entity container in physical view)
    if (type === 'entityGroup' && targetId) {
      const entity = entities.find(e => e.id === targetId);
      const entityTables = tables.filter(t => t.entityId === targetId);
      const tableCount = entityTables.length;
      
      return [
        { label: 'Add Table', icon: <Plus size={14} />, onClick: () => {
          addTable(targetId);
        }},
        { label: '', divider: true, onClick: () => {} },
        { label: tableCount > 0 
            ? `Delete Entity (${tableCount} table${tableCount > 1 ? 's' : ''})` 
            : 'Delete Entity', 
          icon: <Trash2 size={14} />, 
          onClick: () => {
            setDeleteDialog({
              isOpen: true,
              type: 'entity',
              id: targetId,
              name: entity?.name,
            });
          }, 
          danger: true, 
          shortcut: '⌫' 
        },
      ];
    }

    return [];
  }, [contextMenu, viewMode, entities, tables, entityGroups, addEntity, addEntityGroup, addTable, autoLayout, setSelected, setNodePosition, setTablePosition, nodeLayouts, tableLayouts]);

  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (viewMode !== 'conceptual') return;
    
    event.stopPropagation();
    const relationship = relationships.find(r => r.id === edge.id);
    if (relationship) {
      setEditingEdge({
        id: edge.id,
        label: relationship.label || '',
        position: { x: event.clientX, y: event.clientY },
      });
    }
  }, [viewMode, relationships]);

  const handleSaveEdgeLabel = useCallback(() => {
    if (editingEdge) {
      updateRelationship(editingEdge.id, { label: editingEdge.label });
      setEditingEdge(null);
    }
  }, [editingEdge, updateRelationship]);

  const handleCancelEdgeEdit = useCallback(() => {
    setEditingEdge(null);
  }, []);

  const handleEdgeLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdgeLabel();
    } else if (e.key === 'Escape') {
      handleCancelEdgeEdit();
    }
  }, [handleSaveEdgeLabel, handleCancelEdgeEdit]);

  const handleConfirmDelete = useCallback(() => {
    const { type, id } = deleteDialog;
    
    switch (type) {
      case 'entity':
        deleteEntity(id);
        break;
      case 'table':
        deleteTable(id);
        break;
      case 'relationship':
        deleteRelationship(id);
        break;
      case 'foreignKey':
        deleteForeignKey(id);
        break;
      case 'entityGroup':
        deleteEntityGroup(id);
        break;
    }
    
    setDeleteDialog({ isOpen: false, type: 'entity', id: '' });
  }, [deleteDialog, deleteEntity, deleteTable, deleteRelationship, deleteForeignKey, deleteEntityGroup]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialog({ isOpen: false, type: 'entity', id: '' });
  }, []);

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable element
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        // Prevent backspace navigation
        event.preventDefault();
        
        if (viewMode === 'conceptual') {
          // Check if it's an entity
          const entity = entities.find(e => e.id === selectedId);
          if (entity) {
            setDeleteDialog({
              isOpen: true,
              type: 'entity',
              id: selectedId,
              name: entity.name,
            });
          } else {
            // Check if it's an entity group
            const group = entityGroups.find(g => g.id === selectedId);
            if (group) {
              setDeleteDialog({
                isOpen: true,
                type: 'entityGroup',
                id: selectedId,
                name: group.name,
              });
            } else {
              // It's a relationship
              const relationship = relationships.find(r => r.id === selectedId);
              if (relationship) {
                setDeleteDialog({
                  isOpen: true,
                  type: 'relationship',
                  id: selectedId,
                });
              }
            }
          }
        } else {
          // Physical view
          const table = tables.find(t => t.id === selectedId);
          if (table) {
            setDeleteDialog({
              isOpen: true,
              type: 'table',
              id: selectedId,
              name: table.name,
            });
          } else {
            // Check if it's an entity (selected via entity group in physical view)
            const entity = entities.find(e => e.id === selectedId);
            if (entity) {
              setDeleteDialog({
                isOpen: true,
                type: 'entity',
                id: selectedId,
                name: entity.name,
              });
            } else {
              // It's a foreign key
              const foreignKey = foreignKeys.find(fk => fk.id === selectedId);
              if (foreignKey) {
                setDeleteDialog({
                  isOpen: true,
                  type: 'foreignKey',
                  id: selectedId,
                });
              }
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, viewMode, entities, entityGroups, relationships, tables, foreignKeys]);

  // Dynamic background based on view mode and color mode
  const canvasBackground = viewMode === 'physical' 
    ? (colorMode === 'dark' ? '#0a0c10' : '#f8fafc')
    : (colorMode === 'dark' ? '#0a0c10' : '#F0F4F8');
  const gridColor = viewMode === 'physical' 
    ? (colorMode === 'dark' ? '#1c2128' : '#e2e8f0')
    : (colorMode === 'dark' ? '#1c2128' : '#ccc');

  return (
    <div style={{ width: '100%', height: '100%', background: canvasBackground }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        onPaneClick={onPaneClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onEdgeContextMenu={handleEdgeContextMenu}
        onNodeContextMenu={(event, node) => {
          const nodeType = node.type === 'entity' ? 'entity' 
            : node.type === 'table' ? 'table' 
            : node.type === 'conceptualGroup' ? 'group'
            : node.type === 'entityGroup' ? 'entityGroup'
            : undefined;
          if (nodeType) {
            // For entityGroup, extract the actual entity ID from the node id
            const targetId = nodeType === 'entityGroup' ? node.id.replace('-group', '') : node.id;
            handleContextMenu(event, targetId, nodeType);
          }
        }}
        onPaneContextMenu={handlePaneContextMenu}
        connectionMode={ConnectionMode.Loose}
        defaultViewport={viewport}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        snapToGrid={true}
        snapGrid={[20, 20]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color={gridColor} size={1} />
        <MarkerDefs />
        <CanvasControls />
      </ReactFlow>
      
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        title={
          deleteDialog.type === 'entity' 
            ? 'Delete Entity' 
            : deleteDialog.type === 'table'
            ? 'Delete Table'
            : deleteDialog.type === 'relationship'
            ? 'Delete Relationship'
            : deleteDialog.type === 'entityGroup'
            ? 'Delete Entity Group'
            : 'Delete Foreign Key'
        }
        message={
          deleteDialog.type === 'entity'
            ? (() => {
                const entityTables = tables.filter(t => t.entityId === deleteDialog.id);
                const tableCount = entityTables.length;
                if (tableCount > 0) {
                  return `Are you sure you want to delete "${deleteDialog.name}"? This will also delete ${tableCount} table${tableCount > 1 ? 's' : ''} and all connected relationships/foreign keys.`;
                }
                return `Are you sure you want to delete "${deleteDialog.name}"? This will also delete all connected relationships.`;
              })()
            : deleteDialog.type === 'table'
            ? `Are you sure you want to delete table "${deleteDialog.name}"? This will also delete all foreign keys connected to this table.`
            : deleteDialog.type === 'relationship'
            ? 'Are you sure you want to delete this relationship?'
            : deleteDialog.type === 'entityGroup'
            ? `Are you sure you want to delete group "${deleteDialog.name}"? The entities will not be deleted.`
            : 'Are you sure you want to delete this foreign key?'
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
      />
      
      <AddTableDialog
        isOpen={!!editingTable}
        existingTable={editingTable}
        onClose={() => setEditingTable(undefined)}
        onOpenAISettings={() => {
          setEditingTable(undefined);
          setShowAISettingsDialog(true);
        }}
      />
      
      <AddTableDialog
        isOpen={showAddTableDialog}
        onClose={() => setShowAddTableDialog(false)}
        onOpenAISettings={() => {
          setShowAddTableDialog(false);
          setShowAISettingsDialog(true);
        }}
      />
      
      <AISettingsDialog
        isOpen={showAISettingsDialog}
        onClose={() => setShowAISettingsDialog(false)}
      />
      
      {/* Edge Label Editor */}
      {editingEdge && (
        <div
          style={{
            position: 'fixed',
            left: editingEdge.position.x - 100,
            top: editingEdge.position.y - 20,
            zIndex: 1000,
            background: colorMode === 'dark' ? '#161b22' : 'white',
            border: '2px solid #3b82f6',
            borderRadius: '6px',
            padding: '8px',
            boxShadow: colorMode === 'dark' 
              ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
              : '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <input
            autoFocus
            type="text"
            value={editingEdge.label}
            onChange={(e) => setEditingEdge({ ...editingEdge, label: e.target.value })}
            onKeyDown={handleEdgeLabelKeyDown}
            onBlur={handleSaveEdgeLabel}
            placeholder="Relationship label"
            style={{
              padding: '6px 8px',
              fontSize: '13px',
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #d1d5db',
              borderRadius: '4px',
              outline: 'none',
              width: '200px',
              fontFamily: 'inherit',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit',
            }}
          />
          <div style={{ fontSize: '10px', color: colorMode === 'dark' ? '#8b949e' : '#6b7280', fontStyle: 'italic' }}>
            Press Enter to save, Esc to cancel
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={getContextMenuItems()}
        onClose={handleCloseContextMenu}
      />
    </div>
  );
};

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
