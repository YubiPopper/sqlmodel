import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { IconButton } from '../../shared/IconButton';
import { Tooltip } from '../../shared/Tooltip';
import { Toast } from '../../ui/Toast';

interface SaveShareButtonsProps {
  isMobile?: boolean;
}

export const SaveShareButtons = ({ isMobile = false }: SaveShareButtonsProps) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setShowShareDialog(false);
    setShowToast(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {isMobile ? (
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
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Tooltip content="Share diagram">
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
                  value={window.location.href}
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
