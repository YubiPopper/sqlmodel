import React, { useRef, useState } from 'react';
import { 
  FileDown, 
  FilePlus,
  Trash2,
  ArrowDownUp,
  Layers,
  Plus,
  Group,
  PanelLeftClose,
  PanelLeft,
  Download,
  Upload,
  Sparkles
} from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { DropdownButton } from '../../shared/Dropdown';
import type { DropdownItem } from '../../shared/Dropdown';
import type { ConceptualData, LayoutData, PhysicalData } from '../../../model/schemas';
import { ExampleDialog } from '../../ui/ExampleDialog';
import { FullDDLDialog } from '../../ui/FullDDLDialog';
import { AIDialog } from '../../ui/AIDialog';
import { AISettingsDialog } from '../../ui/AISettingsDialog';

export const NavbarActions: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const [showFullDDLDialog, setShowFullDDLDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showAISettingsDialog, setShowAISettingsDialog] = useState(false);
  
  const addEntity = useModelStore(state => state.addEntity);
  const addEntityGroup = useModelStore(state => state.addEntityGroup);
  const addTable = useModelStore(state => state.addTable);
  const updateTable = useModelStore(state => state.updateTable);
  const clearModel = useModelStore(state => state.clearModel);
  const loadModel = useModelStore(state => state.loadModel);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  const autoLayout = useModelStore(state => state.autoLayout);
  const viewMode = useModelStore(state => state.viewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const multiSelectedEntityIds = useModelStore(state => state.multiSelectedEntityIds);
  const multiSelectedTableIds = useModelStore(state => state.multiSelectedTableIds);
  const selectedId = useModelStore(state => state.selectedId);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const entityGroups = useModelStore(state => state.entityGroups);
  const removeEntityFromGroup = useModelStore(state => state.removeEntityFromGroup);
  const clearMultiSelection = useModelStore(state => state.clearMultiSelection);
  const leftSidebarCollapsed = useModelStore(state => state.leftSidebarCollapsed);
  const toggleLeftSidebar = useModelStore(state => state.toggleLeftSidebar);

  const isDark = colorMode === 'dark';

  const handleSave = () => {
    const state = useModelStore.getState();
    const conceptual: ConceptualData = {
      entities: state.entities,
      relationships: state.relationships,
      groups: state.entityGroups
    };
    
    // Include physical data (tables, foreignKeys, tableGroups)
    const physical: PhysicalData = {
      tables: state.tables,
      foreignKeys: state.foreignKeys,
      tableGroups: state.tableGroups
    };
    
    // Save complete layout state
    const data = { 
      conceptual, 
      physical, 
      nodeLayouts: state.nodeLayouts,
      tableLayouts: state.tableLayouts,
      viewport: state.viewport,
      viewMode: state.viewMode
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'model.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDDL = () => {
    setShowFullDDLDialog(true);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        
        // Support new format with conceptual + physical
        if (data.conceptual && data.physical) {
          loadModelFromJSON(data);
        }
        // Backward compatibility: support old format with conceptual + layout
        else if (data.conceptual && data.layout) {
          loadModel(data.conceptual, data.layout);
        } 
        else {
          alert('Invalid file format. Expected either {conceptual, physical} or {conceptual, layout}');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGroupSelected = () => {
    if (viewMode === 'conceptual') {
      const entitiesToGroup = multiSelectedEntityIds.length > 0 
        ? multiSelectedEntityIds 
        : (selectedId ? [selectedId] : []);
      
      if (entitiesToGroup.length > 0) {
        addEntityGroup(entitiesToGroup, 'New Group');
        clearMultiSelection();
      }
    } else {
      // Physical view - create entity for table(s) and group them
      const tablesToGroup = multiSelectedTableIds.length > 0 
        ? multiSelectedTableIds 
        : (selectedId ? [selectedId] : []);
      
      if (tablesToGroup.length > 0) {
        // Create a new entity for these tables
        const entityId = addEntity();
        // Assign all tables to this entity
        tablesToGroup.forEach(tableId => {
          updateTable(tableId, { entityId });
        });
        clearMultiSelection();
      }
    }
  };

  const handleUngroupSelected = () => {
    if (selectedId) {
      if (viewMode === 'conceptual') {
        const group = entityGroups.find(g => g.entityIds.includes(selectedId));
        if (group) {
          removeEntityFromGroup(group.id, selectedId);
        }
      } else {
        // Physical view - remove table from entity group by clearing entityId
        const table = tables.find(t => t.id === selectedId);
        if (table && table.entityId) {
          updateTable(selectedId, { entityId: undefined });
        }
      }
    }
  };

  const handleAddTable = () => {
    // Tables can now be created without an entity
    addTable();
  };

  const fileItems: DropdownItem[] = [
    { label: 'New Model', icon: <FilePlus size={14} />, onClick: clearModel, shortcut: '⌘N' },
    { label: '', divider: true, onClick: () => {} },
    { label: 'Import Model', icon: <Upload size={14} />, onClick: handleLoadClick, shortcut: '⌘O' },
    { label: 'Export Model (JSON)', icon: <Download size={14} />, onClick: handleSave, shortcut: '⌘S' },
    { label: 'Export SQL DDL', icon: <FileDown size={14} />, onClick: handleExportDDL },
    { label: '', divider: true, onClick: () => {} },
    { label: 'Load Example', icon: <FileDown size={14} />, onClick: () => setShowExampleDialog(true) },
  ];

  const insertItems: DropdownItem[] = viewMode === 'conceptual'
    ? [
        { label: 'Add Entity', icon: <Plus size={14} />, onClick: () => addEntity() },
        { label: 'Add Group', icon: <Group size={14} />, onClick: () => addEntityGroup([], 'New Group') },
      ]
    : [
        { label: 'Add Table', icon: <Plus size={14} />, onClick: handleAddTable },
      ];

  const canGroupSelected = viewMode === 'conceptual' 
    ? (multiSelectedEntityIds.length > 0 || (selectedId && entities.find(e => e.id === selectedId)))
    : (multiSelectedTableIds.length > 0 || (selectedId && tables.find(t => t.id === selectedId)));

  const selectedEntityInGroup = viewMode === 'conceptual' && 
    selectedId && 
    entities.find(e => e.id === selectedId) &&
    entityGroups.some(g => g.entityIds.includes(selectedId));
  
  const selectedTableInGroup = viewMode === 'physical' &&
    selectedId &&
    tables.find(t => t.id === selectedId)?.entityId !== undefined;
  
  // For physical view - show multi-selection count
  const selectedTablesCount = viewMode === 'physical' && multiSelectedTableIds.length > 0 
    ? multiSelectedTableIds.length 
    : 0;

  return (
    <>
      <ExampleDialog 
        isOpen={showExampleDialog} 
        onClose={() => setShowExampleDialog(false)} 
      />
      
      <FullDDLDialog 
        isOpen={showFullDDLDialog}
        onClose={() => setShowFullDDLDialog(false)}
      />
      
      <AIDialog
        isOpen={showAIDialog}
        onClose={() => setShowAIDialog(false)}
        onOpenSettings={() => {
          setShowAIDialog(false);
          setShowAISettingsDialog(true);
        }}
      />
      
      <AISettingsDialog
        isOpen={showAISettingsDialog}
        onClose={() => setShowAISettingsDialog(false)}
      />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
        <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json"
        onChange={handleFileChange}
      />

      {/* Sidebar Toggle */}
      <button
        onClick={toggleLeftSidebar}
        title={leftSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          background: 'transparent',
          border: 'none',
          borderRadius: '6px',
          color: isDark ? '#8b949e' : '#6b7280',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
          e.currentTarget.style.color = isDark ? '#e6edf3' : '#374151';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
        }}
      >
        {leftSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <DropdownButton label="File" items={fileItems} />
        <DropdownButton label="Insert" items={insertItems} icon={<Plus size={14} />} />
      </div>

      {/* AI Button */}
      <button
        onClick={() => setShowAIDialog(true)}
        title="Generate or enhance model with AI"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
          border: `1px solid ${isDark ? '#9333ea' : '#c084fc'}`,
          borderRadius: '6px',
          color: '#9333ea',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)';
        }}
      >
        <Sparkles size={14} />
        <span style={{ whiteSpace: 'nowrap' }}>AI</span>
      </button>

      {/* Auto Layout Button */}
      <button
        onClick={autoLayout}
        title="Auto-arrange layout"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: isDark ? '#21262d' : '#f3f4f6',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '6px',
          color: isDark ? '#e6edf3' : '#374151',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <ArrowDownUp size={14} />
        <span style={{ whiteSpace: 'nowrap' }}>Layout</span>
      </button>

      {/* Ungroup Selected - Show for both conceptual (entities) and physical (tables) */}
      {(selectedEntityInGroup || selectedTableInGroup) && (
        <button
          onClick={handleUngroupSelected}
          title={viewMode === 'conceptual' ? 'Remove entity from group' : 'Remove table from group'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
            border: `1px solid ${isDark ? '#ef4444' : '#fecaca'}`,
            borderRadius: '6px',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Trash2 size={14} />
          <span style={{ whiteSpace: 'nowrap' }}>Ungroup</span>
        </button>
      )}

      {/* Group Selected - Show for both conceptual and physical views */}
      {canGroupSelected && !selectedEntityInGroup && !selectedTableInGroup && (
        <button
          onClick={handleGroupSelected}
          title={viewMode === 'conceptual' 
            ? `Group ${multiSelectedEntityIds.length || 1} selected entities`
            : `Group ${multiSelectedTableIds.length || 1} selected tables`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff',
            border: `1px solid ${isDark ? '#6366f1' : '#c7d2fe'}`,
            borderRadius: '6px',
            color: '#6366f1',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Group size={14} />
          Group ({viewMode === 'conceptual' ? (multiSelectedEntityIds.length || 1) : (multiSelectedTableIds.length || 1)})
        </button>
      )}
      
      {/* Physical View - Show multi-selection count */}
      {selectedTablesCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
            border: `1px solid ${isDark ? '#22c55e' : '#86efac'}`,
            borderRadius: '6px',
            color: isDark ? '#22c55e' : '#16a34a',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Layers size={14} />
          {selectedTablesCount} Selected
        </div>
      )}
      </div>
    </>
  );
};
