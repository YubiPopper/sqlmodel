import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';
import { X, Copy, Check } from 'lucide-react';
import { parseSnowflakeDDL } from '../../services/parsers/snowflakeDDLParser';
import { importParsedSchema } from '../../services/parsers/importSchema';

interface SnowflakeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnowflakeDialog: React.FC<SnowflakeDialogProps> = ({ isOpen, onClose }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const [ddlText, setDdlText] = useState('');
  const [appendToEnd, setAppendToEnd] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [copiedCode, setCopiedCode] = useState<'database' | 'schema' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = colorMode === 'dark';

  if (!isOpen) return null;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setDdlText(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!ddlText.trim()) {
      alert('Please provide DDL text');
      return;
    }

    try {
      const result = parseSnowflakeDDL(ddlText);
      
      // Check if parsing found any tables
      if (result.tables.length === 0) {
        alert('No tables found in DDL');
        return;
      }

      const { tableCount, fkCount } = importParsedSchema(result);
      
      console.log(`Snowflake import: ${tableCount} tables, ${fkCount} foreign keys`);
      
      setDdlText('');
      onClose();
    } catch (error) {
      console.error('Error parsing DDL:', error);
      alert(`Error parsing DDL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancel = () => {
    setDdlText('');
    onClose();
  };

  const handleCopyCode = (code: string, type: 'database' | 'schema') => {
    navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const dialogContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1100px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark
            ? '0 20px 60px rgba(0, 0, 0, 0.8)'
            : '0 20px 60px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Content - No outer scroll, only inner textarea scrolls */}
        <div
          style={{
            flex: 1,
            padding: '20px 20px 16px 20px',
            display: 'flex',
            gap: '20px',
            overflow: 'hidden',
          }}
        >
          {/* Left Panel - Instructions (Collapsible) */}
          {showInstructions && (
            <div
              style={{
                flex: '0 0 380px',
                background: isDark ? '#0d1117' : '#f9fafb',
                border: `1px solid ${isDark ? '#21262d' : '#e5e7eb'}`,
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflow: 'auto',
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 600,
                    color: isDark ? '#e6edf3' : '#111827',
                  }}
                >
                  Snowflake
                </h3>
                <button
                  onClick={() => setShowInstructions(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isDark ? '#8b949e' : '#6b7280',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  Hide
                </button>
              </div>

              <div>
                <p
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: isDark ? '#c9d1d9' : '#4b5563',
                    margin: '0 0 10px 0',
                  }}
                >
                  Run the <code
                    style={{
                      background: isDark ? '#161b22' : '#ffffff',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '12px',
                      color: '#e53e3e',
                      border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                      fontFamily: 'monospace',
                    }}
                  >GET_DDL</code> command by hand, then copy and paste the output into the text input on the screen, or save it to a file and upload using the
                </p>
                <button
                  onClick={handleUploadClick}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: isDark ? '#21262d' : '#ffffff',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: isDark ? '#e6edf3' : '#374151',
                    cursor: 'pointer',
                  }}
                >
                  Upload .sql
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".sql,.txt"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <div>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isDark ? '#e6edf3' : '#111827',
                    margin: '0 0 8px 0',
                  }}
                >
                  Exporting all the tables DDL for the entire database:
                </p>
                <div 
                  className="code-block-wrapper"
                  style={{ position: 'relative' }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('button') as HTMLButtonElement;
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('button') as HTMLButtonElement;
                    if (btn && copiedCode !== 'database') btn.style.opacity = '0';
                  }}
                >
                  <pre
                    style={{
                      background: isDark ? '#0d1117' : '#ffffff',
                      border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: isDark ? '#58a6ff' : '#0969da',
                      overflowX: 'auto',
                      margin: 0,
                    }}
                  >
{`SELECT GET_DDL('database',
'<DATABASE_NAME>', true);`}
                  </pre>
                  <button
                    onClick={() => handleCopyCode(`SELECT GET_DDL('database',
'<DATABASE_NAME>', true);`, 'database')}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: isDark ? '#21262d' : '#ffffff',
                      border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: copiedCode === 'database' ? 1 : 0,
                      transition: 'opacity 0.2s',
                      outline: 'none',
                    }}
                  >
                    {copiedCode === 'database' ? (
                      <Check size={14} style={{ color: '#22c55e' }} />
                    ) : (
                      <Copy size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isDark ? '#e6edf3' : '#111827',
                    margin: '0 0 8px 0',
                  }}
                >
                  Select all tables in a single schema:
                </p>
                <div 
                  className="code-block-wrapper"
                  style={{ position: 'relative' }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('button') as HTMLButtonElement;
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('button') as HTMLButtonElement;
                    if (btn && copiedCode !== 'schema') btn.style.opacity = '0';
                  }}
                >
                  <pre
                    style={{
                      background: isDark ? '#0d1117' : '#ffffff',
                      border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: isDark ? '#58a6ff' : '#0969da',
                      overflowX: 'auto',
                      margin: 0,
                    }}
                  >
{`SELECT GET_DDL('schema',
'<DATABASE_NAME>.<SCHEMA_NAME>', true);`}
                  </pre>
                  <button
                    onClick={() => handleCopyCode(`SELECT GET_DDL('schema',
'<DATABASE_NAME>.<SCHEMA_NAME>', true);`, 'schema')}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: isDark ? '#21262d' : '#ffffff',
                      border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: copiedCode === 'schema' ? 1 : 0,
                      transition: 'opacity 0.2s',
                      outline: 'none',
                    }}
                  >
                    {copiedCode === 'schema' ? (
                      <Check size={14} style={{ color: '#22c55e' }} />
                    ) : (
                      <Copy size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Right Panel - Input */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            gap: '12px',
            overflow: 'hidden',
          }}>
            {/* Top bar with title and buttons */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #29B5E8 0%, #1E88E5 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                    }}
                  >
                    <img 
                      src="/assets/icons/snowflake.svg" 
                      alt="Snowflake" 
                      style={{ width: '100%', height: '100%', filter: 'brightness(0) invert(1)' }}
                    />
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 700,
                      color: isDark ? '#e6edf3' : '#111827',
                    }}
                  >
                    Import from Snowflake
                  </h2>
                </div>
                {!showInstructions && (
                  <button
                    onClick={() => setShowInstructions(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      background: isDark ? '#21262d' : '#f3f4f6',
                      border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: isDark ? '#e6edf3' : '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    Instructions
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDark ? '#8b949e' : '#6b7280',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px',
              minHeight: 0,
            }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isDark ? '#e6edf3' : '#374151',
                  flexShrink: 0,
                }}
              >
                Snowflake DDL Output
              </label>
              <textarea
                value={ddlText}
                onChange={(e) => setDdlText(e.target.value)}
                placeholder="Paste the output from GET_DDL command here..."
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isDark ? '#0d1117' : '#ffffff',
                  border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  color: isDark ? '#c9d1d9' : '#1f2937',
                  resize: 'none',
                  lineHeight: '1.5',
                  minHeight: 0,
                  overflow: 'auto',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '10px 12px',
                background: isDark ? '#161b22' : '#f3f4f6',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '6px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="append-checkbox"
                  checked={appendToEnd}
                  onChange={(e) => setAppendToEnd(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                  }}
                />
                <label
                  htmlFor="append-checkbox"
                  style={{
                    fontSize: '13px',
                    color: isDark ? '#c9d1d9' : '#4b5563',
                    cursor: 'pointer',
                  }}
                >
                  Append converted DBML to the end
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '8px 16px',
                    background: isDark ? '#21262d' : '#ffffff',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isDark ? '#e6edf3' : '#374151',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #29B5E8 0%, #1E88E5 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
