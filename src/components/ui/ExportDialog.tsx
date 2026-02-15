import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';
import { X, Copy, Check, Download, ChevronDown } from 'lucide-react';

type ExportDialect = 'postgresql' | 'mysql' | 'snowflake' | 'sqlserver' | 'sqlite';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXPORT_DIALECT_LABELS: Record<ExportDialect, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  snowflake: 'Snowflake',
  sqlserver: 'SQL Server',
  sqlite: 'SQLite',
};

// ── Quoting helpers per dialect ──

const quoteIdentifier = (name: string, dialect: ExportDialect): string => {
  switch (dialect) {
    case 'mysql':
      return `\`${name}\``;
    case 'sqlserver':
      return `[${name}]`;
    default:
      return `"${name}"`;
  }
};

const buildTableName = (
  table: { name: string; database?: string; schema?: string },
  dialect: ExportDialect
): string => {
  const parts: string[] = [];
  if (table.database && (dialect === 'snowflake' || dialect === 'sqlserver')) {
    parts.push(quoteIdentifier(table.database, dialect));
  }
  if (table.schema && dialect !== 'mysql' && dialect !== 'sqlite') {
    parts.push(quoteIdentifier(table.schema, dialect));
  }
  parts.push(quoteIdentifier(table.name, dialect));
  return parts.join('.');
};

const mapDataType = (dataType: string, dialect: ExportDialect): string => {
  const dt = dataType.toLowerCase().trim();

  switch (dialect) {
    case 'postgresql':
      return dt.toUpperCase();
    case 'mysql': {
      if (dt === 'uuid') return 'CHAR(36)';
      if (dt === 'text') return 'TEXT';
      if (dt === 'boolean') return 'TINYINT(1)';
      if (dt === 'timestamp') return 'DATETIME';
      if (dt === 'serial') return 'INT AUTO_INCREMENT';
      if (dt === 'bigserial') return 'BIGINT AUTO_INCREMENT';
      return dt.toUpperCase();
    }
    case 'snowflake': {
      if (dt === 'uuid') return 'VARCHAR(36)';
      if (dt === 'serial') return 'NUMBER AUTOINCREMENT';
      if (dt === 'bigserial') return 'NUMBER AUTOINCREMENT';
      if (dt === 'boolean') return 'BOOLEAN';
      if (dt === 'text') return 'VARCHAR';
      return dt.toUpperCase();
    }
    case 'sqlserver': {
      if (dt === 'uuid') return 'UNIQUEIDENTIFIER';
      if (dt === 'varchar') return 'NVARCHAR(255)';
      if (dt === 'text') return 'NVARCHAR(MAX)';
      if (dt === 'boolean') return 'BIT';
      if (dt === 'timestamp') return 'DATETIME2';
      if (dt === 'serial') return 'INT IDENTITY(1,1)';
      if (dt === 'bigserial') return 'BIGINT IDENTITY(1,1)';
      if (dt === 'int') return 'INT';
      if (dt === 'bigint') return 'BIGINT';
      if (dt === 'decimal') return 'DECIMAL(18,2)';
      if (dt === 'date') return 'DATE';
      return dt.toUpperCase();
    }
    case 'sqlite': {
      if (dt === 'uuid') return 'TEXT';
      if (dt === 'varchar') return 'TEXT';
      if (dt === 'boolean') return 'INTEGER';
      if (dt === 'timestamp') return 'TEXT';
      if (dt === 'decimal') return 'REAL';
      if (dt === 'serial') return 'INTEGER';
      if (dt === 'bigserial') return 'INTEGER';
      if (dt === 'date') return 'TEXT';
      return dt.toUpperCase();
    }
    default:
      return dt.toUpperCase();
  }
};

