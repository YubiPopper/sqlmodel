import React, { useMemo, useState } from 'react';
import { FolderOpen, MoreVertical, Trash2, Plus, Layers } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput } from './FormComponents';
import type { Project } from '../../../model/schemas';

interface ProjectInspectorProps {
  project: Project;
}

export const ProjectInspector: React.FC<ProjectInspectorProps> = ({ project }) => {
  const [showMenu, setShowMenu] = useState(false);
  const updateProject = useModelStore(state => state.updateProject);
  const deleteProject = useModelStore(state => state.deleteProject);
  const addDataModel = useModelStore(state => state.addDataModel);
  const setCurrentProject = useModelStore(state => state.setCurrentProject);
  const dataModels = useModelStore(state => state.dataModels);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';

  const stats = useMemo(() => {
    const projectModels = dataModels.filter(model => model.projectId === project.id);
    const modelIds = new Set(projectModels.map(model => model.id));
    const modelEntities = entities.filter(entity => entity.dataModelId && modelIds.has(entity.dataModelId));
    const entityIds = new Set(modelEntities.map(entity => entity.id));
    const modelTables = tables.filter(table => table.entityId && entityIds.has(table.entityId));

    return {
      modelCount: projectModels.length,
      entityCount: modelEntities.length,
      tableCount: modelTables.length,
    };
  }, [project.id, dataModels, entities, tables]);

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm(`Delete project "${project.name}" and all of its data models? This cannot be undone.`)) {
      deleteProject(project.id);
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
              Delete Project
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InspectorHeader
        icon={<FolderOpen size={18} />}
        title="Project"
        subtitle={project.name}
        actions={<ActionsMenu />}
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px' }}>
        <FormField label="Name">
          <TextInput
            value={project.name}
            onChange={(value) => updateProject(project.id, { name: value })}
            placeholder="Project name"
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
            gridTemplateColumns: '1fr',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isDark ? '#c9d1d9' : '#374151' }}>
            <Layers size={13} />
            {stats.modelCount} data models
          </div>
          <div style={{ fontSize: '12px', color: isDark ? '#8b949e' : '#6b7280' }}>
            {stats.entityCount} entities, {stats.tableCount} tables
          </div>
        </div>

        <button
          onClick={() => {
            setCurrentProject(project.id);
            addDataModel(project.id);
          }}
          style={{
            marginTop: '14px',
            width: '100%',
            padding: '10px 12px',
            background: '#0ea5e9',
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
          Add Data Model To Project
        </button>
      </div>
    </div>
  );
};
