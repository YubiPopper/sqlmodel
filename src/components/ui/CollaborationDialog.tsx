import { useState } from 'react';
import { Users, Copy, Check, X, Wifi, WifiOff } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';
import type { CollaborationSession } from '../../collaboration/types';

interface CollaborationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: CollaborationSession;
  inviteLink: string | null;
  onStart: () => void;
  onStop: () => void;
}

export const CollaborationDialog = ({
  isOpen,
  onClose,
  session,
  inviteLink,
  onStart,
  onStop,
}: CollaborationDialogProps) => {
  const [copied, setCopied] = useState(false);
  const colorMode = useModelStore((s) => s.colorMode);
  const isDark = colorMode === 'dark';

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          borderRadius: '12px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: isDark
            ? '0 20px 60px rgba(0, 0, 0, 0.5)'
            : '0 20px 60px rgba(0, 0, 0, 0.15)',
          border: isDark ? '1px solid #30363d' : '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top bar */}
        <div
          style={{
            height: '4px',
            background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
          }}
        />

        <div style={{ padding: '20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={20} style={{ color: '#10b981' }} />
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Collaborate
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: isDark ? '#8b949e' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                outline: 'none',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: session.isActive
                ? isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)'
                : isDark ? '#0d1117' : '#f8fafc',
              border: `1px solid ${session.isActive
                ? isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                : isDark ? '#30363d' : '#e5e7eb'}`,
              marginBottom: '16px',
            }}
          >
            {session.isActive
              ? <Wifi size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              : <WifiOff size={16} style={{ color: isDark ? '#8b949e' : '#9ca3af', flexShrink: 0 }} />
            }
            <span style={{ fontSize: '13px', color: session.isActive ? '#10b981' : isDark ? '#8b949e' : '#6b7280' }}>
              {session.isActive
                ? `Live session · ${session.connectedUsers.length + 1} user${session.connectedUsers.length + 1 !== 1 ? 's' : ''} connected`
                : 'Not in a collaborative session'}
            </span>
          </div>

          {/* Connected users */}
          {session.isActive && session.connectedUsers.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Connected users
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Self */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: session.userColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {session.userName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', color: isDark ? '#e6edf3' : '#1f2937' }}>
                    {session.userName} <span style={{ color: isDark ? '#8b949e' : '#9ca3af', fontSize: '11px' }}>(you)</span>
                  </span>
                </div>
                {session.connectedUsers.map((u) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', color: isDark ? '#e6edf3' : '#1f2937' }}>
                      {u.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite link */}
          {session.isActive && inviteLink && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Invite link
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: isDark ? '#0d1117' : '#f8fafc',
                    color: isDark ? '#e6edf3' : '#1f2937',
                    fontSize: '12px',
                    outline: 'none',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: '9px 14px',
                    border: 'none',
                    outline: 'none',
                    borderRadius: '8px',
                    background: copied
                      ? '#22c55e'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {!session.isActive ? (
              <button
                onClick={onStart}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Start collaboration
              </button>
            ) : (
              <button
                onClick={onStop}
                style={{
                  padding: '10px 16px',
                  border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                  outline: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: isDark ? '#f85149' : '#dc2626',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(248, 81, 73, 0.1)' : 'rgba(220, 38, 38, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Leave session
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                padding: '10px 16px',
                border: isDark ? '1px solid rgba(48, 54, 61, 0.8)' : '1px solid rgba(226, 232, 240, 0.8)',
                outline: 'none',
                borderRadius: '8px',
                background: 'transparent',
                color: isDark ? '#8b949e' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
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
    </div>
  );
};
