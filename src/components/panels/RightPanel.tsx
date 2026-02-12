import { useMemo, useState } from 'react';
import { useModelStore } from '../../store/useModelStore';
import { type Cardinality } from '../../model/schemas';
import { Trash2 } from 'lucide-react';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

const CARDINALITY_OPTIONS: Cardinality[] = ['1', '0..1', '1..*', '0..*'];

export const RightPanel = () => {
  const { 
    selectedId, 
    entities, 
    relationships,
    entityGroups,
    viewMode,
    multiSelectedEntityIds,
    updateEntity, 
    updateRelationship,
    updateEntityGroup,
    deleteRelationship,
    addEntityToGroup,
    removeEntityFromGroup,
    colorMode
  } = useModelStore();

  const [confirmDeleteRel, setConfirmDeleteRel] = useState<string | null>(null);

  const selectedEntity = useMemo(() => 
    entities.find(e => e.id === selectedId), 
  [entities, selectedId]);

  const selectedRel = useMemo(() => 
    relationships.find(r => r.id === selectedId), 
  [relationships, selectedId]);

  const selectedGroup = useMemo(() => 
    entityGroups.find(g => g.id === selectedId), 
  [entityGroups, selectedId]);

  // Validation Warnings
  const entityNameWarning = useMemo(() => {
    if (!selectedEntity) return null;
    const duplicate = entities.some(e => e.id !== selectedEntity.id && e.name === selectedEntity.name);
    return duplicate ? 'Warning: Duplicate entity name' : null;
  }, [selectedEntity, entities]);

  const relWarning = useMemo(() => {
    if (!selectedRel) return null;
    const duplicate = relationships.some(r => 
       r.id !== selectedRel.id && 
       r.fromEntityId === selectedRel.fromEntityId && 
       r.toEntityId === selectedRel.toEntityId && 
       r.label === selectedRel.label
    );
    return duplicate ? 'Warning: Duplicate relationship (same pair & label)' : null;
  }, [selectedRel, relationships]);

  const handleDeleteRel = () => {
    if (confirmDeleteRel) {
      deleteRelationship(confirmDeleteRel);
      setConfirmDeleteRel(null);
    }
  };

  if (!selectedId) {
    return (
      <div style={{ 
        width: '250px', 
        padding: '20px', 
        color: colorMode === 'dark' ? '#8b949e' : '#999', 
        background: colorMode === 'dark' ? '#161b22' : '#fafafa', 
        borderLeft: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}>
        <div>
          Select an entity or relationship to edit properties.
        </div>
        
        {viewMode === 'conceptual' && multiSelectedEntityIds.length > 0 && (
          <div style={{
            padding: '12px',
            background: colorMode === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
            border: colorMode === 'dark' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '6px',
            fontSize: '13px',
            lineHeight: '1.5',
            color: colorMode === 'dark' ? '#86efac' : '#16a34a',
          }}>
            <strong>{multiSelectedEntityIds.length} entities selected</strong>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
              Click "Group Selected" in the toolbar to create a group with these entities.
            </p>
          </div>
        )}
        
        {viewMode === 'conceptual' && multiSelectedEntityIds.length === 0 && (
          <div style={{
            padding: '12px',
            background: colorMode === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
            border: colorMode === 'dark' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '6px',
            fontSize: '12px',
            lineHeight: '1.5',
            color: colorMode === 'dark' ? '#94a3b8' : '#64748b',
          }}>
            <strong style={{ display: 'block', marginBottom: '6px', color: colorMode === 'dark' ? '#60a5fa' : '#3b82f6' }}>
              💡 Tip: Multi-Select & Group
            </strong>
            Hold <kbd style={{
              padding: '2px 6px',
              background: colorMode === 'dark' ? '#21262d' : '#e5e7eb',
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #cbd5e1',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '11px',
            }}>Shift</kbd> and click entities to select multiple, then group them together.
          </div>
        )}
      </div>
    );
  }

  if (selectedEntity) {
    return (
      <div style={{ 
        width: '300px', 
        background: colorMode === 'dark' ? '#161b22' : '#fafafa', 
        borderLeft: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
        padding: '15px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px',
        overflowY: 'auto',
        overflowX: 'hidden',
        maxHeight: '100vh',
        color: colorMode === 'dark' ? '#e6edf3' : 'inherit',
        boxSizing: 'border-box',
      }}>
        <h3 style={{ margin: 0, color: colorMode === 'dark' ? '#e6edf3' : 'inherit' }}>Edit Entity</h3>
        
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>Name</label>
          <input 
            type="text" 
            value={selectedEntity.name} 
            onChange={(e) => updateEntity(selectedEntity.id, { name: e.target.value })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
              borderRadius: '4px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          />
          {entityNameWarning && <div style={{ color: 'orange', fontSize: '11px', marginTop: '2px' }}>{entityNameWarning}</div>}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>Description</label>
          <textarea 
            rows={3}
            value={selectedEntity.description || ''} 
            onChange={(e) => updateEntity(selectedEntity.id, { description: e.target.value })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
              borderRadius: '4px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          />
        </div>

        <div style={{ 
          borderTop: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
          paddingTop: '15px',
          fontSize: '12px',
          color: colorMode === 'dark' ? '#8b949e' : '#666'
        }}>
          <p style={{ margin: 0 }}>
            <strong>Note:</strong> In the conceptual view, entities represent high-level business concepts. 
            To add columns and define table structure, switch to Physical view and edit the corresponding table.
          </p>
        </div>
      </div>
    );
  }

  if (selectedRel) {
    const fromEntity = entities.find(e => e.id === selectedRel.fromEntityId);
    const toEntity = entities.find(e => e.id === selectedRel.toEntityId);

    return (
      <>
        <ConfirmationDialog 
          isOpen={!!confirmDeleteRel}
          title="Delete Relationship"
          message="Are you sure you want to delete this relationship?"
          confirmLabel="Delete"
          isDestructive
          onConfirm={handleDeleteRel}
          onCancel={() => setConfirmDeleteRel(null)}
        />
        <div style={{ 
          width: '300px', 
          background: colorMode === 'dark' ? '#161b22' : '#fafafa', 
          borderLeft: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
          padding: '15px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '15px',
          overflowY: 'auto',
          overflowX: 'hidden',
          maxHeight: '100vh',
          color: colorMode === 'dark' ? '#e6edf3' : 'inherit',
          boxSizing: 'border-box',
        }}>
          <h3 style={{ margin: 0, color: colorMode === 'dark' ? '#e6edf3' : 'inherit' }}>Edit Relationship</h3>
          <div style={{ 
            fontSize: '12px', 
            color: colorMode === 'dark' ? '#c9d1d9' : '#666', 
            padding: '8px', 
            background: colorMode === 'dark' ? '#0d1117' : '#f0f0f0', 
            borderRadius: '4px' 
          }}>
            <strong>{fromEntity?.name || 'Unknown'}</strong> → <strong>{toEntity?.name || 'Unknown'}</strong>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>Label</label>
            <input 
              type="text"
              value={selectedRel.label}
              onChange={(e) => updateRelationship(selectedRel.id, { label: e.target.value })}
              style={{ 
                width: '100%', 
                padding: '6px', 
                border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
                borderRadius: '4px',
                background: colorMode === 'dark' ? '#0d1117' : 'white',
                color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
              }}
            />
            {relWarning && <div style={{ color: 'orange', fontSize: '11px', marginTop: '2px' }}>{relWarning}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>From Cardinality (Source)</label>
            <select 
              value={selectedRel.fromCardinality} 
              onChange={(e) => updateRelationship(selectedRel.id, { fromCardinality: e.target.value as Cardinality })}
              style={{ 
                width: '100%', 
                padding: '6px', 
                border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
                borderRadius: '4px',
                background: colorMode === 'dark' ? '#0d1117' : 'white',
                color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
              }}
            >
              {CARDINALITY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>To Cardinality (Target)</label>
            <select 
              value={selectedRel.toCardinality} 
              onChange={(e) => updateRelationship(selectedRel.id, { toCardinality: e.target.value as Cardinality })}
              style={{ 
                width: '100%', 
                padding: '6px', 
                border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
                borderRadius: '4px',
                background: colorMode === 'dark' ? '#0d1117' : 'white',
                color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
              }}
            >
              {CARDINALITY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div style={{ borderTop: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', paddingTop: '15px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '8px', color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>
                Line Position (Conceptual View)
              </label>
              <p style={{ fontSize: '11px', color: colorMode === 'dark' ? '#8b949e' : '#666', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                Choose which side of each entity the line connects to.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: colorMode === 'dark' ? '#8b949e' : '#666' }}>
                From Side ({fromEntity?.name || 'Source'})
              </label>
              <select
                value={selectedRel.sourceHandle || ''}
                onChange={(e) => updateRelationship(selectedRel.id, { 
                  sourceHandle: e.target.value || undefined 
                })}
                style={{ 
                  width: '100%', 
                  padding: '6px', 
                  border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
                  borderRadius: '4px', 
                  fontSize: '12px',
                  background: colorMode === 'dark' ? '#0d1117' : 'white',
                  color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
                }}
              >
                <option value="">Auto (Smart)</option>
                <option value="top-s">Top</option>
                <option value="right-s">Right</option>
                <option value="bottom-s">Bottom</option>
                <option value="left-s">Left</option>
              </select>
            </div>

            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: colorMode === 'dark' ? '#8b949e' : '#666' }}>
                To Side ({toEntity?.name || 'Target'})
              </label>
              <select
                value={selectedRel.targetHandle || ''}
                onChange={(e) => updateRelationship(selectedRel.id, { 
                  targetHandle: e.target.value || undefined 
                })}
                style={{ 
                  width: '100%', 
                  padding: '6px', 
                  border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
                  borderRadius: '4px', 
                  fontSize: '12px',
                  background: colorMode === 'dark' ? '#0d1117' : 'white',
                  color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
                }}
              >
                <option value="">Auto (Smart)</option>
                <option value="top">Top</option>
                <option value="right">Right</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
              </select>
            </div>
          </div>

          <button 
            onClick={() => setConfirmDeleteRel(selectedRel.id)}
            style={{ 
              marginTop: '20px', 
              background: '#dc2626', 
              color: 'white', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '6px',
              border: 'none',
              borderRadius: '4px',
              padding: '8px',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={16} /> Delete Relationship
          </button>
        </div>
      </>
    );
  }

  if (selectedGroup) {
    const availableEntities = entities.filter(e => !selectedGroup.entityIds.includes(e.id));
    const groupEntities = entities.filter(e => selectedGroup.entityIds.includes(e.id));

    return (
      <div style={{ 
        width: '300px', 
        background: colorMode === 'dark' ? '#161b22' : '#fafafa', 
        borderLeft: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
        padding: '15px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px',
        overflowY: 'auto',
        overflowX: 'hidden',
        maxHeight: '100vh',
        color: colorMode === 'dark' ? '#e6edf3' : 'inherit',
        boxSizing: 'border-box',
      }}>
        <h3 style={{ margin: 0, color: colorMode === 'dark' ? '#e6edf3' : 'inherit' }}>Edit Entity Group</h3>
        
        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>Group Name</label>
          <input 
            type="text" 
            value={selectedGroup.name} 
            onChange={(e) => updateEntityGroup(selectedGroup.id, { name: e.target.value })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
              borderRadius: '4px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          />
        </div>

        <div style={{ borderTop: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', paddingTop: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>Border Style</label>
          <select 
            value={selectedGroup.borderStyle} 
            onChange={(e) => updateEntityGroup(selectedGroup.id, { borderStyle: e.target.value as 'dashed' | 'solid' | 'dotted' })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
              borderRadius: '4px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          >
            <option value="dashed">Dashed</option>
            <option value="solid">Solid</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>Border Width</label>
          <input 
            type="number" 
            min="1"
            max="10"
            value={selectedGroup.borderWidth} 
            onChange={(e) => updateEntityGroup(selectedGroup.id, { borderWidth: parseInt(e.target.value) || 2 })}
            style={{ 
              width: '100%', 
              padding: '6px', 
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
              borderRadius: '4px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              color: colorMode === 'dark' ? '#e6edf3' : 'inherit'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>Border Color (optional)</label>
          <input 
            type="color" 
            value={selectedGroup.borderColor || (colorMode === 'dark' ? '#475569' : '#94a3b8')}
            onChange={(e) => updateEntityGroup(selectedGroup.id, { borderColor: e.target.value })}
            style={{ 
              width: '100%', 
              height: '36px',
              padding: '2px', 
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
              borderRadius: '4px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              cursor: 'pointer'
            }}
          />
          {selectedGroup.borderColor && (
            <button 
              onClick={() => updateEntityGroup(selectedGroup.id, { borderColor: undefined })}
              style={{
                marginTop: '4px',
                fontSize: '11px',
                padding: '4px 8px',
                background: colorMode === 'dark' ? '#21262d' : '#e5e7eb',
                color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset to default
            </button>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>Background Color (optional)</label>
          <input 
            type="color" 
            value={selectedGroup.backgroundColor || (colorMode === 'dark' ? '#1e293b' : '#f1f5f9')}
            onChange={(e) => updateEntityGroup(selectedGroup.id, { backgroundColor: e.target.value })}
            style={{ 
              width: '100%', 
              height: '36px',
              padding: '2px', 
              border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
              borderRadius: '4px',
              background: colorMode === 'dark' ? '#0d1117' : 'white',
              cursor: 'pointer'
            }}
          />
          {selectedGroup.backgroundColor && (
            <button 
              onClick={() => updateEntityGroup(selectedGroup.id, { backgroundColor: undefined })}
              style={{
                marginTop: '4px',
                fontSize: '11px',
                padding: '4px 8px',
                background: colorMode === 'dark' ? '#21262d' : '#e5e7eb',
                color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset to default
            </button>
          )}
        </div>

        <div style={{ borderTop: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', paddingTop: '10px' }}>
          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', fontWeight: 500, color: colorMode === 'dark' ? '#c9d1d9' : 'inherit' }}>
            Entities in Group ({groupEntities.length})
          </label>
          
          {groupEntities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              {groupEntities.map(entity => (
                <div 
                  key={entity.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: colorMode === 'dark' ? '#0d1117' : '#f9fafb',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <span>{entity.name}</span>
                  <button
                    onClick={() => removeEntityFromGroup(selectedGroup.id, entity.id)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '11px',
                      background: colorMode === 'dark' ? '#21262d' : '#e5e7eb',
                      color: colorMode === 'dark' ? '#8b949e' : '#6b7280',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '11px', color: colorMode === 'dark' ? '#8b949e' : '#6b7280', margin: '0 0 12px 0' }}>
              No entities in this group yet.
            </p>
          )}

          {availableEntities.length > 0 && (
            <>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: colorMode === 'dark' ? '#8b949e' : '#6b7280' }}>
                Add Entity to Group
              </label>
              <select 
                onChange={(e) => {
                  if (e.target.value) {
                    addEntityToGroup(selectedGroup.id, e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{ 
                  width: '100%', 
                  padding: '6px', 
                  border: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
                  borderRadius: '4px',
                  background: colorMode === 'dark' ? '#0d1117' : 'white',
                  color: colorMode === 'dark' ? '#e6edf3' : 'inherit',
                  fontSize: '12px'
                }}
              >
                <option value="">Select entity...</option>
                {availableEntities.map(entity => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            </>
          )}
        </div>

        <div style={{ 
          borderTop: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
          paddingTop: '15px',
          fontSize: '12px',
          color: colorMode === 'dark' ? '#8b949e' : '#666'
        }}>
          <p style={{ margin: 0, lineHeight: '1.5' }}>
            <strong>Tip:</strong> Entity groups help organize your conceptual model visually. 
            Drag entities to position them, and the group boundary will automatically adjust.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '250px', 
      background: colorMode === 'dark' ? '#161b22' : '#fafafa', 
      borderLeft: colorMode === 'dark' ? '1px solid #30363d' : '1px solid #ddd', 
      padding: '20px',
      color: colorMode === 'dark' ? '#8b949e' : 'inherit',
      overflowX: 'hidden',
      boxSizing: 'border-box',
    }}>
      Unknown selection
    </div>
  );
};
