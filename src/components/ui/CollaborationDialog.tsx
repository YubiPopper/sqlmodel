import { useState } from 'react';
import { Copy, Check, X, Wifi, WifiOff, FolderOpen, Plus } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';
import type {
  CollaborationSession,
  PersistedCollaborationRoom,
  PersonalModelSummary,
} from '../../collaboration/types';

interface CollaborationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: CollaborationSession;
  inviteLink: string | null;
  recentRooms: PersistedCollaborationRoom[];
  personalModels: PersonalModelSummary[];
  activePersonalModelId: string | null;
  onStart: (modelName: string) => void;
  onReopenRoom: (modelId: string, modelKey: string) => void;
  onCreatePersonalModel: (name: string) => void;
  onOpenPersonalModel: (modelId: string) => void;
  onSavePersonalModel: () => void;
  onStop: () => void;
}

export const CollaborationDialog = ({
  isOpen,
  onClose,
  session,
  inviteLink,
  recentRooms,
  personalModels,
  activePersonalModelId,
  onStart,
  onReopenRoom,
  onCreatePersonalModel,
  onOpenPersonalModel,
  onSavePersonalModel,
  onStop,
}: CollaborationDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [sharedModelName, setSharedModelName] = useState('Shared Model');
  const [personalModelName, setPersonalModelName] = useState('');
  const colorMode = useModelStore((s) => s.colorMode);
  const clearModel = useModelStore((s) => s.clearModel);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const isDark = colorMode === 'dark';

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatLastVisited = (timestamp: number): string =>
    new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

  const handleClose = () => {
    setShowLeaveConfirm(false);
    onClose();
  };

  const handleBackdropClick = () => {
    if (showLeaveConfirm) {
      setShowLeaveConfirm(false);
      return;
    }
    handleClose();
  };

  const handleLeaveKeepLocal = () => {
    setShowLeaveConfirm(false);
    onStop();
  };

  const handleLeaveStartNew = () => {
    setShowLeaveConfirm(false);
    onStop();
    clearModel();
  };

  const handleCreateSharedModel = () => {
    onStart(sharedModelName);
  };

  const handleCreatePersonalModel = () => {
    onCreatePersonalModel(personalModelName);
    setPersonalModelName('');
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
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          borderRadius: '12px',
          maxWidth: '620px',
          width: '100%',
          boxShadow: isDark
            ? '0 20px 60px rgba(0, 0, 0, 0.5)'
            : '0 20px 60px rgba(0, 0, 0, 0.15)',
          border: isDark ? '1px solid #30363d' : '1px solid #e2e8f0',
          overflow: 'hidden',
          position: 'relative',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: '4px',
            background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
          }}
        />

        <div style={{ padding: '20px 20px 12px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FolderOpen size={20} style={{ color: '#10b981' }} />
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
                Model Library
              </h3>
            </div>
            <button
              onClick={handleClose}
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
                ? `Sharing \"${session.modelName || 'Shared Model'}\" · ${session.connectedUsers.length + 1} user${session.connectedUsers.length + 1 !== 1 ? 's' : ''} connected`
                : 'Working locally'}
            </span>
          </div>

          {session.isActive && session.connectedUsers.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Connected users
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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

          {session.isActive && inviteLink && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Shared model invite link
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

          {!session.isActive && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Create shared model
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={sharedModelName}
                  onChange={(e) => setSharedModelName(e.target.value)}
                  placeholder="Shared model name"
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: isDark ? '#0d1117' : '#f8fafc',
                    color: isDark ? '#e6edf3' : '#1f2937',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleCreateSharedModel}
                  style={{
                    border: 'none',
                    outline: 'none',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '7px 12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Personal models
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                value={personalModelName}
                onChange={(e) => setPersonalModelName(e.target.value)}
                placeholder="New personal model"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: isDark ? '#0d1117' : '#f8fafc',
                  color: isDark ? '#e6edf3' : '#1f2937',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCreatePersonalModel}
                style={{
                  border: 'none',
                  outline: 'none',
                  borderRadius: '8px',
                  background: isDark ? '#21262d' : '#f3f4f6',
                  color: isDark ? '#e6edf3' : '#1f2937',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={14} />
                Create
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {personalModels.map((model) => (
                <div
                  key={model.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                    background: activePersonalModelId === model.id
                      ? (isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.08)')
                      : (isDark ? '#0d1117' : '#f8fafc'),
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: isDark ? '#e6edf3' : '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {model.name}
                    </div>
                    <div style={{ fontSize: '11px', color: isDark ? '#8b949e' : '#6b7280' }}>
                      Updated {formatLastVisited(model.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => onOpenPersonalModel(model.id)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '7px 10px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
            {!session.isActive && activePersonalModelId && (
              <button
                onClick={onSavePersonalModel}
                style={{
                  marginTop: '8px',
                  border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                  outline: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: isDark ? '#8b949e' : '#374151',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '7px 10px',
                  cursor: 'pointer',
                }}
              >
                Save current personal model
              </button>
            )}
          </div>

          {!session.isActive && recentRooms.length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Shared models you joined
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentRooms.map((room) => (
                  <div
                    key={room.modelId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '8px',
                      border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                      background: isDark ? '#0d1117' : '#f8fafc',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: isDark ? '#e6edf3' : '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.modelName || room.modelId}
                      </div>
                      <div style={{ fontSize: '11px', color: isDark ? '#8b949e' : '#6b7280' }}>
                        Last active {formatLastVisited(room.lastActiveAt)}
                      </div>
                      {room.archivedAt && (
                        <div style={{ fontSize: '11px', color: isDark ? '#d29922' : '#b45309' }}>
                          Archived
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onReopenRoom(room.modelId, room.modelKey)}
                      style={{
                        border: 'none',
                        outline: 'none',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '7px 10px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {!session.isActive ? (
              <button
                onClick={handleCreateSharedModel}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create shared model
              </button>
            ) : (
              <button
                onClick={() => setShowLeaveConfirm(true)}
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
                }}
              >
                Leave shared model
              </button>
            )}

            <button
              onClick={handleClose}
              style={{
                marginLeft: 'auto',
                padding: '10px 16px',
                border: isDark ? '1px solid rgba(48, 54, 61, 0.8)' : '1px solid rgba(226, 232, 240, 0.8)',
                outline: 'none',
                borderRadius: '8px',
                background: 'transparent',
                color: isDark ? '#8b949e' : '#64748b',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {showLeaveConfirm && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isDark ? 'rgba(13, 17, 23, 0.92)' : 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                borderRadius: '10px',
                border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                background: isDark ? '#161b22' : '#ffffff',
                padding: '16px',
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: isDark ? '#e6edf3' : '#1f2937' }}>
                Leave shared model?
              </h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', lineHeight: 1.5, color: isDark ? '#8b949e' : '#6b7280' }}>
                Do you want to keep a local copy of this model, or leave and start a new blank model?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={handleLeaveKeepLocal}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  Keep local copy
                </button>
                <button
                  onClick={handleLeaveStartNew}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: isDark ? '#f85149' : '#dc2626',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  Start new model
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: isDark ? '#8b949e' : '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
