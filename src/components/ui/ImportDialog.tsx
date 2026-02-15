import React, { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';
import { X, Upload, Copy, Check, ChevronDown } from 'lucide-react';
import { importParsedSchema } from '../../services/parsers/importSchema';
import type { ParsedSchema } from '../../services/parsers/types';

interface CodeBlock {
  title: string;
  code: string;
  id: string;
}

export interface ImportFormatConfig {
  id: string;
  formatName: string;
  placeholder: string;
  fileAccept: string;
  parseFunction: (text: string) => ParsedSchema;
  instructions: {
    description: ReactNode;
    codeBlocks?: CodeBlock[];
  };
}

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  configs: ImportFormatConfig[];
  initialFormat?: string;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, configs, initialFormat }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const [selectedFormat, setSelectedFormat] = useState(initialFormat || configs[0]?.id || 'snowflake');
  const [schemaText, setSchemaText] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = colorMode === 'dark';
  
  const config = configs.find(c => c.id === selectedFormat) || configs[0];

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
      setSchemaText(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (!schemaText.trim()) {
      alert(`Please provide ${config.formatName} content`);
      return;
    }

    try {
      const result = config.parseFunction(schemaText);
      
      if (result.tables.length === 0) {
        alert(`No tables found in ${config.formatName}.\n\nPlease ensure your schema contains valid table definitions.`);
        return;
      }

      const { tableCount, fkCount } = importParsedSchema(result);
      
      console.log(`${config.formatName} import: ${tableCount} tables, ${fkCount} foreign keys`);
      
      setSchemaText('');
      onClose();
    } catch (error) {
      console.error(`Error parsing ${config.formatName}:`, error);
      alert(`Error parsing ${config.formatName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancel = () => {
    setSchemaText('');
    onClose();
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
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
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#111827',
              }}
            >
              Import Schema
            </h2>
            
            {/* Format Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: isDark ? '#21262d' : '#f3f4f6',
                  border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isDark ? '#e6edf3' : '#374151',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                }}
              >
                {config.formatName}
                <ChevronDown size={14} />
              </button>
              
              {formatDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    background: isDark ? '#161b22' : '#ffffff',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '6px',
                    boxShadow: isDark
                      ? '0 8px 24px rgba(0, 0, 0, 0.6)'
                      : '0 8px 24px rgba(0, 0, 0, 0.1)',
                    zIndex: 10001,
                    minWidth: '160px',
                    overflow: 'hidden',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {configs.map((cfg) => (
                    <button
                      key={cfg.id}
                      onClick={() => {
                        setSelectedFormat(cfg.id);
                        setFormatDropdownOpen(false);
                        setSchemaText('');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: cfg.id === selectedFormat
                          ? (isDark ? '#21262d' : '#f3f4f6')
                          : 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: cfg.id === selectedFormat ? 600 : 400,
                        color: isDark ? '#e6edf3' : '#374151',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (cfg.id !== selectedFormat) {
                          e.currentTarget.style.background = isDark ? '#21262d' : '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (cfg.id !== selectedFormat) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {cfg.formatName}
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
              color: isDark ? '#8b949e' : '#6b7280',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: '20px 20px 16px 20px',
            display: 'flex',
            gap: '20px',
            overflow: 'hidden',
          }}
        >
          {/* Left Panel - Instructions */}
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
                  {config.formatName}
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
                {config.instructions.description}
              </div>

              {config.instructions.codeBlocks?.map((block) => (
                <div key={block.id}>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isDark ? '#e6edf3' : '#111827',
                      margin: '0 0 8px 0',
                    }}
                  >
                    {block.title}
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
                      if (btn && copiedCode !== block.id) btn.style.opacity = '0';
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
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {block.code}
                    </pre>
                    <button
                      onClick={() => handleCopyCode(block.code, block.id)}
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
                        opacity: copiedCode === block.id ? 1 : 0,
                        transition: 'opacity 0.2s',
                        outline: 'none',
                      }}
                    >
                      {copiedCode === block.id ? (
                        <Check size={14} style={{ color: '#22c55e' }} />
                      ) : (
                        <Copy size={14} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Right Panel - Input */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflow: 'hidden',
            }}
          >
            {!showInstructions && (
              <button
                onClick={() => setShowInstructions(true)}
                style={{
                  alignSelf: 'flex-start',
                  background: isDark ? '#21262d' : '#f3f4f6',
                  border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: isDark ? '#e6edf3' : '#374151',
                  cursor: 'pointer',
                }}
              >
                Show Instructions
              </button>
            )}

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <label
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isDark ? '#e6edf3' : '#111827',
                }}
              >
                Paste {config.formatName} here:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleUploadClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: isDark ? '#21262d' : '#f3f4f6',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: isDark ? '#e6edf3' : '#374151',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                  }}
                >
                  <Upload size={14} />
                  Upload File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={config.fileAccept}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <textarea
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              placeholder={config.placeholder}
              style={{
                flex: 1,
                padding: '12px',
                background: isDark ? '#0d1117' : '#ffffff',
                border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: isDark ? '#e6edf3' : '#111827',
                resize: 'none',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = `1px solid ${isDark ? '#58a6ff' : '#2563eb'}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = `1px solid ${isDark ? '#30363d' : '#d1d5db'}`;
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#374151',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!schemaText.trim()}
            style={{
              padding: '8px 16px',
              background: schemaText.trim() 
                ? (isDark ? '#238636' : '#16a34a')
                : (isDark ? '#21262d' : '#f3f4f6'),
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: schemaText.trim() ? '#ffffff' : (isDark ? '#6e7681' : '#9ca3af'),
              cursor: schemaText.trim() ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => {
              if (schemaText.trim()) {
                e.currentTarget.style.background = isDark ? '#2ea043' : '#15803d';
              }
            }}
            onMouseLeave={(e) => {
              if (schemaText.trim()) {
                e.currentTarget.style.background = isDark ? '#238636' : '#16a34a';
              }
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
