import React, { useMemo, useState } from 'react';
import { Layers, MoreVertical, Trash2, Plus, Box, Table } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput } from './FormComponents';
import type { DataModel } from '../../../model/schemas';

interface DataModelInspectorProps {
  dataModel: DataModel;
}

export const DataModelInspector: React.FC<DataModelInspectorProps> = ({ dataModel }) => {
  const [showMenu, setShowMenu] = useState(false);
  const updateDataModel = useModelStore(state => state.updateDataModel);
  const deleteDataModel = useModelStore(state => state.deleteDataModel);
  const addEntity = useModelStore(state => state.addEntity);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';

  const stats = useMemo(() => {
    const modelEntities = entities.filter(entity => entity.dataModelId === dataModel.id);
    const entityIds = new Set(modelEntities.map(entity => entity.id));
    const modelTables = tables.filter(table => table.entityId && entityIds.has(table.entityId));
    return {
      entityCount: modelEntities.length,
      tableCount: modelTables.length,
    };
  }, [dataModel.id, entities, tables]);

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm(`Delete data model "${dataModel.name}"? Entities and tables will be kept and moved to Unassigned.`)) {
      deleteDataModel(dataModel.id);
    }
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
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: isDark ? '#161b22' : '#ffffff',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
              minWidth: '160px',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Trash2 size={14} />
              Delete Data Model
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InspectorHeader
        icon={<Layers size={18} />}
        title="Data Model"
        subtitle={dataModel.name}
        actions={<ActionsMenu />}
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px' }}>
        <FormField label="Name">
          <TextInput
            value={dataModel.name}
            onChange={(value) => updateDataModel(dataModel.id, { name: value })}
            placeholder="Data model name"
          />
        </FormField>

        <FormField label="Description">
          <TextInput
            value={dataModel.description || ''}
            onChange={(value) => updateDataModel(dataModel.id, { description: value })}
            placeholder="Describe this data model..."
            multiline
          />
        </FormField>

        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            background: isDark ? '#0d1117' : '#f9fafb',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isDark ? '#c9d1d9' : '#374151' }}>
            <Box size={13} />
            {stats.entityCount} entities
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isDark ? '#c9d1d9' : '#374151' }}>
            <Table size={13} />
            {stats.tableCount} tables
          </div>
        </div>

        <button
          onClick={() => addEntity(dataModel.id)}
          style={{
            marginTop: '14px',
            width: '100%',
            padding: '10px 12px',
            background: '#6366f1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Plus size={14} />
          Add Entity To This Model
        </button>
      </div>
    </div>
  );
};
