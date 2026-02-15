import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';
import { X, Copy, Check, Upload, ChevronDown, Download } from 'lucide-react';
import { parseRailsSchema } from '../../services/parsers/railsParser';
import { parsePostgresqlDDL } from '../../services/parsers/postgresParser';
import { parsePrismaSchema } from '../../services/parsers/prismaParser';
import { parseSnowflakeDDL } from '../../services/parsers/snowflakeDDLParser';
import { importParsedSchema } from '../../services/parsers/importSchema';

type SchemaMode = 'import' | 'export';
type ImportFormat = 'rails' | 'postgresql' | 'prisma' | 'snowflake';
type ExportDialect = 'postgresql' | 'mysql' | 'snowflake' | 'sqlserver' | 'sqlite';

interface SchemaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: SchemaMode;
}

const IMPORT_FORMAT_LABELS: Record<ImportFormat, string> = {
  rails: 'Rails schema.rb',
  postgresql: 'PostgreSQL DDL',
  prisma: 'Prisma schema',
  snowflake: 'Snowflake DDL',
};

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

      if (dialect === 'sqlite' && attr.isPrimaryKey && mappedType === 'INTEGER') {
        parts.push('INTEGER PRIMARY KEY');
        if (!attr.isNullable) parts.push('NOT NULL');
        columnLines.push(parts.join(' '));
        return;
      }

      parts.push(mappedType);
      if (!attr.isNullable) parts.push('NOT NULL');

      if (dialect === 'postgresql' && attr.dataType.toLowerCase() === 'uuid' && attr.isPrimaryKey) {
        parts.push('DEFAULT gen_random_uuid()');
      }

      columnLines.push(parts.join(' '));
    });

    const pkColumns = table.attributes.filter(a => a.isPrimaryKey);
    const sqlitePKHandledInline = dialect === 'sqlite' && pkColumns.length === 1
      && mapDataType(pkColumns[0].dataType, dialect) === 'INTEGER';

    if (pkColumns.length > 0 && !sqlitePKHandledInline) {
      const pkNames = pkColumns.map(a => quoteIdentifier(a.name, dialect)).join(', ');
      constraints.push(`    PRIMARY KEY (${pkNames})`);
    }

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

