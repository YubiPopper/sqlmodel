import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ReactFlow, { 
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Table, Trash2, Key, Link, MoreVertical, Copy, FileCode, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput, ColorPicker, SelectInput } from './FormComponents';
import type { PhysicalTable, Attribute } from '../../../model/schemas';
import { AddTableDialog } from '../../ui/AddTableDialog';
import { AISettingsDialog } from '../../ui/AISettingsDialog';

// Mini table node for lineage view
const LineageTableNode = ({ data }: { data: { table: PhysicalTable; isCenter: boolean; colorMode: string } }) => {
  const isDark = data.colorMode === 'dark';
  const isCenter = data.isCenter;
  
  return (
    <div style={{
      background: isDark ? '#161b22' : '#ffffff',
      border: `1.5px solid ${isCenter ? '#22c55e' : (isDark ? '#30363d' : '#e5e7eb')}`,
      borderRadius: '4px',
      padding: '3px 6px',
      boxShadow: isCenter 
        ? (isDark ? '0 0 6px rgba(34, 197, 94, 0.3)' : '0 0 6px rgba(34, 197, 94, 0.2)')
        : 'none',
    }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />
      <div style={{
        fontSize: '8px',
        fontWeight: 600,
        color: isCenter ? '#22c55e' : (isDark ? '#e6edf3' : '#374151'),
        fontFamily: 'ui-monospace, monospace',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        {data.table.name}
      </div>
    </div>
  );
};

const lineageNodeTypes = {
  lineageTable: LineageTableNode,
};

// Lineage Graph Component
interface LineageGraphProps {
  table: PhysicalTable;
  tables: PhysicalTable[];
  outgoingFKs: any[];
  incomingFKs: any[];
  colorMode: string;
  onSelectTable: (tableId: string) => void;
}

const LineageGraphInner: React.FC<LineageGraphProps> = ({ 
  table, 
  tables, 
  outgoingFKs, 
  incomingFKs, 
  colorMode,
  onSelectTable 
}) => {
  const { fitView } = useReactFlow();
  const isDark = colorMode === 'dark';
  
  // Build nodes and edges for the mini graph
  const { nodes, edges } = useMemo(() => {
    const nodeList: Node[] = [];
    const edgeList: Edge[] = [];
    
    // Collect unique incoming/outgoing tables first to determine layout
    const incomingTableMap = new Map<string, { table: PhysicalTable; fk: any }>();
    incomingFKs.forEach((fk) => {
      const sourceTable = tables.find(t => t.id === fk.fromTableId);
      if (sourceTable && sourceTable.id !== table.id && !incomingTableMap.has(sourceTable.id)) {
        incomingTableMap.set(sourceTable.id, { table: sourceTable, fk });
      }
    });
    
    const outgoingTableMap = new Map<string, { table: PhysicalTable; fk: any }>();
    outgoingFKs.forEach((fk) => {
      const targetTable = tables.find(t => t.id === fk.toTableId);
      if (targetTable && targetTable.id !== table.id && !outgoingTableMap.has(targetTable.id)) {
        outgoingTableMap.set(targetTable.id, { table: targetTable, fk });
      }
    });
    
    const hasIncoming = incomingTableMap.size > 0;
    const hasOutgoing = outgoingTableMap.size > 0;
    
    // Calculate layout positions - wider spacing for long names
    const maxSideNodes = Math.max(incomingTableMap.size, outgoingTableMap.size, 1);
    const nodeHeight = 20;
    const nodeSpacing = 8;
    const totalHeight = maxSideNodes * nodeHeight + (maxSideNodes - 1) * nodeSpacing;
    const centerY = totalHeight / 2 - nodeHeight / 2;
    
    // Determine center X based on whether we have incoming/outgoing - more spacing
    const centerX = hasIncoming && hasOutgoing ? 150 : (hasIncoming ? 180 : (hasOutgoing ? 80 : 120));
    
    // Center node (current table)
    nodeList.push({
      id: table.id,
      type: 'lineageTable',
      position: { x: centerX, y: centerY },
      data: { table, isCenter: true, colorMode },
      draggable: false,
    });
    
    // Position incoming nodes on left
    const incomingTables = Array.from(incomingTableMap.values());
    const incomingStartY = (totalHeight - (incomingTables.length * nodeHeight + (incomingTables.length - 1) * nodeSpacing)) / 2;
    incomingTables.forEach(({ table: sourceTable, fk }, index) => {
      nodeList.push({
        id: sourceTable.id,
        type: 'lineageTable',
        position: { x: 0, y: incomingStartY + index * (nodeHeight + nodeSpacing) },
        data: { table: sourceTable, isCenter: false, colorMode },
        draggable: false,
      });
      
      edgeList.push({
        id: fk.id,
        source: sourceTable.id,
        target: table.id,
        type: 'smoothstep',
        style: { stroke: '#22c55e', strokeWidth: 1.5 },
      });
    });
    
    // Position outgoing nodes on right
    const outgoingTables = Array.from(outgoingTableMap.values());
    const outgoingStartY = (totalHeight - (outgoingTables.length * nodeHeight + (outgoingTables.length - 1) * nodeSpacing)) / 2;
    outgoingTables.forEach(({ table: targetTable, fk }, index) => {
      nodeList.push({
        id: targetTable.id,
        type: 'lineageTable',
        position: { x: centerX + 120, y: outgoingStartY + index * (nodeHeight + nodeSpacing) },
        data: { table: targetTable, isCenter: false, colorMode },
        draggable: false,
      });
      
      edgeList.push({
        id: fk.id,
        source: table.id,
        target: targetTable.id,
        type: 'smoothstep',
        style: { stroke: '#6366f1', strokeWidth: 1.5 },
      });
    });
    
    return { nodes: nodeList, edges: edgeList };
  }, [table, tables, outgoingFKs, incomingFKs, colorMode]);
  
  // Fit view after nodes change
  React.useEffect(() => {
    setTimeout(() => fitView({ padding: 0.15, maxZoom: 1 }), 50);
  }, [nodes.length, fitView]);
  
  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id !== table.id) {
      onSelectTable(node.id);
    }
  }, [table.id, onSelectTable]);
  
  return (
    <div style={{
      height: '100px',
      background: isDark ? '#0d1117' : '#f9fafb',
      borderRadius: '6px',
      border: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
      overflow: 'hidden',
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={lineageNodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={true}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
};

const LineageGraph: React.FC<LineageGraphProps> = (props) => (
  <ReactFlowProvider>
    <LineageGraphInner {...props} />
  </ReactFlowProvider>
);

interface TableInspectorProps {
  table: PhysicalTable;
}

export const TableInspector: React.FC<TableInspectorProps> = ({ table }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showAIEditDialog, setShowAIEditDialog] = useState(false);
  const [showAISettingsDialog, setShowAISettingsDialog] = useState(false);
  const [colorExpanded, setColorExpanded] = useState(false);
  const [columnsExpanded, setColumnsExpanded] = useState(false);
  const [lineageExpanded, setLineageExpanded] = useState(true);
  const updateTable = useModelStore(state => state.updateTable);
  const updateTableAttribute = useModelStore(state => state.updateTableAttribute);
  const deleteTable = useModelStore(state => state.deleteTable);
  const tables = useModelStore(state => state.tables);
  const entities = useModelStore(state => state.entities);
  const foreignKeys = useModelStore(state => state.foreignKeys);
  const setSelected = useModelStore(state => state.setSelected);
  const selectedTableAttribute = useModelStore(state => state.selectedTableAttribute);
  const setSelectedTableAttribute = useModelStore(state => state.setSelectedTableAttribute);
  const emptyDatabases = useModelStore(state => state.emptyDatabases);
  const emptySchemas = useModelStore(state => state.emptySchemas);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';

  const databaseOptions = useMemo(() => {
    const dbSet = new Set<string>();
    tables.forEach((t) => {
      if (t.database) dbSet.add(t.database);
    });
    emptyDatabases.forEach((dbName) => dbSet.add(dbName));
    if (table.database) dbSet.add(table.database);

    return [
      { value: '', label: 'Unassigned' },
      ...Array.from(dbSet)
        .sort((a, b) => a.localeCompare(b))
        .map((db) => ({ value: db, label: db })),
    ];
  }, [tables, emptyDatabases, table.database]);

  const schemaOptions = useMemo(() => {
    const targetDb = table.database || '';
    const schemaSet = new Set<string>();
    tables.forEach((t) => {
      const tableDb = t.database || '';
      if (tableDb === targetDb && t.schema) {
        schemaSet.add(t.schema);
      }
    });

    emptySchemas.forEach((key) => {
      const parts = key.split('.');
      const dbName = parts[0] || '';
      const schemaName = parts.slice(1).join('.');
      if (dbName === (targetDb || 'unassigned') && schemaName) {
        schemaSet.add(schemaName);
      }
    });

    if (table.schema) schemaSet.add(table.schema);

    return [
      { value: '', label: 'Unassigned' },
      ...Array.from(schemaSet)
        .sort((a, b) => a.localeCompare(b))
        .map((schema) => ({ value: schema, label: schema })),
    ];
  }, [tables, emptySchemas, table.database, table.schema]);

  const selectedAttribute = useMemo(() => {
    if (!selectedTableAttribute || selectedTableAttribute.tableId !== table.id) return undefined;
    return table.attributes.find((attr) => attr.id === selectedTableAttribute.attrId);
  }, [selectedTableAttribute, table.id, table.attributes]);

  // Normalize stale state: a schema without a database should be unassigned.
  useEffect(() => {
    if (!table.database && table.schema) {
      updateTable(table.id, { schema: undefined });
    }
  }, [table.id, table.database, table.schema, updateTable]);

  const handleDatabaseChange = (value: string) => {
    updateTable(table.id, {
      database: value || undefined,
      schema: undefined,
    });
  };

  const handleSchemaChange = (value: string) => {
    updateTable(table.id, { schema: value || undefined });
  };
  
  // Find FK relationships for this table
  const outgoingFKs = foreignKeys.filter(fk => fk.fromTableId === table.id);
  const incomingFKs = foreignKeys.filter(fk => fk.toTableId === table.id);

  const handleGenerateDDL = () => {
    setShowMenu(false);
    setShowAIEditDialog(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm(`Delete table "${table.name}"? This will also delete all foreign keys connected to it.`)) {
      deleteTable(table.id);
    }
  };

  const handleDuplicateTable = () => {
    setShowMenu(false);
    // TODO: Implement duplicate
    alert('Duplicate feature coming soon');
  };

  const ActionsMenu = () => (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          background: showMenu ? (isDark ? '#30363d' : '#e5e7eb') : 'transparent',
          border: 'none',
          padding: '6px',
          cursor: 'pointer',
          color: isDark ? '#8b949e' : '#6b7280',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MoreVertical size={16} />
      </button>
      
      {showMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: isDark ? '#161b22' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '8px',
            boxShadow: isDark 
              ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
              : '0 8px 24px rgba(0, 0, 0, 0.12)',
            minWidth: '160px',
            zIndex: 1000,
            overflow: 'hidden',
          }}>
            <button
              onClick={handleDuplicateTable}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: isDark ? '#e6edf3' : '#374151',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Copy size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
              Duplicate Table
            </button>
            <button
              onClick={handleGenerateDDL}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: isDark ? '#e6edf3' : '#374151',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <FileCode size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
              Copy DDL
            </button>
            <div style={{ 
              height: '1px', 
              background: isDark ? '#30363d' : '#e5e7eb',
              margin: '4px 0',
            }} />
            <button
              onClick={handleDelete}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#ef4444',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 size={14} />
              Delete Table
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Simplified read-only column row
  const ColumnRow: React.FC<{ attr: Attribute; isSelected?: boolean }> = ({ attr, isSelected }) => {
    const referencedTable = attr.referencesTableId 
      ? tables.find(t => t.id === attr.referencesTableId) 
      : null;
    
    return (
      <div
        onClick={() => {
          setSelected(table.id);
          setSelectedTableAttribute(table.id, attr.id);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          background: isSelected
            ? (isDark ? 'rgba(34, 197, 94, 0.14)' : 'rgba(34, 197, 94, 0.08)')
            : (isDark ? '#161b22' : '#ffffff'),
          borderRadius: '6px',
          marginBottom: '4px',
          border: `1px solid ${isSelected ? '#22c55e' : (isDark ? '#21262d' : '#f3f4f6')}`,
          cursor: 'pointer',
        }}
      >
        {/* Key icon */}
        <div style={{ width: '16px', flexShrink: 0 }}>
          {attr.isPrimaryKey && <Key size={12} style={{ color: '#eab308' }} />}
          {attr.isForeignKey && !attr.isPrimaryKey && <Link size={12} style={{ color: '#6366f1' }} />}
        </div>
        
        {/* Column name */}
        <span style={{
          flex: 1,
          fontSize: '13px',
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 500,
          color: isDark ? '#e6edf3' : '#374151',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {attr.name}
        </span>
        
        {/* Data type badge */}
        <span style={{
          fontSize: '11px',
          fontFamily: 'ui-monospace, monospace',
          color: isDark ? '#8b949e' : '#6b7280',
          background: isDark ? '#0d1117' : '#f3f4f6',
          padding: '2px 6px',
          borderRadius: '4px',
          flexShrink: 0,
        }}>
          {attr.dataType}
        </span>
        
        {/* Constraint badges */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {attr.isPrimaryKey && (
            <span style={{
              fontSize: '9px',
              fontWeight: 600,
              color: '#eab308',
              background: isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3',
              padding: '2px 5px',
              borderRadius: '3px',
            }}>
              PK
            </span>
          )}
          {attr.isForeignKey && (
            <span 
              style={{
                fontSize: '9px',
                fontWeight: 600,
                color: '#6366f1',
                background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
                padding: '2px 5px',
                borderRadius: '3px',
                cursor: referencedTable ? 'pointer' : 'default',
              }}
              title={referencedTable ? `References ${referencedTable.name}` : 'Foreign Key'}
              onClick={() => referencedTable && setSelected(referencedTable.id)}
            >
              FK
            </span>
          )}
          {!attr.isNullable && !attr.isPrimaryKey && (
            <span style={{
              fontSize: '9px',
              fontWeight: 600,
              color: '#22c55e',
              background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
              padding: '2px 5px',
              borderRadius: '3px',
            }}>
              NN
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InspectorHeader
        icon={<Table size={18} />}
        title="Table"
        subtitle={table.name}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {/* AI Revise Button */}
            <button
              onClick={() => setShowAIEditDialog(true)}
              title="Revise with AI"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: isDark ? '#8b949e' : '#6b7280',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isDark ? '#c4b5fd' : '#a855f7';
                e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Sparkles size={16} />
            </button>
            <ActionsMenu />
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px' }}>
        <FormField label="Table Name">
          <TextInput
            value={table.name}
            onChange={(value) => updateTable(table.id, { name: value })}
            placeholder="table_name"
          />
        </FormField>

        <FormField label="Linked Entity">
          <SelectInput
            value={table.entityId || ''}
            onChange={(value) => updateTable(table.id, { entityId: value || undefined })}
            options={[
              { value: '', label: 'None' },
              ...entities.map((e) => ({ value: e.id, label: e.name })),
            ]}
          />
        </FormField>

        <FormField label="Database" hint="Move this table to a database namespace">
          <SelectInput
            value={table.database || ''}
            onChange={handleDatabaseChange}
            options={databaseOptions}
          />
        </FormField>

        <FormField label="Schema" hint="Move this table to a schema in the selected database">
          <SelectInput
            value={table.schema || ''}
            onChange={handleSchemaChange}
            options={schemaOptions}
          />
        </FormField>

        {/* Color Section - Collapsible */}
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => setColorExpanded(!colorExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#e6edf3' : '#374151',
              textAlign: 'left',
            }}
          >
            {colorExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Color
            {table.color && table.color !== 'default' && (
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                background: table.color,
                marginLeft: 'auto',
              }} />
            )}
          </button>
          {colorExpanded && (
            <div style={{ paddingLeft: '22px', paddingTop: '8px' }}>
              <ColorPicker
                value={table.color || 'default'}
                onChange={(color) => updateTable(table.id, { color: color as any })}
              />
            </div>
          )}
        </div>

        {/* Columns Section - Collapsible */}
        <div style={{ marginTop: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: columnsExpanded ? '12px' : '0',
          }}>
            <button
              onClick={() => setColumnsExpanded(!columnsExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#374151',
                textAlign: 'left',
              }}
            >
              {columnsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Columns <span style={{ 
                color: isDark ? '#8b949e' : '#9ca3af',
                fontWeight: 500,
              }}>({table.attributes.length})</span>
            </button>
            {columnsExpanded && table.attributes.length > 0 && (
              <button
                onClick={() => setShowAIEditDialog(true)}
                title="Edit columns with AI"
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  background: 'transparent',
                  color: isDark ? '#8b949e' : '#6b7280',
                  border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDark ? '#c4b5fd' : '#a855f7';
                  e.currentTarget.style.color = isDark ? '#c4b5fd' : '#a855f7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
                  e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
                }}
              >
                <Sparkles size={12} />
                Edit
              </button>
            )}
          </div>

          {columnsExpanded && (
            table.attributes.length === 0 ? (
              <div 
                onClick={() => setShowAIEditDialog(true)}
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: isDark ? '#8b949e' : '#9ca3af',
                  fontSize: '13px',
                  background: isDark ? '#0d1117' : '#f9fafb',
                  borderRadius: '8px',
                  border: `1px dashed ${isDark ? '#30363d' : '#e5e7eb'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDark ? '#c4b5fd' : '#a855f7';
                  e.currentTarget.style.background = isDark ? '#161b22' : '#faf5ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
                  e.currentTarget.style.background = isDark ? '#0d1117' : '#f9fafb';
                }}
              >
                <Sparkles size={16} style={{ marginBottom: '6px', opacity: 0.6 }} />
                <div>Click to add columns</div>
              </div>
            ) : (
              <div>
                {table.attributes.map((attr) => (
                          <ColumnRow
                            key={attr.id}
                            attr={attr}
                            isSelected={selectedAttribute?.id === attr.id}
                          />
                ))}
              </div>
            )
          )}
        </div>

                {selectedAttribute ? (
                  <div style={{ marginTop: '24px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isDark ? '#e6edf3' : '#374151',
                      marginBottom: '12px',
                    }}>
                      Selected Column
                    </div>

                    <FormField label="Column Name">
                      <TextInput
                        value={selectedAttribute.name}
                        onChange={(value) => updateTableAttribute(table.id, selectedAttribute.id, { name: value })}
                        placeholder="column_name"
                      />
                    </FormField>

                    <FormField label="Description" hint="Shown in the inspector for this column">
                      <TextInput
                        value={selectedAttribute.description || ''}
                        onChange={(value) => updateTableAttribute(table.id, selectedAttribute.id, { description: value })}
                        placeholder="Optional column description"
                        multiline
                        rows={4}
                      />
                    </FormField>
                  </div>
                ) : (
                  <div style={{
                    marginTop: '24px',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: `1px dashed ${isDark ? '#30363d' : '#e5e7eb'}`,
                    background: isDark ? '#0d1117' : '#f9fafb',
                    color: isDark ? '#8b949e' : '#6b7280',
                    fontSize: '12px',
                  }}>
                    Click a column on the table to rename it or add a description.
                  </div>
                )}

        {/* Lineage Section */}
        <div style={{ marginTop: '24px' }}>
          <button
            onClick={() => setLineageExpanded(!lineageExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#e6edf3' : '#374151',
              textAlign: 'left',
            }}
          >
            {lineageExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Lineage <span style={{ 
              color: isDark ? '#8b949e' : '#9ca3af',
              fontWeight: 500,
            }}>({outgoingFKs.length + incomingFKs.length})</span>
          </button>

          {lineageExpanded && (
            <div style={{ paddingTop: '12px' }}>
              {(outgoingFKs.length === 0 && incomingFKs.length === 0) ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: isDark ? '#8b949e' : '#9ca3af',
                  fontSize: '13px',
                  background: isDark ? '#0d1117' : '#f9fafb',
                  borderRadius: '12px',
                  border: `2px dashed ${isDark ? '#30363d' : '#e5e7eb'}`,
                }}>
                  No relationships defined
                </div>
              ) : (
                <LineageGraph
                  table={table}
                  tables={tables}
                  outgoingFKs={outgoingFKs}
                  incomingFKs={incomingFKs}
                  colorMode={colorMode}
                  onSelectTable={setSelected}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <AddTableDialog
        isOpen={showAIEditDialog}
        onClose={() => setShowAIEditDialog(false)}
        existingTable={table}
        onOpenAISettings={() => {
          setShowAIEditDialog(false);
          setShowAISettingsDialog(true);
        }}
      />
      
      <AISettingsDialog
        isOpen={showAISettingsDialog}
        onClose={() => setShowAISettingsDialog(false)}
      />
    </div>
  );
};
