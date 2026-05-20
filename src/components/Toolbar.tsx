import React, { useRef } from 'react';
import { ArrowDownUp, Sun, Moon, Layers, Group } from 'lucide-react';
import { useModelStore } from '../store/useModelStore';
import type { ConceptualData, LayoutData } from '../model/schemas';

export const Toolbar: React.FC = () => {
  const addEntity = useModelStore(state => state.addEntity);
  const addEntityGroup = useModelStore(state => state.addEntityGroup);
  const clearModel = useModelStore(state => state.clearModel);
  const loadExample = useModelStore(state => state.loadExample);
  const loadModel = useModelStore(state => state.loadModel);
  const autoLayout = useModelStore(state => state.autoLayout);
  const colorMode = useModelStore(state => state.colorMode);
  const viewMode = useModelStore(state => state.viewMode);
  const showEntityOverlay = useModelStore(state => state.showEntityOverlay);
  const setShowEntityOverlay = useModelStore(state => state.setShowEntityOverlay);
  const entities = useModelStore(state => state.entities);
  const selectedId = useModelStore(state => state.selectedId);
  const multiSelectedEntityIds = useModelStore(state => state.multiSelectedEntityIds);
  const clearMultiSelection = useModelStore(state => state.clearMultiSelection);
  
  // For file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const state = useModelStore.getState();
    const conceptual: ConceptualData = {
      dataModels: state.dataModels,
      entities: state.entities,
      relationships: state.relationships,
      groups: state.entityGroups
    };
    
    // transform nodeLayouts to array
    const nodes = Object.entries(state.nodeLayouts).map(([entityId, layout]) => ({
      entityId,
      ...layout
    }));

    const layout: LayoutData = {
      viewport: state.viewport,
      nodes
    };

    const data = {
      conceptual,
      layout
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
        if (data.conceptual && data.layout) {
          loadModel(data.conceptual, data.layout);
        } else {
          alert('Invalid file format');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse file');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleCreateGroup = () => {
    // For now, create an empty group that user can add entities to later
    addEntityGroup([], 'New Group');
  };

  const handleGroupSelected = () => {
    // Create group with currently selected entities
    const entitiesToGroup = multiSelectedEntityIds.length > 0 
      ? multiSelectedEntityIds 
      : (selectedId ? [selectedId] : []);
    
    if (entitiesToGroup.length > 0) {
      addEntityGroup(entitiesToGroup, 'New Group');
      clearMultiSelection();
    }
  };

  return (
    <div style={{
      height: '40px',
      background: colorMode === 'dark' ? '#161b22' : '#f0f0f0',
      borderBottom: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ccc',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      gap: '10px',
      color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
    }}>
      <span style={{ fontWeight: 'bold', marginRight: '10px', color: colorMode === 'dark' ? '#e6edf3' : 'inherit' }}>Data Modeler</span>
      
      <button onClick={() => addEntity()} style={{ 
        background: colorMode === 'dark' ? '#21262d' : undefined,
        color: colorMode === 'dark' ? '#e6edf3' : undefined,
        border: colorMode === 'dark' ? '1px solid #30363d' : undefined
      }}>Add Entity</button>
      
      {viewMode === 'conceptual' && (
        <>
          {(multiSelectedEntityIds.length > 0 || (selectedId && entities.find(e => e.id === selectedId))) ? (
            <button 
              onClick={handleGroupSelected} 
              title={`Group ${multiSelectedEntityIds.length || 1} selected ${(multiSelectedEntityIds.length || 1) === 1 ? 'entity' : 'entities'}`}
              style={{ 
                background: colorMode === 'dark' ? '#1e3a5f' : '#dbeafe',
                color: colorMode === 'dark' ? '#60a5fa' : '#2563eb',
                border: colorMode === 'dark' ? '1px solid #3b82f6' : '1px solid #3b82f6',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <Group size={16} />
              Group Selected ({multiSelectedEntityIds.length || 1})
            </button>
          ) : (
            <button onClick={handleCreateGroup} title="Create Entity Group" style={{ 
              background: colorMode === 'dark' ? '#21262d' : undefined,
              color: colorMode === 'dark' ? '#e6edf3' : undefined,
              border: colorMode === 'dark' ? '1px solid #30363d' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Group size={16} />
              New Group
            </button>
          )}
        </>
      )}
      
      <div style={{ width: '1px', height: '20px', background: colorMode === 'dark' ? '#30363d' : '#ccc' }} />
      
      <button onClick={handleSave} style={{ 
        background: colorMode === 'dark' ? '#21262d' : undefined,
        color: colorMode === 'dark' ? '#e6edf3' : undefined,
        border: colorMode === 'dark' ? '1px solid #30363d' : undefined
      }}>Save JSON</button>
      <button onClick={handleLoadClick} style={{ 
        background: colorMode === 'dark' ? '#21262d' : undefined,
        color: colorMode === 'dark' ? '#e6edf3' : undefined,
        border: colorMode === 'dark' ? '1px solid #30363d' : undefined
      }}>Load JSON</button>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json"
        onChange={handleFileChange}
      />
      
      <div style={{ width: '1px', height: '20px', background: colorMode === 'dark' ? '#30363d' : '#ccc' }} />
      <button onClick={loadExample} style={{ 
        background: colorMode === 'dark' ? '#21262d' : undefined,
        color: colorMode === 'dark' ? '#e6edf3' : undefined,
        border: colorMode === 'dark' ? '1px solid #30363d' : undefined
      }}>Load Example</button>
      <button onClick={clearModel} style={{ 
        background: colorMode === 'dark' ? '#21262d' : undefined,
        color: colorMode === 'dark' ? '#e6edf3' : undefined,
        border: colorMode === 'dark' ? '1px solid #30363d' : undefined
      }}>Clear</button>
      <button onClick={autoLayout} title="Auto-arrange entities" style={{ 
        background: colorMode === 'dark' ? '#21262d' : undefined,
        color: colorMode === 'dark' ? '#e6edf3' : undefined,
        border: colorMode === 'dark' ? '1px solid #30363d' : undefined
      }}>
        <ArrowDownUp size={16} />
        Auto Layout
      </button>

      <div style={{ width: '1px', height: '20px', background: colorMode === 'dark' ? '#30363d' : '#ccc' }} />
      
      <div style={{ display: 'flex', border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
        <button
          onClick={() => useModelStore.getState().setViewMode('conceptual')}
          style={{
            background: viewMode === 'conceptual' 
              ? (colorMode === 'dark' ? '#30363d' : '#ddd') 
              : (colorMode === 'dark' ? '#21262d' : '#fff'),
            color: colorMode === 'dark' ? '#e6edf3' : 'inherit',
            border: 'none',
            padding: '5px 10px',
            cursor: 'pointer'
          }}
        >
          Conceptual
        </button>
        <button
          onClick={() => useModelStore.getState().setViewMode('physical')}
          style={{
            background: viewMode === 'physical' 
              ? (colorMode === 'dark' ? '#30363d' : '#ddd') 
              : (colorMode === 'dark' ? '#21262d' : '#fff'),
            color: colorMode === 'dark' ? '#e6edf3' : 'inherit',
            border: 'none',
            padding: '5px 10px',
            cursor: 'pointer',
            borderLeft: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ccc'
          }}
        >
          Physical
        </button>
      </div>

      {/* Entity Overlay Toggle - Only visible in Physical view */}
      {viewMode === 'physical' && (
        <button
          onClick={() => setShowEntityOverlay(!showEntityOverlay)}
          title={showEntityOverlay ? 'Hide Entity Groupings' : 'Show Entity Groupings'}
          style={{ 
            background: showEntityOverlay 
              ? (colorMode === 'dark' ? '#1e3a5f' : '#dbeafe')
              : (colorMode === 'dark' ? '#21262d' : undefined),
            color: showEntityOverlay 
              ? (colorMode === 'dark' ? '#60a5fa' : '#2563eb')
              : (colorMode === 'dark' ? '#e6edf3' : undefined),
            border: showEntityOverlay 
              ? (colorMode === 'dark' ? '1px solid #3b82f6' : '1px solid #3b82f6')
              : (colorMode === 'dark' ? '1px solid #30363d' : undefined),
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Layers size={16} />
          Entities
        </button>
      )}

      <div style={{ width: '1px', height: '20px', background: colorMode === 'dark' ? '#30363d' : '#ccc' }} />
      
      <button
        onClick={() => {
          const current = useModelStore.getState().colorMode;
          useModelStore.getState().setColorMode(current === 'dark' ? 'light' : 'dark');
        }}
        title={colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{ 
          background: colorMode === 'dark' ? '#21262d' : undefined,
          color: colorMode === 'dark' ? '#e6edf3' : undefined,
          border: colorMode === 'dark' ? '1px solid #30363d' : undefined
        }}
      >
        {colorMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
};
