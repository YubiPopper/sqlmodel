import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { getModelHealthIssues } from '../../../model/modelHealth';

const DATABASE_NODE_PREFIX = 'db-';
const SCHEMA_NODE_PREFIX = 'schema-';
const pluralize = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

export const QuickActions: React.FC = () => {
  const entities = useModelStore(state => state.entities);
  const relationships = useModelStore(state => state.relationships);
  const tables = useModelStore(state => state.tables);
  const foreignKeys = useModelStore(state => state.foreignKeys);
  const colorMode = useModelStore(state => state.colorMode);
  const setSelected = useModelStore(state => state.setSelected);
  const setViewMode = useModelStore(state => state.setViewMode);
  const navigateToNodeCallback = useModelStore(state => state.navigateToNodeCallback);

  const issues = useMemo(
    () => getModelHealthIssues({ entities, relationships, tables, foreignKeys }),
    [entities, relationships, tables, foreignKeys]
  );

  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const warningCount = issues.length - errorCount;
  const isDark = colorMode === 'dark';

  const handleSelectIssue = (targetId?: string, targetViewMode?: 'data-model' | 'conceptual' | 'physical') => {
    if (!targetId) return;

    if (targetViewMode) {
      setViewMode(targetViewMode);
    }

    setSelected(targetId);

    if (
      navigateToNodeCallback &&
      !targetId.startsWith(DATABASE_NODE_PREFIX) &&
      !targetId.startsWith(SCHEMA_NODE_PREFIX) &&
      targetViewMode !== 'physical'
    ) {
      navigateToNodeCallback(targetId);
    }
  };

  return (
    <div style={{
      borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
      padding: '14px 12px 12px',
      background: isDark ? '#0d1117' : '#fafafa',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {issues.length > 0 ? (
            <ShieldAlert size={16} style={{ color: errorCount > 0 ? '#ef4444' : '#f59e0b' }} />
          ) : (
            <ShieldCheck size={16} style={{ color: '#22c55e' }} />
          )}
          <div>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#e6edf3' : '#1f2937',
            }}>
              Model Health
            </div>
            <div style={{
              fontSize: '11px',
              color: isDark ? '#8b949e' : '#6b7280',
            }}>
              {issues.length === 0 ? 'No issues detected' : `${pluralize(issues.length, 'issue')} detected`}
            </div>
          </div>
        </div>
        {issues.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '10px',
            color: isDark ? '#8b949e' : '#6b7280',
          }}>
            {errorCount > 0 && <span>{pluralize(errorCount, 'error')}</span>}
            {warningCount > 0 && <span>{pluralize(warningCount, 'warning')}</span>}
          </div>
        )}
      </div>

      {issues.length === 0 ? (
        <div style={{
          fontSize: '12px',
          lineHeight: 1.5,
          color: isDark ? '#8b949e' : '#6b7280',
          padding: '10px 12px',
          background: isDark ? 'rgba(34, 197, 94, 0.08)' : '#f0fdf4',
          border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.2)' : '#bbf7d0'}`,
          borderRadius: '10px',
        }}>
          This model passes the current lightweight consistency checks.
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '220px',
          overflowY: 'auto',
          paddingRight: '2px',
        }}>
          {issues.map(issue => (
            <button
              key={issue.id}
              type="button"
              onClick={() => handleSelectIssue(issue.targetId, issue.targetViewMode)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${
                  issue.severity === 'error'
                    ? (isDark ? 'rgba(239, 68, 68, 0.25)' : '#fecaca')
                    : (isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a')
                }`,
                background: issue.severity === 'error'
                  ? (isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2')
                  : (isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb'),
                cursor: issue.targetId ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                color: isDark ? '#e6edf3' : '#1f2937',
              }}
              disabled={!issue.targetId}
            >
              <AlertTriangle
                size={14}
                style={{
                  color: issue.severity === 'error' ? '#ef4444' : '#f59e0b',
                  marginTop: '1px',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '3px',
                }}>
                  {issue.title}
                </div>
                <div style={{
                  fontSize: '11px',
                  lineHeight: 1.45,
                  color: isDark ? '#8b949e' : '#6b7280',
                }}>
                  {issue.description}
                </div>
              </div>
              {issue.targetId && (
                <ArrowRight
                  size={14}
                  style={{
                    color: isDark ? '#8b949e' : '#6b7280',
                    marginTop: '1px',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