export const SchemaDialog: React.FC<SchemaDialogProps> = ({ isOpen, onClose, mode }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const [importFormat, setImportFormat] = useState<ImportFormat>('rails');
  const [exportDialect, setExportDialect] = useState<ExportDialect>('postgresql');
  const [schemaText, setSchemaText] = useState('');
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = colorMode === 'dark';

  useEffect(() => {
    if (isOpen && mode === 'export') {
      setSchemaText(generateFullDDL(exportDialect));
      setPosition({ x: 0, y: 0 });
    } else if (isOpen && mode === 'import') {
      setSchemaText('');
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (isOpen && mode === 'export') {
      setSchemaText(generateFullDDL(exportDialect));
    }
  }, [exportDialect, isOpen, mode]);

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

  useEffect(() => {
    if (!isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      if (dialogRef.current && dialogRef.current.contains(e.target as Node)) {
        e.stopPropagation();
      }
    };

    document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => document.removeEventListener('wheel', handleWheel, { capture: true });
  }, [isOpen]);

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

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      setPosition({
        x: moveEvent.clientX - dragOffsetRef.current.x,
        y: moveEvent.clientY - dragOffsetRef.current.y,
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };

    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schemaText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([schemaText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `schema_${exportDialect}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSchemaText(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = () => {
    if (!schemaText.trim()) {
      alert('Please provide schema content');
      return;
    }

    try {
      let result;
      
      switch (importFormat) {
        case 'rails':
          result = parseRailsSchema(schemaText);
          break;
        case 'postgresql':
          result = parsePostgresqlDDL(schemaText);
          break;
        case 'prisma':
          result = parsePrismaSchema(schemaText);
          break;
        case 'snowflake':
          result = parseSnowflakeDDL(schemaText);
          break;
        default:
          throw new Error('Unsupported import format');
      }

      if (result.tables.length === 0) {
        alert(`No tables found in ${IMPORT_FORMAT_LABELS[importFormat]}.\n\nPlease ensure your schema contains valid table definitions.`);
        return;
      }

      const { tableCount, fkCount } = importParsedSchema(result);
      
      console.log(`${importFormat} import: ${tableCount} tables, ${fkCount} foreign keys`);
      
      setSchemaText('');
      onClose();
    } catch (error) {
      console.error('Error parsing schema:', error);
      alert(`Error parsing schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  const title = mode === 'export' ? 'Export Database Schema (SQL DDL)' : 'Import Database Schema';
  const subtitle = mode === 'export' 
    ? 'All tables and foreign key constraints' 
    : 'Paste your schema or upload a file';

  return createPortal(
    <div
      ref={dialogRef}
      className="nodrag nopan"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        width: '650px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: isDark ? '#161b22' : 'white',
          borderRadius: '8px',
          padding: '0',
          boxShadow: isDark
            ? '0 8px 24px rgba(0, 0, 0, 0.6)'
            : '0 8px 24px rgba(0, 0, 0, 0.25)',
          border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          height: '550px',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Hidden file input for upload */}
        {mode === 'import' && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".rb,.sql,.prisma"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        )}

        {/* Header */}
        <div
          onMouseDown={handleDragStart}
          style={{
            padding: '14px 18px',
            borderBottom: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#111827',
                marginBottom: '2px',
              }}>
                {title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: isDark ? '#8b949e' : '#6b7280',
              }}>
                {subtitle}
              </p>
            </div>
            {/* Format/Dialect Dropdown */}
            <div
              ref={dropdownRef}
              className="nodrag nopan"
              style={{ position: 'relative' }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                className="nodrag nopan"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(!dropdownOpen);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  background: isDark ? '#21262d' : '#f3f4f6',
                  border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                  color: isDark ? '#e6edf3' : '#374151',
                  padding: '4px 10px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontWeight: 500,
                  minHeight: '30px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                }}
              >
                {mode === 'export' 
                  ? EXPORT_DIALECT_LABELS[exportDialect]
                  : IMPORT_FORMAT_LABELS[importFormat]
                }
                <ChevronDown size={14} style={{
                  transition: 'transform 0.15s',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }} />
              </button>
              {dropdownOpen && (
                <div
                  className="nodrag nopan"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: isDark ? '#161b22' : 'white',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    boxShadow: isDark
                      ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                      : '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 10001,
                    overflow: 'hidden',
                    minWidth: '160px',
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {mode === 'export' ? (
                    (Object.keys(EXPORT_DIALECT_LABELS) as ExportDialect[]).map((key) => (
                      <button
                        key={key}
                        className="nodrag nopan"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExportDialect(key);
                          setDropdownOpen(false);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 12px',
                          fontSize: '12px',
                          fontWeight: exportDialect === key ? 600 : 400,
                          color: exportDialect === key
                            ? (isDark ? '#58a6ff' : '#2563eb')
                            : (isDark ? '#e6edf3' : '#374151'),
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 0,
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {exportDialect === key ? `✓ ${EXPORT_DIALECT_LABELS[key]}` : `   ${EXPORT_DIALECT_LABELS[key]}`}
                      </button>
                    ))
                  ) : (
                    (Object.keys(IMPORT_FORMAT_LABELS) as ImportFormat[]).map((key) => (
                      <button
                        key={key}
                        className="nodrag nopan"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImportFormat(key);
                          setDropdownOpen(false);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 12px',
                          fontSize: '12px',
                          fontWeight: importFormat === key ? 600 : 400,
                          color: importFormat === key
                            ? (isDark ? '#58a6ff' : '#2563eb')
                            : (isDark ? '#e6edf3' : '#374151'),
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 0,
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {importFormat === key ? `✓ ${IMPORT_FORMAT_LABELS[key]}` : `   ${IMPORT_FORMAT_LABELS[key]}`}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {mode === 'export' ? (
              <>
                <button
                  className="nodrag nopan"
                  onClick={handleDownload}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    background: isDark ? '#2563eb' : '#3b82f6',
                    border: 'none',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? '#1d4ed8' : '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? '#2563eb' : '#3b82f6';
                  }}
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  className="nodrag nopan"
                  onClick={handleCopy}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    background: isDark ? '#21262d' : '#f3f4f6',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    color: isDark ? '#e6edf3' : '#374151',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </>
            ) : (
              <>
                <button
                  className="nodrag nopan"
                  onClick={handleUploadClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    background: isDark ? '#21262d' : '#f3f4f6',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    color: isDark ? '#e6edf3' : '#374151',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                  }}
                >
                  <Upload size={16} />
                  Upload File
                </button>
                <button
                  className="nodrag nopan"
                  onClick={handleImport}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    background: isDark ? '#2563eb' : '#3b82f6',
                    border: 'none',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? '#1d4ed8' : '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? '#2563eb' : '#3b82f6';
                  }}
                >
                  Import
                </button>
              </>
            )}
            <button
              className="nodrag nopan"
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: 'transparent',
                border: 'none',
                color: isDark ? '#8b949e' : '#6b7280',
                padding: '5px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                e.currentTarget.style.color = isDark ? '#e6edf3' : '#111827';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            padding: '14px 18px',
            borderRadius: '0 0 8px 8px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <textarea
            className="nodrag nopan"
            value={schemaText}
            onChange={mode === 'import' ? (e) => setSchemaText(e.target.value) : undefined}
            readOnly={mode === 'export'}
            placeholder={mode === 'import' ? `Paste your ${IMPORT_FORMAT_LABELS[importFormat]} here...` : undefined}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              flex: 1,
              background: isDark ? '#0d1117' : '#f9fafb',
              color: isDark ? '#e6edf3' : '#111827',
              border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
              borderRadius: '5px',
              padding: '10px',
              fontSize: '12px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
              lineHeight: '1.4',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              overflow: 'auto',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = isDark
                ? '1px solid #22c55e'
                : '1px solid #16a34a';
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = isDark
                ? '1px solid #30363d'
                : '1px solid #e5e7eb';
            }}
          />
          <p style={{
            marginTop: '8px',
            marginBottom: '0',
            fontSize: '10px',
            color: isDark ? '#8b949e' : '#6b7280',
            fontStyle: 'italic',
          }}>
            {mode === 'export' 
              ? 'Read-only view of the complete database schema' 
              : `Paste ${IMPORT_FORMAT_LABELS[importFormat]} content or upload a file`
            }
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
