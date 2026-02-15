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
import { SchemaDialog } from '../../ui/SchemaDialog';
import { ImportDialog } from '../../ui/ImportDialog';
import { ExportDialog } from '../../ui/ExportDialog';
import { 
  railsConfig, 
  snowflakeConfig, 
  postgresConfig, 
  prismaConfig 
} from '../../ui/importFormatConfigs';

// Snowflake Icon Component
const SnowflakeIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <img 
    src="/assets/icons/snowflake.svg" 
    alt="Snowflake" 
    style={{ width: size, height: size, objectFit: 'contain' }} 
  />
);

// Rails Icon Component
const RailsIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <img 
    src="/assets/icons/rubyonrails.png" 
    alt="Ruby on Rails" 
    style={{ 
      width: size, 
      height: size, 
      objectFit: 'contain' 
    }} 
  />
);

// PostgreSQL Icon Component
const PostgresIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <img 
    src="/assets/icons/postgresql.svg" 
    alt="PostgreSQL" 
    style={{ 
      width: size, 
      height: size, 
      objectFit: 'contain' 
    }} 
  />
);

// Prisma Icon Component
const PrismaIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <img 
    src="/assets/icons/prisma.svg" 
    alt="Prisma" 
    style={{ 
      width: size, 
      height: size, 
      objectFit: 'contain' 
    }} 
  />
);

interface NavbarActionsProps {
  onActionComplete?: () => void;
  isMobile?: boolean;
}

export const NavbarActions: React.FC<NavbarActionsProps> = ({ onActionComplete, isMobile = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [schemaDialogState, setSchemaDialogState] = useState<{ isOpen: boolean; mode: 'import' | 'export' }>({ isOpen: false, mode: 'export' });
  const [importDialogState, setImportDialogState] = useState<{ isOpen: boolean; initialFormat?: string }>({ isOpen: false });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [insertDropdownOpen, setInsertDropdownOpen] = useState(false);
  
  // Dialog states from store (persisted across component unmounts)
  const setShowExampleDialog = useModelStore(state => state.setShowExampleDialog);
  const setShowAIDialog = useModelStore(state => state.setShowAIDialog);
  const setShowAddTableDialog = useModelStore(state => state.setShowAddTableDialog);
  
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
    setExportDialogOpen(true);
  };

  const handleImportSchema = () => {
    setSchemaDialogState({ isOpen: true, mode: 'import' });
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
    { label: 'Import Model (JSON)', icon: <Upload size={14} />, onClick: () => { handleLoadClick(); onActionComplete?.(); }, shortcut: '⌘O' },
    { label: 'Import Schema (SQL)', icon: <Upload size={14} />, onClick: () => { handleImportSchema(); onActionComplete?.(); } },
    { label: '', divider: true, onClick: () => {} },
    { label: 'From Snowflake', icon: <SnowflakeIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'snowflake'); setImportDialogState({ isOpen: true, initialFormat: 'snowflake' }); onActionComplete?.(); } },
    { label: 'From Rails', icon: <RailsIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'rails'); setImportDialogState({ isOpen: true, initialFormat: 'rails' }); onActionComplete?.(); } },
    { label: 'From PostgreSQL', icon: <PostgresIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'postgres'); setImportDialogState({ isOpen: true, initialFormat: 'postgres' }); onActionComplete?.(); } },
    { label: 'From Prisma', icon: <PrismaIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'prisma'); setImportDialogState({ isOpen: true, initialFormat: 'prisma' }); onActionComplete?.(); } },
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
      {/* Keep SchemaDialog for now (legacy import mode if needed) */}
      <SchemaDialog 
        isOpen={schemaDialogState.isOpen}
        onClose={() => setSchemaDialogState({ ...schemaDialogState, isOpen: false })}
        mode={schemaDialogState.mode}
      />
      
      {/* Import Dialog with Format Switching */}
      <ImportDialog
        isOpen={importDialogState.isOpen}
        onClose={() => setImportDialogState({ isOpen: false })}
        configs={[snowflakeConfig, railsConfig, postgresConfig, prismaConfig]}
        initialFormat={importDialogState.initialFormat}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
      
      {isMobile ? (
        // Mobile Layout - Buttons render directly into parent grid
        <>
          {/* Sidebar Toggle */}
          <button
            onClick={() => { toggleLeftSidebar(); onActionComplete?.(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              height: '48px',
              boxSizing: 'border-box',
              background: isDark ? '#21262d' : '#f3f4f6',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: isDark ? '#e6edf3' : '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.15s ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
            }}
          >
            {leftSidebarCollapsed ? <PanelLeft size={18} style={{ flexShrink: 0 }} /> : <PanelLeftClose size={18} style={{ flexShrink: 0 }} />}
            <span>{leftSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}</span>
          </button>

          {/* Import Menu - Mobile */}
          <DropdownButton label="Import" items={importItems} icon={<Upload size={16} />} fullWidth={true} compact={true} />

          {/* Export Menu - Mobile */}
          <DropdownButton label="Export" items={exportItems} icon={<Download size={16} />} fullWidth={true} compact={true} />

          {/* Insert Menu - Mobile */}
          <DropdownButton label="Insert" items={insertItems} icon={<Plus size={16} />} fullWidth={true} compact={true} />

          {/* AI Button */}
          <button
            onClick={() => { setShowAIDialog(true); onActionComplete?.(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              height: '48px',
              boxSizing: 'border-box',
              background: isDark
                ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)'
                : 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
              border: `1.5px solid ${isDark ? '#a855f7' : '#c084fc'}`,
              borderRadius: '8px',
              color: isDark ? '#e9d5ff' : '#7c3aed',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.15s ease',
              boxShadow: isDark 
                ? '0 2px 8px rgba(168, 85, 247, 0.15)'
                : '0 2px 8px rgba(192, 132, 252, 0.15)',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Sparkles size={18} style={{ flexShrink: 0 }} />
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
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              height: '48px',
              boxSizing: 'border-box',
              background: (selectedEntityInGroup || selectedTableInGroup)
                ? (isDark ? '#21262d' : '#f3f4f6')
                : (isDark ? 'rgba(33, 38, 45, 0.5)' : 'rgba(243, 244, 246, 0.5)'),
              border: `1px solid ${
                (selectedEntityInGroup || selectedTableInGroup)
                  ? (isDark ? '#30363d' : '#d1d5db')
                  : (isDark ? '#21262d' : '#e5e7eb')
              }`,
              borderRadius: '8px',
              outline: 'none',
              color: (selectedEntityInGroup || selectedTableInGroup)
                ? (isDark ? '#e6edf3' : '#374151')
                : (isDark ? '#6e7681' : '#9ca3af'),
              fontSize: '14px',
              fontWeight: 500,
              cursor: (selectedEntityInGroup || selectedTableInGroup) ? 'pointer' : 'not-allowed',
              opacity: (selectedEntityInGroup || selectedTableInGroup) ? 1 : 0.6,
              width: '100%',
              transition: 'all 0.15s ease',
            }}
            onMouseDown={(e) => {
              if (selectedEntityInGroup || selectedTableInGroup) {
                e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
              }
            }}
            onMouseUp={(e) => {
              if (selectedEntityInGroup || selectedTableInGroup) {
                e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
              }
            }}
          >
            <Ungroup size={18} style={{ flexShrink: 0 }} />
            <span>Ungroup Selected</span>
          </button>
        </>
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
          onClick={() => { setShowAIDialog(true); }}
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
