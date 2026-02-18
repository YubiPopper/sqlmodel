import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModelStore } from '../../store/useModelStore';
import type { PhysicalTable, Attribute } from '../../model/schemas';
import { X, Sparkles, Loader2, Plus, Code, Wand2, Eye, Settings, AlertCircle, Copy, Check, Image as ImageIcon, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getAISettings, type AIServiceConfig } from '../../services/aiService';

interface AddTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityId?: string; // Optional entity to associate with
  onOpenAISettings?: () => void;
  existingTable?: PhysicalTable; // When provided, dialog runs in edit mode (revise existing table)
}

type TabMode = 'manual' | 'ddl' | 'ai';

interface TablePreview {
  name: string;
  database?: string;
  schema?: string;
  attributes: Attribute[];
}

// Copy button component for DDL textarea
const CopyButton = ({ text, isDark, visible }: { text: string; isDark: boolean; visible: boolean }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        padding: '4px',
        background: isDark ? '#21262d' : '#f3f4f6',
        border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
        borderRadius: '4px',
        color: copied ? '#22c55e' : (isDark ? '#8b949e' : '#6b7280'),
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible || copied ? 1 : 0,
        transition: 'opacity 0.2s, color 0.2s',
        zIndex: 1,
      }}
      title={copied ? 'Copied!' : 'Copy DDL'}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

// DDL Textarea with copy button that shows on hover
const DdlTextareaWithCopy = ({ 
  value, 
  onChange, 
  isDark 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  isDark: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="CREATE TABLE..."
        rows={12}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px',
          paddingRight: '36px',
          background: isDark ? '#0d1117' : '#ffffff',
          border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
          borderRadius: '6px',
          color: isDark ? '#e6edf3' : '#111827',
          fontSize: '11px',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          lineHeight: '1.5',
          outline: 'none',
          resize: 'vertical',
        }}
        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
        onBlur={(e) => e.target.style.borderColor = isDark ? '#30363d' : '#d1d5db'}
      />
      <CopyButton text={value} isDark={isDark} visible={isHovered} />
    </div>
  );
};

// Parse CREATE TABLE DDL into table structure
const parseDDL = (ddl: string): TablePreview | null => {
  try {
    // Extract table name (handle fully qualified names)
    const tableNameMatch = ddl.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRANSIENT\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)/i);
    if (!tableNameMatch) return null;
    
    const fullTableName = tableNameMatch[1];
    const nameParts = fullTableName.split('.');
    
    let tableName: string;
    let schemaName: string | undefined;
    let databaseName: string | undefined;
    
    if (nameParts.length === 3) {
      databaseName = nameParts[0];
      schemaName = nameParts[1];
      tableName = nameParts[2];
    } else if (nameParts.length === 2) {
      schemaName = nameParts[0];
      tableName = nameParts[1];
    } else {
      tableName = nameParts[0];
    }
    
    // Extract column definitions (between parentheses of CREATE TABLE)
    const createTableMatch = ddl.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRANSIENT\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w.]+\s*\(([\s\S]*?)\);?/i);
    if (!createTableMatch) return null;
    
    const columnSection = createTableMatch[1];
    const lines = columnSection.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
    
    const attributes: Attribute[] = [];
    let primaryKeys: string[] = [];
    
    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.startsWith('--')) continue;
      
      // Check for standalone PRIMARY KEY constraint (not inline with column)
      // e.g., "PRIMARY KEY (id, name)" - this is a table constraint, not a column def
      if (line.match(/^\s*PRIMARY\s+KEY\s*\(/i)) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          primaryKeys = pkMatch[1].split(',').map(k => k.trim().replace(/"/g, ''));
        }
        continue;
      }
      
      // Skip FOREIGN KEY, CONSTRAINT, UNIQUE, CHECK lines
      if (line.match(/^\s*(FOREIGN\s+KEY|CONSTRAINT|UNIQUE|CHECK)/i)) continue;
      
      // Parse column definition - handle quoted identifiers and complex types
      // Matches: [spaces] column_name DATA_TYPE [constraints...]
      const columnMatch = line.match(/^\s*"?(\w+)"?\s+([A-Z_]+(?:\s*\([^)]+\))?)/i);
      if (columnMatch) {
        const [, name, rawDataType] = columnMatch;
        const dataType = rawDataType.toLowerCase().replace(/\s*\([^)]+\)/, '');
        const isNullable = !line.match(/NOT\s+NULL/i);
        const isPK = line.match(/PRIMARY\s+KEY/i) !== null;
        
        attributes.push({
          id: uuidv4(),
          name: name.replace(/"/g, ''),
          dataType,
          isPrimaryKey: isPK,
          isNullable: isPK ? false : isNullable,
          isForeignKey: false,
        });
      }
    }
    
    // Mark primary key columns from constraint
    attributes.forEach(attr => {
      if (primaryKeys.includes(attr.name)) {
        attr.isPrimaryKey = true;
        attr.isNullable = false;
      }
    });
    
    // If no attributes found, try a simpler parsing
    if (attributes.length === 0) {
      // Try to parse comma-separated column definitions
      const simpleParts = columnSection.split(',').filter(p => p.trim());
      for (const part of simpleParts) {
        const trimmed = part.trim();
        if (trimmed.match(/^\s*(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|CHECK)/i)) continue;
        
        const simpleMatch = trimmed.match(/^"?(\w+)"?\s+([A-Z_]+)/i);
        if (simpleMatch) {
          const [, name, dataType] = simpleMatch;
          attributes.push({
            id: uuidv4(),
            name,
            dataType: dataType.toLowerCase(),
            isPrimaryKey: false,
            isNullable: true,
            isForeignKey: false,
          });
        }
      }
    }
    
    return {
      name: tableName,
      database: databaseName,
      schema: schemaName,
      attributes,
    };
  } catch (err) {
    console.error('Failed to parse DDL:', err);
    return null;
  }
};

