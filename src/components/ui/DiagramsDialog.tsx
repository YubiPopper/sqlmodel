import { useState, useEffect } from 'react';
import { X, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';

interface DiagramsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagramsDialog = ({ isOpen, onClose }: DiagramsDialogProps) => {
  const [tab, setTab] = useState<'mine' | 'public'>('mine');
  const [myDiagrams, setMyDiagrams] = useState<any[]>([]);
  const [publicDiagrams, setPublicDiagrams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [diagramToDelete, setDiagramToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const colorMode = useModelStore(state => state.colorMode);
  const getUserDiagrams = useModelStore(state => state.getUserDiagrams);
  const getPublicDiagrams = useModelStore(state => state.getPublicDiagrams);
  const loadDiagramFromCloud = useModelStore(state => state.loadDiagramFromCloud);
  const deleteDiagramFromCloud = useModelStore(state => state.deleteDiagramFromCloud);
  const currentDiagramId = useModelStore(state => state.currentDiagramId);
  
  const isDark = colorMode === 'dark';

  useEffect(() => {
    if (isOpen) {
      loadDiagrams();
    }
  }, [isOpen, tab]);

  const loadDiagrams = async () => {
    setLoading(true);
    try {
      if (tab === 'mine') {
        const diagrams = await getUserDiagrams();
        setMyDiagrams(diagrams);
      } else {
        const diagrams = await getPublicDiagrams();
        setPublicDiagrams(diagrams);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDiagram = async (id: string) => {
    try {
      await loadDiagramFromCloud(id);
      // Update URL with diagram ID
      const url = new URL(window.location.href);
      url.searchParams.set('diagram', id);
      window.history.pushState({}, '', url.toString());
      onClose();
    } catch (error) {
      alert('Failed to load diagram');
    }
  };

  const handleDeleteDiagram = (id: string) => {
    setDiagramToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!diagramToDelete) return;
    
    setDeleting(true);
    try {
      await deleteDiagramFromCloud(diagramToDelete);
      setDeleteDialogOpen(false);
      setDiagramToDelete(null);
      loadDiagrams();
    } catch (error) {
      alert('Failed to delete diagram');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const diagrams = tab === 'mine' ? myDiagrams : publicDiagrams;

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          borderRadius: '12px',
          maxWidth: '660px',
          width: '100%',
          maxHeight: '80vh',
          boxShadow: isDark
            ? '0 20px 60px rgba(0, 0, 0, 0.5)'
            : '0 20px 60px rgba(0, 0, 0, 0.15)',
          border: isDark ? '1px solid #30363d' : '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
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
        
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: isDark
              ? '1px solid rgba(51, 65, 85, 0.5)'
              : '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '19px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            My Diagrams
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '6px',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#8b949e' : '#64748b',
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
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '0 20px',
            borderBottom: isDark
              ? '1px solid rgba(51, 65, 85, 0.5)'
              : '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <button
            onClick={() => setTab('mine')}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              borderBottom: tab === 'mine' ? '2px solid #3b82f6' : '2px solid transparent',
              color: tab === 'mine'
                ? (isDark ? '#60a5fa' : '#2563eb')
                : (isDark ? '#8b949e' : '#64748b'),
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            My Diagrams ({myDiagrams.length})
          </button>
          <button
            onClick={() => setTab('public')}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              borderBottom: tab === 'public' ? '2px solid #3b82f6' : '2px solid transparent',
              color: tab === 'public'
                ? (isDark ? '#60a5fa' : '#2563eb')
                : (isDark ? '#8b949e' : '#64748b'),
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Public Diagrams
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', minHeight: '400px' }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
                color: isDark ? '#8b949e' : '#64748b',
                fontSize: '13px',
              }}
            >
              Loading...
            </div>
          ) : diagrams.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
                gap: '8px',
                color: isDark ? '#8b949e' : '#64748b',
              }}
            >
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                {tab === 'mine' ? 'No saved diagrams yet' : 'No public diagrams available'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
                {tab === 'mine' ? 'Save your first diagram to see it here' : 'Check back later for shared diagrams'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {diagrams.map((diagram) => (
                <div
                  key={diagram.id}
                  style={{
                    padding: '14px',
                    background: isDark ? '#0d1117' : '#f8fafc',
                    border: isDark
                      ? '1px solid rgba(48, 54, 61, 0.8)'
                      : '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? '#161b22' : '#f1f5f9';
                    e.currentTarget.style.borderColor = isDark
                      ? 'rgba(59, 130, 246, 0.4)'
                      : 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isDark ? '#0d1117' : '#f8fafc';
                    e.currentTarget.style.borderColor = isDark
                      ? 'rgba(48, 54, 61, 0.8)'
                      : 'rgba(226, 232, 240, 0.8)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: isDark ? '#e6edf3' : '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {diagram.name}
                        {diagram.id === currentDiagramId && (
                          <span
                            style={{
                              padding: '2px 6px',
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#22c55e',
                              fontSize: '10px',
                              fontWeight: 700,
                              borderRadius: '4px',
                              border: '1px solid rgba(34, 197, 94, 0.5)',
                            }}
                          >
                            CURRENT
                          </span>
                        )}
                        {diagram.is_public && (
                          <ExternalLink size={12} style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
                        )}
                      </h3>
                      {diagram.description && (
                        <p
                          style={{
                            margin: '0 0 6px 0',
                            fontSize: '12px',
                            color: isDark ? '#8b949e' : '#64748b',
                            lineHeight: 1.5,
                          }}
                        >
                          {diagram.description}
                        </p>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          color: isDark ? '#6e7681' : '#8b949e',
                        }}
                      >
                        <Calendar size={12} />
                        {new Date(diagram.updated_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleLoadDiagram(diagram.id)}
                        style={{
                          padding: '7px 14px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          border: 'none',
                          outline: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        Load
                      </button>
                      {tab === 'mine' && (
                        <button
                          onClick={() => handleDeleteDiagram(diagram.id)}
                          style={{
                            padding: '7px',
                            background: 'transparent',
                            border: isDark
                              ? '1px solid rgba(48, 54, 61, 0.8)'
                              : '1px solid rgba(226, 232, 240, 0.8)',
                            outline: 'none',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark
                              ? 'rgba(239, 68, 68, 0.1)'
                              : 'rgba(239, 68, 68, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = isDark
                              ? 'rgba(48, 54, 61, 0.8)'
                              : 'rgba(226, 232, 240, 0.8)';
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
          onClick={() => !deleting && setDeleteDialogOpen(false)}
        >
          <div
            style={{
              background: isDark ? '#161b22' : '#ffffff',
              borderRadius: '8px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: isDark
                ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                : '0 8px 32px rgba(0, 0, 0, 0.12)',
              border: isDark ? '1px solid #30363d' : '1px solid #e2e8f0',
              padding: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#1f2937',
              }}
            >
              Delete diagram?
            </h3>
            
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '13px',
                lineHeight: 1.5,
                color: isDark ? '#8b949e' : '#64748b',
              }}
            >
              This action cannot be undone.
            </p>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: isDark
                    ? '1px solid #30363d'
                    : '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: isDark ? '#8b949e' : '#64748b',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  outline: 'none',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '6px',
                  background: deleting
                    ? (isDark ? '#30363d' : '#e5e7eb')
                    : '#ef4444',
                  color: deleting ? (isDark ? '#6e7681' : '#9ca3af') : '#ffffff',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
