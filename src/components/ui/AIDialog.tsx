import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Wand2, Settings, Loader2, Lightbulb, ChevronRight, AlertCircle, CheckCircle2, Image as ImageIcon, Upload, CheckSquare, Square, ChevronDown, Table } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';
import {
  generateDataModel,
  enhanceModel,
  generatePhysicalFromConceptual,
  getAISettings,
  callAI,
  PROMPT_TEMPLATES,
  type ProgressCallback,
} from '../../services/aiService';

interface AIDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

type AIMode = 'generate' | 'enhance' | 'physical';

interface ProgressState {
  stage: string;
  detail?: string;
  completedStages: string[];
}

export const AIDialog: React.FC<AIDialogProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const [mode, setMode] = useState<AIMode>('generate');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [generateConceptual, setGenerateConceptual] = useState(true);
  const [generatePhysical, setGeneratePhysical] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const colorMode = useModelStore(state => state.colorMode);
  const entities = useModelStore(state => state.entities);
  const relationships = useModelStore(state => state.relationships);
  const tables = useModelStore(state => state.tables);
  const foreignKeys = useModelStore(state => state.foreignKeys);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);
  
  const isDark = colorMode === 'dark';

  const hasExistingModel = entities.length > 0 || tables.length > 0;
  const hasConceptualOnly = entities.length > 0 && tables.length === 0;

  // Remove image
  const handleRemoveImage = useCallback(() => {
    setImageData(null);
    setImageName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle image file selection
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageData(result);
      setImageName(file.name);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle paste event for screenshots
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!isOpen) return;
      
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              setImageData(result);
              setImageName('Pasted Screenshot');
              setError(null);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    if (isOpen) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts (Escape to remove image)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || !imageData) return;
      
      // Remove image on Escape key
      if (event.key === 'Escape') {
        handleRemoveImage();
        event.preventDefault();
      }
    };

    if (isOpen && imageData) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, imageData, handleRemoveImage]);

  const handleGenerate = useCallback(async () => {
    const settings = getAISettings();
    if (!settings?.apiKey) {
      setError('Please configure your AI API key in settings first.');
      return;
    }

    if (!prompt.trim() && mode !== 'physical' && !imageData) {
      setError('Please enter a description or attach an image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress({ stage: 'Initializing...', completedStages: [] });

    // Progress callback to update UI in real-time
    const onProgress: ProgressCallback = (stage, detail) => {
      setProgress(prev => ({
        stage,
        detail,
        completedStages: prev?.stage && prev.stage !== stage 
          ? [...(prev.completedStages || []), prev.stage]
          : prev?.completedStages || [],
      }));
    };

    try {
      if (mode === 'generate') {
        // Phase 1: Quick preview if image provided
        if (imageData) {
          try {
            onProgress?.('Analyzing structure...', 'Scanning diagram for groups and entities');
            
            // Request quick structure analysis only
            const previewPrompt = `You are analyzing an ERD/database diagram image to extract its structure.

CRITICAL: Look VERY CAREFULLY for visual groupings in the diagram:
- Boxes or rectangles containing multiple entities
- Section headers or labels (e.g., "PARTY", "STUDENT", "COURSE")
- Colored regions or shaded areas
- Horizontal/vertical dividing lines separating sections
- Spatial clustering (entities close together)

RESPOND WITH VALID JSON:
{
  "groups": [
    {
      "name": "Section/Group Name",
      "entityNames": ["Entity1", "Entity2"]
    }
  ]
}

RULES:
1. Create SEPARATE groups for each visually distinct section
2. Use section headers/labels as group names when visible
3. If entities are outside any box/section, create a group called "Ungrouped"
4. Extract ONLY entity/table names (the boxes) - NO attributes, NO relationships
5. Keep entity names EXACTLY as shown (preserve slashes, spaces, case)
6. Output ONLY valid JSON - NO markdown, NO explanations

EXAMPLES:
Diagram with sections:
{
  "groups": [
    {"name": "User Management", "entityNames": ["User", "Profile", "Auth"]},
    {"name": "Products", "entityNames": ["Product", "Category", "Inventory"]},
    {"name": "Ungrouped", "entityNames": ["AuditLog"]}
  ]
}

Diagram without clear sections (all entities together):
{
  "groups": [
    {"name": "Main", "entityNames": ["User", "Product", "Order", "Payment"]}
  ]
}`;
            
            const previewResponse = await callAI(previewPrompt, settings, imageData);
            
            // Clean response - remove markdown blocks and whitespace
            let cleanedResponse = previewResponse.trim();
            cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
            cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
            cleanedResponse = cleanedResponse.trim();
            
            let preview;
            try {
              preview = JSON.parse(cleanedResponse);
            } catch (parseError) {
              throw new Error(`AI couldn't understand the image format. Try using a text description instead, or upload a clearer diagram with visible entity boxes.`);
            }
            
            if (preview.groups && preview.groups.length > 0) {
              // Normalize and validate groups - handle variations in field names
              const validGroups = preview.groups.map((g: any, index: number) => {
                // Normalize field names (handle 'entities' vs 'entityNames')
                const name = g.name || g.groupName || `Group ${index + 1}`;
                const entityNames = g.entityNames || g.entities || g.tables || [];
                
                // Convert to array if it's a string
                const normalizedEntities = Array.isArray(entityNames) ? entityNames : [entityNames];
                
                // Validate has name and at least one entity
                if (name && normalizedEntities.length > 0) {
                  return {
                    name,
                    entityNames: normalizedEntities.filter((e: any) => e && typeof e === 'string' && e.trim())
                  };
                }
                
                return null;
              }).filter((g: any) => g !== null && g.entityNames.length > 0);
              
              if (validGroups.length > 0) {
                // Batch all state updates to prevent flicker
                // Set all preview data first, THEN show the modal
                const selectedGroupIds = new Set<string>(validGroups.map((_: any, i: number) => `group-${i}`));
                const expandedGroupIds = new Set<string>(); // Start with all groups collapsed
                
                // Update all state - React 18+ will batch these automatically
                setIsLoading(false);
                setProgress(null);
                setPreviewData({ groups: validGroups, prompt, imageData });
                setSelectedGroups(selectedGroupIds);
                setExpandedGroups(expandedGroupIds);
                setShowPreview(true); // Show last after all data is ready
                
                return;
              } else {
                throw new Error(`AI couldn't find any entities/tables in the image. The diagram might be too small, blurry, or in an unsupported format. Try:\n\n• Using a higher resolution image\n• Taking a screenshot with better contrast\n• Describing your data model with text instead`);
              }
            } else {
              throw new Error('AI response did not contain any groups. Please try again or use text description.');
            }
          } catch (previewError) {
            // Show error to user if preview parsing fails
            throw new Error(`Failed to analyze diagram structure: ${previewError instanceof Error ? previewError.message : 'Unknown error'}. Please try again or use text description.`);
          }
          
          // If we reach here with imageData, something went wrong - we should have returned or thrown
          throw new Error('Preview workflow failed unexpectedly. Please try again.');
        }
        
        // Phase 2: Full generation (text-only or after preview confirmation)
        // Note: This should ONLY run if no imageData, or if called from handleConfirmPreview
        const result = await generateDataModel(prompt, settings, onProgress, imageData || undefined);
        
        loadModelFromJSON({
          conceptual: {
            entities: result.entities,
            relationships: result.relationships,
            groups: result.groups || [],
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
          settings,
          onProgress,
          imageData || undefined
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
        
        // Run auto layout for both views to position new elements
        setTimeout(() => {
          const store = useModelStore.getState();
          const currentView = store.viewMode;
          
          // Layout conceptual view
          store.setViewMode('conceptual');
          store.autoLayout();
          
          // Layout physical view
          store.setViewMode('physical');
          store.autoLayout();
          
          // Return to original view
          store.setViewMode(currentView);
        }, 100);
        
        onClose();
      } else if (mode === 'physical') {
        const result = await generatePhysicalFromConceptual(entities, relationships, settings, onProgress);
        
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
      setProgress(null);
    }
  }, [mode, prompt, imageData, entities, relationships, tables, foreignKeys, loadModelFromJSON, onClose]);

  const handleConfirmPreview = useCallback(async () => {
    if (!previewData) {
      return;
    }
    
    setShowPreview(false);
    setIsLoading(true);
    setProgress({ stage: 'Generating full model...', detail: 'Processing selected groups', completedStages: [] });
    
    try {
      const settings = getAISettings();
      if (!settings) {
        throw new Error('AI settings not configured');
      }
      
      // Build focused prompt with selected groups and their entities
      const selectedGroupData = Array.from(selectedGroups)
        .map(id => {
          const index = parseInt(id.replace('group-', ''));
          return previewData.groups[index];
        })
        .filter(Boolean);
      
      const groupList = selectedGroupData.map(g => 
        `- ${g.name}: [${g.entityNames.join(', ')}]`
      ).join('\n');
      
      const focusedPrompt = `Extract and generate a COMPLETE data model for ONLY the following sections from the diagram:

${groupList}

CRITICAL REQUIREMENTS:
1. Generate entities from the listed sections above
2. Generate ALL relationships (connections/lines) between these entities
3. ${generatePhysical ? 'Generate physical tables with columns for each entity, including primary keys, foreign keys, and data types' : 'Focus only on conceptual entities'}
4. ${generatePhysical ? 'Generate foreign key relationships between the tables based on entity relationships' : ''}
5. Ignore all other entities NOT in the list above

${previewData.prompt || ''}`;
      
      const onProgress: ProgressCallback = (stage, detail) => {
        setProgress(prev => ({
          stage,
          detail,
          completedStages: prev?.stage && prev.stage !== stage 
            ? [...(prev.completedStages || []), prev.stage]
            : prev?.completedStages || [],
        }));
      };
      
      const result = await generateDataModel(focusedPrompt, settings, onProgress, previewData.imageData);
      
      // Build model data based on selected options
      const conceptualData = generateConceptual ? {
        entities: result.entities,
        relationships: result.relationships,
        groups: result.groups || [],
      } : {
        entities: [],
        relationships: [],
        groups: [],
      };
      
      const physicalData = generatePhysical ? {
        tables: result.tables,
        foreignKeys: result.foreignKeys,
        tableGroups: [],
      } : {
        tables: [],
        foreignKeys: [],
        tableGroups: [],
      };
      
      loadModelFromJSON({
        conceptual: conceptualData,
        physical: physicalData,
      });
      
      // Reset and close
      setPreviewData(null);
      setSelectedGroups(new Set());
      setExpandedGroups(new Set());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate model');
      setShowPreview(true); // Show preview again on error
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [previewData, selectedGroups, generateConceptual, generatePhysical, loadModelFromJSON, onClose]);

  const toggleGroupExpanded = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const selectAllGroups = useCallback(() => {
    if (previewData?.groups) {
      setSelectedGroups(new Set(previewData.groups.map((_: any, i: number) => `group-${i}`)));
    }
  }, [previewData]);

  const deselectAllGroups = useCallback(() => {
    setSelectedGroups(new Set());
  }, []);

  const handleTemplateSelect = (template: string) => {
    setPrompt(template);
    setShowTemplates(false);
  };

  if (!isOpen) return null;

  return createPortal(
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
            <h2 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: 600,
              color: isDark ? '#e6edf3' : '#1f2937',
            }}>
              AI Data Modeler
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={onOpenSettings}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: isDark ? '#21262d' : '#f3f4f6',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: isDark ? '#8b949e' : '#6b7280',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              title="AI Settings"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
                e.currentTarget.style.color = isDark ? '#e6edf3' : '#1f2937';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
              }}
            >
              <Settings size={16} />
              Settings
            </button>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: isDark ? '#8b949e' : '#6b7280',
                transition: 'all 0.15s ease',
              }}
              title="Close"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
                e.currentTarget.style.color = isDark ? '#e6edf3' : '#1f2937';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Mode Selection */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setMode('generate')}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: mode === 'generate' 
                  ? 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)'
                  : isDark ? '#21262d' : '#f3f4f6',
                border: `1px solid ${mode === 'generate' ? 'transparent' : isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: mode === 'generate' ? 'white' : isDark ? '#e6edf3' : '#374151',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
            >
              <Wand2 size={14} />
              Generate New
            </button>
            <button
              onClick={() => setMode('enhance')}
              disabled={!hasExistingModel}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: mode === 'enhance' 
                  ? 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)'
                  : isDark ? '#21262d' : '#f3f4f6',
                border: `1px solid ${mode === 'enhance' ? 'transparent' : isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: mode === 'enhance' ? 'white' : isDark ? '#e6edf3' : '#374151',
                fontSize: '13px',
                fontWeight: 500,
                cursor: hasExistingModel ? 'pointer' : 'not-allowed',
                opacity: hasExistingModel ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
            >
              <Sparkles size={14} />
              Enhance Model
            </button>
            {hasConceptualOnly && (
              <button
                onClick={() => setMode('physical')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: mode === 'physical' 
                    ? 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)'
                    : isDark ? '#21262d' : '#f3f4f6',
                  border: `1px solid ${mode === 'physical' ? 'transparent' : isDark ? '#30363d' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: mode === 'physical' ? 'white' : isDark ? '#e6edf3' : '#374151',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <Lightbulb size={14} />
                Add Tables
              </button>
            )}
          </div>

          {/* Description */}
          <div style={{
            padding: '10px 12px',
            background: isDark ? '#161b22' : '#f9fafb',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          }}>
            {mode === 'generate' && (
              <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#8b949e' : '#6b7280' }}>
                Describe the system you want to model. AI will generate entities, relationships, tables, and foreign keys.
              </p>
            )}
            {mode === 'enhance' && (
              <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#8b949e' : '#6b7280' }}>
                Describe what you want to add or change. AI will analyze your current model and suggest enhancements.
              </p>
            )}
            {mode === 'physical' && (
              <p style={{ margin: 0, fontSize: '13px', color: isDark ? '#8b949e' : '#6b7280' }}>
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
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'generate'
                    ? 'e.g., A project management system with projects, tasks, team members, and milestones...'
                    : 'e.g., Add user authentication with roles and permissions...'
                }
                style={{
                  width: '100%',
                  minHeight: '80px',
                  maxHeight: '120px',
                  padding: '10px 12px',
                  background: isDark ? '#0d1117' : 'white',
                  border: `2px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDark ? '#e6edf3' : '#1f2937',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#9333ea';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
                }}
              />
              
              {/* Image Upload Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                
                {!imageData ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: isDark ? '#21262d' : '#f3f4f6',
                      border: `2px dashed ${isDark ? '#30363d' : '#d1d5db'}`,
                      borderRadius: '8px',
                      color: isDark ? '#8b949e' : '#6b7280',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
                      e.currentTarget.style.borderColor = '#9333ea';
                      e.currentTarget.style.color = isDark ? '#e6edf3' : '#374151';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                      e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                      e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
                    }}
                  >
                    <Upload size={16} />
                    Attach Image or Paste Screenshot (Cmd+V)
                  </button>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: isDark ? '#161b22' : '#f9fafb',
                    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    }}>
                      <img
                        src={imageData}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px',
                      }}>
                        <ImageIcon size={14} color={isDark ? '#8b949e' : '#6b7280'} />
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: isDark ? '#e6edf3' : '#374151',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {imageName}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: isDark ? '#8b949e' : '#6b7280',
                      }}>
                        AI will analyze this image • Press Esc to remove
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveImage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        background: isDark ? '#30363d' : '#f3f4f6',
                        border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                        borderRadius: '8px',
                        color: isDark ? '#e6edf3' : '#374151',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                        fontWeight: 600,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ef4444';
                        e.currentTarget.style.borderColor = '#dc2626';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
                        e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                        e.currentTarget.style.color = isDark ? '#e6edf3' : '#374151';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title="Remove image (or press Esc)"
                    >
                      <X size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
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
              padding: '8px 12px',
              background: isDark ? '#161b22' : '#f0fdf4',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#30363d' : '#bbf7d0'}`,
            }}>
              <p style={{ 
                margin: 0, 
                fontSize: '12px', 
                color: isDark ? '#8b949e' : '#15803d',
              }}>
                Current model: <strong>{entities.length}</strong> entities, <strong>{relationships.length}</strong> relationships, <strong>{tables.length}</strong> tables
              </p>
            </div>
          )}

          {/* Progress Display */}
          {isLoading && progress && (
            <div style={{
              padding: '12px',
              background: isDark 
                ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#9333ea33' : '#9333ea22'}`,
            }}>
              {/* Completed stages */}
              {progress.completedStages.map((stage, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                    opacity: 0.6,
                  }}
                >
                  <CheckCircle2 size={14} color="#22c55e" />
                  <span style={{ 
                    fontSize: '12px', 
                    color: isDark ? '#8b949e' : '#6b7280',
                    textDecoration: 'line-through',
                  }}>
                    {stage}
                  </span>
                </div>
              ))}
              
              {/* Current stage */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Loader2 
                  size={14} 
                  color="#9333ea" 
                  style={{ animation: 'spin 1s linear infinite' }} 
                />
                <div>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 500,
                    color: isDark ? '#e6edf3' : '#374151',
                  }}>
                    {progress.stage}
                  </span>
                  {progress.detail && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: isDark ? '#8b949e' : '#6b7280',
                      marginLeft: '6px',
                    }}>
                      {progress.detail}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '14px 20px',
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

      {/* Implementation Preview Modal */}
      {showPreview && previewData && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              zIndex: 10000,
              backdropFilter: 'blur(6px)',
            }}
            onClick={() => {
              setShowPreview(false);
              setPreviewData(null);
            }}
          />
          
          {/* Preview Dialog */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '700px',
              maxHeight: '85vh',
              background: isDark ? '#0d1117' : '#ffffff',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '16px',
              boxShadow: isDark 
                ? '0 25px 80px rgba(0, 0, 0, 0.9)' 
                : '0 25px 80px rgba(0, 0, 0, 0.25)',
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              background: isDark 
                ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(147, 51, 234, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 600,
                  color: isDark ? '#e6edf3' : '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <Lightbulb size={20} style={{ color: '#f59e0b' }} />
                  Implementation Preview
                </h3>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isDark ? '#8b949e' : '#6b7280',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '6px',
                  }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: isDark ? '#8b949e' : '#6b7280',
                lineHeight: '1.6',
              }}>
                Found <strong>{previewData.groups.length} groups</strong> with <strong>{previewData.groups.reduce((acc: number, g: any) => acc + g.entityNames.length, 0)} entities</strong>.
                Select which sections to generate — this speeds up processing and ensures accuracy.
              </p>
            </div>

            {/* Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
            }}>
              {/* Quick actions */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              }}>
                <button
                  onClick={selectAllGroups}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '6px',
                    color: isDark ? '#8b949e' : '#6b7280',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                    e.currentTarget.style.borderColor = isDark ? '#3b82f6' : '#3b82f6';
                    e.currentTarget.style.color = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                    e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllGroups}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '6px',
                    color: isDark ? '#8b949e' : '#6b7280',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                    e.currentTarget.style.borderColor = isDark ? '#3b82f6' : '#3b82f6';
                    e.currentTarget.style.color = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                    e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
                  }}
                >
                  Deselect All
                </button>
                
                {/* Generation mode switch */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                }}>
                  <span style={{
                    fontSize: '11px',
                    color: !generatePhysical ? '#22c55e' : isDark ? '#8b949e' : '#6b7280',
                    fontWeight: !generatePhysical ? 600 : 500,
                    transition: 'all 0.2s ease',
                  }}>
                    Conceptual
                  </span>
                  <div style={{
                    position: 'relative',
                    width: '36px',
                    height: '20px',
                    background: generatePhysical ? '#3b82f6' : isDark ? '#30363d' : '#d1d5db',
                    borderRadius: '10px',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                  }}>
                    <input
                      type="checkbox"
                      checked={generatePhysical}
                      onChange={(e) => {
                        setGeneratePhysical(e.target.checked);
                        if (!e.target.checked) {
                          setGenerateConceptual(true);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                        margin: 0,
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: generatePhysical ? '18px' : '2px',
                      width: '16px',
                      height: '16px',
                      background: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      pointerEvents: 'none',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: generatePhysical ? '#3b82f6' : isDark ? '#8b949e' : '#6b7280',
                    fontWeight: generatePhysical ? 600 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                  }}>
                    <Table size={12} strokeWidth={2.5} />
                    All
                  </span>
                </label>
                
                <div style={{
                  fontSize: '13px',
                  color: isDark ? '#8b949e' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {selectedGroups.size} of {previewData.groups.length} selected
                </div>
              </div>

              {/* Groups with expandable entities - Cascade Dropdown Style */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {previewData.groups.map((group: any, index: number) => {
                  const groupId = `group-${index}`;
                  const isSelected = selectedGroups.has(groupId);
                  const isExpanded = expandedGroups.has(groupId);
                  
                  return (
                    <div 
                      key={groupId}
                      style={{
                        background: isDark ? '#161b22' : '#ffffff',
                        border: `1px solid ${isSelected ? '#3b82f6' : isDark ? '#30363d' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Group Header - Single Row */}
                      <div
                        onClick={() => toggleGroupExpanded(groupId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          background: isSelected
                            ? isDark
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'rgba(59, 130, 246, 0.05)'
                            : 'transparent',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = isDark ? '#0d1117' : '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {/* Expand indicator */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDark ? '#8b949e' : '#6b7280',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          flexShrink: 0,
                        }}>
                          <ChevronDown size={16} strokeWidth={2} />
                        </div>
                        
                        {/* Group Name and Count - All on one line */}
                        <div style={{ 
                          flex: 1, 
                          display: 'flex', 
                          alignItems: 'baseline',
                          gap: '6px',
                          minWidth: 0,
                        }}>
                          <span style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: isSelected
                              ? '#3b82f6'
                              : isDark ? '#e6edf3' : '#1f2937',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {group.name}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: isDark ? '#8b949e' : '#6b7280',
                            flexShrink: 0,
                          }}>
                            · {group.entityNames.length} {group.entityNames.length === 1 ? 'entity' : 'entities'}
                          </span>
                        </div>
                        
                        {/* Checkbox - Now on the right */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedGroups);
                            if (isSelected) {
                              newSelected.delete(groupId);
                            } else {
                              newSelected.add(groupId);
                            }
                            setSelectedGroups(newSelected);
                          }}
                          style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}
                        >
                          {isSelected ? (
                            <CheckSquare size={17} color="#3b82f6" strokeWidth={2.5} />
                          ) : (
                            <Square size={17} color={isDark ? '#8b949e' : '#9ca3af'} strokeWidth={2} />
                          )}
                        </div>
                      </div>
                      
                      {/* Entity List - Collapsible Cascade */}
                      {isExpanded && (
                        <div style={{
                          borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                          background: isDark ? '#0d1117' : '#f9fafb',
                        }}>
                          <div style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: isDark ? '#8b949e' : '#6b7280',
                            padding: '8px 12px 4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            Entities in this group:
                          </div>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '0 12px 8px',
                          }}>
                            {group.entityNames.map((entityName: string, i: number) => (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  fontSize: '12px',
                                  color: isDark ? '#c9d1d9' : '#374151',
                                  borderBottom: i < group.entityNames.length - 1 
                                    ? `1px solid ${isDark ? '#21262d' : '#e5e7eb'}` 
                                    : 'none',
                                }}
                              >
                                <div style={{
                                  width: '4px',
                                  height: '4px',
                                  borderRadius: '50%',
                                  background: '#3b82f6',
                                  flexShrink: 0,
                                }} />
                                <span style={{ fontWeight: 500 }}>{entityName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '18px 24px',
              borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              background: isDark ? '#0d1117' : '#f9fafb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: '13px',
                color: isDark ? '#8b949e' : '#6b7280',
                fontWeight: 500,
              }}>
                {selectedGroups.size} of {previewData.groups.length} groups selected
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData(null);
                    setSelectedGroups(new Set());
                    setExpandedGroups(new Set());
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '8px',
                    color: isDark ? '#8b949e' : '#6b7280',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
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
                  onClick={handleConfirmPreview}
                  disabled={selectedGroups.size === 0}
                  style={{
                    padding: '10px 24px',
                    background: selectedGroups.size === 0
                      ? isDark ? '#30363d' : '#e5e7eb'
                      : 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: selectedGroups.size === 0
                      ? isDark ? '#8b949e' : '#9ca3af'
                      : 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: selectedGroups.size === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: selectedGroups.size === 0
                      ? 'none'
                      : '0 4px 12px rgba(147, 51, 234, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedGroups.size > 0) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(147, 51, 234, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedGroups.size > 0) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(147, 51, 234, 0.3)';
                    }
                  }}
                >
                  <Sparkles size={16} />
                  Generate Model
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>,
    document.body
  );
};
