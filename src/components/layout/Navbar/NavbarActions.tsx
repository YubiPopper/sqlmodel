import React, { useRef, useState } from 'react';
import { 
  FilePlus,
  FolderOpen,
  Layers,
  Plus,
  Group,
  FolderPlus,
  Database,
  Download,
  Upload,
  Sparkles,
  Link2
} from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { DropdownButton } from '../../shared/Dropdown';
import { Tooltip } from '../../shared/Tooltip';
import type { DropdownItem } from '../../shared/Dropdown';
import type { ConceptualData, PhysicalData } from '../../../model/schemas';
import { useCollaborationContext } from '../../../collaboration/CollaborationContext';
import { SchemaDialog } from '../../ui/SchemaDialog';
import { ImportDialog } from '../../ui/ImportDialog';
import { ExportDialog } from '../../ui/ExportDialog';
import { ImportUrlDialog } from '../../ui/ImportUrlDialog';
import { 
  railsConfig, 
  snowflakeConfig, 
  postgresConfig, 
  prismaConfig,
  mysqlConfig,
  oracleConfig
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

// MySQL Icon Component
const MySQLIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <img 
    src="/assets/icons/mysql.webp" 
    alt="MySQL" 
    style={{ 
      width: size, 
      height: size, 
      objectFit: 'contain' 
    }} 
  />
);

// Oracle Icon Component
const OracleIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <img 
    src="/assets/icons/oracle.svg" 
    alt="Oracle" 
    style={{ 
      width: size, 
      height: size, 
      objectFit: 'contain' 
    }} 
  />
);

// Colorful Database Icon Component for Export SQL
const DatabaseIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="6" rx="8" ry="3" fill="#3b82f6" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="1.5"/>
    <path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round"/>
    <ellipse cx="12" cy="6" rx="8" ry="3" fill="none" stroke="#3b82f6" strokeWidth="1.5"/>
  </svg>
);

interface NavbarActionsProps {
  onActionComplete?: () => void;
  isMobile?: boolean;
}

