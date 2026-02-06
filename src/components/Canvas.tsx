import { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  ConnectionMode,
  ReactFlowProvider,
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
import { ConfirmationDialog } from './ui/ConfirmationDialog';

const nodeTypes = {
  entity: EntityNode,
  table: TableNode,
  entityGroup: EntityGroupNode,
  conceptualGroup: ConceptualGroupNode,
};

const CanvasInner = () => {
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
    multiSelectedEntityIds,
    
    addRelationship,
    updateRelationship,
    deleteEntity,
    deleteRelationship,
    deleteEntityGroup,
    deleteTable,
    deleteForeignKey,
    setNodePosition,
    setTablePosition,
    setViewport,
    setSelected,
    selectedId,
    clearMultiSelection,
  } = useModelStore();

  // Compute all transitively connected entity IDs (for conceptual view)
  const connectedEntityIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    
    // Check if selectedId is an entity
    const isEntity = entities.some(e => e.id === selectedId);
    if (!isEntity) return new Set<string>();
    
    const connected = new Set<string>();
    const queue = [selectedId];
    
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
  }, [selectedId, entities, relationships]);

  // Snapping helper function
  const snapToGrid = useCallback((x: number, y: number, snapSize: number = 20) => {
    return {
      x: Math.round(x / snapSize) * snapSize,
      y: Math.round(y / snapSize) * snapSize,
    };
  }, []);

  // Compute all transitively connected table IDs (downstream from selected table)
  const connectedTableIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    
    // Check if selectedId is a table
    const isTable = tables.some(t => t.id === selectedId);
    if (!isTable) return new Set<string>();
    
    const connected = new Set<string>();
    const queue = [selectedId];
    
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
  }, [selectedId, tables, foreignKeys]);

  // Build nodes based on view mode
  const nodes: Node[] = useMemo(() => {
    if (viewMode === 'conceptual') {
      // Entity nodes - higher z-index so they're always clickable above groups
      const entityNodes = entities.map(e => {
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
        // Calculate bounding box for all entities in the group
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasEntities = false;
        
        group.entityIds.forEach(entityId => {
          const layout = nodeLayouts[entityId];
          if (layout) {
            hasEntities = true;
            const entityWidth = 220;
            const entityHeight = 120;
            
            minX = Math.min(minX, layout.x);
            minY = Math.min(minY, layout.y);
            maxX = Math.max(maxX, layout.x + entityWidth);
            maxY = Math.max(maxY, layout.y + entityHeight);
          }
        });

        // If no entities have positions yet, use default size and position
        if (!hasEntities) {
          minX = 100;
          minY = 100;
          maxX = 500;
          maxY = 400;
        }

        const padding = 60;
        const headerPadding = 60;

        return {
          id: group.id,
          type: 'conceptualGroup',
          position: { x: minX - padding, y: minY - headerPadding },
          data: {
            ...group,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding + headerPadding,
          },
          zIndex: -1,
          selectable: false, // Disable React Flow's built-in selection - we handle it via label click
          draggable: true,
          selected: selectedId === group.id,
          dragHandle: '.conceptual-group-drag-handle',
          className: 'group-node-passthrough', // Allow clicks to pass through to entities
        };
      });

      // Return group nodes first (lower z-index), then entity nodes on top
      return [...groupNodes, ...entityNodes];
    } else {
      // Tables are always positioned absolutely (not relative to groups)
      const tableNodes = tables.map(t => ({
        id: t.id,
        type: 'table',
        position: tableLayouts[t.id] || { x: 0, y: 0 },
        data: t,
        selected: selectedId === t.id,
      }));

      if (!showEntityOverlay) {
        return tableNodes;
      }

      // Create entity group nodes as background containers (independent positioning)
      const entityGroupNodes: Node[] = entities.map(entity => {
        // Find all tables belonging to this entity
        const entityTables = tables.filter(t => t.entityId === entity.id);
        
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
              width: 280,
              height: 120,
            },
            zIndex: -1,
            selectable: true,
            draggable: true,
            dragHandle: '.entity-group-drag-handle',
          };
        }

        // Calculate bounding box for all tables in this entity
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
        const headerPadding = 60; // Extra space at top for entity label

        return {
          id: `${entity.id}-group`,
          type: 'entityGroup',
          position: { x: minX - padding, y: minY - headerPadding },
          data: {
            entityId: entity.id,
            entityName: entity.name,
            entityDescription: entity.description,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding + headerPadding + 16,
          },
          zIndex: -1,
          selectable: true,
          draggable: true,
          dragHandle: '.entity-group-drag-handle',
        };
      }).filter(Boolean);

      // Return group nodes first (lower z-index), then table nodes on top
      return [...entityGroupNodes, ...tableNodes];
    }
  }, [entities, entityGroups, tables, nodeLayouts, tableLayouts, selectedId, viewMode, showEntityOverlay, multiSelectedEntityIds]);

  // Build edges based on view mode
  const edges: Edge[] = useMemo(() => {
    if (viewMode === 'conceptual') {
      return relationships.map(r => {
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
          type: 'smoothstep',
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
      return foreignKeys.map(fk => {
        // Determine which side handles to use based on table positions
        const sourceTable = tableLayouts[fk.fromTableId];
        const targetTable = tableLayouts[fk.toTableId];
        
        let sourceHandle: string;
        let targetHandle: string;
        
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
            sourceHandle = `source-${fk.fromAttributeId}`; // exit right
            targetHandle = `target-${fk.toAttributeId}`; // enter left
          } else if (sourceLeft >= targetRight - 20) {
            // Target is to the left of source
            sourceHandle = `source-left-${fk.fromAttributeId}`; // exit left
            targetHandle = `target-right-${fk.toAttributeId}`; // enter right
          } else {
            // Tables are overlapping horizontally - use vertical positioning
            const sourceY = sourceTable.y;
            const targetY = targetTable.y;
            if (targetY < sourceY) {
              // Target is above - exit left, enter right (or vice versa based on x)
              sourceHandle = sourceTable.x < targetTable.x 
                ? `source-${fk.fromAttributeId}` 
                : `source-left-${fk.fromAttributeId}`;
              targetHandle = sourceTable.x < targetTable.x 
                ? `target-${fk.toAttributeId}` 
                : `target-right-${fk.toAttributeId}`;
            } else {
              sourceHandle = sourceTable.x < targetTable.x 
                ? `source-${fk.fromAttributeId}` 
                : `source-left-${fk.fromAttributeId}`;
              targetHandle = sourceTable.x < targetTable.x 
                ? `target-${fk.toAttributeId}` 
                : `target-right-${fk.toAttributeId}`;
            }
          }
        } else {
          // Fallback
          sourceHandle = `source-${fk.fromAttributeId}`;
          targetHandle = `target-${fk.toAttributeId}`;
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
          type: 'smoothstep',
          markerEnd: `url(#marker-${fk.toCardinality})`,
          markerStart: `url(#marker-${fk.fromCardinality})`,
          selected: isEdgeSelected,
          className: (isConnectedToSelected || isEdgeSelected) ? 'pulse' : '',
          data: fk,
          interactionWidth: 20,
          style: {
            stroke: (isEdgeSelected || isConnectedToSelected) ? '#4ade80' : defaultColor,
            strokeWidth: (isEdgeSelected || isConnectedToSelected) ? 2.5 : 2,
          },
        };
      });
    }
  }, [relationships, foreignKeys, selectedId, viewMode, nodeLayouts, tableLayouts, connectedEntityIds, connectedTableIds, colorMode]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        // Check if this is an entity group node
        const isEntityGroup = change.id.endsWith('-group');
        const isConceptualGroup = entityGroups.some(g => g.id === change.id);
        
        if (isConceptualGroup) {
          // For conceptual groups, move all entities within the group
          const group = entityGroups.find(g => g.id === change.id);
          if (group && group.entityIds.length > 0) {
            // Calculate the delta from current position
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
          // Skip React Flow's selection handling for entities in conceptual view
          // We handle it via onClick with shift key detection
          const isEntity = entities.some(e => e.id === change.id);
          if (isEntity && viewMode === 'conceptual') {
            // Don't interfere with our custom shift-click logic
            return;
          }
          
          if (change.selected) setSelected(change.id);
          else if (!change.selected && change.id === selectedId) {
               setSelected(null);
          }
        }
      }
    });
  }, [setNodePosition, setTablePosition, setSelected, selectedId, viewMode, snapToGrid, tables, nodes, tableLayouts, entityGroups, entities]);

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

  const onMoveEnd = useCallback((_: any, viewport: any) => {
    setViewport(viewport);
  }, [setViewport]);

  const onPaneClick = useCallback(() => {
    setSelected(null);
    clearMultiSelection();
  }, [setSelected, clearMultiSelection]);

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
        onPaneClick={onPaneClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        connectionMode={ConnectionMode.Loose}
        defaultViewport={viewport}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        snapToGrid={true}
        snapGrid={[20, 20]}
      >
        <Background gap={20} color={gridColor} size={1} />
        <Controls />
        <MarkerDefs />
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
            ? `Are you sure you want to delete "${deleteDialog.name}"? This will also delete all connected relationships.`
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