// Generate table from AI
const generateTableFromAI = async (
  prompt: string,
  config: AIServiceConfig,
  existingTables: PhysicalTable[],
  imageData?: string | null
): Promise<TablePreview> => {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  let model = config.model || 'gpt-4o';
  
  // Use vision model if image is provided and current model doesn't support vision
  if (imageData && !model.includes('gpt-4o')) {
    model = 'gpt-4o-mini';
  }
  
  const existingTableInfo = existingTables.length > 0
    ? `\n\nExisting tables in the model:\n${existingTables.map(t => `- ${t.name}: ${t.attributes.map(a => a.name).join(', ')}`).join('\n')}`
    : '';
  
  const systemPrompt = `You are an expert database designer. Generate a single table definition based on the user's description.

Generate appropriate columns with:
- A primary key (usually 'id' with type 'uuid' or 'bigint')
- Relevant data columns based on the table purpose
- Common audit fields if appropriate (created_at, updated_at)
- Snake_case naming convention
- Appropriate data types: uuid, varchar, text, int, bigint, decimal, boolean, date, timestamp, json

Respond with ONLY a valid JSON object in this exact format:
{
  "name": "table_name",
  "attributes": [
    { "name": "id", "dataType": "uuid", "isPrimaryKey": true, "isNullable": false },
    { "name": "column_name", "dataType": "varchar", "isPrimaryKey": false, "isNullable": true }
  ]
}

Do not include any explanation or markdown formatting.`;

  // Build user message content - use vision API format if image is provided
  const userText = `Create a table for: ${prompt}${existingTableInfo}`;
  let userContent: any;
  if (imageData) {
    userContent = [
      { type: 'text', text: userText },
      { type: 'image_url', image_url: { url: imageData, detail: 'high' } },
    ];
  } else {
    userContent = userText;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  
  // Clean up response - remove markdown code blocks if present
  let jsonStr = content;
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Add UUIDs to attributes
    const attributes = (parsed.attributes || []).map((attr: { name?: string; dataType?: string; isPrimaryKey?: boolean; isNullable?: boolean }) => ({
      id: uuidv4(),
      name: attr.name,
      dataType: attr.dataType || 'varchar',
      isPrimaryKey: attr.isPrimaryKey || false,
      isNullable: attr.isNullable !== false,
      isForeignKey: false,
    }));
    
    return {
      name: parsed.name || 'new_table',
      database: parsed.database,
      schema: parsed.schema,
      attributes,
    };
  } catch (err) {
    console.error('Failed to parse AI response:', content, err);
    throw new Error('Failed to parse AI response. Please try again.');
  }
};

// Revise existing table with AI
const reviseTableWithAI = async (
  prompt: string,
  config: AIServiceConfig,
  currentTable: TablePreview,
  imageData?: string | null
): Promise<TablePreview> => {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  let model = config.model || 'gpt-4o';
  
  // Use vision model if image is provided and current model doesn't support vision
  if (imageData && !model.includes('gpt-4o')) {
    model = 'gpt-4o-mini';
  }
  
  const currentTableInfo = `Current table "${currentTable.name}" has these columns:
${currentTable.attributes.map(a => `- ${a.name}: ${a.dataType}${a.isPrimaryKey ? ' (PRIMARY KEY)' : ''}${!a.isNullable ? ' NOT NULL' : ''}`).join('\n')}`;

  const systemPrompt = `You are an expert database designer. You will revise an existing table based on the user's instructions.

${currentTableInfo}

Apply the requested changes while:
- Keeping existing primary keys unless explicitly asked to change
- Maintaining snake_case naming convention
- Using appropriate data types: uuid, varchar, text, int, bigint, decimal, boolean, date, timestamp, json
- Preserving the table name unless explicitly asked to rename

Respond with ONLY a valid JSON object for the COMPLETE revised table:
{
  "name": "table_name",
  "attributes": [
    { "name": "id", "dataType": "uuid", "isPrimaryKey": true, "isNullable": false },
    { "name": "column_name", "dataType": "varchar", "isPrimaryKey": false, "isNullable": true }
  ]
}

Do not include any explanation or markdown formatting.`;

  // Build user message content - use vision API format if image is provided
  const userText = `Revise this table: ${prompt}`;
  let userContent: any;
  if (imageData) {
    userContent = [
      { type: 'text', text: userText },
      { type: 'image_url', image_url: { url: imageData, detail: 'high' } },
    ];
  } else {
    userContent = userText;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  
  // Clean up response - remove markdown code blocks if present
  let jsonStr = content;
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Add UUIDs to attributes
    const attributes = (parsed.attributes || []).map((attr: { name?: string; dataType?: string; isPrimaryKey?: boolean; isNullable?: boolean }) => ({
      id: uuidv4(),
      name: attr.name,
      dataType: attr.dataType || 'varchar',
      isPrimaryKey: attr.isPrimaryKey || false,
      isNullable: attr.isNullable !== false,
      isForeignKey: false,
    }));
    
    return {
      name: parsed.name || currentTable.name,
      database: currentTable.database,
      schema: currentTable.schema,
      attributes,
    };
  } catch (err) {
    console.error('Failed to parse AI response:', content, err);
    throw new Error('Failed to parse AI response. Please try again.');
  }
};

