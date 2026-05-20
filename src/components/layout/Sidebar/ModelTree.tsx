import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Box, 
  Table, 
  FolderOpen, 
  Link,
  ExternalLink,
  Database,
  Layers,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import type { PhysicalTable } from '../../../model/schemas';

// Type aliases for the database hierarchy
type SchemaMap = Record<string, PhysicalTable[]>;
type DatabaseHierarchy = Record<string, SchemaMap>;

interface ModelTreeProps {
  searchQuery?: string;
}

export const ModelTree: React.FC<ModelTreeProps> = ({ searchQuery = '' }) => {
  const {
    dataModels,
    entities,
    tables,
    relationships,
    entityGroups,
    selectedId,
    setSelected,
    viewMode,
    setViewMode,
    colorMode,
    physicalHierarchyMode,
    hiddenEntityIds,
    hiddenTableIds,
    emptyDatabases,
    emptySchemas,
    toggleEntityVisibility,
    toggleTableVisibility,
    navigateToNodeCallback,
  } = useModelStore();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedDataModels, setExpandedDataModels] = useState<Set<string>>(new Set());
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [renamingItem, setRenamingItem] = useState<{ type: 'database' | 'schema' | 'table'; key: string; value: string } | null>(null);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [draggedTableName, setDraggedTableName] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ type: 'database' | 'schema'; key: string } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const dropTargetsRef = useRef<Map<string, DOMRect>>(new Map());
  
  const updateTable = useModelStore(state => state.updateTable);
  const setEmptyDatabases = useCallback((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    const newSet = typeof updater === 'function' ? updater(emptyDatabases) : updater;
    useModelStore.setState({ emptyDatabases: newSet });
  }, [emptyDatabases]);
  
  const setEmptySchemas = useCallback((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    const newSet = typeof updater === 'function' ? updater(emptySchemas) : updater;
    useModelStore.setState({ emptySchemas: newSet });
  }, [emptySchemas]);

  const isDark = colorMode === 'dark';

  // Conceptual View - Filter data models, entities, groups, and relationships based on search
  const filteredConceptualData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      return { dataModels, entities, entityGroups, relationships };
    }

    const matchingDataModels = dataModels.filter(model =>
      model.name.toLowerCase().includes(query) ||
      (model.description && model.description.toLowerCase().includes(query))
    );
    const matchingDataModelIds = new Set(matchingDataModels.map(model => model.id));
    
    // Filter entities by name or description
    const matchingEntities = entities.filter(e => 
      e.name.toLowerCase().includes(query) ||
      (e.description && e.description.toLowerCase().includes(query))
    );
    const matchingEntityIds = new Set(matchingEntities.map(e => e.id));
    matchingEntities.forEach(entity => {
      if (entity.dataModelId) matchingDataModelIds.add(entity.dataModelId);
    });

    const allMatchingDataModels = dataModels.filter(model => matchingDataModelIds.has(model.id));
    
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
      dataModels: allMatchingDataModels,
      entities: matchingEntities, 
      entityGroups: matchingGroups,
      relationships: matchingRelationships 
    };
  }, [dataModels, entities, entityGroups, relationships, searchQuery]);

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

  // Group tables by database/schema hierarchy
  // Use ALL tables to get the full list of databases/schemas, but filter per-schema
  const databaseHierarchy = useMemo((): DatabaseHierarchy => {
    const hierarchy: DatabaseHierarchy = {};
    
    // First, get all unique database/schema combinations from ALL tables
    tables.forEach(table => {
      const db = table.database || 'unassigned';
      const schema = table.schema || 'unassigned';
      
      if (!hierarchy[db]) {
        hierarchy[db] = {};
      }
      if (!hierarchy[db][schema]) {
        hierarchy[db][schema] = [];
      }
    });
    
    // Then, add filtered tables to their respective database/schema
    filteredTablesAndEntities.tables.forEach(table => {
      const db = table.database || 'unassigned';
      const schema = table.schema || 'unassigned';
      hierarchy[db][schema].push(table);
    });
    
    return hierarchy;
  }, [tables, filteredTablesAndEntities]);

  // Auto-expand databases and schemas when searching
  React.useEffect(() => {
    if (searchQuery && physicalHierarchyMode === 'database') {
      const databasesToExpand = new Set<string>();
      const schemasToExpand = new Set<string>();
      
      Object.entries(databaseHierarchy).forEach(([dbName, schemas]) => {
        // Check if this database has any matching tables
        const hasMatchingTables = Object.values(schemas).some(tables => tables.length > 0);
        if (hasMatchingTables) {
          databasesToExpand.add(dbName);
          
          // Expand all schemas within this database that have matching tables
          Object.entries(schemas).forEach(([schemaName, tables]) => {
            if (tables.length > 0) {
              schemasToExpand.add(`${dbName}.${schemaName}`);
            }
          });
        }
      });
      
      setExpandedDatabases(databasesToExpand);
      setExpandedSchemas(schemasToExpand);
    }
  }, [searchQuery, databaseHierarchy, physicalHierarchyMode]);

  // Global drag end listener to clean up state when drag ends anywhere
  React.useEffect(() => {
    const handleGlobalDragEnd = () => {
      if (draggedTable) {
        console.log('[ModelTree] Global drag end - cleaning up');
        setDraggedTable(null);
        setDropTarget(null);
      }
    };
    
    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => document.removeEventListener('dragend', handleGlobalDragEnd);
  }, [draggedTable]);

  // Auto-expand parent items when a table is selected
  React.useEffect(() => {
    if (!selectedId || viewMode !== 'physical') return;
    
    const selectedTable = tables.find(t => t.id === selectedId);
    if (!selectedTable) return;
    
    if (physicalHierarchyMode === 'entity') {
      // Expand parent entity if table is selected
      if (selectedTable.entityId) {
        setExpandedEntities(prev => {
          if (prev.has(selectedTable.entityId!)) return prev;
          const next = new Set(prev);
          next.add(selectedTable.entityId!);
          return next;
        });
      }
    } else if (physicalHierarchyMode === 'database') {
      // Expand parent database and schema if table is selected
      const dbName = selectedTable.database || 'unassigned';
      const schemaName = selectedTable.schema || 'unassigned';
      const schemaKey = `${dbName}.${schemaName}`;
      
      setExpandedDatabases(prev => {
        if (prev.has(dbName)) return prev;
        const next = new Set(prev);
        next.add(dbName);
        return next;
      });
      
      setExpandedSchemas(prev => {
        if (prev.has(schemaKey)) return prev;
        const next = new Set(prev);
        next.add(schemaKey);
        return next;
      });
    }
  }, [selectedId, viewMode, physicalHierarchyMode, tables]);

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDataModelExpand = (id: string) => {
    setExpandedDataModels(prev => {
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

  const toggleDatabaseExpand = (id: string) => {
    setExpandedDatabases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSchemaExpand = (id: string) => {
    setExpandedSchemas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTablesForEntity = (entityId: string) => 
    tables.filter(t => t.entityId === entityId);

  const handleRenameStart = useCallback((type: 'database' | 'schema' | 'table', key: string, currentValue: string) => {
    console.log('[ModelTree] handleRenameStart called:', { type, key, currentValue });
    setRenamingItem({ type, key, value: currentValue });
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }, []);

  const handleRenameComplete = useCallback(() => {
    if (!renamingItem) return;
    
    const newValue = renamingItem.value.trim();
    if (!newValue || newValue === 'unassigned') {
      setRenamingItem(null);
      return;
    }
    
    if (renamingItem.type === 'database') {
      // Get the old database name from the key
      const oldDbName = renamingItem.key;
      
      // If it's a new database name that doesn't match any existing, just expand it
      // Otherwise, rename all tables in this database
      const tablesToUpdate = tables.filter(t => (t.database || 'unassigned') === oldDbName);
      
      if (tablesToUpdate.length > 0) {
        // Rename existing database
        tablesToUpdate.forEach(table => {
          updateTable(table.id, { database: newValue });
        });
      }
      // If no tables, the database name will be created when a table is added to it
      
      // Track as empty database if no tables
      if (tablesToUpdate.length === 0) {
        setEmptyDatabases(prev => {
          const next = new Set(prev);
          next.delete(oldDbName);
          next.add(newValue);
          return next;
        });
      }
      
      // Expand the new/renamed database
      setExpandedDatabases(prev => {
        const next = new Set(prev);
        next.delete(oldDbName);
        next.add(newValue);
        return next;
      });
    } else if (renamingItem.type === 'schema') {
      // Rename schema within a database
      const parts = renamingItem.key.split('.');
      const dbName = parts[0];
      const oldSchemaName = parts.slice(1).join('.');
      
      const tablesToUpdate = tables.filter(t => {
        const tableDb = t.database || 'unassigned';
        const tableSchema = t.schema || 'unassigned';
        return tableDb === dbName && tableSchema === oldSchemaName;
      });
      
      if (tablesToUpdate.length > 0) {
        tablesToUpdate.forEach(table => {
          updateTable(table.id, { schema: newValue });
        });
        
        // Remove from empty schemas if it now has tables
        setEmptySchemas(prev => {
          const next = new Set(prev);
          next.delete(renamingItem.key);
          return next;
        });
      } else {
        // If no tables, track this as an empty schema so it persists after rename
        setEmptySchemas(prev => {
          const next = new Set(prev);
          next.delete(renamingItem.key);
          next.add(`${dbName}.${newValue}`);
          return next;
        });
      }
      
      // Expand the new/renamed schema
      setExpandedSchemas(prev => {
        const next = new Set(prev);
        next.delete(renamingItem.key);
        next.add(`${dbName}.${newValue}`);
        return next;
      });
    } else if (renamingItem.type === 'table') {
      // Rename table
      const tableId = renamingItem.key;
      updateTable(tableId, { name: newValue });
    }
    
    setRenamingItem(null);
  }, [renamingItem, tables, updateTable]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Stop all propagation to prevent global keyboard handlers
    e.stopPropagation();
    
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameComplete();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setRenamingItem(null);
    }
    // Allow all other keys (including Backspace) to work normally in the input
  }, [handleRenameComplete]);

  // Instant pointer-based drag system
  const handlePointerDragStart = useCallback((tableId: string, tableName: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ModelTree] Pointer drag start for table:', tableName);
    
    // Pointer capture is handled by TreeItem after delay
    
    setDraggedTable(tableId);
    setDraggedTableName(tableName);
    setDragPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggedTable) return;
    
    setDragPosition({ x: e.clientX, y: e.clientY });
    
    // Find which drop target we're over
    let foundTarget: { type: 'database' | 'schema'; key: string } | null = null;
    
    dropTargetsRef.current.forEach((rect, key) => {
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const [type, ...keyParts] = key.split(':');
        foundTarget = { type: type as 'database' | 'schema', key: keyParts.join(':') };
      }
    });
    
    if ((foundTarget as { type: string; key: string } | null)?.type !== dropTarget?.type || (foundTarget as { type: string; key: string } | null)?.key !== dropTarget?.key) {
      setDropTarget(foundTarget);
    }
  }, [draggedTable, dropTarget]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggedTable) return;
    
    console.log('[ModelTree] Pointer up, dropTarget:', dropTarget);
    
    // Release pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Handle the drop if we have a target
    if (dropTarget) {
      const currentTables = useModelStore.getState().tables;
      const table = currentTables.find(t => t.id === draggedTable);
      
      if (table) {
        const storeUpdateTable = useModelStore.getState().updateTable;
        
        if (dropTarget.type === 'database') {
          const dbName = dropTarget.key === 'unassigned' ? undefined : dropTarget.key;
          const currentDb = table.database || 'unassigned';
          
          if (currentDb !== dropTarget.key) {
            storeUpdateTable(draggedTable, { database: dbName, schema: undefined });
          } else {
            storeUpdateTable(draggedTable, { database: dbName });
          }
          
          setExpandedDatabases(prev => new Set(prev).add(dropTarget.key));
          setEmptyDatabases(prev => {
            const next = new Set(prev);
            next.delete(dropTarget.key);
            return next;
          });
        } else if (dropTarget.type === 'schema') {
          const [dbName, ...schemaParts] = dropTarget.key.split('.');
          const schemaName = schemaParts.join('.');
          const finalDb = dbName === 'unassigned' ? undefined : dbName;
          const finalSchema = schemaName === 'unassigned' ? undefined : schemaName;
          
          storeUpdateTable(draggedTable, { database: finalDb, schema: finalSchema });
          
          setExpandedDatabases(prev => new Set(prev).add(dbName));
          setExpandedSchemas(prev => new Set(prev).add(dropTarget.key));
          setEmptySchemas(prev => {
            const next = new Set(prev);
            next.delete(dropTarget.key);
            return next;
          });
        }
      }
    }
    
    // Clear drag state
    setDraggedTable(null);
    setDraggedTableName(null);
    setDragPosition(null);
    setDropTarget(null);
  }, [draggedTable, dropTarget, setEmptyDatabases, setEmptySchemas]);

  // Register a drop target
  const registerDropTarget = useCallback((type: 'database' | 'schema', key: string, element: HTMLElement | null) => {
    const mapKey = `${type}:${key}`;
    if (element) {
      dropTargetsRef.current.set(mapKey, element.getBoundingClientRect());
    } else {
      dropTargetsRef.current.delete(mapKey);
    }
  }, []);

  const handleDragOver = useCallback((type: 'database' | 'schema', key: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Update drop target immediately
    if (dropTarget?.type !== type || dropTarget?.key !== key) {
      console.log('[ModelTree] Drag over:', type, key);
      setDropTarget({ type, key });
    }
  }, [dropTarget]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're actually leaving the element (not entering a child)
    const relatedTarget = e.relatedTarget as Node;
    const currentTarget = e.currentTarget as Node;
    if (!currentTarget.contains(relatedTarget)) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback((type: 'database' | 'schema', key: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get table ID from either state or dataTransfer (for cross-browser support)
    const tableId = draggedTable || e.dataTransfer.getData('text/plain');
    console.log('[ModelTree] Drop event fired:', type, key, 'tableId:', tableId);
    
    if (!tableId) {
      console.log('[ModelTree] No dragged table, aborting drop');
      setDraggedTable(null);
      setDropTarget(null);
      return;
    }
    
    // Get fresh tables from store to avoid stale closure
    const currentTables = useModelStore.getState().tables;
    const table = currentTables.find(t => t.id === tableId);
    if (!table) {
      console.log('[ModelTree] Table not found:', tableId);
      setDraggedTable(null);
      setDropTarget(null);
      return;
    }
    
    console.log('[ModelTree] Dropping table:', table.name, '(', table.database, '.', table.schema, ') onto', type, key);
    
    // Get updateTable directly from store for reliability
    const storeUpdateTable = useModelStore.getState().updateTable;
    
    if (type === 'database') {
      const dbName = key === 'unassigned' ? undefined : key;
      // When moving to a different database, clear schema
      // When moving within same database, keep schema
      const currentDb = table.database || 'unassigned';
      const targetDb = key;
      
      if (currentDb !== targetDb) {
        console.log('[ModelTree] Moving to different database, clearing schema');
        storeUpdateTable(tableId, { database: dbName, schema: undefined });
      } else {
        console.log('[ModelTree] Same database, keeping schema');
        // Same database, just update to make sure
        storeUpdateTable(tableId, { database: dbName });
      }
      
      // Expand the target database to show the table
      setExpandedDatabases(prev => new Set(prev).add(key));
      
      // Remove from empty databases since it now has a table
      setEmptyDatabases(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else if (type === 'schema') {
      const [dbName, ...schemaParts] = key.split('.');
      const schemaName = schemaParts.join('.');
      console.log('[ModelTree] Splitting key "' + key + '" into database:', dbName, 'schema:', schemaName);
      const finalDb = dbName === 'unassigned' ? undefined : dbName;
      const finalSchema = schemaName === 'unassigned' ? undefined : schemaName;
      console.log('[ModelTree] Updating table with database:', finalDb, 'schema:', finalSchema);
      storeUpdateTable(tableId, { 
        database: finalDb,
        schema: finalSchema
      });
      
      // Expand the target database and schema to show the table
      setExpandedDatabases(prev => new Set(prev).add(dbName));
      setExpandedSchemas(prev => new Set(prev).add(key));
      
      // Remove from empty schemas since it now has a table
      setEmptySchemas(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    
    console.log('[ModelTree] Drop completed, clearing drag state');
    setDraggedTable(null);
    setDropTarget(null);
  }, [draggedTable, setEmptySchemas, setEmptyDatabases]);

  const handleAddDatabase = useCallback(() => {
    console.log('[ModelTree] handleAddDatabase called');
    
    // Get existing databases to generate a unique name
    const currentTables = useModelStore.getState().tables;
    const currentEmptyDatabases = useModelStore.getState().emptyDatabases;
    
    // Collect all existing database names
    const existingDbNames = new Set<string>();
    currentTables.forEach(table => {
      if (table.database) {
        existingDbNames.add(table.database);
      }
    });
    currentEmptyDatabases.forEach(dbName => {
      existingDbNames.add(dbName);
    });
    
    // Generate unique database name
    let newDbName = 'new_database';
    let counter = 2;
    while (existingDbNames.has(newDbName)) {
      newDbName = `new_database_${counter}`;
      counter++;
    }
    
    console.log('[ModelTree] Setting renaming item:', { type: 'database', key: newDbName, value: newDbName });
    setRenamingItem({ type: 'database', key: newDbName, value: newDbName });
    setExpandedDatabases(prev => new Set(prev).add(newDbName));
  }, []);

  const handleAddSchema = useCallback((dbName: string) => {
    // Get existing schemas to generate a unique name
    const currentTables = useModelStore.getState().tables;
    const currentEmptySchemas = useModelStore.getState().emptySchemas;
    
    // Collect all existing schema names for this database
    const existingSchemaNames = new Set<string>();
    currentTables.forEach(table => {
      if (table.database === dbName && table.schema) {
        existingSchemaNames.add(table.schema);
      }
    });
    currentEmptySchemas.forEach(key => {
      if (key.startsWith(`${dbName}.`)) {
        existingSchemaNames.add(key.split('.').slice(1).join('.'));
      }
    });
    
    // Generate unique schema name
    let newSchemaName = 'new_schema';
    let counter = 2;
    while (existingSchemaNames.has(newSchemaName)) {
      newSchemaName = `new_schema_${counter}`;
      counter++;
    }
    
    const key = `${dbName}.${newSchemaName}`;
    setRenamingItem({ type: 'schema', key, value: newSchemaName });
    // Ensure the database is expanded so the new schema is visible
    setExpandedDatabases(prev => new Set(prev).add(dbName));
    setExpandedSchemas(prev => new Set(prev).add(key));
  }, []);

  const TreeItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    selected?: boolean;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onExpand?: () => void;
    onNavigate?: () => void;
    onShowInDiagram?: () => void;
    expanded?: boolean;
    hasChildren?: boolean;
    level?: number;
    badge?: string | number;
    secondaryLabel?: string;
    isHidden?: boolean;
    onRename?: () => void;
    onAddChild?: () => void;
    isRenaming?: boolean;
    renamingValue?: string;
    onRenamingValueChange?: (value: string) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    isDragTarget?: boolean;
    draggable?: boolean;
    tableId?: string; // For instant pointer drag
    onPointerDragStart?: (tableId: string, tableName: string, e: React.PointerEvent) => void;
    dropTargetType?: 'database' | 'schema';
    dropTargetKey?: string;
    onRegisterDropTarget?: (type: 'database' | 'schema', key: string, element: HTMLElement | null) => void;
  }> = ({ icon, label, selected, onClick, onDoubleClick, onExpand, onNavigate, onShowInDiagram, expanded, hasChildren, level = 0, badge, secondaryLabel, isHidden, onRename: _onRename, onAddChild, isRenaming, renamingValue, onRenamingValueChange, onDragStart: _onDragStart, onDragOver: _onDragOver, onDragLeave: _onDragLeave, onDrop: _onDrop, isDragTarget, draggable, tableId, onPointerDragStart, dropTargetType, dropTargetKey, onRegisterDropTarget }) => {
    const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const dragDelayTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingDragEventRef = React.useRef<React.PointerEvent | null>(null);
    const isDraggingRef = React.useRef(false);
    const elementRef = React.useRef<HTMLDivElement>(null);
    
    // Register this element as a drop target if it's a database or schema
    React.useEffect(() => {
      if (dropTargetType && dropTargetKey && onRegisterDropTarget) {
        onRegisterDropTarget(dropTargetType, dropTargetKey, elementRef.current);
        return () => onRegisterDropTarget(dropTargetType, dropTargetKey, null);
      }
    }, [dropTargetType, dropTargetKey, onRegisterDropTarget]);
    
    // Update bounds when scrolling or resizing
    React.useEffect(() => {
      if (!dropTargetType || !dropTargetKey || !onRegisterDropTarget || !elementRef.current) return;
      
      const updateBounds = () => {
        if (elementRef.current) {
          onRegisterDropTarget(dropTargetType, dropTargetKey, elementRef.current);
        }
      };
      
      // Update on scroll
      const scrollContainer = elementRef.current.closest('[style*="overflow"]');
      scrollContainer?.addEventListener('scroll', updateBounds);
      window.addEventListener('resize', updateBounds);
      
      return () => {
        scrollContainer?.removeEventListener('scroll', updateBounds);
        window.removeEventListener('resize', updateBounds);
      };
    }, [dropTargetType, dropTargetKey, onRegisterDropTarget]);
    
    const handleClick = (_e: React.MouseEvent) => {
      if (isRenaming || isDraggingRef.current) return;
      
      // For draggable items, don't execute click on first mousedown
      // Let the pointerdown handler decide if it's a drag or click
      if (draggable) {
        onClick?.();
        return;
      }
      
      if (onDoubleClick) {
        // If double-click handler exists, delay onClick to distinguish from double-click
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
        }
        
        clickTimerRef.current = setTimeout(() => {
          console.log('[TreeItem] Single click confirmed for:', label);
          onClick?.();
        }, 200);
      } else {
        // No double-click handler - execute immediately
        onClick?.();
      }
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
      if (isRenaming || isDraggingRef.current) return;
      
      // Cancel the pending single-click
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      
      e.stopPropagation();
      console.log('[TreeItem] Double click detected for:', label);
      onDoubleClick?.();
    };
    
    // Pointer-based drag with slight delay for draggable items
    // Delay allows single click to select the table
    const DRAG_DELAY_MS = 150;
    
    const handlePointerDown = (e: React.PointerEvent) => {
      if (!draggable || isRenaming || !tableId || !onPointerDragStart) return;
      
      // Only handle primary button (left click)
      if (e.button !== 0) return;
      
      // Store the event details for later use (event object may be reused)
      pendingDragEventRef.current = e;
      
      // Start a delayed timer - if held long enough, start drag
      dragDelayTimerRef.current = setTimeout(() => {
        if (pendingDragEventRef.current && tableId) {
          isDraggingRef.current = true;
          // Capture pointer for tracking outside element
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onPointerDragStart(tableId, label, pendingDragEventRef.current);
        }
        pendingDragEventRef.current = null;
      }, DRAG_DELAY_MS);
    };
    
    const handlePointerUp = (_e: React.PointerEvent) => {
      // Cancel drag delay if pointer released before delay expired
      if (dragDelayTimerRef.current) {
        clearTimeout(dragDelayTimerRef.current);
        dragDelayTimerRef.current = null;
      }
      pendingDragEventRef.current = null;
      // Don't reset isDraggingRef here - let the global handlePointerUp do that
    };
    
    return (
    <div
      ref={elementRef}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={draggable ? handlePointerDown : undefined}
      onPointerUp={draggable ? handlePointerUp : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 8px',
        paddingLeft: `${8 + level * 14}px`,
        cursor: draggable ? 'grab' : 'pointer',
        background: isDragTarget
          ? (isDark ? 'rgba(99, 102, 241, 0.35)' : '#c7d2fe')
          : selected 
          ? (isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff')
          : 'transparent',
        borderRadius: '6px',
        margin: '1px 6px',
        transition: isDragTarget ? 'none' : 'all 0.15s',
        borderLeft: isDragTarget
          ? '3px solid #6366f1'
          : selected ? '2px solid #6366f1' : '2px solid transparent',
        boxShadow: isDragTarget ? (isDark ? '0 0 0 1px rgba(99, 102, 241, 0.5) inset' : '0 0 0 1px rgba(99, 102, 241, 0.4) inset') : 'none',
        userSelect: draggable ? 'none' : 'auto',
        WebkitUserSelect: draggable ? 'none' : 'auto',
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
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renamingValue}
            onChange={(e) => {
              e.stopPropagation();
              onRenamingValueChange?.(e.target.value);
            }}
            onBlur={(e) => {
              e.stopPropagation();
              setRenamingItem(null);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              handleRenameKeyDown(e);
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            autoFocus
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#374151',
              background: isDark ? '#0d1117' : 'white',
              border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
              borderRadius: '4px',
              padding: '2px 6px',
              outline: 'none',
              width: '100%',
            }}
          />
        ) : (
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
        )}
        {secondaryLabel && !isRenaming && (
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

      {onAddChild && !isRenaming && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddChild(); }}
          title="Add schema"
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
            e.currentTarget.style.color = '#22c55e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = isDark ? '#8b949e' : '#9ca3af';
          }}
        >
          <Plus size={12} />
        </button>
      )}

      {onNavigate && !isRenaming && (
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

      {onShowInDiagram && !isRenaming && (
        <button
          onClick={(e) => { e.stopPropagation(); onShowInDiagram(); }}
          title={isHidden ? "Show in diagram" : "Hide from diagram"}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isHidden ? (isDark ? '#6b7280' : '#9ca3af') : (isDark ? '#8b949e' : '#9ca3af'),
            borderRadius: '4px',
            transition: 'all 0.15s',
            opacity: isHidden ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
            e.currentTarget.style.color = '#6366f1';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = isHidden ? (isDark ? '#6b7280' : '#9ca3af') : (isDark ? '#8b949e' : '#9ca3af');
            e.currentTarget.style.opacity = isHidden ? '0.5' : '1';
          }}
        >
          {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
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
  };

  // Drag ghost element that follows the cursor
  const DragGhost = () => {
    if (!dragPosition || !draggedTableName) return null;
    
    return (
      <div
        style={{
          position: 'fixed',
          left: dragPosition.x + 10,
          top: dragPosition.y - 10,
          background: isDark ? '#1e293b' : 'white',
          border: `2px solid #6366f1`,
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 500,
          color: isDark ? '#e2e8f0' : '#1f2937',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Table size={12} />
        {draggedTableName}
      </div>
    );
  };

  if (viewMode !== 'physical') {
    const unassignedEntities = filteredConceptualData.entities.filter(e => !e.dataModelId);

    return (
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '8px', paddingBottom: '80px' }}>
        {dataModels.length === 0 && entities.length === 0 && entityGroups.length === 0 && (
          <div style={{ 
            padding: '32px 16px', 
            textAlign: 'center', 
            color: isDark ? '#8b949e' : '#9ca3af' 
          }}>
            <Layers size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '13px' }}>No models yet</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              Click "Insert" to add a data model
            </div>
          </div>
        )}

        {searchQuery && filteredConceptualData.dataModels.length === 0 &&
         filteredConceptualData.entities.length === 0 && 
         filteredConceptualData.entityGroups.length === 0 && 
         filteredConceptualData.relationships.length === 0 && 
         (dataModels.length > 0 || entities.length > 0 || entityGroups.length > 0 || relationships.length > 0) && (
          <div style={{ 
            padding: '32px 16px', 
            textAlign: 'center', 
            color: isDark ? '#8b949e' : '#9ca3af' 
          }}>
            <div style={{ fontSize: '13px' }}>No matches found</div>
          </div>
        )}

        {filteredConceptualData.dataModels.map(model => {
          const modelEntities = filteredConceptualData.entities.filter(e => e.dataModelId === model.id);
          const modelEntityIds = new Set(modelEntities.map(e => e.id));
          const modelGroups = filteredConceptualData.entityGroups.filter(g =>
            g.entityIds.some(entityId => modelEntityIds.has(entityId))
          );
          const groupedEntityIds = new Set(modelGroups.flatMap(g => g.entityIds));
          const ungroupedModelEntities = modelEntities.filter(e => !groupedEntityIds.has(e.id));
          const isModelExpanded = expandedDataModels.has(model.id);

          return (
            <div key={model.id}>
              <TreeItem
                icon={<Layers size={12} />}
                label={model.name}
                secondaryLabel={model.description}
                selected={selectedId === model.id}
                onClick={() => {
                  setRenamingItem(null);
                  setSelected(model.id);
                  if (!isModelExpanded) toggleDataModelExpand(model.id);
                }}
                onExpand={() => toggleDataModelExpand(model.id)}
                expanded={isModelExpanded}
                hasChildren={modelEntities.length > 0}
                badge={modelEntities.length}
              />

              {isModelExpanded && modelGroups.map(group => {
                const isExpanded = expandedGroups.has(group.id);
                const groupEntities = group.entityIds
                  .map(id => modelEntities.find(e => e.id === id))
                  .filter(Boolean) as typeof entities;

                return (
                  <div key={group.id}>
                    <TreeItem
                      icon={<FolderOpen size={12} />}
                      label={group.name}
                      selected={selectedId === group.id}
                      onClick={() => {
                        setRenamingItem(null);
                        setSelected(group.id);
                        if (!isExpanded) toggleGroupExpand(group.id);
                      }}
                      onExpand={() => toggleGroupExpand(group.id)}
                      expanded={isExpanded}
                      hasChildren={groupEntities.length > 0}
                      level={1}
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
                            onClick={() => {
                              setRenamingItem(null);
                              setSelected(entity.id);
                              if (!isEntityExpanded) toggleEntityExpand(entity.id);
                            }}
                            onExpand={() => toggleEntityExpand(entity.id)}
                            onShowInDiagram={() => toggleEntityVisibility(entity.id)}
                            isHidden={hiddenEntityIds.has(entity.id)}
                            expanded={isEntityExpanded}
                            hasChildren={entityTables.length > 0}
                            level={2}
                            badge={entityTables.length > 0 ? entityTables.length : undefined}
                          />

                          {isEntityExpanded && entityTables.map(table => (
                            <TreeItem
                              key={table.id}
                              icon={<Table size={12} />}
                              label={table.name}
                              selected={selectedId === table.id}
                              onClick={() => { setRenamingItem(null); setViewMode('physical'); setSelected(table.id); }}
                              onDoubleClick={() => { setViewMode('physical'); setSelected(table.id); }}
                              onNavigate={() => { setViewMode('physical'); setSelected(table.id); }}
                              level={3}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {isModelExpanded && ungroupedModelEntities.map(entity => {
                const entityTables = getTablesForEntity(entity.id);
                const isEntityExpanded = expandedEntities.has(entity.id);

                return (
                  <div key={entity.id}>
                    <TreeItem
                      icon={<Box size={12} />}
                      label={entity.name}
                      secondaryLabel={entity.description}
                      selected={selectedId === entity.id}
                      onClick={() => {
                        setRenamingItem(null);
                        setSelected(entity.id);
                        if (!isEntityExpanded) toggleEntityExpand(entity.id);
                      }}
                      onExpand={() => toggleEntityExpand(entity.id)}
                      onShowInDiagram={() => toggleEntityVisibility(entity.id)}
                      isHidden={hiddenEntityIds.has(entity.id)}
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
                        onClick={() => { setRenamingItem(null); setViewMode('physical'); setSelected(table.id); }}
                        onDoubleClick={() => { setRenamingItem(null); setViewMode('physical'); setSelected(table.id); }}
                        onNavigate={() => { setRenamingItem(null); setViewMode('physical'); setSelected(table.id); }}
                        level={2}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}

        {unassignedEntities.length > 0 && (
          <>
            <div style={{
              padding: '8px 20px 4px',
              fontSize: '10px',
              fontWeight: 600,
              color: isDark ? '#8b949e' : '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Unassigned
            </div>
            {unassignedEntities.map(entity => {
              const entityTables = getTablesForEntity(entity.id);
              const isEntityExpanded = expandedEntities.has(entity.id);

              return (
                <div key={entity.id}>
                  <TreeItem
                    icon={<Box size={12} />}
                    label={entity.name}
                    secondaryLabel={entity.description}
                    selected={selectedId === entity.id}
                    onClick={() => {
                      setRenamingItem(null);
                      setSelected(entity.id);
                      if (!isEntityExpanded) toggleEntityExpand(entity.id);
                    }}
                    onExpand={() => toggleEntityExpand(entity.id)}
                    onShowInDiagram={() => toggleEntityVisibility(entity.id)}
                    isHidden={hiddenEntityIds.has(entity.id)}
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
                      onClick={() => { setRenamingItem(null); setViewMode('physical'); setSelected(table.id); }}
                      onDoubleClick={() => { setRenamingItem(null); setViewMode('physical'); setSelected(table.id); }}
                      onNavigate={() => { setRenamingItem(null); setViewMode('physical'); setSelected(table.id); }}
                      level={1}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}

        {/* Relationships Section */}
        {viewMode === 'conceptual' && filteredConceptualData.relationships.length > 0 && (
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
                  onClick={() => { setRenamingItem(null); setSelected(rel.id); }}
                />
              );
            })}
          </>
        )}
      </div>
    );
  }

  // Physical View - Show Tables Grouped by Entity or Database/Schema
  return (
    <div 
      style={{ flex: 1, overflowY: 'auto', paddingTop: '8px', paddingBottom: '80px' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <DragGhost />
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

      {/* Entity Hierarchy Mode */}
      {physicalHierarchyMode === 'entity' && (
        <>
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
                  onClick={() => { 
                    setRenamingItem(null);
                    setSelected(entity.id); 
                    if (!isEntityExpanded) toggleEntityExpand(entity.id); 
                  }}
                  onExpand={() => toggleEntityExpand(entity.id)}
                  onShowInDiagram={() => { setViewMode('physical'); setSelected(entity.id); }}
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
                    onClick={() => { 
                      setRenamingItem(null); 
                      setSelected(table.id);
                      if (viewMode === 'physical' && navigateToNodeCallback) {
                        navigateToNodeCallback(table.id);
                      }
                    }}
                    onDoubleClick={() => handleRenameStart('table', table.id, table.name)}
                    onShowInDiagram={() => toggleTableVisibility(table.id)}
                    isHidden={hiddenTableIds.has(table.id)}
                    level={1}
                    badge={table.attributes.length}
                    isRenaming={renamingItem?.type === 'table' && renamingItem.key === table.id}
                    renamingValue={renamingItem?.type === 'table' && renamingItem.key === table.id ? renamingItem.value : ''}
                    onRenamingValueChange={(value) => setRenamingItem(prev => prev ? { ...prev, value } : null)}
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
                  onClick={() => { 
                    setRenamingItem(null); 
                    setSelected(table.id);
                    if (viewMode === 'physical' && navigateToNodeCallback) {
                      navigateToNodeCallback(table.id);
                    }
                  }}
                  onDoubleClick={() => handleRenameStart('table', table.id, table.name)}
                  onShowInDiagram={() => toggleTableVisibility(table.id)}
                  isHidden={hiddenTableIds.has(table.id)}
                  badge={table.attributes.length}
                  isRenaming={renamingItem?.type === 'table' && renamingItem.key === table.id}
                  renamingValue={renamingItem?.type === 'table' && renamingItem.key === table.id ? renamingItem.value : ''}
                  onRenamingValueChange={(value) => setRenamingItem(prev => prev ? { ...prev, value } : null)}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* Database/Schema Hierarchy Mode */}
      {physicalHierarchyMode === 'database' && (
        <>
          {/* Add Database Button */}
          <div style={{ padding: '8px 12px' }}>
            <button
              onClick={handleAddDatabase}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: `1px dashed ${isDark ? '#30363d' : '#d1d5db'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: isDark ? '#8b949e' : '#6b7280',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.color = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
              }}
            >
              <Plus size={14} />
              Add Database
            </button>
          </div>
          
          {(() => {
            // Get all database entries from hierarchy
            const databaseEntries: [string, SchemaMap][] = Object.entries(databaseHierarchy);
            
            // Check if we're renaming a new database
            const renamingNewDatabase = renamingItem?.type === 'database' && 
              !databaseEntries.some(([dbName]) => dbName === renamingItem.key);
            
            // Add the new database being renamed if it doesn't exist yet
            const allDatabases: [string, SchemaMap][] = renamingNewDatabase
              ? [...databaseEntries, [renamingItem!.key, {} as SchemaMap]]
              : databaseEntries;
            
            // Add any empty databases
            const emptyDatabasesList: [string, SchemaMap][] = Array.from(emptyDatabases)
              .filter(dbName => !allDatabases.some(([name]) => name === dbName))
              .map(dbName => [dbName, {} as SchemaMap]);
            
            const finalDatabases: [string, SchemaMap][] = [...allDatabases, ...emptyDatabasesList];
            
            return finalDatabases.map(([dbName, schemas]) => {
            const isDatabaseExpanded = expandedDatabases.has(dbName);
            const dbTables = Object.values(schemas).flat();
            const tableCount = dbTables.length;
            const allTablesHidden = dbTables.length > 0 && dbTables.every(t => hiddenTableIds.has(t.id));
            
            return (
              <div key={dbName}>
                <TreeItem
                  key={`db-${dbName}`}
                  icon={<Database size={12} />}
                  label={dbName === 'unassigned' ? 'Unassigned' : dbName}
                  selected={selectedId === `db-${dbName}`}
                  onClick={() => {
                    // Don't select if we're in the middle of a drag operation
                    if (!draggedTable) {
                      setSelected(`db-${dbName}`);
                      if (!isDatabaseExpanded) {
                        toggleDatabaseExpand(dbName);
                      }
                    }
                  }}
                  onDoubleClick={() => handleRenameStart('database', dbName, dbName)}
                  onExpand={() => toggleDatabaseExpand(dbName)}
                  onShowInDiagram={() => {
                    // If all tables are hidden, show them all. Otherwise hide them all.
                    if (allTablesHidden) {
                      // Show all tables
                      dbTables.forEach(table => {
                        if (hiddenTableIds.has(table.id)) {
                          toggleTableVisibility(table.id);
                        }
                      });
                    } else {
                      // Hide all tables
                      dbTables.forEach(table => {
                        if (!hiddenTableIds.has(table.id)) {
                          toggleTableVisibility(table.id);
                        }
                      });
                    }
                  }}
                  isHidden={allTablesHidden}
                  expanded={isDatabaseExpanded}
                  hasChildren={Object.keys(schemas).length > 0}
                  badge={tableCount}
                  onAddChild={() => handleAddSchema(dbName)}
                  isRenaming={renamingItem?.type === 'database' && renamingItem.key === dbName}
                  renamingValue={renamingItem?.type === 'database' && renamingItem.key === dbName ? renamingItem.value : ''}
                  onRenamingValueChange={(value) => setRenamingItem(prev => prev ? { ...prev, value } : null)}
                  onDragOver={(e) => handleDragOver('database', dbName, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop('database', dbName, e)}
                  isDragTarget={dropTarget?.type === 'database' && dropTarget.key === dbName}
                  dropTargetType="database"
                  dropTargetKey={dbName}
                  onRegisterDropTarget={registerDropTarget}
                />
                
                {isDatabaseExpanded && (() => {
                  // Get all schema entries from the hierarchy
                  const schemaEntries: [string, PhysicalTable[]][] = Object.entries(schemas);
                  
                  // Check if we're renaming a new schema for this database
                  const renamingNewSchema = renamingItem?.type === 'schema' && 
                    renamingItem.key.startsWith(`${dbName}.`) &&
                    !schemaEntries.some(([schemaName]) => `${dbName}.${schemaName}` === renamingItem.key);
                  
                  // Add any empty schemas for this database
                  const emptySchemasList: [string, PhysicalTable[]][] = Array.from(emptySchemas)
                    .filter(key => key.startsWith(`${dbName}.`))
                    .map(key => [key.split('.').slice(1).join('.'), []]);
                  
                  // If we're renaming a new schema, extract the schema name from the key
                  const newSchemaEntry: [string, PhysicalTable[]][] = renamingNewSchema
                    ? [[renamingItem!.key.split('.').slice(1).join('.'), []]]
                    : [];
                  
                  // Combine all schemas: existing + empty + new being renamed
                  const allSchemas: [string, PhysicalTable[]][] = [...schemaEntries, ...emptySchemasList, ...newSchemaEntry];
                  
                  // Remove duplicates (if an empty schema now has tables)
                  const uniqueSchemas: [string, PhysicalTable[]][] = Array.from(
                    new Map(allSchemas.map(([name, schemaTables]) => [name, schemaTables])).entries()
                  );
                  
                  return uniqueSchemas.map(([schemaName, schemaTables]) => {
                  const isSchemaExpanded = expandedSchemas.has(`${dbName}.${schemaName}`);
                  const allSchemaTablesHidden = schemaTables.length > 0 && schemaTables.every(t => hiddenTableIds.has(t.id));
                  
                  return (
                    <div key={`${dbName}.${schemaName}`}>
                      <TreeItem
                        key={`schema-${dbName}-${schemaName}`}
                        icon={<Layers size={12} />}
                        label={schemaName === 'unassigned' ? 'Unassigned' : schemaName}
                        selected={selectedId === `schema-${dbName}-${schemaName}`}
                        onClick={() => {
                          // Don't select if we're in the middle of a drag operation
                          if (!draggedTable) {
                            setSelected(`schema-${dbName}-${schemaName}`);
                            if (!isSchemaExpanded) {
                              toggleSchemaExpand(`${dbName}.${schemaName}`);
                            }
                          }
                        }}
                        onDoubleClick={() => handleRenameStart('schema', `${dbName}.${schemaName}`, schemaName)}
                        onExpand={() => toggleSchemaExpand(`${dbName}.${schemaName}`)}
                        onShowInDiagram={() => {
                          // If all tables are hidden, show them all. Otherwise hide them all.
                          if (allSchemaTablesHidden) {
                            // Show all tables
                            schemaTables.forEach(table => {
                              if (hiddenTableIds.has(table.id)) {
                                toggleTableVisibility(table.id);
                              }
                            });
                          } else {
                            // Hide all tables
                            schemaTables.forEach(table => {
                              if (!hiddenTableIds.has(table.id)) {
                                toggleTableVisibility(table.id);
                              }
                            });
                          }
                        }}
                        isHidden={allSchemaTablesHidden}
                        expanded={isSchemaExpanded}
                        hasChildren={schemaTables.length > 0}
                        badge={schemaTables.length}
                        level={1}
                        isRenaming={renamingItem?.type === 'schema' && renamingItem.key === `${dbName}.${schemaName}`}
                        renamingValue={renamingItem?.type === 'schema' && renamingItem.key === `${dbName}.${schemaName}` ? renamingItem.value : ''}
                        onRenamingValueChange={(value) => setRenamingItem(prev => prev ? { ...prev, value } : null)}
                        onDragOver={(e) => handleDragOver('schema', `${dbName}.${schemaName}`, e)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop('schema', `${dbName}.${schemaName}`, e)}
                        isDragTarget={dropTarget?.type === 'schema' && dropTarget.key === `${dbName}.${schemaName}`}
                        dropTargetType="schema"
                        dropTargetKey={`${dbName}.${schemaName}`}
                        onRegisterDropTarget={registerDropTarget}
                      />
                      
                      {isSchemaExpanded && schemaTables.map(table => (
                        <TreeItem
                          key={table.id}
                          icon={<Table size={12} />}
                          label={table.name}
                          selected={selectedId === table.id}
                          onClick={() => { 
                            // Only update selection if not dragging
                            if (!draggedTable) {
                              setRenamingItem(null); 
                              setSelected(table.id);
                              if (viewMode === 'physical' && navigateToNodeCallback) {
                                navigateToNodeCallback(table.id);
                              }
                            }
                          }}
                          onDoubleClick={() => handleRenameStart('table', table.id, table.name)}
                          onShowInDiagram={() => toggleTableVisibility(table.id)}
                          isHidden={hiddenTableIds.has(table.id)}
                          level={2}
                          badge={table.attributes.length}
                          draggable={true}
                          tableId={table.id}
                          onPointerDragStart={handlePointerDragStart}
                          isRenaming={renamingItem?.type === 'table' && renamingItem.key === table.id}
                          renamingValue={renamingItem?.type === 'table' && renamingItem.key === table.id ? renamingItem.value : ''}
                          onRenamingValueChange={(value) => setRenamingItem(prev => prev ? { ...prev, value } : null)}
                        />
                      ))}
                    </div>
                  );
                });
              })()}
              </div>
            );
          });
        })()}
        </>
      )}
    </div>
  );
};
