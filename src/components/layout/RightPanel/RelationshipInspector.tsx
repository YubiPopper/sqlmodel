import React from 'react';
import { Link, Trash2 } from 'lucide-react';
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
  const updateRelationship = useModelStore(state => state.updateRelationship);
  const deleteRelationship = useModelStore(state => state.deleteRelationship);
  const entities = useModelStore(state => state.entities);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';
  const fromEntity = entities.find(e => e.id === relationship.fromEntityId);
  const toEntity = entities.find(e => e.id === relationship.toEntityId);

  const handleDelete = () => {
    if (confirm('Delete this relationship?')) {
      deleteRelationship(relationship.id);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InspectorHeader
        icon={<Link size={18} />}
        title="Relationship"
        subtitle={`${fromEntity?.name || '?'} → ${toEntity?.name || '?'}`}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
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

      {/* Delete Action */}
      <div style={{
        padding: '16px',
        borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
      }}>
        <button
          onClick={handleDelete}
          style={{
            width: '100%',
            padding: '10px',
            background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Trash2 size={14} />
          Delete Relationship
        </button>
      </div>
    </div>
  );
};