export const AddTableDialog: React.FC<AddTableDialogProps> = ({ isOpen, onClose, entityId, onOpenAISettings, existingTable }) => {
  const colorMode = useModelStore(state => state.colorMode);
  const addTable = useModelStore(state => state.addTable);
  const updateTable = useModelStore(state => state.updateTable);
  const addTableAttribute = useModelStore(state => state.addTableAttribute);
  const updateTableAttribute = useModelStore(state => state.updateTableAttribute);
  const deleteTableAttribute = useModelStore(state => state.deleteTableAttribute);
  const tables = useModelStore(state => state.tables);
  const entities = useModelStore(state => state.entities);
  
  const isDark = colorMode === 'dark';
  const isEditMode = !!existingTable;
  
  const [activeTab, setActiveTab] = useState<TabMode>('manual');
  const [ddlText, setDdlText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TablePreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDdlView, setShowDdlView] = useState(false);
  const [previewDdl, setPreviewDdl] = useState('');
  const [manualTableName, setManualTableName] = useState('new_table');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (existingTable) {
        // Edit mode: start with AI tab and load existing table as preview
        setActiveTab('ai');
        setDdlText('');
        setAiPrompt('');
        setError(null);
        setImageData(null);
        setImageName(null);
        // Convert existing table to preview format
        setPreview({
          name: existingTable.name,
          database: existingTable.database,
          schema: existingTable.schema,
          attributes: existingTable.attributes.map(attr => ({ ...attr })),
        });
        setShowPreview(true);
        setShowDdlView(false);
        setPreviewDdl('');
        setManualTableName(existingTable.name);
      } else {
        // Create mode: reset everything
        setActiveTab('manual');
        setDdlText('');
        setAiPrompt('');
        setError(null);
        setImageData(null);
        setImageName(null);
        setPreview(null);
        setShowPreview(false);
        setShowDdlView(false);
        setPreviewDdl('');
        setManualTableName('new_table');
      }
    }
  }, [isOpen, existingTable]);
  
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
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
      if (!isOpen || (activeTab !== 'ai' && !showPreview)) return;
      
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
  }, [isOpen, activeTab, showPreview]);
  
  // Generate DDL from preview (defined early to be used in other callbacks)
  const generateDdlFromPreview = useCallback((prev: TablePreview | null): string => {
    if (!prev) return '';
    
    const tableName = prev.schema 
      ? `${prev.schema}.${prev.name}` 
      : prev.name;
    
    const columnDefs = prev.attributes.map(attr => {
      const parts = [`  ${attr.name} ${attr.dataType.toUpperCase()}`];
      if (attr.isPrimaryKey) parts.push('PRIMARY KEY');
      if (!attr.isNullable && !attr.isPrimaryKey) parts.push('NOT NULL');
      // Add FK comment so user can see relationships (and we can parse it back)
      if (attr.isForeignKey && attr.referencesTableId) {
        // Find referenced table name for the comment
        const refTable = tables.find(t => t.id === attr.referencesTableId);
        const refAttr = refTable?.attributes.find(a => a.id === attr.referencesAttributeId);
        if (refTable && refAttr) {
          parts.push(`-- FK: ${refTable.name}.${refAttr.name}`);
        }
      }
      return parts.join(' ');
    });
    
    return `CREATE TABLE ${tableName} (\n${columnDefs.join(',\n')}\n);`;
  }, [tables]);
  
  // Parse DDL and show preview
  const handleParseDDL = useCallback(() => {
    if (!ddlText.trim()) {
      setError('Please paste DDL code');
      return;
    }
    
    const parsed = parseDDL(ddlText);
    if (!parsed) {
      setError('Could not parse DDL. Please check the syntax.');
      return;
    }
    
    if (parsed.attributes.length === 0) {
      setError('No columns found in DDL. Please check the syntax.');
      return;
    }
    
    setPreview(parsed);
    setPreviewDdl(ddlText.trim()); // Store original DDL for toggle
    setShowPreview(true);
    setError(null);
  }, [ddlText]);
  
  // Generate table with AI
  const handleGenerateAI = useCallback(async () => {
    const settings = getAISettings();
    if (!settings?.apiKey) {
      setError('Please configure your AI API key in settings first.');
      return;
    }
    
    if (!aiPrompt.trim() && !imageData) {
      setError(isEditMode ? 'Please describe the changes you want to make or attach an image.' : 'Please describe the table you want to create or attach an image.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let result: TablePreview;
      
      if (isEditMode && preview) {
        // Edit mode: revise existing table
        result = await reviseTableWithAI(aiPrompt, settings, preview, imageData);
        
        // Preserve FK properties from original table (existingTable) where names match
        // Use case-insensitive matching to handle AI returning different casing
        result.attributes = result.attributes.map(newAttr => {
          // First try to match against original table (most reliable source of FK info)
          const originalAttr = existingTable?.attributes.find(
            a => a.name.toLowerCase() === newAttr.name.toLowerCase()
          );
          // Also check current preview for any in-progress edits
          const previewAttr = preview.attributes.find(
            a => a.name.toLowerCase() === newAttr.name.toLowerCase()
          );
          
          // Prefer original table's ID to maintain FK relationships, fall back to preview
          const sourceAttr = originalAttr || previewAttr;
          
          if (sourceAttr) {
            return {
              ...newAttr,
              id: sourceAttr.id,
              isForeignKey: sourceAttr.isForeignKey,
              referencesTableId: sourceAttr.referencesTableId,
              referencesAttributeId: sourceAttr.referencesAttributeId,
            };
          }
          return newAttr;
        });
      } else {
        // Create mode: generate new table
        result = await generateTableFromAI(aiPrompt, settings, tables, imageData);
      }
      
      setPreview(result);
      setShowPreview(true);
      // Update DDL view if it's active
      if (showDdlView) {
        setPreviewDdl(generateDdlFromPreview(result));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [aiPrompt, tables, isEditMode, preview, showDdlView, generateDdlFromPreview, existingTable, imageData]);
  
  // Create or update the table from preview
  const handleCreateTable = useCallback(() => {
    // Get fresh table data from store (existingTable prop might be stale)
    const freshExistingTable = existingTable 
      ? useModelStore.getState().tables.find(t => t.id === existingTable.id) 
      : null;
    
    // If in DDL view, parse DDL first to sync with preview
    let currentPreview = preview;
    if (showDdlView && previewDdl) {
      const parsed = parseDDL(previewDdl);
      if (!parsed) {
        setError('Could not parse DDL. Please check the syntax.');
        return;
      }
      
      // Build a robust name-to-attribute map from fresh store data
      const existingAttrByName = new Map<string, Attribute>();
      freshExistingTable?.attributes.forEach(attr => {
        existingAttrByName.set(attr.name.toLowerCase().trim(), attr);
      });
      
      // Also check preview as fallback
      const previewAttrByName = new Map<string, Attribute>();
      preview?.attributes.forEach(attr => {
        previewAttrByName.set(attr.name.toLowerCase().trim(), attr);
      });
      
      // Merge: preserve IDs and FK properties from existing attributes
      const mergedAttrs = parsed.attributes.map(newAttr => {
        const normalizedName = newAttr.name.toLowerCase().trim();
        const originalAttr = existingAttrByName.get(normalizedName);
        const previewAttr = previewAttrByName.get(normalizedName);
        const sourceAttr = originalAttr || previewAttr;
        
        if (sourceAttr) {
          // Preserve ID and FK properties from existing attribute
          return { 
            ...newAttr, 
            id: sourceAttr.id,
            isForeignKey: sourceAttr.isForeignKey,
            referencesTableId: sourceAttr.referencesTableId,
            referencesAttributeId: sourceAttr.referencesAttributeId,
          };
        }
        return newAttr;
      });
      currentPreview = { ...parsed, attributes: mergedAttrs };
    }
    
    if (!currentPreview) return;
    
    let tableId: string;
    
    if (existingTable) {
      // Edit mode: update existing table
      tableId = existingTable.id;
      
      // Ensure we have fresh table data from store
      if (!freshExistingTable) {
        setError('Table no longer exists');
        return;
      }
      
      // Update table metadata
      updateTable(tableId, {
        name: currentPreview.name,
        database: currentPreview.database,
        schema: currentPreview.schema,
      });
      
      // Smart attribute update: preserve existing attributes with same ID to keep FK relationships
      const existingAttrIds = new Set(freshExistingTable.attributes.map(a => a.id));
      const previewAttrIds = new Set(currentPreview.attributes.map(a => a.id));
      
      // Get all FKs to check which attributes are FK targets
      const allForeignKeys = useModelStore.getState().foreignKeys;
      const fkTargetAttrIds = new Set(allForeignKeys.map(fk => fk.toAttributeId));
      const fkSourceAttrIds = new Set(allForeignKeys.map(fk => fk.fromAttributeId));
      
      // 1. Remove attributes that are no longer in preview (but protect FK-referenced attrs)
      freshExistingTable.attributes.forEach(attr => {
        if (!previewAttrIds.has(attr.id)) {
          // Check if this attr is referenced by any FK
          const isReferencedByFK = fkTargetAttrIds.has(attr.id) || fkSourceAttrIds.has(attr.id);
          
          if (isReferencedByFK) {
            // Don't delete - find matching attr in preview by name and use that ID instead
            const matchingPreviewAttr = currentPreview.attributes.find(
              a => a.name.toLowerCase().trim() === attr.name.toLowerCase().trim()
            );
            if (matchingPreviewAttr) {
              // Update the preview attr to use the existing ID (preserve FK reference)
              matchingPreviewAttr.id = attr.id;
              previewAttrIds.add(attr.id);
            }
          } else {
            deleteTableAttribute(tableId, attr.id);
          }
        }
      });
      
      // 2. Update existing attributes and add new ones
      currentPreview.attributes.forEach(attr => {
        if (existingAttrIds.has(attr.id)) {
          // Update existing attribute in place (preserves FK relationships)
          updateTableAttribute(tableId, attr.id, {
            name: attr.name,
            dataType: attr.dataType,
            isPrimaryKey: attr.isPrimaryKey,
            isNullable: attr.isNullable,
            isForeignKey: attr.isForeignKey,
            referencesTableId: attr.referencesTableId,
            referencesAttributeId: attr.referencesAttributeId,
          });
        } else {
          // Add new attribute
          addTableAttribute(tableId);
          
          // Get fresh state to find the new attribute
          const freshState = useModelStore.getState();
          const table = freshState.tables.find(t => t.id === tableId);
          if (!table) return;
          
          const newAttr = table.attributes[table.attributes.length - 1];
          if (newAttr) {
            updateTableAttribute(tableId, newAttr.id, {
              name: attr.name,
              dataType: attr.dataType,
              isPrimaryKey: attr.isPrimaryKey,
              isNullable: attr.isNullable,
              isForeignKey: attr.isForeignKey,
            });
          }
        }
      });
    } else {
      // Create mode: create new table
      tableId = addTable(entityId);
      
      // Update table with name and other metadata
      updateTable(tableId, {
        name: currentPreview.name,
        database: currentPreview.database,
        schema: currentPreview.schema,
      });
      
      // Get the table to access its default attribute
      const state = useModelStore.getState();
      const newTable = state.tables.find(t => t.id === tableId);
      
      // Remove default attribute if exists
      if (newTable && newTable.attributes.length > 0) {
        newTable.attributes.forEach(attr => {
          deleteTableAttribute(tableId, attr.id);
        });
      }
      
      // Add all preview attributes
      currentPreview.attributes.forEach(attr => {
        addTableAttribute(tableId);
        
        // Get fresh state
        const freshState = useModelStore.getState();
        const table = freshState.tables.find(t => t.id === tableId);
        if (!table) return;
        
        const newAttr = table.attributes[table.attributes.length - 1];
        if (newAttr) {
          updateTableAttribute(tableId, newAttr.id, {
            name: attr.name,
            dataType: attr.dataType,
            isPrimaryKey: attr.isPrimaryKey,
            isNullable: attr.isNullable,
            isForeignKey: attr.isForeignKey,
          });
        }
      });
    }
    
    onClose();
  }, [preview, previewDdl, showDdlView, entityId, existingTable, addTable, updateTable, addTableAttribute, updateTableAttribute, deleteTableAttribute, onClose]);
  
  // Create empty table (manual mode)
  const handleCreateEmptyTable = useCallback(() => {
    const tableId = addTable(entityId);
    updateTable(tableId, { name: manualTableName });
    onClose();
  }, [manualTableName, entityId, addTable, updateTable, onClose]);
  
  // Update preview attribute
  const handleUpdatePreviewAttribute = useCallback((attrId: string, field: keyof Attribute, value: string | boolean) => {
    if (!preview) return;
    
    setPreview({
      ...preview,
      attributes: preview.attributes.map(attr => 
        attr.id === attrId ? { ...attr, [field]: value } : attr
      ),
    });
  }, [preview]);
  
  // Add attribute to preview
  const handleAddPreviewAttribute = useCallback(() => {
    if (!preview) return;
    
    setPreview({
      ...preview,
      attributes: [
        ...preview.attributes,
        {
          id: uuidv4(),
          name: 'new_column',
          dataType: 'varchar',
          isPrimaryKey: false,
          isNullable: true,
          isForeignKey: false,
        },
      ],
    });
  }, [preview]);
  
  // Remove attribute from preview
  const handleRemovePreviewAttribute = useCallback((attrId: string) => {
    if (!preview) return;
    
    setPreview({
      ...preview,
      attributes: preview.attributes.filter(attr => attr.id !== attrId),
    });
  }, [preview]);
  
  // Handle DDL view toggle
  const handleToggleDdlView = useCallback((checked: boolean) => {
    if (checked && preview) {
      // Switching to DDL view - generate DDL from current preview
      setPreviewDdl(generateDdlFromPreview(preview));
    } else if (!checked && previewDdl) {
      // Switching back to field view - parse DDL to update preview
      const parsed = parseDDL(previewDdl);
      if (parsed) {
        // Get fresh table data from store (existingTable prop might be stale)
        const freshExistingTable = existingTable 
          ? useModelStore.getState().tables.find(t => t.id === existingTable.id) 
          : null;
        
        // Preserve attribute IDs AND FK properties where names match (case-insensitive)
        const mergedAttrs = parsed.attributes.map(newAttr => {
          // Check fresh store table first (most reliable for FK info)
          const originalAttr = freshExistingTable?.attributes.find(
            a => a.name.toLowerCase() === newAttr.name.toLowerCase()
          );
          const previewAttr = preview?.attributes.find(
            a => a.name.toLowerCase() === newAttr.name.toLowerCase()
          );
          const sourceAttr = originalAttr || previewAttr;
          
          if (sourceAttr) {
            return { 
              ...newAttr, 
              id: sourceAttr.id,
              isForeignKey: sourceAttr.isForeignKey,
              referencesTableId: sourceAttr.referencesTableId,
              referencesAttributeId: sourceAttr.referencesAttributeId,
            };
          }
          return newAttr;
        });
        setPreview({ ...parsed, attributes: mergedAttrs });
      }
    }
    setShowDdlView(checked);
  }, [preview, previewDdl, generateDdlFromPreview, existingTable]);
  
  // Update preview DDL and sync back to field preview
  const handlePreviewDdlChange = useCallback((newDdl: string) => {
    setPreviewDdl(newDdl);
  }, []);
  
  if (!isOpen) return null;
  
  const entity = entityId ? entities.find(e => e.id === entityId) : null;
  
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
        }}
      />
      
      {/* Dialog */}
      <div
        ref={dialogRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: showPreview && preview ? '560px' : '420px',
          maxWidth: '90vw',
          zIndex: 9999,
          background: isDark ? '#161b22' : '#ffffff',
          borderRadius: '10px',
          boxShadow: isDark 
            ? '0 8px 32px rgba(0, 0, 0, 0.6)' 
            : '0 8px 32px rgba(0, 0, 0, 0.25)',
          border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: isEditMode 
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isEditMode ? <Sparkles size={16} style={{ color: 'white' }} /> : <Plus size={16} style={{ color: 'white' }} />}
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#111827',
              }}>
                {showPreview 
                  ? (isEditMode ? 'Preview Changes' : 'Preview Table')
                  : (isEditMode ? 'Revise Table' : 'Add Table')}
              </h2>
              {entity && !isEditMode && (
                <p style={{
                  margin: '1px 0 0',
                  fontSize: '11px',
                  color: isDark ? '#8b949e' : '#6b7280',
                }}>
                  Adding to entity: {entity.name}
                </p>
              )}
              {isEditMode && existingTable && (
                <p style={{
                  margin: '1px 0 0',
                  fontSize: '11px',
                  color: isDark ? '#8b949e' : '#6b7280',
                }}>
                  Editing: {existingTable.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#8b949e' : '#6b7280',
              padding: '4px',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Tabs - only show when not in preview */}
        {!showPreview && (
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '0 18px 12px',
          }}>
            {[
              { id: 'manual' as TabMode, label: 'Manual', icon: <Plus size={12} />, hideInEditMode: true },
              { id: 'ddl' as TabMode, label: 'From DDL', icon: <Code size={12} />, hideInEditMode: false },
              { id: 'ai' as TabMode, label: 'AI Generate', icon: <Sparkles size={12} />, hideInEditMode: false },
            ].filter(tab => !isEditMode || !tab.hideInEditMode).map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError(null);
                  setShowPreview(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  background: activeTab === tab.id 
                    ? (isDark ? '#21262d' : '#f3f4f6')
                    : 'transparent',
                  border: activeTab === tab.id 
                    ? (isDark ? '1px solid #30363d' : '1px solid #e5e7eb')
                    : '1px solid transparent',
                  borderRadius: '5px',
                  color: activeTab === tab.id 
                    ? (isDark ? '#e6edf3' : '#111827')
                    : (isDark ? '#8b949e' : '#6b7280'),
                  fontSize: '12px',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Content */}
        <div style={{
          padding: '0 18px 18px',
        }}>
          {/* Error Message */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 10px',
              background: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '5px',
              marginBottom: '12px',
              color: '#ef4444',
              fontSize: '11px',
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          
          {/* Manual Tab */}
          {activeTab === 'manual' && !showPreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: isDark ? '#e6edf3' : '#374151',
                  marginBottom: '5px',
                }}>
                  Table Name
                </label>
                <input
                  type="text"
                  value={manualTableName}
                  onChange={(e) => setManualTableName(e.target.value)}
                  placeholder="e.g., users, orders, products"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    background: isDark ? '#0d1117' : '#ffffff',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '5px',
                    color: isDark ? '#e6edf3' : '#111827',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
              </div>
              
              <p style={{
                fontSize: '11px',
                color: isDark ? '#8b949e' : '#6b7280',
                margin: 0,
                lineHeight: '1.5',
              }}>
                Create an empty table and add columns manually in the inspector panel.
              </p>
            </div>
          )}
          
          {/* DDL Tab */}
          {activeTab === 'ddl' && !showPreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: isDark ? '#e6edf3' : '#374151',
                  marginBottom: '5px',
                }}>
                  Paste CREATE TABLE DDL
                </label>
                <textarea
                  value={ddlText}
                  onChange={(e) => setDdlText(e.target.value)}
                  placeholder={`CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  name VARCHAR NOT NULL,\n  email VARCHAR,\n  created_at TIMESTAMP\n);`}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '140px',
                    padding: '8px 10px',
                    background: isDark ? '#0d1117' : '#ffffff',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '5px',
                    color: isDark ? '#c9d1d9' : '#111827',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: '1.5',
                  }}
                />
              </div>
            </div>
          )}
          
          {/* AI Tab */}
          {activeTab === 'ai' && !showPreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: isDark ? '#e6edf3' : '#374151',
                  marginBottom: '5px',
                }}>
                  {isEditMode ? 'Describe the changes you want to make' : 'Describe the table you want to create'}
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={isEditMode 
                    ? "Example: Add audit columns (created_at, updated_at), or add a status enum column"
                    : "Example: A users table for an e-commerce system with email, password hash, name, address, phone, and account status"}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '70px',
                    padding: '8px 10px',
                    background: isDark ? '#0d1117' : '#ffffff',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '5px',
                    color: isDark ? '#e6edf3' : '#111827',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: '1.5',
                  }}
                />
              </div>
              
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
                      gap: '6px',
                      padding: '8px 12px',
                      background: isDark ? '#21262d' : '#f3f4f6',
                      border: `2px dashed ${isDark ? '#30363d' : '#d1d5db'}`,
                      borderRadius: '6px',
                      color: isDark ? '#8b949e' : '#6b7280',
                      fontSize: '11px',
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
                    <Upload size={14} />
                    Attach Image or Paste Screenshot (⌘V)
                  </button>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    background: isDark ? '#161b22' : '#f9fafb',
                    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    borderRadius: '6px',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '4px',
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
                        gap: '4px',
                        marginBottom: '2px',
                      }}>
                        <ImageIcon size={12} color={isDark ? '#8b949e' : '#6b7280'} />
                        <span style={{
                          fontSize: '11px',
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
                        fontSize: '10px',
                        color: isDark ? '#8b949e' : '#6b7280',
                      }}>
                        AI will analyze this image
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveImage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: isDark ? '#30363d' : '#f3f4f6',
                        border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                        borderRadius: '6px',
                        color: isDark ? '#e6edf3' : '#374151',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                        padding: 0,
                        minHeight: 'auto',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ef4444';
                        e.currentTarget.style.borderColor = '#dc2626';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDark ? '#30363d' : '#f3f4f6';
                        e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                        e.currentTarget.style.color = isDark ? '#e6edf3' : '#374151';
                      }}
                      title="Remove image"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
              
              <p style={{
                fontSize: '11px',
                color: isDark ? '#8b949e' : '#6b7280',
                margin: 0,
                lineHeight: '1.4',
              }}>
                {isEditMode 
                  ? 'AI will revise the table structure based on your description or image. Preview changes before applying.'
                  : 'AI will generate a table structure based on your description or image. You can preview and edit before creating.'}
              </p>
            </div>
          )}
          
          {/* Preview Section */}
          {showPreview && preview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: isDark ? '#8b949e' : '#6b7280',
                }}>
                  Review and edit {showDdlView ? 'DDL' : 'columns'} before {isEditMode ? 'saving' : 'creating'}
                </p>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: isDark ? '#8b949e' : '#6b7280',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={showDdlView}
                    onChange={(e) => handleToggleDdlView(e.target.checked)}
                    style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                  />
                  <Code size={12} />
                  DDL View
                </label>
              </div>
              
              {/* DDL View */}
              {showDdlView ? (
                <DdlTextareaWithCopy
                  value={previewDdl}
                  onChange={handlePreviewDdlChange}
                  isDark={isDark}
                />
              ) : (
                <>
                  {/* Table Name */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: isDark ? '#8b949e' : '#6b7280',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Table Name
                    </label>
                    <input
                      type="text"
                      value={preview.name}
                      onChange={(e) => setPreview({ ...preview, name: e.target.value })}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '7px 10px',
                        background: isDark ? '#0d1117' : '#ffffff',
                        border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                        borderRadius: '5px',
                        color: isDark ? '#e6edf3' : '#111827',
                        fontSize: '12px',
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        outline: 'none',
                      }}
                    />
                  </div>
              
              {/* Columns Table */}
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}>
                  <label style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    color: isDark ? '#8b949e' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Columns ({preview.attributes.length})
                  </label>
                  <button
                    onClick={handleAddPreviewAttribute}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '11px',
                      color: '#3b82f6',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <Plus size={12} />
                    Add Column
                  </button>
                </div>
                
                <div style={{
                  border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 40px 40px 28px',
                    gap: '6px',
                    padding: '6px 10px',
                    background: isDark ? '#21262d' : '#f9fafb',
                    borderBottom: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                    fontSize: '9px',
                    fontWeight: 600,
                    color: isDark ? '#8b949e' : '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    <span>Name</span>
                    <span>Type</span>
                    <span style={{ textAlign: 'center' }}>PK</span>
                    <span style={{ textAlign: 'center' }}>NULL</span>
                    <span></span>
                  </div>
                  
                  {/* Rows */}
                  <div style={{ maxHeight: '180px', overflowY: preview.attributes.length > 5 ? 'auto' : 'visible' }}>
                    {preview.attributes.map((attr, index) => (
                      <div
                        key={attr.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 80px 40px 40px 28px',
                          gap: '6px',
                          padding: '5px 10px',
                          borderBottom: index < preview.attributes.length - 1
                            ? (isDark ? '1px solid #21262d' : '1px solid #f3f4f6')
                            : 'none',
                          alignItems: 'center',
                          background: isDark ? '#161b22' : '#ffffff',
                        }}
                      >
                        <input
                          type="text"
                          value={attr.name}
                          onChange={(e) => handleUpdatePreviewAttribute(attr.id, 'name', e.target.value)}
                          style={{
                            padding: '4px 6px',
                            background: isDark ? '#0d1117' : '#f9fafb',
                            border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                            borderRadius: '3px',
                            color: isDark ? '#e6edf3' : '#111827',
                            fontSize: '11px',
                            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                            outline: 'none',
                          }}
                        />
                        <select
                          value={attr.dataType}
                          onChange={(e) => handleUpdatePreviewAttribute(attr.id, 'dataType', e.target.value)}
                          style={{
                            padding: '4px 6px',
                            background: isDark ? '#0d1117' : '#f9fafb',
                            border: isDark ? '1px solid #30363d' : '1px solid #e5e7eb',
                            borderRadius: '3px',
                            color: isDark ? '#e6edf3' : '#111827',
                            fontSize: '11px',
                            outline: 'none',
                          }}
                        >
                          {['uuid', 'varchar', 'text', 'int', 'bigint', 'decimal', 'boolean', 'date', 'timestamp', 'json'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <div style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={attr.isPrimaryKey}
                            onChange={(e) => handleUpdatePreviewAttribute(attr.id, 'isPrimaryKey', e.target.checked)}
                            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                          />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={attr.isNullable}
                            onChange={(e) => handleUpdatePreviewAttribute(attr.id, 'isNullable', e.target.checked)}
                            disabled={attr.isPrimaryKey}
                            style={{ cursor: attr.isPrimaryKey ? 'not-allowed' : 'pointer', width: '14px', height: '14px', opacity: attr.isPrimaryKey ? 0.4 : 1 }}
                          />
                        </div>
                        <button
                          onClick={() => handleRemovePreviewAttribute(attr.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isDark ? '#8b949e' : '#9ca3af',
                            cursor: 'pointer',
                            padding: '2px',
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#8b949e' : '#9ca3af'}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
                </>
              )}
              
              {/* AI Refine Section - always visible in preview */}
              <div style={{
                padding: '10px',
                background: isDark ? 'rgba(147, 51, 234, 0.08)' : 'rgba(147, 51, 234, 0.04)',
                border: `1px solid ${isDark ? 'rgba(147, 51, 234, 0.25)' : 'rgba(147, 51, 234, 0.15)'}`,
                borderRadius: '6px',
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: isDark ? '#c084fc' : '#9333ea',
                  marginBottom: '6px',
                }}>
                  <Sparkles size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Refine with AI
                </label>
                
                {/* Image preview inside refine section */}
                {imageData && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    background: isDark ? '#161b22' : '#f9fafb',
                    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    borderRadius: '5px',
                    marginBottom: '6px',
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    }}>
                      <img
                        src={imageData}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: isDark ? '#e6edf3' : '#374151',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}>
                        {imageName}
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveImage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        color: isDark ? '#8b949e' : '#9ca3af',
                        cursor: 'pointer',
                        flexShrink: 0,
                        padding: 0,
                        minHeight: 'auto',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = isDark ? '#8b949e' : '#9ca3af'; }}
                      title="Remove image"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px',
                      background: isDark ? '#21262d' : '#f3f4f6',
                      border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                      borderRadius: '5px',
                      color: isDark ? '#8b949e' : '#6b7280',
                      cursor: 'pointer',
                      flexShrink: 0,
                      minHeight: 'auto',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9333ea';
                      e.currentTarget.style.color = isDark ? '#c084fc' : '#9333ea';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                      e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
                    }}
                    title="Attach image or paste screenshot (⌘V)"
                  >
                    <ImageIcon size={13} />
                  </button>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading && (aiPrompt.trim() || imageData)) {
                        e.preventDefault();
                        handleGenerateAI();
                      }
                    }}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items;
                      if (!items) return;
                      for (const item of Array.from(items)) {
                        if (item.type.startsWith('image/')) {
                          e.preventDefault();
                          const file = item.getAsFile();
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const result = ev.target?.result as string;
                              setImageData(result);
                              setImageName('Pasted Screenshot');
                              setError(null);
                            };
                            reader.readAsDataURL(file);
                          }
                          break;
                        }
                      }
                    }}
                    placeholder={imageData ? "Describe what to extract, or just hit Refine..." : "Add a status enum column, or add audit fields..."}
                    style={{
                        flex: 1,
                        padding: '6px 8px',
                        background: isDark ? '#0d1117' : '#ffffff',
                        border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                        borderRadius: '5px',
                        color: isDark ? '#e6edf3' : '#111827',
                        fontSize: '11px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleGenerateAI}
                      disabled={isLoading || (!aiPrompt.trim() && !imageData)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        background: '#9333ea',
                        border: 'none',
                        borderRadius: '5px',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: isLoading ? 'wait' : 'pointer',
                        opacity: (isLoading || (!aiPrompt.trim() && !imageData)) ? 0.7 : 1,
                      }}
                    >
                      {isLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={12} />}
                      Refine
                    </button>
                  </div>
                </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          background: isDark ? '#0d1117' : '#f9fafb',
          borderTop: isDark ? '1px solid #21262d' : '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          borderRadius: '0 0 10px 10px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px',
              background: isDark ? '#21262d' : '#ffffff',
              border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
              borderRadius: '5px',
              color: isDark ? '#e6edf3' : '#374151',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          
          {/* Action button based on state */}
          {!showPreview && activeTab === 'manual' && (
            <button
              onClick={handleCreateEmptyTable}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '5px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Create Table
            </button>
          )}
          
          {!showPreview && activeTab === 'ddl' && (
            <button
              onClick={handleParseDDL}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '5px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Eye size={14} />
              Parse & Preview
            </button>
          )}
          
          {!showPreview && activeTab === 'ai' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {onOpenAISettings && (
                <button
                  onClick={onOpenAISettings}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '7px 10px',
                    background: isDark ? '#21262d' : '#ffffff',
                    border: isDark ? '1px solid #30363d' : '1px solid #d1d5db',
                    borderRadius: '5px',
                    color: isDark ? '#8b949e' : '#6b7280',
                    cursor: 'pointer',
                  }}
                  title="AI Settings"
                >
                  <Settings size={14} />
                </button>
              )}
              <button
                onClick={handleGenerateAI}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  background: 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isLoading ? 'wait' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 size={12} />
                    Generate
                  </>
                )}
              </button>
            </div>
          )}
          
          {showPreview && preview && (
            <button
              onClick={handleCreateTable}
              disabled={preview.attributes.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                background: '#22c55e',
                border: 'none',
                borderRadius: '5px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                cursor: preview.attributes.length === 0 ? 'not-allowed' : 'pointer',
                opacity: preview.attributes.length === 0 ? 0.5 : 1,
              }}
            >
              <Plus size={14} />
              {isEditMode ? 'Apply Changes' : 'Create Table'}
            </button>
          )}
        </div>
      </div>
      
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
