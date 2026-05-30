import { useState } from 'react';
import { Save, Share2 } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { AuthDialog } from '../../ui/AuthDialog';
import { IconButton } from '../../shared/IconButton';
import { Tooltip } from '../../shared/Tooltip';
import { Toast } from '../../ui/Toast';
import { DropdownButton } from '../../shared/Dropdown';
import type { DropdownItem } from '../../shared/Dropdown';
import { buildShareLink } from '../../../hooks/shareUrlState';

interface SaveShareButtonsProps {
  onSaveClick?: () => void;
  onSaveAsClick?: () => void;
  isMobile?: boolean;
}

export const SaveShareButtons = ({ onSaveClick, onSaveAsClick, isMobile = false }: SaveShareButtonsProps) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const user = useModelStore(state => state.user);
  const colorMode = useModelStore(state => state.colorMode);
  const currentDiagramId = useModelStore(state => state.currentDiagramId);
  const viewMode = useModelStore(state => state.viewMode);
  const selectedId = useModelStore(state => state.selectedId);
  const entities = useModelStore(state => state.entities);
  const tables = useModelStore(state => state.tables);
  const isDark = colorMode === 'dark';
  const [includeView, setIncludeView] = useState(true);
  const [includeFocus, setIncludeFocus] = useState(true);
  const [includeInspector, setIncludeInspector] = useState(false);

  const hasFocusTarget = Boolean(
    selectedId &&
    (entities.some(entity => entity.id === selectedId) || tables.some(table => table.id === selectedId))
  );

  const shareUrl = buildShareLink({
    diagramId: currentDiagramId,
    view: includeView ? viewMode : null,
    focus: includeFocus && hasFocusTarget ? selectedId : null,
    inspector: includeInspector && includeFocus && hasFocusTarget,
  });

  const handleShare = () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    
    if (!currentDiagramId) {
      alert('Please save your diagram first before sharing');
      return;
    }
    
    setShowShareDialog(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setShowShareDialog(false);
    setShowToast(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveItems: DropdownItem[] = [
    {
      label: 'Save',
      icon: <Save size={14} />,
      onClick: () => onSaveClick?.(),
      disabled: !currentDiagramId,
    },
    {
      label: 'Save as...',
      icon: <Save size={14} />,
      onClick: () => onSaveAsClick?.(),
    },
  ];

  return (
    <>
      {isMobile ? (
        <>
          {user && (
            <button
              onClick={() => {
                if (currentDiagramId) {
                  onSaveClick?.();
                } else {
                  onSaveAsClick?.();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px 14px',
                minHeight: '48px',
                height: '48px',
                boxSizing: 'border-box',
                background: isDark ? '#21262d' : '#f3f4f6',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: isDark ? '#e6edf3' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
              }}
            >
              <Save size={18} style={{ flexShrink: 0 }} />
              <span>Save</span>
            </button>
          )}
          
          <button
            onClick={handleShare}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '12px 14px',
              minHeight: '48px',
              height: '48px',
              boxSizing: 'border-box',
              background: isDark ? '#21262d' : '#f3f4f6',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: isDark ? '#e6edf3' : '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.15s ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
            }}
          >
            <Share2 size={18} style={{ flexShrink: 0 }} />
            <span>Share</span>
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {user && (
            <DropdownButton
              label=""
              items={saveItems}
              icon={<Save size={18} />}
              variant="ghost"
            />
          )}
          
          <Tooltip content={user ? "Share diagram" : "Sign in to share"}>
            <div>
              <IconButton
                icon={<Share2 size={18} />}
                onClick={handleShare}
                variant="ghost"
                size="md"
              />
            </div>
          </Tooltip>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message="Share link copied to clipboard!"
          type="share"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Auth Dialog for non-logged-in users */}
      <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />

      {/* Share Dialog */}
      {showShareDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowShareDialog(false)}
        >
          <div
            style={{
              background: isDark ? '#161b22' : '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: isDark
                ? '0 20px 60px rgba(0, 0, 0, 0.5)'
                : '0 20px 60px rgba(0, 0, 0, 0.15)',
              border: isDark ? '1px solid #30363d' : '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient Top Bar */}
            <div
              style={{
                height: '4px',
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
              }}
            />
            
            <div style={{ padding: '20px' }}>
              <h3
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '19px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Share Diagram
              </h3>

              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '13px',
                  color: isDark ? '#8b949e' : '#64748b',
                  lineHeight: 1.5,
                }}
              >
                Share this link with others to let them view your diagram:
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: isDark ? '#0d1117' : '#f8fafc',
                    color: isDark ? '#e6edf3' : '#1f2937',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={copyShareLink}
                  style={{
                    padding: '9px 16px',
                    border: 'none',
                    outline: 'none',
                    borderRadius: '8px',
                    background: copied
                      ? '#22c55e'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: isDark ? '#8b949e' : '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={includeView}
                    onChange={(e) => setIncludeView(e.target.checked)}
                  />
                  Include current view ({viewMode})
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: isDark ? '#8b949e' : '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={includeFocus}
                    disabled={!hasFocusTarget}
                    onChange={(e) => setIncludeFocus(e.target.checked)}
                  />
                  Focus selected node{!hasFocusTarget ? ' (select an entity/table first)' : ''}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: isDark ? '#8b949e' : '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={includeInspector}
                    disabled={!includeFocus || !hasFocusTarget}
                    onChange={(e) => setIncludeInspector(e.target.checked)}
                  />
                  Auto-open inspector
                </label>
              </div>

              <button
                onClick={() => setShowShareDialog(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: isDark
                    ? '1px solid rgba(48, 54, 61, 0.8)'
                    : '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: isDark ? '#8b949e' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                  e.currentTarget.style.color = isDark ? '#e6edf3' : '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = isDark ? '#8b949e' : '#64748b';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