export const NavbarActions: React.FC<NavbarActionsProps> = ({ onActionComplete, isMobile = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [schemaDialogState, setSchemaDialogState] = useState<{ isOpen: boolean; mode: 'import' | 'export' }>({ isOpen: false, mode: 'export' });
  const [importDialogState, setImportDialogState] = useState<{ isOpen: boolean; initialFormat?: string }>({ isOpen: false });
  const [importUrlDialogOpen, setImportUrlDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [modelsDropdownOpen, setModelsDropdownOpen] = useState(false);
  const [insertDropdownOpen, setInsertDropdownOpen] = useState(false);
  
  // Dialog states from store (persisted across component unmounts)
  const setShowExampleDialog = useModelStore(state => state.setShowExampleDialog);
  const setShowAIDialog = useModelStore(state => state.setShowAIDialog);
  const setShowAddTableDialog = useModelStore(state => state.setShowAddTableDialog);
  
  const addEntity = useModelStore(state => state.addEntity);
  const addDataModel = useModelStore(state => state.addDataModel);
  const addEntityGroup = useModelStore(state => state.addEntityGroup);
  const clearModel = useModelStore(state => state.clearModel);
  const loadModel = useModelStore(state => state.loadModel);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  const viewMode = useModelStore(state => state.viewMode);
  const colorMode = useModelStore(state => state.colorMode);
  const {
    session,
    personalModels,
    activePersonalModelId,
    renameCurrentModel,
    createPersonalModel,
    startCollaboration,
  } = useCollaborationContext();

  const isDark = colorMode === 'dark';
  const activePersonalModel = personalModels.find((model) => model.id === activePersonalModelId) ?? null;
  const currentModelName = session.isActive
    ? (session.modelName || 'Shared Model')
    : (activePersonalModel?.name || 'My Model');

  const handleSave = () => {
    const state = useModelStore.getState();
    const conceptual: ConceptualData = {
      dataModels: state.dataModels,
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
      databaseDescriptions: state.databaseDescriptions,
      schemaDescriptions: state.schemaDescriptions,
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

  const handleAddTable = () => {
    // Open the Add Table dialog instead of directly adding
    setShowAddTableDialog(true);
  };

  const getUniqueName = (base: string, existing: Set<string>) => {
    let name = base;
    let counter = 2;
    while (existing.has(name)) {
      name = `${base}_${counter}`;
      counter += 1;
    }
    return name;
  };

  const handleAddDatabase = () => {
    const state = useModelStore.getState();
    const existingDbNames = new Set<string>();

    state.tables.forEach((table) => {
      if (table.database) existingDbNames.add(table.database);
    });
    state.emptyDatabases.forEach((dbName) => existingDbNames.add(dbName));

    const dbName = getUniqueName('new_database', existingDbNames);
    const nextEmptyDatabases = new Set(state.emptyDatabases);
    nextEmptyDatabases.add(dbName);

    useModelStore.setState({
      emptyDatabases: nextEmptyDatabases,
      physicalHierarchyMode: 'database',
      selectedId: `db-${dbName}`,
    });
  };

  const handleAddSchema = () => {
    const state = useModelStore.getState();
    const existingDbNames = new Set<string>();

    state.tables.forEach((table) => {
      if (table.database) existingDbNames.add(table.database);
    });
    state.emptyDatabases.forEach((dbName) => existingDbNames.add(dbName));

    const suggestedDb = existingDbNames.size > 0
      ? Array.from(existingDbNames)[0]
      : 'new_database';
    const requestedDb = window.prompt('Target database for new schema:', suggestedDb);
    if (requestedDb === null) return;

    const targetDb = requestedDb.trim() || suggestedDb;

    const existingSchemaNames = new Set<string>();
    state.tables.forEach((table) => {
      if ((table.database || 'unassigned') === targetDb && table.schema) {
        existingSchemaNames.add(table.schema);
      }
    });
    state.emptySchemas.forEach((key) => {
      if (key.startsWith(`${targetDb}.`)) {
        existingSchemaNames.add(key.split('.').slice(1).join('.'));
      }
    });

    const schemaName = getUniqueName('new_schema', existingSchemaNames);
    const nextEmptyDatabases = new Set(state.emptyDatabases);
    const nextEmptySchemas = new Set(state.emptySchemas);
    nextEmptyDatabases.add(targetDb);
    nextEmptySchemas.add(`${targetDb}.${schemaName}`);

    useModelStore.setState({
      emptyDatabases: nextEmptyDatabases,
      emptySchemas: nextEmptySchemas,
      physicalHierarchyMode: 'database',
      selectedId: `schema-${targetDb}-${schemaName}`,
    });
  };

  const modelItems: DropdownItem[] = [
    {
      label: 'Rename current model',
      icon: <FolderOpen size={14} />,
      onClick: () => {
        const nextName = window.prompt('Rename current model', currentModelName);
        if (nextName === null) return;
        void renameCurrentModel(nextName);
        onActionComplete?.();
      },
    },
    {
      label: 'New personal model',
      icon: <FolderOpen size={14} />,
      onClick: () => {
        createPersonalModel(`Personal Model ${personalModels.length + 1}`);
        onActionComplete?.();
      },
    },
    {
      label: 'Start shared model',
      icon: <Database size={14} />,
      onClick: () => {
        void startCollaboration('Shared Model');
        onActionComplete?.();
      },
    },
    { label: '', divider: true, onClick: () => {} },
    { label: 'New Model', icon: <FilePlus size={14} />, onClick: () => { clearModel(); onActionComplete?.(); }, shortcut: '⌘N' },
    { label: 'Import Model', icon: <Upload size={14} />, onClick: () => { handleLoadClick(); onActionComplete?.(); }, shortcut: '⌘O' },
    { label: 'Import Schema', icon: <Upload size={14} />, onClick: () => { handleImportSchema(); onActionComplete?.(); } },
    { label: 'Import from URL', icon: <Link2 size={14} />, onClick: () => { setImportUrlDialogOpen(true); onActionComplete?.(); } },
    { label: '', divider: true, onClick: () => {} },
    { label: 'From Snowflake', icon: <SnowflakeIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'snowflake'); setImportDialogState({ isOpen: true, initialFormat: 'snowflake' }); onActionComplete?.(); } },
    { label: 'From Rails', icon: <RailsIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'rails'); setImportDialogState({ isOpen: true, initialFormat: 'rails' }); onActionComplete?.(); } },
    { label: 'From PostgreSQL', icon: <PostgresIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'postgres'); setImportDialogState({ isOpen: true, initialFormat: 'postgres' }); onActionComplete?.(); } },
    { label: 'From MySQL', icon: <MySQLIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'mysql'); setImportDialogState({ isOpen: true, initialFormat: 'mysql' }); onActionComplete?.(); } },
    { label: 'From Oracle', icon: <OracleIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'oracle'); setImportDialogState({ isOpen: true, initialFormat: 'oracle' }); onActionComplete?.(); } },
    { label: 'From Prisma', icon: <PrismaIcon size={14} />, onClick: () => { localStorage.setItem('sqlmodel-preferred-format', 'prisma'); setImportDialogState({ isOpen: true, initialFormat: 'prisma' }); onActionComplete?.(); } },
    { label: '', divider: true, onClick: () => {} },
    { label: 'Templates', icon: <Layers size={14} />, onClick: () => { setShowExampleDialog(true); onActionComplete?.(); } },
    { label: 'Export Model', icon: <Download size={14} />, onClick: () => { handleSave(); onActionComplete?.(); }, shortcut: '⌘S' },
    { label: 'Export SQL', icon: <DatabaseIcon size={14} />, onClick: () => { handleExportDDL(); onActionComplete?.(); } },
  ];

  const insertItems: DropdownItem[] = viewMode !== 'physical'
    ? [
        { label: 'Add Data Model', icon: <FolderPlus size={14} />, onClick: () => { addDataModel(); onActionComplete?.(); } },
        { label: 'Add Entity', icon: <Plus size={14} />, onClick: () => { addEntity(); onActionComplete?.(); } },
        { label: 'Add Group', icon: <Group size={14} />, onClick: () => { addEntityGroup([], 'New Group'); onActionComplete?.(); } },
      ]
    : [
        { label: 'Add Table', icon: <Plus size={14} />, onClick: () => { handleAddTable(); onActionComplete?.(); } },
        { label: 'Add Database', icon: <Database size={14} />, onClick: () => { handleAddDatabase(); onActionComplete?.(); } },
        { label: 'Add Schema', icon: <Layers size={14} />, onClick: () => { handleAddSchema(); onActionComplete?.(); } },
      ];

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
        configs={[snowflakeConfig, railsConfig, postgresConfig, mysqlConfig, oracleConfig, prismaConfig]}
        initialFormat={importDialogState.initialFormat}
      />
      
      {/* Import from URL Dialog */}
      <ImportUrlDialog
        isOpen={importUrlDialogOpen}
        onClose={() => setImportUrlDialogOpen(false)}
      />
      
      {/* Export Dialog */}
      <ExportDialog
        isOpen={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json"
        onChange={handleFileChange}
      />
      
      {isMobile ? (
        // Mobile Layout - Buttons render directly into parent grid
        <>
          {/* Models Menu - Mobile */}
          <DropdownButton label="Models" items={modelItems} icon={<FolderOpen size={16} />} fullWidth={true} compact={true} />

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
        </>
      ) : (
        // Desktop Layout - Original horizontal layout
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <Tooltip content={`Manage models: ${currentModelName}`} disabled={modelsDropdownOpen}>
          <DropdownButton label="Models" items={modelItems} icon={<FolderOpen size={14} />} onOpenChange={setModelsDropdownOpen} />
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
          height: '32px',
          boxSizing: 'border-box',
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
        </div>
      )}
    </>
  );
};
