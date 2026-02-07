import React, { useState } from 'react';
import { Link, Trash2, Key, MoreVertical } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { InspectorHeader } from './InspectorHeader';
import { FormField, SelectInput } from './FormComponents';
import type { ForeignKey, Cardinality } from '../../../model/schemas';

interface ForeignKeyInspectorProps {
  foreignKey: ForeignKey;
}

const CARDINALITY_OPTIONS: { value: Cardinality; label: string }[] = [
  { value: '1', label: '1 (One)' },
  { value: '0..1', label: '0..1 (Zero or One)' },
  { value: '1..*', label: '1..* (One or Many)' },
  { value: '0..*', label: '0..* (Zero or Many)' },
];

const EDGE_TYPE_OPTIONS = [
  { value: 'smoothstep', label: 'Smooth (curved)' },
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Step (angular)' },
];

export const ForeignKeyInspector: React.FC<ForeignKeyInspectorProps> = ({ foreignKey }) => {
  const [showMenu, setShowMenu] = useState(false);
  const updateForeignKey = useModelStore(state => state.updateForeignKey);
  const deleteForeignKey = useModelStore(state => state.deleteForeignKey);
  const tables = useModelStore(state => state.tables);
  const colorMode = useModelStore(state => state.colorMode);

  const isDark = colorMode === 'dark';
  
  const fromTable = tables.find(t => t.id === foreignKey.fromTableId);
  const toTable = tables.find(t => t.id === foreignKey.toTableId);
  const fromAttribute = fromTable?.attributes.find(a => a.id === foreignKey.fromAttributeId);
  const toAttribute = toTable?.attributes.find(a => a.id === foreignKey.toAttributeId);

  const handleDelete = () => {
    setShowMenu(false);
    if (confirm('Delete this foreign key?')) {
      deleteForeignKey(foreignKey.id);
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
              Delete Foreign Key
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <InspectorHeader
        icon={<Key size={18} />}
        title="Foreign Key"
        subtitle={`${fromTable?.name || '?'} → ${toTable?.name || '?'}`}
        actions={<ActionsMenu />}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Connection Info */}
        <div style={{
          padding: '16px',
          background: isDark ? '#0d1117' : '#f9fafb',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: isDark ? '#8b949e' : '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
          }}>
            Connection
          </div>
          
          {/* From side */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px',
              color: isDark ? '#8b949e' : '#9ca3af',
              marginBottom: '4px',
            }}>
              From (FK)
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
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
                {fromTable?.name || 'Unknown'}
              </div>
              <span style={{ color: isDark ? '#8b949e' : '#9ca3af', fontSize: '12px' }}>.</span>
              <div style={{
                padding: '6px 10px',
                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: isDark ? '#60a5fa' : '#2563eb',
                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Link size={12} />
                {fromAttribute?.name || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            color: isDark ? '#8b949e' : '#9ca3af',
            fontSize: '16px',
            margin: '8px 0',
          }}>
            ↓
          </div>

          {/* To side */}
          <div>
            <div style={{
              fontSize: '11px',
              color: isDark ? '#8b949e' : '#9ca3af',
              marginBottom: '4px',
            }}>
              To (PK)
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
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
                {toTable?.name || 'Unknown'}
              </div>
              <span style={{ color: isDark ? '#8b949e' : '#9ca3af', fontSize: '12px' }}>.</span>
              <div style={{
                padding: '6px 10px',
                background: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: isDark ? '#4ade80' : '#16a34a',
                border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Key size={12} />
                {toAttribute?.name || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        <FormField label="From Cardinality">
          <SelectInput
            value={foreignKey.fromCardinality}
            onChange={(value) => updateForeignKey(foreignKey.id, { fromCardinality: value as Cardinality })}
            options={CARDINALITY_OPTIONS}
          />
        </FormField>

        <FormField label="To Cardinality">
          <SelectInput
            value={foreignKey.toCardinality}
            onChange={(value) => updateForeignKey(foreignKey.id, { toCardinality: value as Cardinality })}
            options={CARDINALITY_OPTIONS}
          />
        </FormField>

        <FormField label="Line Style">
          <SelectInput
            value={foreignKey.edgeType || 'smoothstep'}
            onChange={(value) => updateForeignKey(foreignKey.id, { edgeType: value as 'smoothstep' | 'straight' | 'step' })}
            options={EDGE_TYPE_OPTIONS}
          />
        </FormField>
      </div>
    </div>
  );
};
