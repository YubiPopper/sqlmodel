import React, { useState } from 'react';
import { Link, Trash2, MoreVertical } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, TextInput, SelectInput } from './FormComponents';
import type { Relationship, Cardinality } from '../../../model/schemas';

interface RelationshipInspectorProps {
  relationship: Relationship;
}

const CARDINALITY_OPTIONS: { value: Cardinality; label: string }[] = [
  { value: '1', label: '1 (One)' },
  { value: '0..1', label: '0..1 (Zero or One)' },
  { value: '1..*', label: '1..* (One or Many)' },
  { value: '0..*', label: '0..* (Zero or Many)' },
];

export const RelationshipInspector: React.FC<RelationshipInspectorProps> = ({ relationship }) => {
  const [showMenu, setShowMenu] = useState(false);
  const updateRelationship = useModelStore(state => state.updateRelationship);
  const deleteRelationship = useModelStore(state => state.deleteRelationship);
  const entities = useModelStore(state => state.entities);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';
  const fromEntity = entities.find(e => e.id === relationship.fromEntityId);
  const toEntity = entities.find(e => e.id === relationship.toEntityId);

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm('Delete this relationship?')) {
      deleteRelationship(relationship.id);
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
              Delete Relationship
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InspectorHeader
        icon={<Link size={18} />}
        title="Relationship"
        subtitle={`${fromEntity?.name || '?'} → ${toEntity?.name || '?'}`}
        actions={<ActionsMenu />}
      />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px' }}>
        <FormField label="Label">
          <TextInput
            value={relationship.label || ''}
            onChange={(value) => updateRelationship(relationship.id, { label: value })}
            placeholder="e.g., has, contains, belongs to"
          />
        </FormField>

        {/* Connection Info */}
        <div style={{
          padding: '12px',
          background: isDark ? '#0d1117' : '#f9fafb',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center',
          }}>
            <div style={{
              padding: '6px 10px',
              background: isDark ? '#21262d' : '#ffffff',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#374151',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            }}>
              {fromEntity?.name || 'Unknown'}
            </div>
            <div style={{ color: isDark ? '#8b949e' : '#9ca3af' }}>→</div>
            <div style={{
              padding: '6px 10px',
              background: isDark ? '#21262d' : '#ffffff',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#374151',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            }}>
              {toEntity?.name || 'Unknown'}
            </div>
          </div>
        </div>

        <FormField label="From Cardinality">
          <SelectInput
            value={relationship.fromCardinality}
            onChange={(value) => updateRelationship(relationship.id, { fromCardinality: value as Cardinality })}
            options={CARDINALITY_OPTIONS}
          />
        </FormField>

        <FormField label="To Cardinality">
          <SelectInput
            value={relationship.toCardinality}
            onChange={(value) => updateRelationship(relationship.id, { toCardinality: value as Cardinality })}
            options={CARDINALITY_OPTIONS}
          />
        </FormField>
      </div>
    </div>
  );
};
