import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import ReactFlow, { 
  Background, 
  ConnectionMode,
  PanOnScrollMode,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
} from 'reactflow';
import AnimatedEdge from './edges/AnimatedEdge';
import type { 
  Connection, 
  Edge, 
  Node, 
  NodeChange, 
  EdgeChange, 
  OnConnectStartParams,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useModelStore } from '../store/useModelStore';
import EntityNode from './nodes/EntityNode';
import TableNode from './nodes/TableNode';
import EntityGroupNode from './nodes/EntityGroupNode';
import ConceptualGroupNode from './nodes/ConceptualGroupNode';
import DataModelBoxNode from './nodes/DataModelBoxNode';
import { MarkerDefs } from './MarkerDefs';
import { CanvasControls } from './CanvasControls';
import { ConfirmationDialog } from './ui/ConfirmationDialog';
import { AddTableDialog } from './ui/AddTableDialog';
import { AISettingsDialog } from './ui/AISettingsDialog';
import { ContextMenu, type ContextMenuItem } from './ui/ContextMenu';
import { Plus, Trash2, Copy, ArrowDownUp, Group, Pencil, Code } from 'lucide-react';

// Define nodeTypes and edgeTypes outside component to prevent React Flow warnings
const nodeTypes = {
  entity: EntityNode,
  table: TableNode,
  entityGroup: EntityGroupNode,
  conceptualGroup: ConceptualGroupNode,
  dataModelBox: DataModelBoxNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<typeof tables[0] | undefined>(undefined);
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  const [showAISettingsDialog, setShowAISettingsDialog] = useState(false);
  const pendingModelConnectionRef = useRef<{ sourceId: string; sourceHandle?: string | null } | null>(null);
  const modelRelationshipCreatedRef = useRef(false);

  const { 
    dataModels,
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
    showRelationshipLabels,
    relationshipLabelSize,
    showEntityDescriptions,
    entityCardSize,
    
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
    setCenterDataModelCallback,
  } = useModelStore();

  const selectedDataModelId = dataModels.some(model => model.id === selectedId)
    ? (selectedId ?? undefined)
    : undefined;
  const isConceptualLikeView = viewMode !== 'physical';

  const activeDataModelId = useMemo(() => {
    if (dataModels.length === 0) return undefined;

    if (selectedDataModelId) return selectedDataModelId;

    const selectedEntity = entities.find(entity => entity.id === selectedId);
    if (selectedEntity?.dataModelId) return selectedEntity.dataModelId;

    const selectedTable = tables.find(table => table.id === selectedId);
    if (selectedTable?.entityId) {
      const tableEntity = entities.find(entity => entity.id === selectedTable.entityId);
      if (tableEntity?.dataModelId) return tableEntity.dataModelId;
    }

    const selectedRelationship = relationships.find(rel => rel.id === selectedId);
    if (selectedRelationship) {
      if (selectedRelationship.relationshipType === 'entity' || selectedRelationship.relationshipType === undefined) {
        const fromEntity = entities.find(entity => entity.id === selectedRelationship.fromEntityId);
        if (fromEntity?.dataModelId) return fromEntity.dataModelId;
      }
      if (selectedRelationship.relationshipType === 'dataModel' && selectedRelationship.fromDataModelId) {
        return selectedRelationship.fromDataModelId;
      }
    }

    const selectedGroup = entityGroups.find(group => group.id === selectedId);
    if (selectedGroup) {
      const firstEntityInGroup = entities.find(entity => selectedGroup.entityIds.includes(entity.id));
      if (firstEntityInGroup?.dataModelId) return firstEntityInGroup.dataModelId;
    }

    return dataModels[0]?.id;
  }, [dataModels, selectedId, selectedDataModelId, entities, tables, relationships, entityGroups]);

  // Register navigation callback for sidebar
  useEffect(() => {
    const navigateToNode = (nodeId: string, retries = 4) => {
      const node = reactFlowInstance.getNode(nodeId);
      if (node) {
        reactFlowInstance.setCenter(node.position.x + (node.width || 200) / 2, node.position.y + (node.height || 100) / 2, {
          zoom: 0.7,
          duration: 400,
        });
      } else if (retries > 0) {
        requestAnimationFrame(() => navigateToNode(nodeId, retries - 1));
      }
    };

    const centerDataModel = (dataModelId: string, retries = 4) => {
      const state = useModelStore.getState();
      const hiddenEntitySet = state.hiddenEntityIds instanceof Set
        ? state.hiddenEntityIds
        : new Set(state.hiddenEntityIds || []);

      const modelEntityIds = new Set(
        state.entities
          .filter(entity => entity.dataModelId === dataModelId && !hiddenEntitySet.has(entity.id))
          .map(entity => entity.id)
      );

      if (modelEntityIds.size === 0) return;

      const modelNodes = reactFlowInstance.getNodes().filter(node => modelEntityIds.has(node.id));
      if (modelNodes.length > 0) {
        reactFlowInstance.fitView({ nodes: modelNodes, padding: 0.25, duration: 400, maxZoom: 0.9 });
      } else if (retries > 0) {
        requestAnimationFrame(() => centerDataModel(dataModelId, retries - 1));
      }
    };

    setNavigateToNodeCallback(navigateToNode);
    setCenterDataModelCallback(centerDataModel);

    return () => {
      setNavigateToNodeCallback(null);
      setCenterDataModelCallback(null);
    };
  }, [reactFlowInstance, setNavigateToNodeCallback, setCenterDataModelCallback]);

  // Register fitView callback for auto-fit after loading/importing
  useEffect(() => {
    const fitView = () => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    };
    useModelStore.getState().setFitViewCallback(fitView);
    return () => useModelStore.getState().setFitViewCallback(null);
  }, [reactFlowInstance]);

  // Auto fit-to-view on initial page load / refresh
  useEffect(() => {
    // Small delay to let nodes render and get their dimensions
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [reactFlowInstance]);

  // Ensure hiddenEntityIds and hiddenTableIds are Sets (fallback for localStorage migration)
  const safeHiddenEntityIds = hiddenEntityIds instanceof Set ? hiddenEntityIds : new Set(hiddenEntityIds || []);
  const safeHiddenTableIds = hiddenTableIds instanceof Set ? hiddenTableIds : new Set(hiddenTableIds || []);

  // Compute directly connected entity IDs (1-hop only, matching Liam ERD behavior)
  const connectedEntityIds = useMemo(() => {
    const activeId = selectedId || hoveredNodeId;
    if (!activeId) return new Set<string>();

    const scopedEntityIds = new Set(
      entities
        .filter(entity => !activeDataModelId || entity.dataModelId === activeDataModelId)
        .map(entity => entity.id)
    );
    
    // Check if activeId is an entity
    const isEntity = entities.some(e => e.id === activeId && scopedEntityIds.has(e.id));
    // Check if activeId is an entity group
    const isGroup = entityGroups.some(g => g.id === activeId);
    
    if (!isEntity && !isGroup) return new Set<string>();
    
    const connected = new Set<string>();
    const sourceIds: string[] = [];
    
    if (isEntity) {
      sourceIds.push(activeId);
      connected.add(activeId);
    } else if (isGroup) {
      const group = entityGroups.find(g => g.id === activeId);
      if (group) {
        group.entityIds.forEach(entityId => {
          sourceIds.push(entityId);
          connected.add(entityId);
        });
      }
    }
    
    // Only add directly connected entities (1-hop)
    sourceIds.forEach(sourceId => {
      relationships.forEach(rel => {
        const isEntityRelationship = rel.relationshipType === 'entity' || rel.relationshipType === undefined;
        if (!isEntityRelationship || !rel.fromEntityId || !rel.toEntityId) return;
        if (!scopedEntityIds.has(rel.fromEntityId) || !scopedEntityIds.has(rel.toEntityId)) return;
        if (rel.fromEntityId === sourceId) connected.add(rel.toEntityId);
        if (rel.toEntityId === sourceId) connected.add(rel.fromEntityId);
      });
    });
    
    return connected;
  }, [selectedId, hoveredNodeId, entities, relationships, entityGroups, activeDataModelId]);

  const connectedDataModelIds = useMemo(() => {
    const activeId = selectedId || hoveredNodeId;
    if (!activeId) return new Set<string>();

    const isDataModel = dataModels.some(model => model.id === activeId);
    if (!isDataModel) return new Set<string>();

    const connected = new Set<string>();
    connected.add(activeId);

    relationships.forEach(rel => {
      if (rel.relationshipType !== 'dataModel') return;
      if (!rel.fromDataModelId || !rel.toDataModelId) return;
      if (rel.fromDataModelId === activeId) connected.add(rel.toDataModelId);
      if (rel.toDataModelId === activeId) connected.add(rel.fromDataModelId);
    });

    return connected;
  }, [selectedId, hoveredNodeId, dataModels, relationships]);


  // Compute directly connected table IDs (1-hop only, matching Liam ERD behavior)
  const connectedTableIds = useMemo(() => {
    const activeId = selectedId || hoveredNodeId;
    if (!activeId) return new Set<string>();

    const scopedEntityIds = new Set(
      entities
        .filter(entity => !activeDataModelId || entity.dataModelId === activeDataModelId)
        .map(entity => entity.id)
    );

    const scopedTableIds = new Set(
      tables
        .filter(table => !table.entityId || scopedEntityIds.has(table.entityId))
        .map(table => table.id)
    );
    
    // Check if activeId is a table
    const isTable = tables.some(t => t.id === activeId && scopedTableIds.has(t.id));
    // Check if activeId is an entity (in physical view with overlay)
    const isEntity = viewMode === 'physical' && showEntityOverlay && entities.some(e => e.id === activeId);
    
    if (!isTable && !isEntity) return new Set<string>();
    
    const connected = new Set<string>();
    const sourceTableIds: string[] = [];
    
    if (isTable) {
      sourceTableIds.push(activeId);
      connected.add(activeId);
    } else if (isEntity) {
      const entityTables = tables.filter(t => t.entityId === activeId);
      entityTables.forEach(t => {
        sourceTableIds.push(t.id);
        connected.add(t.id);
      });
    }
    
    // Only add directly connected tables (1-hop)
    sourceTableIds.forEach(sourceId => {
      foreignKeys.forEach(fk => {
        if (!scopedTableIds.has(fk.fromTableId) || !scopedTableIds.has(fk.toTableId)) return;
        if (fk.fromTableId === sourceId) connected.add(fk.toTableId);
        if (fk.toTableId === sourceId) connected.add(fk.fromTableId);
      });
    });
    
    return connected;
  }, [selectedId, hoveredNodeId, tables, foreignKeys, viewMode, showEntityOverlay, entities, activeDataModelId]);

  // Build nodes based on view mode
  const nodes: Node[] = useMemo(() => {
    if (viewMode === 'data-model') {
      const modelNodes: Node[] = dataModels.map((model, index) => {
        const layout = nodeLayouts[model.id];
        const modelEntities = entities.filter(entity => entity.dataModelId === model.id);

        return {
          id: model.id,
          type: 'dataModelBox',
          position: layout
            ? { x: layout.x, y: layout.y }
            : { x: 120 + (index % 3) * 380, y: 120 + Math.floor(index / 3) * 240 },
          data: {
            name: model.name,
            color: model.color,
            width: layout?.width || 320,
            height: layout?.height || 180,
            entityCount: modelEntities.length,
            isSelected: selectedId === model.id,
          },
          draggable: true,
          selectable: true,
          selected: selectedId === model.id,
          zIndex: 2,
        };
      });

      return modelNodes;
    }

    if (isConceptualLikeView) {
      // Filter out hidden entities
      const scopedEntities = entities.filter(e => !activeDataModelId || e.dataModelId === activeDataModelId);
      const visibleEntities = scopedEntities.filter(e => !safeHiddenEntityIds.has(e.id));
      const visibleEntityIdSet = new Set(visibleEntities.map(entity => entity.id));
      
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
        const scopedGroupEntityIds = group.entityIds.filter(entityId => visibleEntityIdSet.has(entityId));
        if (scopedGroupEntityIds.length === 0) {
          return null;
        }

        const leftPadding = 40; // Left padding (smaller due to label)
        const rightPadding = 80; // Right padding
        const headerPadding = 70; // Extra space at top for label
        const bottomPadding = 60; // Bottom padding
        
        // Check if group has a stored layout (from manual positioning/resizing)
        const storedGroupLayout = nodeLayouts[group.id];
        
        // Calculate bounding box for all entities in the group
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasEntities = false;
        
        scopedGroupEntityIds.forEach(entityId => {
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
        const hasEntitiesInGroup = scopedGroupEntityIds.length > 0 && scopedGroupEntityIds.some(id => nodeLayouts[id]);

        return {
          id: group.id,
          type: 'conceptualGroup',
          position: { x: groupX, y: groupY },
          data: {
            ...group,
            entityIds: scopedGroupEntityIds,
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
      }).filter(Boolean) as Node[];

      // Return group nodes first (lower z-index), then entity nodes on top
      return [...groupNodes, ...entityNodes];
    } else {
      // Filter out hidden tables
      const scopedEntityIds = new Set(
        entities
          .filter(entity => !activeDataModelId || entity.dataModelId === activeDataModelId)
          .map(entity => entity.id)
      );
      const visibleTables = tables.filter(t => {
        if (safeHiddenTableIds.has(t.id)) return false;
        if (!activeDataModelId) return true;
        return !t.entityId || scopedEntityIds.has(t.entityId);
      });
      
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
      const entityGroupNodes: Node[] = entities
      .filter(entity => !activeDataModelId || entity.dataModelId === activeDataModelId)
      .map(entity => {
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
          
          // Calculate table width dynamically based on name length
          // Base width is 240px, but table expands for longer names
          // Monospace font at 15px/600 weight is ~9.5px per character, plus padding, icons, and margins
          const nameWidth = table.name.length * 11; // Increased for accurate width matching
          const tableWidth = Math.max(240, nameWidth);
          
          // Calculate table height based on display mode
          // Table has 2px border on all sides (4px total height)
          // Header is 44px (12px padding + text) + 1px bottom border
          // Each row is 40px (10px padding top + 10px padding bottom + ~20px text)
          // "No columns defined" message is 48px (16px top + 16px bottom + text)
          let tableHeight;
          if (tableFieldsDisplay === 'name') {
            // Header only - just title bar
            // 4px (borders) + 44px (header) + 1px (header border) = 49px
            tableHeight = 49;
          } else if (tableFieldsDisplay === 'keys') {
            // Header + key fields only
            const keyCount = table.attributes.filter(a => a.isPrimaryKey || a.isForeignKey).length;
            if (keyCount === 0) {
              // No keys to show - shows "No columns defined" message
              // 4px (borders) + 44px (header) + 1px (header border) + 48px (message) = 97px
              tableHeight = 97;
            } else {
              // 4px (borders) + 44px (header) + 1px (header border) + rows
              tableHeight = 49 + (keyCount * 40);
            }
          } else {
            // All fields
            if (table.attributes.length === 0) {
              // No attributes - shows "No columns defined" message
              // 4px (borders) + 44px (header) + 1px (header border) + 48px (message) = 97px
              tableHeight = 97;
            } else {
              // 4px (borders) + 44px (header) + 1px (header border) + rows
              tableHeight = 49 + (table.attributes.length * 40);
            }
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

        const padding = 30; // Left, right, and bottom padding
        const topPadding = 60; // More padding at top for entity label and drag handle

        return {
          id: `${entity.id}-group`,
          type: 'entityGroup',
          position: { x: minX - padding, y: minY - topPadding },
          data: {
            entityId: entity.id,
            entityName: entity.name,
            entityDescription: entity.description,
            entityColor: entity.color,
            width: maxX - minX + padding * 2,
            height: maxY - minY + topPadding + padding,
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
  }, [entities, entityGroups, tables, dataModels, nodeLayouts, tableLayouts, selectedId, isConceptualLikeView, showEntityOverlay, tableFieldsDisplay, multiSelectedEntityIds, multiSelectedTableIds, dragHoverEntityGroupId, dragHoverGroupId, hiddenEntityIds, hiddenTableIds, showEntityDescriptions, entityCardSize, viewMode, activeDataModelId]);

  // Local display nodes - mirrors store nodes but gets fast position updates during drag
  // This avoids the Zustand → useMemo → all nodes rebuild cycle on every drag pixel
  const [displayNodes, setDisplayNodes] = useState<Node[]>(nodes);
  useEffect(() => {
    setDisplayNodes(nodes);
  }, [nodes]);

  // Build edges based on view mode
  const edges: Edge[] = useMemo(() => {
    if (viewMode === 'conceptual') {
      const scopedEntityIdSet = new Set(
        entities
          .filter(entity => !activeDataModelId || entity.dataModelId === activeDataModelId)
          .map(entity => entity.id)
      );

      // Filter out relationships where either entity is hidden
      return relationships
        .filter(r => {
          const isEntityRelationship = r.relationshipType === 'entity' || r.relationshipType === undefined;
          if (!isEntityRelationship || !r.fromEntityId || !r.toEntityId) return false;
          if (!scopedEntityIdSet.has(r.fromEntityId) || !scopedEntityIdSet.has(r.toEntityId)) return false;
          return !safeHiddenEntityIds.has(r.fromEntityId) && !safeHiddenEntityIds.has(r.toEntityId);
        })
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
          label: showRelationshipLabels ? r.label : '',
          sourceHandle,
          targetHandle,
          type: 'animated',
          markerEnd: `url(#marker-${r.toCardinality})`,
          markerStart: `url(#marker-${r.fromCardinality})`,
          selected: isEdgeSelected,
          className: (isConnectedToSelected || isEdgeSelected) ? 'pulse' : '',
          data: { ...r, isHighlighted: isConnectedToSelected || isEdgeSelected, edgeType: 'curved' },
          interactionWidth: 20,
          style: {
            stroke: (isEdgeSelected || isConnectedToSelected) ? '#4ade80' : defaultColor,
            strokeWidth: (isEdgeSelected || isConnectedToSelected) ? 1.5 : 1,
          },
          labelStyle: {
            fontSize: relationshipLabelSize === 'small' ? '10px' : relationshipLabelSize === 'large' ? '14px' : '12px',
            fontWeight: 500,
            fill: colorMode === 'dark' ? '#94a3b8' : '#475569',
          },
          labelBgStyle: {
            fill: colorMode === 'dark' ? '#0d1117' : '#ffffff',
            fillOpacity: 0.9,
          },
        };
      });
    } else if (viewMode === 'data-model') {
      return relationships
        .filter(r => r.relationshipType === 'dataModel' && !!r.fromDataModelId && !!r.toDataModelId)
        .map(r => {
          const isConnectedToSelected = connectedDataModelIds.has(r.fromDataModelId!) && connectedDataModelIds.has(r.toDataModelId!);
          const isEdgeSelected = selectedId === r.id;
          const defaultColor = colorMode === 'dark' ? '#4b5563' : '#9ca3af';

          return {
            id: r.id,
            source: r.fromDataModelId!,
            target: r.toDataModelId!,
            label: r.label,
            sourceHandle: r.sourceHandle || null,
            targetHandle: r.targetHandle || null,
            type: 'animated',
            markerEnd: `url(#marker-${r.toCardinality})`,
            markerStart: `url(#marker-${r.fromCardinality})`,
            selected: isEdgeSelected,
            className: (isConnectedToSelected || isEdgeSelected) ? 'pulse' : '',
            data: { ...r, isHighlighted: isConnectedToSelected || isEdgeSelected, edgeType: 'curved' },
            interactionWidth: 20,
            style: {
              stroke: (isEdgeSelected || isConnectedToSelected) ? '#4ade80' : defaultColor,
              strokeWidth: (isEdgeSelected || isConnectedToSelected) ? 1.5 : 1.2,
            },
            labelStyle: {
              fontSize: relationshipLabelSize === 'small' ? '10px' : relationshipLabelSize === 'large' ? '14px' : '12px',
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

      const scopedEntityIds = new Set(
        entities
          .filter(entity => !activeDataModelId || entity.dataModelId === activeDataModelId)
          .map(entity => entity.id)
      );
      const scopedTableIds = new Set(
        tables
          .filter(table => !table.entityId || scopedEntityIds.has(table.entityId))
          .map(table => table.id)
      );
      
      // Filter out foreign keys where either table is hidden
      return foreignKeys
        .filter(fk => {
          if (safeHiddenTableIds.has(fk.fromTableId) || safeHiddenTableIds.has(fk.toTableId)) return false;
          if (!scopedTableIds.has(fk.fromTableId) || !scopedTableIds.has(fk.toTableId)) return false;
          return true;
        })
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
          type: 'animated',
          markerEnd: `url(#marker-${fk.toCardinality})`,
          markerStart: `url(#marker-${fk.fromCardinality})`,
          selected: isEdgeSelected,
          className: (isConnectedToSelected || isEdgeSelected) ? 'pulse' : '',
          data: { ...fk, isHighlighted: isConnectedToSelected || isEdgeSelected, edgeType: fk.edgeType || 'curved' },
          interactionWidth: 20,
          zIndex: 10, // Put edges on top of tables
          style: {
            stroke: (isEdgeSelected || isConnectedToSelected) ? '#4ade80' : defaultColor,
            strokeWidth: (isEdgeSelected || isConnectedToSelected) ? 1.5 : 1,
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
  }, [relationships, foreignKeys, selectedId, hoveredNodeId, viewMode, nodeLayouts, tableLayouts, connectedEntityIds, connectedDataModelIds, connectedTableIds, colorMode, tableFieldsDisplay, hiddenEntityIds, hiddenTableIds, showRelationshipLabels, relationshipLabelSize, entities, tables, activeDataModelId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Apply ALL changes (position, select, etc.) to local display nodes immediately
    // This gives React Flow smooth visual updates without Zustand overhead
    setDisplayNodes(nds => applyNodeChanges(changes, nds));

    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        const isDragEnd = change.dragging === false;
        
        const isEntityGroup = change.id.endsWith('-group');
        const isConceptualGroup = entityGroups.some(g => g.id === change.id);
        
        if (isConceptualGroup) {
          const group = entityGroups.find(g => g.id === change.id);
          if (group) {
            if (group.entityIds.length > 0) {
              // Group drag: must update store continuously so group bounds recalculate
              const currentGroupNode = nodes.find(n => n.id === change.id);
              if (currentGroupNode) {
                const deltaX = change.position.x - currentGroupNode.position.x;
                const deltaY = change.position.y - currentGroupNode.position.y;
                group.entityIds.forEach(entityId => {
                  const currentLayout = nodeLayouts[entityId];
                  if (currentLayout) {
                    setNodePosition(entityId, currentLayout.x + deltaX, currentLayout.y + deltaY);
                  }
                });
              }
              return;
            } else if (isDragEnd) {
              setNodePosition(change.id, change.position.x, change.position.y);
            }
          }
          return;
        } else if (isEntityGroup) {
          const entityId = change.id.replace('-group', '');
          const entityTables = tables.filter(t => t.entityId === entityId);
          
          if (entityTables.length > 0) {
            // Group drag: must update store continuously
            const currentGroupNode = nodes.find(n => n.id === change.id);
            if (currentGroupNode) {
              const deltaX = change.position.x - currentGroupNode.position.x;
              const deltaY = change.position.y - currentGroupNode.position.y;
              entityTables.forEach(table => {
                const currentLayout = tableLayouts[table.id];
                if (currentLayout) {
                  setTablePosition(table.id, currentLayout.x + deltaX, currentLayout.y + deltaY);
                }
              });
            }
          } else if (isDragEnd) {
            setNodePosition(entityId, change.position.x, change.position.y);
          }
        } else {
          // Individual node/table - persist position to store
          // Must update continuously (not just on drag end) so that when
          // other state changes cause the `nodes` useMemo to recompute,
          // the recalculated nodes use the latest position from the store
          // instead of reverting to the stale pre-drag position.
          if (isConceptualLikeView) {
            setNodePosition(change.id, change.position.x, change.position.y);
          } else {
            setTablePosition(change.id, change.position.x, change.position.y);
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
          
          if (isEntity && isConceptualLikeView) {
            // For entities in conceptual view, always clear multi-selection on normal clicks
            if (change.selected) {
              // Always call setSelected to clear multi-selection state
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
  }, [setNodePosition, setTablePosition, setSelected, selectedId, isConceptualLikeView, tables, nodes, tableLayouts, entityGroups, entities, addEntityToGroup, dragHoverGroupId, multiSelectedEntityIds, nodeLayouts]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
      changes.forEach(change => {
          if (change.type === 'select') {
              if (change.selected) setSelected(change.id);
              else if (!change.selected && change.id === selectedId) setSelected(null);
          }
      });
  }, [setSelected, selectedId]);

  const createDataModelRelationship = useCallback((
    sourceId: string,
    targetId: string,
    sourceHandle?: string | null,
    targetHandle?: string | null
  ) => {
    const isSourceModel = dataModels.some(model => model.id === sourceId);
    const isTargetModel = dataModels.some(model => model.id === targetId);
    if (!isSourceModel || !isTargetModel) return false;

    const hasExistingModelRelationship = relationships.some(rel =>
      rel.relationshipType === 'dataModel' &&
      ((rel.fromDataModelId === sourceId && rel.toDataModelId === targetId) ||
        (rel.fromDataModelId === targetId && rel.toDataModelId === sourceId))
    );
    if (hasExistingModelRelationship) return false;

    addRelationship(sourceId, targetId, 'dataModel', sourceHandle, targetHandle);
    return true;
  }, [dataModels, relationships, addRelationship]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      if (params.source === params.target) {
        if (!confirm('Do you really want to create a self-reference?')) {
          return;
        }
      }
      if (viewMode === 'conceptual') {
        addRelationship(params.source, params.target, 'entity', params.sourceHandle, params.targetHandle);
      } else if (viewMode === 'data-model') {
        const created = createDataModelRelationship(params.source, params.target, params.sourceHandle, params.targetHandle);
        if (created) {
          modelRelationshipCreatedRef.current = true;
        }
      }
      // For physical view, FK connections are handled via TableNode drag interactions
    }
  }, [addRelationship, viewMode, createDataModelRelationship]);

  const onConnectStart = useCallback((_: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
    if (viewMode !== 'data-model') return;
    if (!params.nodeId) return;
    pendingModelConnectionRef.current = { sourceId: params.nodeId, sourceHandle: params.handleId };
    modelRelationshipCreatedRef.current = false;
  }, [viewMode]);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState?: { isValid?: boolean }) => {
    if (viewMode !== 'data-model') return;

    const pending = pendingModelConnectionRef.current;
    const createdAlready = modelRelationshipCreatedRef.current;
    pendingModelConnectionRef.current = null;
    modelRelationshipCreatedRef.current = false;

    if (!pending || createdAlready || connectionState?.isValid) return;

    const isTouchEvent = 'touches' in event || 'changedTouches' in event;
    const clientPoint = isTouchEvent
      ? ((event as TouchEvent).changedTouches?.[0] || (event as TouchEvent).touches?.[0])
      : (event as MouseEvent);
    if (!clientPoint) return;

    const flowPoint = (reactFlowInstance as any).screenToFlowPosition
      ? (reactFlowInstance as any).screenToFlowPosition({ x: clientPoint.clientX, y: clientPoint.clientY })
      : (reactFlowInstance as any).project({ x: clientPoint.clientX, y: clientPoint.clientY });

    const modelIdSet = new Set(dataModels.map(model => model.id));
    const targetNode = reactFlowInstance
      .getNodes()
      .filter(node => modelIdSet.has(node.id) && node.id !== pending.sourceId)
      .find(node => {
        const width = node.width ?? (node.data as any)?.width ?? nodeLayouts[node.id]?.width ?? 320;
        const height = node.height ?? (node.data as any)?.height ?? nodeLayouts[node.id]?.height ?? 180;
        const nodePosition = node.positionAbsolute || node.position;

        return (
          flowPoint.x >= nodePosition.x &&
          flowPoint.x <= nodePosition.x + width &&
          flowPoint.y >= nodePosition.y &&
          flowPoint.y <= nodePosition.y + height
        );
      });

    if (targetNode) {
      createDataModelRelationship(pending.sourceId, targetNode.id, pending.sourceHandle, undefined);
      return;
    }

    const targetElement = event.target as HTMLElement | null;
    const targetNodeElement = targetElement?.closest?.('.react-flow__node[data-id]') as HTMLElement | null;
    const targetId = targetNodeElement?.getAttribute('data-id');
    if (!targetId || targetId === pending.sourceId) return;

    createDataModelRelationship(pending.sourceId, targetId, pending.sourceHandle, undefined);
  }, [viewMode, createDataModelRelationship, reactFlowInstance, dataModels, nodeLayouts]);

  const onNodeDrag = useCallback((_: any, node: any) => {
    // Conceptual view: track entities being dragged over entity groups
    if (isConceptualLikeView && entities.some(e => e.id === node.id)) {
      // Check if entity is over any group
      const entityX = node.position.x + 110; // Entity center
      const entityY = node.position.y + 60;

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

    setDragHoverEntityGroupId(hoveredEntityId || null);
    return;
  }

  // Clear hover states if not dragging relevant items
  setDragHoverGroupId(null);
  setDragHoverEntityGroupId(null);
}, [isConceptualLikeView, viewMode, entities, entityGroups, nodeLayouts, tables, tableLayouts, showEntityOverlay]);

  const onNodeDragStop = useCallback((_: any, node: any) => {
    // Conceptual view: Handle entities dropped into entity groups
    if (isConceptualLikeView && dragHoverGroupId) {
      const entity = entities.find(e => e.id === node.id);
      if (entity) {
        addEntityToGroup(dragHoverGroupId, entity.id);
      }
    }

    // Physical view with entity overlay: Handle tables dropped into entity groups
    if (viewMode === 'physical' && showEntityOverlay && dragHoverEntityGroupId) {
      const table = tables.find(t => t.id === node.id);
      if (table) {
        updateTable(table.id, { entityId: dragHoverEntityGroupId });
      }
    }

    // Clear hover states after handling drop
    setDragHoverGroupId(null);
    setDragHoverEntityGroupId(null);
  }, [isConceptualLikeView, viewMode, dragHoverGroupId, dragHoverEntityGroupId, entities, tables, addEntityToGroup, updateTable, showEntityOverlay]);

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
        type: nodeType || (isConceptualLikeView ? 'entity' : 'table'),
        targetId: nodeId,
      });
    }
  }, [setSelected, isConceptualLikeView]);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: any) => {
    event.preventDefault();
    event.stopPropagation();
    
    setSelected(edge.id);
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      type: viewMode === 'physical' ? 'foreignKey' : 'relationship',
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
      return isConceptualLikeView
        ? [
            { label: 'Add Entity', icon: <Plus size={14} />, onClick: () => addEntity(selectedDataModelId) },
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
          const newId = addEntity(entity?.dataModelId);
          if (entity) {
            const state = useModelStore.getState();
            state.updateEntity(newId, { name: `${entity.name} (copy)`, description: entity.description, dataModelId: entity.dataModelId });
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
      const isInEntityGroup = table?.entityId !== undefined;
      
      const menuItems: ContextMenuItem[] = [
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
      ];
      
      // Add "Remove from Entity Group" option if table is in an entity group
      if (isInEntityGroup) {
        menuItems.push(
          { label: '', divider: true, onClick: () => {} },
          { label: 'Remove from Entity Group', icon: <Group size={14} />, onClick: () => {
            updateTable(targetId, { entityId: undefined });
          }}
        );
      }
      
      menuItems.push(
        { label: '', divider: true, onClick: () => {} },
        { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => {
          setDeleteDialog({
            isOpen: true,
            type: 'table',
            id: targetId,
            name: table?.name,
          });
        }, danger: true, shortcut: '⌫' },
      );
      
      return menuItems;  
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
  }, [contextMenu, isConceptualLikeView, dataModels, entities, tables, entityGroups, addEntity, addEntityGroup, addTable, autoLayout, setSelected, selectedDataModelId, setNodePosition, setTablePosition, nodeLayouts, tableLayouts]);

  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (viewMode === 'physical') return;
    
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
        
        if (isConceptualLikeView) {
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
  }, [selectedId, isConceptualLikeView, entities, entityGroups, relationships, tables, foreignKeys]);

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
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={useCallback((_: any, node: any) => {
          // For entity groups, extract the entity ID
          const id = node.id.endsWith('-group') ? node.id.replace('-group', '') : node.id;
          setHoveredNodeId(id);
        }, [])}
        onNodeMouseLeave={useCallback(() => {
          setHoveredNodeId(null);
        }, [])}
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
        panOnScroll={true}
        panOnScrollSpeed={1.5}
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch={true}
        snapToGrid={false}
        snapGrid={[1, 1]}
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
