import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';
import { X, Link2, Loader2, Check, Copy, AlertCircle } from 'lucide-react';
import { parse } from '../../services/parsers';
import { importParsedSchema } from '../../services/parsers/importSchema';
import { buildShareableUrl } from '../../hooks/useUrlImport';
import { SESSION_KEY } from '../../hooks/schemaUrlState';
import type { SupportedFormat } from '../../services/parsers/types';

interface ImportUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

const FORMAT_OPTIONS: { value: SupportedFormat | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'rails', label: 'Rails (schema.rb)' },
  { value: 'prisma', label: 'Prisma' },
];

/** Map extensions to parser formats. */
const EXT_FORMAT_MAP: Record<string, SupportedFormat[]> = {
  '.sql':    ['postgres', 'snowflake'],
  '.rb':     ['rails'],
  '.prisma': ['prisma'],
  '.schema': ['prisma'],
  '.ddl':    ['postgres', 'snowflake'],
};

function guessFormats(url: string): SupportedFormat[] {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.substring(pathname.lastIndexOf('.')).toLowerCase();
    if (EXT_FORMAT_MAP[ext]) return EXT_FORMAT_MAP[ext];
  } catch {
    for (const [ext, formats] of Object.entries(EXT_FORMAT_MAP)) {
      if (url.includes(ext)) return formats;
    }
  }
  return ['postgres', 'snowflake'];
}

export const ImportUrlDialog: React.FC<ImportUrlDialogProps> = ({ isOpen, onClose }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<SupportedFormat | 'auto'>('auto');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setMessage('');
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImport = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setStatus('error');
      setMessage('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      setStatus('error');
      setMessage('Invalid URL format. Please enter a full URL starting with https://');
      return;
    }

    setStatus('loading');
    setMessage(`Fetching schema from URL…`);

    try {
      const response = await fetch(trimmedUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const content = await response.text();

      if (!content.trim()) {
        throw new Error('The fetched file is empty');
      }

      // Determine formats to try
      const formats: SupportedFormat[] = format === 'auto'
        ? guessFormats(trimmedUrl)
        : [format];

      let lastError: Error | null = null;

      for (const fmt of formats) {
        try {
          const result = await parse(content, fmt);
          if (result.tables.length > 0) {
            const { tableCount, fkCount } = importParsedSchema(result, { clearFirst: true });
            setStatus('success');
            setMessage(`Imported ${tableCount} table${tableCount !== 1 ? 's' : ''} and ${fkCount} FK${fkCount !== 1 ? 's' : ''} (${fmt})`);
            // Update address bar so the URL is shareable and persists
            const shareUrl = buildShareableUrl(trimmedUrl);
            window.history.replaceState({}, '', new URL(shareUrl).pathname + new URL(shareUrl).search);
            sessionStorage.setItem(SESSION_KEY, trimmedUrl);
            // Switch to physical view to show imported tables
            useModelStore.getState().setViewMode('physical');
            return;
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      }

      throw lastError || new Error('No tables found in the fetched file. Check the URL or try a different format.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCopyShareUrl = () => {
    if (!url.trim()) return;
    const shareUrl = buildShareableUrl(url.trim());
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && status !== 'loading') {
      e.preventDefault();
      handleImport();
    } else if (e.key === 'Escape') {
      onClose();
    }
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
          maxWidth: '600px',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link2 size={18} color={isDark ? '#58a6ff' : '#2563eb'} />
            <h2 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: isDark ? '#e6edf3' : '#1f2937',
            }}>
              Import from URL
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: isDark ? '#8b949e' : '#6b7280',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Description */}
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: isDark ? '#8b949e' : '#6b7280',
            lineHeight: '1.6',
          }}>
            Paste a URL to a raw SQL, Rails schema, or Prisma file. GitHub raw links, GitLab raw links, or any publicly accessible file URL will work.
          </p>

          {/* URL Input */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#c9d1d9' : '#374151',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Schema URL
            </label>
            <input
              autoFocus
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://raw.githubusercontent.com/user/repo/main/schema.sql"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                background: isDark ? '#0d1117' : '#f9fafb',
                border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                borderRadius: '8px',
                color: isDark ? '#e6edf3' : '#1f2937',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Format Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#c9d1d9' : '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
            }}>
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as SupportedFormat | 'auto')}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                background: isDark ? '#0d1117' : '#f9fafb',
                border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                borderRadius: '8px',
                color: isDark ? '#e6edf3' : '#1f2937',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {FORMAT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Status Message */}
          {status !== 'idle' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              background: status === 'loading'
                ? (isDark ? '#1c2333' : '#eff6ff')
                : status === 'success'
                  ? (isDark ? '#0d2818' : '#f0fdf4')
                  : (isDark ? '#2d1418' : '#fef2f2'),
              color: status === 'loading'
                ? (isDark ? '#58a6ff' : '#2563eb')
                : status === 'success'
                  ? (isDark ? '#3fb950' : '#16a34a')
                  : (isDark ? '#f85149' : '#dc2626'),
              border: `1px solid ${
                status === 'loading'
                  ? (isDark ? '#1f3a5f' : '#bfdbfe')
                  : status === 'success'
                    ? (isDark ? '#1a4731' : '#bbf7d0')
                    : (isDark ? '#4a1d22' : '#fecaca')
              }`,
            }}>
              {status === 'loading' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {status === 'success' && <Check size={14} />}
              {status === 'error' && <AlertCircle size={14} />}
              <span style={{ flex: 1 }}>{message}</span>
            </div>
          )}

          {/* Tip */}
          <div style={{
            fontSize: '12px',
            color: isDark ? '#6e7681' : '#9ca3af',
            lineHeight: '1.5',
          }}>
            <strong>Tip:</strong> On GitHub, click "Raw" on any file to get a direct link. You can also share this import as a URL:{' '}
            <code style={{
              fontSize: '11px',
              background: isDark ? '#21262d' : '#f3f4f6',
              padding: '1px 4px',
              borderRadius: '3px',
            }}>
              {window.location.origin}?url=…
            </code>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Copy share URL button */}
          <button
            onClick={handleCopyShareUrl}
            disabled={!url.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'none',
              border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
              borderRadius: '8px',
              color: isDark ? '#8b949e' : '#6b7280',
              cursor: url.trim() ? 'pointer' : 'not-allowed',
              opacity: url.trim() ? 1 : 0.5,
            }}
            title="Copy a shareable link that auto-imports this schema"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Share URL'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                background: isDark ? '#21262d' : '#f3f4f6',
                border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                borderRadius: '8px',
                color: isDark ? '#c9d1d9' : '#374151',
                cursor: 'pointer',
              }}
            >
              {status === 'success' ? 'Done' : 'Cancel'}
            </button>
            {status !== 'success' && (
              <button
                onClick={handleImport}
                disabled={status === 'loading' || !url.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: status === 'loading' || !url.trim() ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' || !url.trim() ? 0.6 : 1,
                }}
              >
                {status === 'loading' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                Import
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};