const generateFullDDL = (dialect: ExportDialect): string => {
  const lines: string[] = [];
  const state = useModelStore.getState();

  // Generate database and schema creation for Snowflake
  if (dialect === 'snowflake') {
    const databases = new Set(state.tables.map(t => t.database).filter(Boolean));
    const schemas = new Set(state.tables.map(t => t.schema).filter(Boolean));
    databases.forEach(db => {
      lines.push(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(db!, dialect)};`);
    });
    if (databases.size > 0) lines.push('');
    schemas.forEach(schema => {
      lines.push(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema!, dialect)};`);
    });
    if (schemas.size > 0) lines.push('');
  }

  // Generate table definitions
  state.tables.forEach((table, index) => {
    if (index > 0) lines.push('');

    const fullName = buildTableName(table, dialect);

    if (dialect === 'sqlite') {
      lines.push(`CREATE TABLE IF NOT EXISTS ${fullName} (`);
    } else {
      lines.push(`CREATE TABLE ${fullName} (`);
    }

    const columnLines: string[] = [];
    const constraints: string[] = [];

    table.attributes.forEach((attr) => {
      const parts = [`    ${quoteIdentifier(attr.name, dialect)}`];
      const mappedType = mapDataType(attr.dataType, dialect);

      // SQLite: INTEGER PRIMARY KEY is auto-increment
      if (dialect === 'sqlite' && attr.isPrimaryKey && mappedType === 'INTEGER') {
        parts.push('INTEGER PRIMARY KEY');
        if (!attr.isNullable) parts.push('NOT NULL');
        columnLines.push(parts.join(' '));
        return;
      }

      parts.push(mappedType);
      if (!attr.isNullable) parts.push('NOT NULL');

      // PostgreSQL: UUID default
      if (dialect === 'postgresql' && attr.dataType.toLowerCase() === 'uuid' && attr.isPrimaryKey) {
        parts.push('DEFAULT gen_random_uuid()');
      }

      columnLines.push(parts.join(' '));
    });

    // Primary Key constraint
    const pkColumns = table.attributes.filter(a => a.isPrimaryKey);
    const sqlitePKHandledInline = dialect === 'sqlite' && pkColumns.length === 1
      && mapDataType(pkColumns[0].dataType, dialect) === 'INTEGER';

    if (pkColumns.length > 0 && !sqlitePKHandledInline) {
      const pkNames = pkColumns.map(a => quoteIdentifier(a.name, dialect)).join(', ');
      constraints.push(`    PRIMARY KEY (${pkNames})`);
    }

    // SQLite: inline foreign keys in table definition
    if (dialect === 'sqlite') {
      state.foreignKeys
        .filter(fk => fk.fromTableId === table.id)
        .forEach(fk => {
          const targetTable = state.tables.find(t => t.id === fk.toTableId);
          const sourceAttr = table.attributes.find(a => a.id === fk.fromAttributeId);
          const targetAttr = targetTable?.attributes.find(a => a.id === fk.toAttributeId);
          if (targetTable && sourceAttr && targetAttr) {
            constraints.push(
              `    FOREIGN KEY (${quoteIdentifier(sourceAttr.name, dialect)}) REFERENCES ${quoteIdentifier(targetTable.name, dialect)}(${quoteIdentifier(targetAttr.name, dialect)})`
            );
          }
        });
    }

    const allLines = [...columnLines, ...constraints];
    lines.push(allLines.join(',\n'));

    if (dialect === 'mysql') {
      lines.push(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;');
    } else {
      lines.push(');');
    }
  });

  // Foreign keys for non-SQLite dialects (as ALTER TABLE statements)
  if (dialect !== 'sqlite' && state.foreignKeys.length > 0) {
    lines.push('');
    lines.push('-- Foreign Keys');
    state.foreignKeys.forEach((fk) => {
      const sourceTable = state.tables.find(t => t.id === fk.fromTableId);
      const targetTable = state.tables.find(t => t.id === fk.toTableId);
      const sourceAttr = sourceTable?.attributes.find(a => a.id === fk.fromAttributeId);
      const targetAttr = targetTable?.attributes.find(a => a.id === fk.toAttributeId);

      if (sourceTable && targetTable && sourceAttr && targetAttr) {
        const fullSourceName = buildTableName(sourceTable, dialect);
        const fullTargetName = buildTableName(targetTable, dialect);
        const constraintName = `fk_${sourceTable.name}_${sourceAttr.name}`;

        lines.push('');
        lines.push(`ALTER TABLE ${fullSourceName}`);
        lines.push(`    ADD CONSTRAINT ${quoteIdentifier(constraintName, dialect)}`);
        lines.push(`    FOREIGN KEY (${quoteIdentifier(sourceAttr.name, dialect)})`);
        lines.push(`    REFERENCES ${fullTargetName}(${quoteIdentifier(targetAttr.name, dialect)});`);
      }
    });
  }

  return lines.join('\n');
};

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const [exportDialect, setExportDialect] = useState<ExportDialect>('postgresql');
  const [ddlText, setDDLText] = useState('');
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = colorMode === 'dark';

  // Generate DDL when dialog opens or dialect changes
  useEffect(() => {
    if (isOpen) {
      setDDLText(generateFullDDL(exportDialect));
    }
  }, [isOpen, exportDialect]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (dropdownOpen) {
          setDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, dropdownOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ddlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([ddlText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema_${exportDialect}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const lineCount = ddlText.split('\n').length;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: isDark ? '#0f172a' : '#ffffff',
          borderRadius: '16px',
          width: '95%',
          maxWidth: '650px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with toolbar feel */}
        <div
          style={{
            background: isDark 
              ? 'linear-gradient(to bottom, #1e293b 0%, #0f172a 100%)'
              : 'linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
            {/* Icon/Logo area */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isDark 
                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark 
                ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                : '0 2px 8px rgba(59, 130, 246, 0.2)',
            }}>
              <Download size={16} color="#ffffff" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  letterSpacing: '-0.01em',
                }}
              >
                Export Database Schema
              </h2>
              <div style={{
                fontSize: '12px',
                color: isDark ? '#64748b' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span>{lineCount} lines</span>
                <span style={{ opacity: 0.4 }}>•</span>
                <span>DDL Script</span>
              </div>
            </div>

            {/* Dialect Selector with better styling */}
            <div style={{ position: 'relative', marginLeft: 'auto', marginRight: '12px' }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isDark ? '#f1f5f9' : '#0f172a',
                  background: isDark 
                    ? 'rgba(51, 65, 85, 0.6)'
                    : 'rgba(255, 255, 255, 0.9)',
                  border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isDark 
                    ? '0 1px 3px rgba(0, 0, 0, 0.3)'
                    : '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(71, 85, 105, 0.7)' : 'rgba(255, 255, 255, 1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = isDark 
                    ? '0 2px 6px rgba(0, 0, 0, 0.4)'
                    : '0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isDark 
                    ? '0 1px 3px rgba(0, 0, 0, 0.3)'
                    : '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: isDark ? '#94a3b8' : '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>SQL</span>
                <span>{EXPORT_DIALECT_LABELS[exportDialect]}</span>
                <ChevronDown size={14} style={{ opacity: 0.6 }} />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: '200px',
                    background: isDark ? '#1e293b' : '#ffffff',
                    border: isDark ? '1px solid #475569' : '1px solid #d1d5db',
                    borderRadius: '10px',
                    boxShadow: isDark
                      ? '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                      : '0 10px 40px rgba(0, 0, 0, 0.12)',
                    padding: '6px',
                    zIndex: 1001,
                    animation: 'menuSlideDown 0.15s ease-out',
                  }}
                >
                  {(Object.keys(EXPORT_DIALECT_LABELS) as ExportDialect[]).map((dialect) => (
                    <button
                      key={dialect}
                      onClick={() => {
                        setExportDialect(dialect);
                        setDropdownOpen(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        fontWeight: dialect === exportDialect ? 600 : 400,
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        background:
                          dialect === exportDialect
                            ? isDark
                              ? 'rgba(59, 130, 246, 0.15)'
                              : 'rgba(59, 130, 246, 0.08)'
                            : 'transparent',
                        border: 'none',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        if (dialect !== exportDialect) {
                          e.currentTarget.style.background = isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.9)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (dialect !== exportDialect) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{EXPORT_DIALECT_LABELS[dialect]}</span>
                        {dialect === exportDialect && (
                          <Check size={14} style={{ marginLeft: 'auto', color: '#3b82f6' }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#64748b' : '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? '#f1f5f9' : '#0f172a';
              e.currentTarget.style.background = isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? '#64748b' : '#94a3b8';
              e.currentTarget.style.background = 'transparent';
            }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Code Content Area - Editor-like */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            background: isDark ? '#0a0f1a' : '#fafbfc',
          }}
        >
          {/* Line numbers */}
          <div
            style={{
              width: '52px',
              padding: '20px 0',
              background: isDark ? '#0f1419' : '#f6f8fa',
              borderRight: isDark ? '1px solid #1e293b' : '1px solid #e5e7eb',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'right',
                  padding: '0 12px',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  color: isDark ? '#475569' : '#9ca3af',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                  userSelect: 'none',
                  height: '16.5px',
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code editor */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <textarea
              readOnly
              value={ddlText}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '450px',
                padding: '20px 24px',
                fontSize: '11px',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
                color: isDark ? '#e2e8f0' : '#1f2937',
                background: 'transparent',
                border: 'none',
                resize: 'none',
                outline: 'none',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                overflowY: 'auto',
                overflowX: 'hidden',
                tabSize: 4,
                boxSizing: 'border-box',
              }}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Footer - Action bar */}
        <div
          style={{
            background: isDark 
              ? 'linear-gradient(to top, #0f172a 0%, #1e293b 100%)'
              : 'linear-gradient(to top, #f1f5f9 0%, #f8fafc 100%)',
            borderTop: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 600,
              color: isDark ? '#f1f5f9' : '#0f172a',
              background: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(255, 255, 255, 0.9)',
              border: isDark ? '1px solid #475569' : '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isDark 
                ? '0 1px 3px rgba(0, 0, 0, 0.3)'
                : '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(71, 85, 105, 0.7)' : 'rgba(255, 255, 255, 1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = isDark 
                ? '0 2px 6px rgba(0, 0, 0, 0.4)'
                : '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isDark 
                ? '0 1px 3px rgba(0, 0, 0, 0.3)'
                : '0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>

          <button
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isDark 
                ? '0 2px 8px rgba(59, 130, 246, 0.3), 0 1px 3px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(59, 130, 246, 0.25), 0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = isDark 
                ? '0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)'
                : '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isDark 
                ? '0 2px 8px rgba(59, 130, 246, 0.3), 0 1px 3px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(59, 130, 246, 0.25), 0 1px 2px rgba(0, 0, 0, 0.05)';
            }}
          >
            <Download size={15} />
            Download SQL File
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
