import React, { useState, useCallback } from 'react';
import { X, Sparkles, Wand2, Settings, Loader2, Lightbulb, ChevronRight, AlertCircle } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';
import {
  generateDataModel,
  enhanceModel,
  generatePhysicalFromConceptual,
  getAISettings,
  PROMPT_TEMPLATES,
  type AIServiceConfig,
} from '../../services/aiService';

interface AIDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

type AIMode = 'generate' | 'enhance' | 'physical';

export const AIDialog: React.FC<AIDialogProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const [mode, setMode] = useState<AIMode>('generate');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  
  const colorMode = useModelStore(state => state.colorMode);
  const entities = useModelStore(state => state.entities);
  const relationships = useModelStore(state => state.relationships);
  const tables = useModelStore(state => state.tables);
  const foreignKeys = useModelStore(state => state.foreignKeys);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  
  const isDark = colorMode === 'dark';

  const hasExistingModel = entities.length > 0 || tables.length > 0;
  const hasConceptualOnly = entities.length > 0 && tables.length === 0;

  const handleGenerate = useCallback(async () => {
    const settings = getAISettings();
    if (!settings?.apiKey) {
      setError('Please configure your AI API key in settings first.');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a description for your data model.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'generate') {
        const result = await generateDataModel(prompt, settings);
        
        // Load the generated model
        loadModelFromJSON({
          conceptual: {
            entities: result.entities,
            relationships: result.relationships,
            groups: [],
          },
          physical: {
            tables: result.tables,
            foreignKeys: result.foreignKeys,
            tableGroups: [],
          },
        });
        
        onClose();
      } else if (mode === 'enhance') {
        const result = await enhanceModel(
          { entities, relationships, tables, foreignKeys },
          prompt,
          settings
        );
        
        // Merge with existing model
        const state = useModelStore.getState();
        loadModelFromJSON({
          conceptual: {
            entities: [...state.entities, ...result.entities],
            relationships: [...state.relationships, ...result.relationships],
            groups: state.entityGroups,
          },
          physical: {
            tables: [...state.tables, ...result.tables],
            foreignKeys: [...state.foreignKeys, ...result.foreignKeys],
            tableGroups: state.tableGroups,
          },
          nodeLayouts: state.nodeLayouts,
          tableLayouts: state.tableLayouts,
          viewport: state.viewport,
        });
        
        // Run auto layout to position new elements
        setTimeout(() => {
          useModelStore.getState().autoLayout();
        }, 100);
        
        onClose();
      } else if (mode === 'physical') {
        const result = await generatePhysicalFromConceptual(entities, relationships, settings);
        
        // Merge with existing model
        const state = useModelStore.getState();
        loadModelFromJSON({
          conceptual: {
            entities: state.entities,
            relationships: state.relationships,
            groups: state.entityGroups,
          },
          physical: {
            tables: [...state.tables, ...result.tables],
            foreignKeys: [...state.foreignKeys, ...result.foreignKeys],
            tableGroups: state.tableGroups,
          },
          nodeLayouts: state.nodeLayouts,
          tableLayouts: state.tableLayouts,
          viewport: state.viewport,
        });
        
        // Switch to physical view and layout
        useModelStore.getState().setViewMode('physical');
        setTimeout(() => {
          useModelStore.getState().autoLayout();
        }, 100);
        
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [mode, prompt, entities, relationships, tables, foreignKeys, loadModelFromJSON, onClose]);

  const handleTemplateSelect = (template: string) => {
    setPrompt(template);
    setShowTemplates(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '85vh',
          background: isDark ? '#0d1117' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '16px',
          boxShadow: isDark 
            ? '0 25px 80px rgba(0, 0, 0, 0.8)' 
            : '0 25px 80px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          background: isDark 
            ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={22} color="white" />
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#1f2937',
              }}>
                AI Data Modeler
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: isDark ? '#8b949e' : '#6b7280',
              }}>
                Generate and enhance data models with AI
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onOpenSettings}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                background: isDark ? '#21262d' : '#f3f4f6',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: isDark ? '#8b949e' : '#6b7280',
              }}
              title="AI Settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: isDark ? '#8b949e' : '#6b7280',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Mode Selection */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMode('generate')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: mode === 'generate' 
                  ? 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)'
                  : isDark ? '#21262d' : '#f3f4f6',
                border: `1px solid ${mode === 'generate' ? 'transparent' : isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '10px',
                color: mode === 'generate' ? 'white' : isDark ? '#e6edf3' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <Wand2 size={16} />
              Generate New
            </button>
            <button
              onClick={() => setMode('enhance')}
              disabled={!hasExistingModel}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: mode === 'enhance' 
                  ? 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)'
                  : isDark ? '#21262d' : '#f3f4f6',
                border: `1px solid ${mode === 'enhance' ? 'transparent' : isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '10px',
                color: mode === 'enhance' ? 'white' : isDark ? '#e6edf3' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: hasExistingModel ? 'pointer' : 'not-allowed',
                opacity: hasExistingModel ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <Sparkles size={16} />
              Enhance Model
            </button>
            {hasConceptualOnly && (
              <button
                onClick={() => setMode('physical')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: mode === 'physical' 
                    ? 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)'
                    : isDark ? '#21262d' : '#f3f4f6',
                  border: `1px solid ${mode === 'physical' ? 'transparent' : isDark ? '#30363d' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  color: mode === 'physical' ? 'white' : isDark ? '#e6edf3' : '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Lightbulb size={16} />
                Add Tables
              </button>
            )}
          </div>

          {/* Description */}
          <div style={{
            padding: '16px',
            background: isDark ? '#161b22' : '#f9fafb',
            borderRadius: '10px',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          }}>
            {mode === 'generate' && (
              <p style={{ margin: 0, fontSize: '14px', color: isDark ? '#8b949e' : '#6b7280' }}>
                Describe the system you want to model. AI will generate entities, relationships, tables, and foreign keys.
              </p>
            )}
            {mode === 'enhance' && (
              <p style={{ margin: 0, fontSize: '14px', color: isDark ? '#8b949e' : '#6b7280' }}>
                Describe what you want to add or change. AI will analyze your current model and suggest enhancements.
              </p>
            )}
            {mode === 'physical' && (
              <p style={{ margin: 0, fontSize: '14px', color: isDark ? '#8b949e' : '#6b7280' }}>
                AI will generate physical tables with columns and foreign keys based on your conceptual entities.
              </p>
            )}
          </div>

          {/* Prompt Input */}
          {mode !== 'physical' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isDark ? '#e6edf3' : '#374151',
                }}>
                  {mode === 'generate' ? 'Describe your data model' : 'What would you like to add?'}
                </label>
                {mode === 'generate' && (
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#9333ea',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Lightbulb size={14} />
                    Templates
                    <ChevronRight 
                      size={14} 
                      style={{ 
                        transform: showTemplates ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }} 
                    />
                  </button>
                )}
              </div>

              {/* Templates */}
              {showTemplates && mode === 'generate' && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '12px',
                  background: isDark ? '#161b22' : '#f9fafb',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                }}>
                  {Object.entries(PROMPT_TEMPLATES).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleTemplateSelect(value)}
                      style={{
                        padding: '6px 12px',
                        background: isDark ? '#21262d' : 'white',
                        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                        borderRadius: '6px',
                        color: isDark ? '#e6edf3' : '#374151',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {key.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'generate'
                    ? 'e.g., A project management system with projects, tasks, team members, and milestones...'
                    : 'e.g., Add user authentication with roles and permissions...'
                }
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '14px 16px',
                  background: isDark ? '#0d1117' : 'white',
                  border: `2px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  color: isDark ? '#e6edf3' : '#1f2937',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#9333ea';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
                }}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '14px 16px',
              background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
              borderRadius: '10px',
            }}>
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: isDark ? '#fca5a5' : '#dc2626',
                lineHeight: '1.5',
              }}>
                {error}
              </p>
            </div>
          )}

          {/* Current Model Info */}
          {hasExistingModel && mode !== 'generate' && (
            <div style={{
              padding: '14px 16px',
              background: isDark ? '#161b22' : '#f0fdf4',
              borderRadius: '10px',
              border: `1px solid ${isDark ? '#30363d' : '#bbf7d0'}`,
            }}>
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: isDark ? '#8b949e' : '#15803d',
              }}>
                Current model: <strong>{entities.length}</strong> entities, <strong>{relationships.length}</strong> relationships, <strong>{tables.length}</strong> tables
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '20px 24px',
          borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          background: isDark ? '#161b22' : '#f9fafb',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: isDark ? '#21262d' : 'white',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: isDark ? '#e6edf3' : '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading || (mode !== 'physical' && !prompt.trim())}
            style={{
              padding: '10px 24px',
              background: isLoading || (mode !== 'physical' && !prompt.trim())
                ? isDark ? '#30363d' : '#e5e7eb'
                : 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
              border: 'none',
              borderRadius: '8px',
              color: isLoading || (mode !== 'physical' && !prompt.trim())
                ? isDark ? '#8b949e' : '#9ca3af'
                : 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isLoading || (mode !== 'physical' && !prompt.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {mode === 'generate' ? 'Generate Model' : mode === 'enhance' ? 'Enhance Model' : 'Generate Tables'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
