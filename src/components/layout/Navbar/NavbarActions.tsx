import React, { useRef, useState } from 'react';
import { 
  FileDown, 
  FilePlus,
  Layers,
  Plus,
  Group,
  Ungroup,
  PanelLeftClose,
  PanelLeft,
  Download,
  Upload,
  Sparkles
} from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { DropdownButton } from '../../shared/Dropdown';
import { Tooltip } from '../../shared/Tooltip';
import type { DropdownItem } from '../../shared/Dropdown';
import type { ConceptualData, PhysicalData } from '../../../model/schemas';
import { ExampleDialog } from '../../ui/ExampleDialog';
import { FullDDLDialog } from '../../ui/FullDDLDialog';
import { AIDialog } from '../../ui/AIDialog';
import { AISettingsDialog } from '../../ui/AISettingsDialog';
import { SnowflakeDialog } from '../../ui/SnowflakeDialog';
import { AddTableDialog } from '../../ui/AddTableDialog';

interface NavbarActionsProps {
  onActionComplete?: () => void;
  isMobile?: boolean;
}

export const NavbarActions: React.FC<NavbarActionsProps> = ({ onActionComplete, isMobile = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExampleDialog, setShowExampleDialog] = useState(false);
  const [showFullDDLDialog, setShowFullDDLDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showAISettingsDialog, setShowAISettingsDialog] = useState(false);
  const [showSnowflakeDialog, setShowSnowflakeDialog] = useState(false);
  const [showAddTableDialog, setShowAddTableDialog] = useState(false);
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [insertDropdownOpen, setInsertDropdownOpen] = useState(false);
  
  const addEntity = useModelStore(state => state.addEntity);
  const addEntityGroup = useModelStore(state => state.addEntityGroup);
  const updateTable = useModelStore(state => state.updateTable);
  const clearModel = useModelStore(state => state.clearModel);
  const loadModel = useModelStore(state => state.loadModel);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  const viewMode = useModelStore(state => state.viewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const selectedId = useModelStore(state => state.selectedId);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const entityGroups = useModelStore(state => state.entityGroups);
  const removeEntityFromGroup = useModelStore(state => state.removeEntityFromGroup);
  const leftSidebarCollapsed = useModelStore(state => state.leftSidebarCollapsed);
  const toggleLeftSidebar = useModelStore(state => state.toggleLeftSidebar);
  const showEntityOverlay = useModelStore(state => state.showEntityOverlay);
  const setShowEntityOverlay = useModelStore(state => state.setShowEntityOverlay);

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
          // Auto-enable entity overlay so user can see the ungrouped table
          if (!showEntityOverlay) {
            setShowEntityOverlay(true);
          }
        }
      }
    }
  };

  const handleAddTable = () => {
    // Open the Add Table dialog instead of directly adding
    setShowAddTableDialog(true);
  };

  const importItems: DropdownItem[] = [
    { label: 'New Model', icon: <FilePlus size={14} />, onClick: () => { clearModel(); onActionComplete?.(); }, shortcut: '⌘N' },
    { label: '', divider: true, onClick: () => {} },
    { label: 'Import Model', icon: <Upload size={14} />, onClick: () => { handleLoadClick(); onActionComplete?.(); }, shortcut: '⌘O' },
    { label: 'From Snowflake', icon: <Upload size={14} />, onClick: () => { setShowSnowflakeDialog(true); onActionComplete?.(); } },
    { label: '', divider: true, onClick: () => {} },
    { label: 'Templates', icon: <Layers size={14} />, onClick: () => { setShowExampleDialog(true); onActionComplete?.(); } },
  ];

  const exportItems: DropdownItem[] = [
    { label: 'Export Model (JSON)', icon: <Download size={14} />, onClick: () => { handleSave(); onActionComplete?.(); }, shortcut: '⌘S' },
    { label: 'Export SQL DDL', icon: <FileDown size={14} />, onClick: () => { handleExportDDL(); onActionComplete?.(); } },
  ];

  const insertItems: DropdownItem[] = viewMode === 'conceptual'
    ? [
        { label: 'Add Entity', icon: <Plus size={14} />, onClick: () => { addEntity(); onActionComplete?.(); } },
        { label: 'Add Group', icon: <Group size={14} />, onClick: () => { addEntityGroup([], 'New Group'); onActionComplete?.(); } },
      ]
    : [
        { label: 'Add Table', icon: <Plus size={14} />, onClick: () => { handleAddTable(); onActionComplete?.(); } },
      ];

  const selectedEntityInGroup = viewMode === 'conceptual' && 
    selectedId && 
    entities.find(e => e.id === selectedId) &&
    entityGroups.some(g => g.entityIds.includes(selectedId));
  
  const selectedTableInGroup = viewMode === 'physical' &&
    selectedId &&
    tables.find(t => t.id === selectedId)?.entityId !== undefined;

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
      
      <SnowflakeDialog
        isOpen={showSnowflakeDialog}
        onClose={() => setShowSnowflakeDialog(false)}
      />
      
      <AddTableDialog
        isOpen={showAddTableDialog}
        onClose={() => setShowAddTableDialog(false)}
        onOpenAISettings={() => {
          setShowAddTableDialog(false);
          setShowAISettingsDialog(true);
        }}
      />
      
      {isMobile ? (
        // Mobile Layout - Compact vertical stack
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          {/* Sidebar Toggle */}
          <button
            onClick={() => { toggleLeftSidebar(); onActionComplete?.(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: isDark ? '#21262d' : '#f3f4f6',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '6px',
              color: isDark ? '#e6edf3' : '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            {leftSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            <span>{leftSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</span>
          </button>

          {/* Import Menu - Mobile */}
          <div style={{ width: '100%' }}>
            <DropdownButton label="Import" items={importItems} icon={<Upload size={16} />} fullWidth={true} compact={true} />
          </div>

          {/* Export Menu - Mobile */}
          <div style={{ width: '100%' }}>
            <DropdownButton label="Export" items={exportItems} icon={<Download size={16} />} fullWidth={true} compact={true} />
          </div>

          {/* Insert Menu - Mobile */}
          <div style={{ width: '100%' }}>
            <DropdownButton label="Insert" items={insertItems} icon={<Plus size={16} />} fullWidth={true} compact={true} />
          </div>

          {/* AI Button */}
          <button
            onClick={() => { setShowAIDialog(true); onActionComplete?.(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
              border: `1px solid ${isDark ? '#9333ea' : '#c084fc'}`,
              borderRadius: '6px',
              color: '#9333ea',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Sparkles size={18} />
            <span>AI Assistant</span>
          </button>

          {/* Group/Ungroup Buttons */}
          {/* Ungroup Selected - Always visible, disabled when not applicable */}
          <button
            onClick={() => { 
              if (selectedEntityInGroup || selectedTableInGroup) {
                handleUngroupSelected(); 
                onActionComplete?.(); 
              }
            }}
            disabled={!selectedEntityInGroup && !selectedTableInGroup}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: (selectedEntityInGroup || selectedTableInGroup)
                ? (isDark ? '#21262d' : '#f3f4f6')
                : (isDark ? '#0d1117' : '#f8f9fa'),
              border: `1px solid ${
                (selectedEntityInGroup || selectedTableInGroup)
                  ? (isDark ? '#30363d' : '#d1d5db')
                  : (isDark ? '#21262d' : '#d1d5db')
              }`,
              borderRadius: '6px',
              outline: 'none',
              color: (selectedEntityInGroup || selectedTableInGroup)
                ? (isDark ? '#e6edf3' : '#374151')
                : (isDark ? '#6e7681' : '#9ca3af'),
              fontSize: '14px',
              fontWeight: 600,
              cursor: (selectedEntityInGroup || selectedTableInGroup) ? 'pointer' : 'not-allowed',
              opacity: (selectedEntityInGroup || selectedTableInGroup) ? 1 : 0.8,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Ungroup size={18} />
            <span>Ungroup Selected</span>
          </button>
        </div>
      ) : (
        // Desktop Layout - Original horizontal layout
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
        <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json"
        onChange={handleFileChange}
      />

      {/* Sidebar Toggle */}
      <Tooltip content={leftSidebarCollapsed ? 'Show left sidebar with entity/table list' : 'Hide left sidebar'}>
        <button
          onClick={() => { toggleLeftSidebar(); onActionComplete?.(); }}
          style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          background: 'transparent',
          border: 'none',
          borderRadius: '6px',
          outline: 'none',
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
      </Tooltip>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <Tooltip content="Import models and templates" disabled={importDropdownOpen}>
          <DropdownButton label="Import" items={importItems} icon={<Upload size={14} />} onOpenChange={setImportDropdownOpen} />
        </Tooltip>
        <Tooltip content="Export model as JSON or SQL DDL" disabled={exportDropdownOpen}>
          <DropdownButton label="Export" items={exportItems} icon={<Download size={14} />} onOpenChange={setExportDropdownOpen} />
        </Tooltip>
        <Tooltip content="Add entities, tables, or groups to your model" disabled={insertDropdownOpen}>
          <DropdownButton label="Insert" items={insertItems} icon={<Plus size={14} />} onOpenChange={setInsertDropdownOpen} />
        </Tooltip>
      </div>

      {/* AI Button */}
      <Tooltip content="Generate or enhance your model with AI assistance">
        <button
          onClick={() => { setShowAIDialog(true); onActionComplete?.(); }}
          style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
          border: `1px solid ${isDark ? '#9333ea' : '#c084fc'}`,
          borderRadius: '6px',
          outline: 'none',
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
      </Tooltip>

      {/* Ungroup Selected - Always visible, disabled when not applicable */}
      <Tooltip
        content={
          selectedEntityInGroup || selectedTableInGroup
            ? (viewMode === 'conceptual' ? 'Remove entity from group' : 'Remove table from entity group')
            : 'Select a grouped item to ungroup'
        }
      >
        <button
          onClick={() => { 
            if (selectedEntityInGroup || selectedTableInGroup) {
              handleUngroupSelected(); 
              onActionComplete?.(); 
            }
          }}
          disabled={!selectedEntityInGroup && !selectedTableInGroup}
          style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          background: (selectedEntityInGroup || selectedTableInGroup)
            ? (isDark ? '#21262d' : '#f3f4f6')
            : (isDark ? '#0d1117' : '#ffffff'),
          border: `1px solid ${
            (selectedEntityInGroup || selectedTableInGroup)
              ? (isDark ? '#30363d' : '#d1d5db')
              : (isDark ? '#21262d' : '#d1d5db')
          }`,
          borderRadius: '6px',
          outline: 'none',
          color: (selectedEntityInGroup || selectedTableInGroup)
            ? (isDark ? '#e6edf3' : '#374151')
            : (isDark ? '#6e7681' : '#9ca3af'),
          cursor: (selectedEntityInGroup || selectedTableInGroup) ? 'pointer' : 'not-allowed',
          opacity: (selectedEntityInGroup || selectedTableInGroup) ? 1 : 0.8,
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (selectedEntityInGroup || selectedTableInGroup) {
            e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedEntityInGroup || selectedTableInGroup) {
            e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
          }
        }}
      >
        <Ungroup size={14} />
      </button>
      </Tooltip>
        </div>
      )}
    </>
  );
};
