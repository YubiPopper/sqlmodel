import { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Save, FolderOpen } from 'lucide-react';
import { useModelStore } from '../../../store/useModelStore';
import { supabase } from '../../../services/supabaseClient';
import { AuthDialog } from '../../ui/AuthDialog';
import { DiagramsDialog } from '../../ui/DiagramsDialog';
import { Toast } from '../../ui/Toast';

interface AuthButtonProps {
  triggerSave?: boolean;
  triggerSaveAs?: boolean;
  onSaveComplete?: () => void;
  onSaveAsComplete?: () => void;
}

export const AuthButton = ({ triggerSave, triggerSaveAs, onSaveComplete, onSaveAsComplete }: AuthButtonProps = {}) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showDiagramsDialog, setShowDiagramsDialog] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [diagramName, setDiagramName] = useState('');
  const [diagramDescription, setDiagramDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isSaveAs, setIsSaveAs] = useState(false);
  
  const colorMode = useModelStore(state => state.colorMode);
  const user = useModelStore(state => state.user);
  const setUser = useModelStore(state => state.setUser);
  const setSession = useModelStore(state => state.setSession);
  const signOut = useModelStore(state => state.signOut);
  const saveDiagramToCloud = useModelStore(state => state.saveDiagramToCloud);
  const currentDiagramId = useModelStore(state => state.currentDiagramId);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = colorMode === 'dark';

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    // Use capture phase to ensure we catch the event before React Flow
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [showUserMenu]);

  // Handle external save trigger
  useEffect(() => {
    if (triggerSave && user) {
      // If diagram already exists (has UUID), save directly without dialog
      if (currentDiagramId) {
        handleQuickSave();
      } else {
        setShowSaveDialog(true);
      }
      onSaveComplete?.();
    }
  }, [triggerSave, user, onSaveComplete, currentDiagramId]);

  // Handle external save as trigger - always show dialog
  useEffect(() => {
    if (triggerSaveAs && user) {
      setIsSaveAs(true);
      setShowSaveDialog(true);
      onSaveAsComplete?.();
    }
  }, [triggerSaveAs, user, onSaveAsComplete]);

  const handleQuickSave = async () => {
    if (!currentDiagramId) return;
    
    setSaving(true);
    try {
      // Save with empty name/description - will update existing diagram
      await saveDiagramToCloud('', '', false);
      setShowToast(true);
    } catch (error) {
      alert('Failed to save diagram');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDiagram = async () => {
    if (!diagramName.trim()) return;
    
    setSaving(true);
    try {
      // For Save As, temporarily clear currentDiagramId to force creating new diagram
      if (isSaveAs && currentDiagramId) {
        // Temporarily set currentDiagramId to null to force creation of new diagram
        useModelStore.setState({ currentDiagramId: null });
      }
      
      const newDiagramId = await saveDiagramToCloud(diagramName, diagramDescription, isPublic);
      
      // If this was Save As, update URL with new diagram ID
      if (isSaveAs && newDiagramId) {
        const url = new URL(window.location.href);
        url.searchParams.set('diagram', newDiagramId);
        window.history.pushState({}, '', url.toString());
        setIsSaveAs(false);
      }
      
      setShowSaveDialog(false);
      setDiagramName('');
      setDiagramDescription('');
      setIsPublic(false);
      setShowToast(true);
    } catch (error) {
      alert('Failed to save diagram');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthDialog(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
          }}
        >
          <LogIn size={16} />
          Sign In
        </button>
        <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
      </>
    );
  }

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: isDark ? '#e6edf3' : '#1f2937',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.7';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {user.email?.[0].toUpperCase() || 'U'}
        </div>
      </button>

      {/* User Dropdown Menu */}
      {showUserMenu && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '220px',
            background: isDark ? '#21262d' : '#ffffff',
            border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: isDark 
              ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
              : '0 8px 24px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* User Info */}
          <div
            style={{
              padding: '12px',
              borderBottom: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {user.email?.[0].toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isDark ? '#e6edf3' : '#1f2937',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: isDark ? '#8b949e' : '#6b7280',
                }}
              >
                Signed in
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ padding: '4px' }}>
            <button
              onClick={() => {
                setShowSaveDialog(true);
                setShowUserMenu(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#e6edf3' : '#1f2937',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'background 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Save size={16} />
              {currentDiagramId ? 'Update Diagram' : 'Save Diagram'}
            </button>

            <button
              onClick={() => {
                setShowDiagramsDialog(true);
                setShowUserMenu(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#e6edf3' : '#1f2937',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'background 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <FolderOpen size={16} />
              My Diagrams
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: isDark ? '#30363d' : '#e5e7eb', margin: '4px 0' }} />

          {/* Sign Out */}
          <div style={{ padding: '4px' }}>
            <button
              onClick={async () => {
                await signOut();
                setShowUserMenu(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'background 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#30363d' : '#fef2f2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              background: isDark ? '#161b22' : '#ffffff',
              borderRadius: '12px',
              maxWidth: '420px',
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
              {currentDiagramId ? 'Update Diagram' : 'Save Diagram'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isDark ? '#8b949e' : '#64748b',
                  }}
                >
                  Diagram Name *
                </label>
                <input
                  type="text"
                  value={diagramName}
                  onChange={(e) => setDiagramName(e.target.value)}
                  placeholder="My Awesome Diagram"
                  style={{
                    width: 'calc(100% - 28px)',
                    padding: '9px 12px',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: isDark ? '#0d1117' : '#ffffff',
                    color: isDark ? '#e6edf3' : '#1f2937',
                    fontSize: '13px',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isDark ? '#8b949e' : '#64748b',
                  }}
                >
                  Description (optional)
                </label>
                <textarea
                  value={diagramDescription}
                  onChange={(e) => setDiagramDescription(e.target.value)}
                  placeholder="Describe your diagram..."
                  rows={3}
                  style={{
                    width: 'calc(100% - 28px)',
                    padding: '9px 12px',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: isDark ? '#0d1117' : '#ffffff',
                    color: isDark ? '#e6edf3' : '#1f2937',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                  }}
                />
                <label
                  htmlFor="isPublic"
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isDark ? '#8b949e' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Make this diagram public (anyone can view)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  style={{
                    flex: 1,
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
                  Cancel
                </button>
                <button
                  onClick={handleSaveDiagram}
                  disabled={!diagramName.trim() || saving}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: 'none',
                    outline: 'none',
                    borderRadius: '8px',
                    background: diagramName.trim() && !saving
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : isDark ? '#30363d' : '#e5e7eb',
                    color: diagramName.trim() && !saving ? '#ffffff' : isDark ? '#6e7681' : '#9ca3af',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: diagramName.trim() && !saving ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (diagramName.trim() && !saving) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (diagramName.trim() && !saving) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {saving ? 'Saving...' : currentDiagramId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message="Diagram saved successfully!"
          type="save"
          onClose={() => setShowToast(false)}
        />
      )}

      <DiagramsDialog isOpen={showDiagramsDialog} onClose={() => setShowDiagramsDialog(false)} />
    </div>
  );
};
