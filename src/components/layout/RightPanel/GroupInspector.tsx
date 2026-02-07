import React, { useState } from 'react';
import { FolderOpen, Trash2, Box, X, MoreVertical } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput } from './FormComponents';
import type { EntityGroup } from '../../../model/schemas';

interface GroupInspectorProps {
  group: EntityGroup;
}

export const GroupInspector: React.FC<GroupInspectorProps> = ({ group }) => {
  const [showMenu, setShowMenu] = useState(false);
  const updateEntityGroup = useModelStore(state => state.updateEntityGroup);
  const deleteEntityGroup = useModelStore(state => state.deleteEntityGroup);
  const removeEntityFromGroup = useModelStore(state => state.removeEntityFromGroup);
  const entities = useModelStore(state => state.entities);
  const colorMode = useModelStore(state => state.colorMode);
  const setSelected = useModelStore(state => state.setSelected);

  const isDark = colorMode === 'dark';
  const groupEntities = group.entityIds
    .map(id => entities.find(e => e.id === id))
    .filter(Boolean) as typeof entities;

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm(`Delete group "${group.name}"? The entities will not be deleted.`)) {
      deleteEntityGroup(group.id);
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
              Delete Group
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
        title="Entity Group"
        subtitle={`${groupEntities.length} entities`}
        actions={<ActionsMenu />}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <FormField label="Group Name">
          <TextInput
            value={group.name}
            onChange={(value) => updateEntityGroup(group.id, { name: value })}
            placeholder="Group name"
          />
        </FormField>

        {/* Entities in Group */}
        <div style={{ marginTop: '16px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: isDark ? '#8b949e' : '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}>
            Entities ({groupEntities.length})
          </div>

          {groupEntities.length === 0 ? (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              color: isDark ? '#8b949e' : '#9ca3af',
              fontSize: '12px',
              background: isDark ? '#0d1117' : '#f9fafb',
              borderRadius: '8px',
              border: `1px dashed ${isDark ? '#30363d' : '#e5e7eb'}`,
            }}>
              No entities in this group. Shift-click entities to select them, then group.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {groupEntities.map(entity => (
                <div
                  key={entity.id}
                  style={{
                    padding: '10px 12px',
                    background: isDark ? '#0d1117' : '#f3f4f6',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Box size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
                  <span
                    onClick={() => setSelected(entity.id)}
                    style={{
                      flex: 1,
                      fontSize: '13px',
                      color: isDark ? '#e6edf3' : '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    {entity.name}
                  </span>
                  <button
                    onClick={() => removeEntityFromGroup(group.id, entity.id)}
                    title="Remove from group"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: isDark ? '#8b949e' : '#9ca3af',
                      borderRadius: '4px',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
