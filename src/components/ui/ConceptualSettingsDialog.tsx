import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, FileText, Maximize2, Type } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';

interface ConceptualSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConceptualSettingsDialog: React.FC<ConceptualSettingsDialogProps> = ({ isOpen, onClose }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const showEntityDescriptions = useModelStore(state => state.showEntityDescriptions);
  const showRelationshipLabels = useModelStore(state => state.showRelationshipLabels);
  const entityCardSize = useModelStore(state => state.entityCardSize);
  const relationshipLabelSize = useModelStore(state => state.relationshipLabelSize);
  const setShowEntityDescriptions = useModelStore(state => state.setShowEntityDescriptions);
  const setShowRelationshipLabels = useModelStore(state => state.setShowRelationshipLabels);
  const setEntityCardSize = useModelStore(state => state.setEntityCardSize);
  const setRelationshipLabelSize = useModelStore(state => state.setRelationshipLabelSize);
  
  const [localShowDescriptions, setLocalShowDescriptions] = useState(showEntityDescriptions);
  const [localShowLabels, setLocalShowLabels] = useState(showRelationshipLabels);
  const [localCardSize, setLocalCardSize] = useState(entityCardSize);
  const [localLabelSize, setLocalLabelSize] = useState(relationshipLabelSize);

  const isDark = colorMode === 'dark';

  // Reset local state when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Use a microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setLocalShowDescriptions(showEntityDescriptions);
        setLocalShowLabels(showRelationshipLabels);
        setLocalCardSize(entityCardSize);
        setLocalLabelSize(relationshipLabelSize);
      });
    }
  }, [isOpen, showEntityDescriptions, showRelationshipLabels, entityCardSize, relationshipLabelSize]);

  const handleSave = () => {
    setShowEntityDescriptions(localShowDescriptions);
    setShowRelationshipLabels(localShowLabels);
    setEntityCardSize(localCardSize);
    setRelationshipLabelSize(localLabelSize);
    onClose();
  };

  const handleCancel = () => {
    setLocalShowDescriptions(showEntityDescriptions);
    setLocalShowLabels(showRelationshipLabels);
    setLocalCardSize(entityCardSize);
    setLocalLabelSize(relationshipLabelSize);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}
    onClick={handleCancel}
    >
      <div 
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          borderRadius: '12px',
          boxShadow: isDark 
            ? '0 20px 60px rgba(0, 0, 0, 0.6)' 
            : '0 20px 60px rgba(0, 0, 0, 0.2)',
          width: '480px',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: isDark ? '#e6edf3' : '#1f2937',
          }}>
            Conceptual View Settings
          </h2>
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
              color: isDark ? '#8b949e' : '#6b7280',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Show Entity Descriptions */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}>
                <FileText size={16} style={{ color: '#6366f1' }} />
                <label style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isDark ? '#e6edf3' : '#1f2937',
                }}>
                  Show Entity Descriptions
                </label>
              </div>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: isDark ? '#8b949e' : '#6b7280',
                lineHeight: '1.5',
              }}>
                Display description text below entity names on the canvas
              </p>
            </div>
            <div
              onClick={() => setLocalShowDescriptions(!localShowDescriptions)}
              style={{
                width: '44px',
                height: '24px',
                background: localShowDescriptions 
                  ? '#6366f1'
                  : isDark ? '#30363d' : '#d1d5db',
                borderRadius: '12px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: localShowDescriptions ? '22px' : '2px',
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s ease-in-out',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {localShowDescriptions ? (
                  <Eye size={12} style={{ color: '#6366f1' }} />
                ) : (
                  <EyeOff size={12} style={{ color: '#9ca3af' }} />
                )}
              </div>
            </div>
          </div>

          {/* Show Relationship Labels */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}>
                <FileText size={16} style={{ color: '#6366f1' }} />
                <label style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isDark ? '#e6edf3' : '#1f2937',
                }}>
                  Show Relationship Labels
                </label>
              </div>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: isDark ? '#8b949e' : '#6b7280',
                lineHeight: '1.5',
              }}>
                Display labels on relationship lines between entities
              </p>
            </div>
            <div
              onClick={() => setLocalShowLabels(!localShowLabels)}
              style={{
                width: '44px',
                height: '24px',
                background: localShowLabels 
                  ? '#6366f1'
                  : isDark ? '#30363d' : '#d1d5db',
                borderRadius: '12px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: localShowLabels ? '22px' : '2px',
                width: '20px',
                height: '20px',
                background: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s ease-in-out',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {localShowLabels ? (
                  <Eye size={12} style={{ color: '#6366f1' }} />
                ) : (
                  <EyeOff size={12} style={{ color: '#9ca3af' }} />
                )}
              </div>
            </div>
          </div>

          {/* Entity Card Size */}
          <div style={{
            marginBottom: '20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <Maximize2 size={16} style={{ color: '#6366f1' }} />
              <label style={{
                fontSize: '14px',
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#1f2937',
              }}>
                Default Entity Card Size
              </label>
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              {(['compact', 'normal', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setLocalCardSize(size)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: localCardSize === size
                      ? '#6366f1'
                      : isDark ? '#0d1117' : '#f9fafb',
                    border: `1px solid ${localCardSize === size ? '#6366f1' : (isDark ? '#30363d' : '#e5e7eb')}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: localCardSize === size
                      ? 'white'
                      : isDark ? '#e6edf3' : '#1f2937',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize',
                  }}
                  onMouseEnter={(e) => {
                    if (localCardSize !== size) {
                      e.currentTarget.style.background = isDark ? '#161b22' : '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (localCardSize !== size) {
                      e.currentTarget.style.background = isDark ? '#0d1117' : '#f9fafb';
                    }
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: isDark ? '#8b949e' : '#6b7280',
              fontStyle: 'italic',
            }}>
              {localCardSize === 'compact' && 'Minimal: 140×80px - Best for large models'}
              {localCardSize === 'normal' && 'Standard: 220×120px - Balanced view'}
              {localCardSize === 'large' && 'Spacious: 280×160px - Maximum detail'}
            </p>
          </div>
          
          {/* Relationship Label Size */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <Type size={16} style={{ color: '#6366f1' }} />
              <label style={{
                fontSize: '14px',
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#1f2937',
              }}>
                Relationship Label Text Size
              </label>
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              {(['small', 'normal', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setLocalLabelSize(size)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: localLabelSize === size
                      ? '#6366f1'
                      : isDark ? '#0d1117' : '#f9fafb',
                    border: `1px solid ${localLabelSize === size ? '#6366f1' : (isDark ? '#30363d' : '#e5e7eb')}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: localLabelSize === size
                      ? 'white'
                      : isDark ? '#e6edf3' : '#1f2937',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize',
                  }}
                  onMouseEnter={(e) => {
                    if (localLabelSize !== size) {
                      e.currentTarget.style.background = isDark ? '#161b22' : '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (localLabelSize !== size) {
                      e.currentTarget.style.background = isDark ? '#0d1117' : '#f9fafb';
                    }
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: isDark ? '#8b949e' : '#6b7280',
              fontStyle: 'italic',
            }}>
              {localLabelSize === 'small' && 'Compact: 10px - For detailed diagrams'}
              {localLabelSize === 'normal' && 'Standard: 12px - Balanced readability'}
              {localLabelSize === 'large' && 'Large: 14px - Maximum clarity'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#1f2937',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: '#6366f1',
              border: '1px solid #6366f1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4f46e5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#6366f1';
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
