/**
 * AI Service for generating and enhancing data models
 * Supports OpenAI API (GPT-4) and compatible endpoints
 */

import { v4 as uuidv4 } from 'uuid';
import type { Entity, Relationship, PhysicalTable, ForeignKey, Attribute, EntityGroup } from '../model/schemas';

// Types for AI responses
export interface AIGeneratedModel {
  entities: Entity[];
  relationships: Relationship[];
  tables: PhysicalTable[];
  foreignKeys: ForeignKey[];
  groups?: EntityGroup[];
}

export interface AIEnhancementSuggestion {
  type: 'add_entity' | 'add_relationship' | 'add_attribute' | 'modify_entity' | 'add_table';
  description: string;
  data: Partial<Entity | Relationship | PhysicalTable | Attribute>;
}

export interface AIServiceConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  generatePhysical?: boolean; // If true, generate both conceptual and physical models
}

// Local storage key for API settings
const AI_SETTINGS_KEY = 'sqlmodel-ai-settings';

// Get default config from environment variables
const getDefaultConfig = (): AIServiceConfig | null => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (apiKey && apiKey !== 'your-openai-api-key-here') {
    return {
      apiKey,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      generatePhysical: true, // Default to generating both conceptual and physical
    };
  }
  return null;
};

// Get saved AI settings (prioritize user settings over defaults)
export const getAISettings = (): AIServiceConfig | null => {
  try {
    const saved = localStorage.getItem(AI_SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    // Fall back to environment variable default
    return getDefaultConfig();
  } catch {
    return getDefaultConfig();
  }
};

// Save AI settings
export const saveAISettings = (settings: AIServiceConfig): void => {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
};

// Clear AI settings
export const clearAISettings = (): void => {
  localStorage.removeItem(AI_SETTINGS_KEY);
};

// System prompt for data modeling
const SYSTEM_PROMPT = `You are an expert data architect and database designer. Your role is to help users design conceptual and physical data models.

WHEN ANALYZING IMAGES:
- Look for ERD diagrams, database schemas, whiteboard drawings, or hand-drawn sketches
- Identify entities/tables (usually boxes or rectangles)
- Detect relationships (usually lines/arrows connecting entities)
- Read entity/table names and attribute/column names
- Identify cardinality markers (1, *, 0..1, 1..*, etc.)
- Recognize primary keys (often underlined or marked with PK)
- Detect foreign keys (often marked with FK or shown as relationships)
- Look for groupings or modules (boxes around multiple entities)
- Pay attention to any labels, annotations, or notes

IMPORTANT: First analyze the user's request to determine the type of data model needed:

1. **OLTP (Transactional Systems)** - For operational systems like e-commerce, CRM, project management:
   - Use highly normalized structures (3NF or higher)
   - Focus on data integrity and avoiding redundancy
   - Design for frequent inserts, updates, and deletes
   - Include audit fields (created_at, updated_at)
   - Use proper foreign key relationships

2. **OLAP/Analytics (Star Schema)** - For reporting, analytics, data warehouses, dashboards:
   - Use dimensional modeling (star or snowflake schema)
   - Create fact tables for measurable events/metrics
   - Create dimension tables for descriptive attributes
   - Include surrogate keys and natural keys
   - Add slowly changing dimension (SCD) fields where appropriate
   - Optimize for read-heavy queries with denormalization

3. **Hybrid** - For systems needing both operational and analytical capabilities:
   - Design OLTP core with analytical views/summaries
   - Consider materialized aggregates

Keywords that suggest ANALYTICS/STAR SCHEMA:
- analytics, reporting, dashboard, metrics, KPIs, data warehouse, BI, business intelligence
- measures, dimensions, facts, aggregations, historical analysis, trends

Keywords that suggest OLTP:
- application, system, platform, service, operations, transactions, users, workflow
- CRUD operations, real-time, live data

When generating data models:
1. Use clear, descriptive names for entities, tables, and columns
2. Define appropriate relationships with correct cardinality
3. Include primary keys (UUID for OLTP, surrogate integers for OLAP)
4. Add relevant attributes with appropriate data types
5. For star schema: prefix fact tables with "fact_" and dimension tables with "dim_"

Data types: uuid, varchar, text, int, bigint, decimal, boolean, date, timestamp, json

Cardinality options: "1" (exactly one), "0..1" (zero or one), "1..*" (one or more), "0..*" (zero or more)

Always respond with valid JSON that matches the requested schema.`;

// Progress callback type for real-time updates
export type ProgressCallback = (stage: string, detail?: string) => void;

// Generate a complete data model from a description
export const generateDataModel = async (
  description: string,
  config: AIServiceConfig,
  onProgress?: ProgressCallback,
  imageData?: string
): Promise<AIGeneratedModel> => {
  onProgress?.('Analyzing request...', 'Determining model type (OLTP vs Analytics)');
  
  let prompt = '';
  
  if (imageData) {
    // Enhanced prompt for image analysis
    // If description contains focus instructions (from preview confirmation), use those first
    const hasFilterInstructions = description && (description.includes('ONLY the following sections') || description.includes('FOCUS ON'));
    
    prompt = `I've attached an image of a database schema/ERD diagram. Please analyze it carefully and generate a complete data model.

${description || 'Extract the entire schema from the image.'}

${hasFilterInstructions ? '\n=== IMAGE ANALYSIS GUIDELINES ===' : ''}\n\nANALYZE THE IMAGE FOR:
1. **Entities/Tables**: Look for boxes, rectangles, or labeled sections representing entities
   - Extract the entity/table name from each box
   - Note any descriptions or annotations
   
2. **Attributes/Columns**: Inside each entity/table box, look for:
   - Column/attribute names (often listed vertically)
   - Data types (varchar, int, date, etc.)
   - Primary keys (often underlined, bold, or marked with PK)
   - Foreign keys (often marked with FK or shown with asterisks)
   - Nullable indicators (NULL, NOT NULL, or question marks)
   
3. **Relationships**: Look for lines/arrows connecting entities
   - Follow the lines to determine which entities are connected
   - Read any labels on the lines (e.g., "has many", "belongs to")
   - Identify cardinality markers (crow's foot notation, 1, *, N, 0..1, 1..*)
   
4. **Groups/Modules**: Look for larger boxes or dashed borders grouping multiple entities
   - Extract group names if labeled
   - Note which entities belong to each group
   - If specific sections are requested above, create groups matching those sections

5. **Notation Style**: Detect if it's:
   - Chen notation (diamonds for relationships)
   - Crow's foot notation (lines with symbols at ends)
   - UML class diagram style
   - Simple boxes and arrows

RESPOND WITH: A JSON object containing:
- entities: Array of all entities found in the diagram
- relationships: Array of all connections between entities${config.generatePhysical !== false ? '\n- tables: Array of physical tables with full column definitions (if shown in image)\n- foreignKeys: Array of foreign key relationships' : ''}
- groups: Array of entity groups (if entities are visually grouped in the image)

For each entity: { name, description }
For each relationship: { fromEntityId (use entity name), toEntityId (use entity name), label, fromCardinality, toCardinality }${config.generatePhysical !== false ? '\nFor each table: { name, entityId (use entity name), attributes: [{ name, dataType, isPrimaryKey, isNullable, isForeignKey }] }\nFor each foreignKey: { fromTableId (use table name), toTableId (use table name), fromAttributeId (use column name), toAttributeId (use column name), fromCardinality, toCardinality }' : ''}
For each group: { name, entityIds: [array of entity names that belong to this group] }

CRITICAL GROUPING RULES:
- If specific sections were requested at the top of this prompt, create groups matching those sections EXACTLY
- Otherwise, if entities are inside dashed/dotted boxes, rectangles, or containers → create a group for them
- If entities have the same label/heading above them → group them together
- If entities are visually close together with shared context → group them
- Look for section labels like "Core", "Admin", "Reporting", etc. → those are group names
- Each group MUST have entityIds array with the names of entities inside it
- If NO visual grouping exists, return empty groups array []

IMPORTANT: 
- Extract ALL entities/tables visible in the image
- Extract ALL relationships/connections shown
- Use the actual names from the image, not generic names
- Preserve the cardinality markers exactly as shown
- If column details are visible, include them in tables.attributes
- If the diagram is very large (50+ entities), prioritize the most important entities and relationships
- Keep your response concise to avoid truncation

Respond ONLY with the JSON object, no markdown code blocks or explanations.`;
  } else {
    // Text-only prompt (existing logic)
    prompt = `Generate a complete data model for the following system:

${description}

FIRST: Analyze whether this is an OLTP system, Analytics/Star Schema, or Hybrid based on the description.
Then generate the appropriate model structure.

Respond with a JSON object containing:
- modelType: "oltp" | "star_schema" | "hybrid" (indicate what you detected)
- entities: Array of conceptual entities with id (uuid), name, description
- relationships: Array of relationships with id, fromEntityId, toEntityId, label, fromCardinality, toCardinality${config.generatePhysical !== false ? '\n- tables: Array of physical tables with id, entityId (matching entity), name (snake_case), attributes\n- foreignKeys: Array of foreign keys with id, fromTableId, toTableId, fromAttributeId, toAttributeId, fromCardinality, toCardinality' : ''}
${config.generatePhysical !== false ? '\nEach table attribute should have: id, name, dataType, isPrimaryKey, isNullable, isForeignKey' : ''}

For OLTP: Generate 3-8 normalized entities with proper relationships.${config.generatePhysical !== false ? '\nFor Star Schema: Generate 1-3 fact tables and 3-6 dimension tables.' : ''}
For Hybrid: Mix of operational entities and analytical structures.

IMPORTANT: Respond ONLY with the JSON object, no markdown code blocks or explanations.`;
  }

  onProgress?.('Calling AI...', imageData ? 'Analyzing image and extracting schema' : 'Generating conceptual entities');
  const response = await callAI(prompt, config, imageData);
  
  onProgress?.('Parsing response...', 'Building entity structures');
  const result = parseModelResponse(response);
  
  onProgress?.('Finalizing...', `Created ${result.entities.length} entities and ${result.tables.length} tables`);
  return result;
};

// Enhance an existing model with AI suggestions
export const enhanceModel = async (
  currentModel: {
    entities: Entity[];
    relationships: Relationship[];
    tables: PhysicalTable[];
    foreignKeys: ForeignKey[];
  },
  enhancementRequest: string,
  config: AIServiceConfig,
  onProgress?: ProgressCallback,
  imageData?: string
): Promise<AIGeneratedModel> => {
  onProgress?.('Analyzing current model...', `Found ${currentModel.entities.length} entities, ${currentModel.tables.length} tables`);
  
  // Build detailed table info including PKs for FK references
  const tableDetails = currentModel.tables.map(t => {
    const pk = t.attributes.find(a => a.isPrimaryKey);
    return {
      name: t.name,
      entityName: currentModel.entities.find(e => e.id === t.entityId)?.name || null,
      primaryKey: pk ? { name: pk.name, type: pk.dataType } : null,
      columns: t.attributes.map(a => ({
        name: a.name,
        type: a.dataType,
        isPK: a.isPrimaryKey,
        isFK: a.isForeignKey
      }))
    };
  });

  let prompt = '';
  
  if (imageData) {
    // Enhanced prompt for image-based enhancement
    prompt = `I've attached an image showing additional entities or changes to add to my existing data model.

=== CURRENT MODEL ===

ENTITIES:
${JSON.stringify(currentModel.entities.map(e => ({ id: e.id, name: e.name, description: e.description })), null, 2)}

RELATIONSHIPS:
${JSON.stringify(currentModel.relationships.map(r => ({
  from: currentModel.entities.find(e => e.id === r.fromEntityId)?.name,
  to: currentModel.entities.find(e => e.id === r.toEntityId)?.name,
  label: r.label,
  cardinality: `${r.fromCardinality} to ${r.toCardinality}`
})), null, 2)}

TABLES (with columns):
${JSON.stringify(tableDetails, null, 2)}

=== IMAGE CONTENT ===
${enhancementRequest || 'Analyze the image to identify new entities, relationships, or tables to add.'}

ANALYZE THE IMAGE FOR:
1. **NEW Entities/Tables**: Look for entities NOT already in the current model
2. **NEW Relationships**: Look for connections between entities (new or to existing ones)
3. **NEW Attributes/Columns**: Additional columns to add to existing or new tables
4. **Groups**: Any groupings or modules containing entities

RESPOND WITH: A JSON object containing ONLY NEW elements to add:
{
  "entities": [ /* Only NEW entities from image,,
  "groups": [ /* Only NEW entity groups with entityIds as entity names */ ]
}

For NEW entities: use entity names from the image
For relationships: use entity NAMES (not IDs) for fromEntityId/toEntityId - both new and existing names work
For tables: include entityId as entity NAME, and MUST include full attributes array
For foreignKeys: use table NAMES (not IDs) and column NAMES (not IDs)
For groups: { name, entityIds: [array of entity names] } - can include both new and existing entity names
For relationships: use entity NAMES (not IDs) for fromEntityId/toEntityId - both new and existing names work
For tables: include entityId as entity NAME, and MUST include full attributes array
For foreignKeys: use table NAMES (not IDs) and column NAMES (not IDs)

CRITICAL:
- DO NOT duplicate existing entities/tables
- DO NOT return empty attributes arrays - every new table needs columns
- Use actual names from the image
- Link new elements to existing ones by using their names

Respond ONLY with valid JSON, no markdown or explanations.`;
  } else {
    // Text-only enhancement prompt (existing logic)
    prompt = `You are enhancing an existing data model. Generate NEW entities, relationships, tables with FULL column definitions, and foreign keys.

=== CURRENT MODEL ===

ENTITIES:
${JSON.stringify(currentModel.entities.map(e => ({ id: e.id, name: e.name, description: e.description })), null, 2)}

RELATIONSHIPS:
${JSON.stringify(currentModel.relationships.map(r => ({
  from: currentModel.entities.find(e => e.id === r.fromEntityId)?.name,
  to: currentModel.entities.find(e => e.id === r.toEntityId)?.name,
  label: r.label,
  cardinality: `${r.fromCardinality} to ${r.toCardinality}`
})), null, 2)}

TABLES (with columns):
${JSON.stringify(tableDetails, null, 2)}

=== USER REQUEST ===
${enhancementRequest}

=== INSTRUCTIONS ===

1. CREATE NEW ENTITIES for each new concept (e.g., "Dim Borrower", "Fact Loan")
2. CREATE RELATIONSHIPS linking new entities to existing entities
3. CREATE TABLES with FULL column definitions - EVERY table must have:
   - A primary key column (usually "id" with type "uuid" or "bigint")
   - All relevant data columns with appropriate types
   - FK columns for relationships to other tables

4. For STAR SCHEMA / ANALYTICS:
   - Dimension tables (dim_*): Include surrogate key, natural key, descriptive attributes, SCD fields
   - Fact tables (fact_*): Include surrogate key, dimension keys (FKs), measures, timestamps
   - Link fact tables to dimension tables AND to existing OLTP tables if referenced

5. CREATE FOREIGN KEYS for every table relationship

=== REQUIRED OUTPUT FORMAT ===

{
  "entities": [
    {
      "name": "Dim Borrower",
      "description": "Dimension table for borrower analytics with historical tracking"
    }
  ],
  "relationships": [
    {
      "fromEntityId": "Fact Loan",
      "toEntityId": "Dim Borrower",
      "label": "references",
      "fromCardinality": "0..*",
      "toCardinality": "1"
    },
    {
      "fromEntityId": "Dim Borrower",
      "toEntityId": "Borrower",
      "label": "derived from",
      "fromCardinality": "1",
      "toCardinality": "1"
    }
  ],
  "tables": [
    {
      "name": "dim_borrowers",
      "entityId": "Dim Borrower",
      "attributes": [
        { "name": "borrower_key", "dataType": "bigint", "isPrimaryKey": true, "isNullable": false, "isForeignKey": false },
        { "name": "borrower_id", "dataType": "uuid", "isPrimaryKey": false, "isNullable": false, "isForeignKey": true },
        { "name": "name", "dataType": "varchar", "isPrimaryKey": false, "isNullable": false, "isForeignKey": false },
        { "name": "email", "dataType": "varchar", "isPrimaryKey": false, "isNullable": true, "isForeignKey": false },
        { "name": "valid_from", "dataType": "timestamp", "isPrimaryKey": false, "isNullable": false, "isForeignKey": false },
        { "name": "valid_to", "dataType": "timestamp", "isPrimaryKey": false, "isNullable": true, "isForeignKey": false },
        { "name": "is_current", "dataType": "boolean", "isPrimaryKey": false, "isNullable": false, "isForeignKey": false }
      ]
    },
    {
      "name": "fact_loans",
      "entityId": "Fact Loan",
      "attributes": [
        { "name": "loan_key", "dataType": "bigint", "isPrimaryKey": true, "isNullable": false, "isForeignKey": false },
        { "name": "borrower_key", "dataType": "bigint", "isPrimaryKey": false, "isNullable": false, "isForeignKey": true },
        { "name": "book_key", "dataType": "bigint", "isPrimaryKey": false, "isNullable": false, "isForeignKey": true },
        { "name": "date_key", "dataType": "int", "isPrimaryKey": false, "isNullable": false, "isForeignKey": true },
        { "name": "loan_count", "dataType": "int", "isPrimaryKey": false, "isNullable": false, "isForeignKey": false },
        { "name": "days_borrowed", "dataType": "int", "isPrimaryKey": false, "isNullable": true, "isForeignKey": false }
      ]
    }
  ],
  "foreignKeys": [
    {
      "fromTableId": "fact_loans",
      "toTableId": "dim_borrowers",
      "fromAttributeId": "borrower_key",
      "toAttributeId": "borrower_key",
      "fromCardinality": "0..*",
      "toCardinality": "1"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Every table MUST have an "attributes" array with at least 4 columns including a primary key
- Tables with empty attributes arrays are INVALID - every table needs column definitions
- Every table MUST have entityId matching an entity name (new or existing)
- Use entity NAMES (not IDs) for entityId and relationship references
- Dimension tables should have 5-8 columns (surrogate key, natural key, attributes, SCD fields)
- Fact tables should have 5-10 columns (surrogate key, dimension FKs, measures)
- Foreign keys must reference actual column names in the tables
- DO NOT return tables without attributes - this will cause the model to fail

Respond ONLY with valid JSON, no markdown or explanations.`;
  }

  onProgress?.('Calling AI...', imageData ? 'Analyzing image and identifying new elements' : 'Generating enhancements');
  const response = await callAI(prompt, config, imageData);
  
  onProgress?.('Parsing response...', 'Merging with existing model');
  const result = parseEnhancementResponse(response, currentModel);
  
  onProgress?.('Finalizing...', `Adding ${result.entities.length} entities, ${result.tables.length} tables, ${result.foreignKeys.length} foreign keys`);
  return result;
};

// Generate physical tables from conceptual entities
export const generatePhysicalFromConceptual = async (
  entities: Entity[],
  relationships: Relationship[],
  config: AIServiceConfig,
  onProgress?: ProgressCallback
): Promise<{ tables: PhysicalTable[]; foreignKeys: ForeignKey[] }> => {
  onProgress?.('Analyzing conceptual model...', `Processing ${entities.length} entities`);
  
  const prompt = `Convert the following conceptual data model into a physical database schema.

CONCEPTUAL ENTITIES:
${JSON.stringify(entities.map(e => ({ id: e.id, name: e.name, description: e.description })), null, 2)}

RELATIONSHIPS:
${JSON.stringify(relationships.map(r => ({
  from: entities.find(e => e.id === r.fromEntityId)?.name,
  fromId: r.fromEntityId,
  to: entities.find(e => e.id === r.toEntityId)?.name,
  toId: r.toEntityId,
  label: r.label,
  fromCardinality: r.fromCardinality,
  toCardinality: r.toCardinality
})), null, 2)}

Generate physical tables with:
1. Appropriate columns based on entity names and descriptions
2. Primary keys (uuid type preferred)
3. Foreign keys for relationships
4. Common audit fields (created_at, updated_at)
5. Snake_case naming convention for tables and columns

Respond with a JSON object containing:
- tables: Array of physical tables, each with id, entityId (use the entity id from above), name, attributes
- foreignKeys: Array of foreign keys

IMPORTANT: 
- Use the exact entityId values provided above
- Generate new UUIDs for table ids, attribute ids, and foreignKey ids
- Respond ONLY with the JSON object, no markdown code blocks or explanations.`;

  onProgress?.('Calling AI...', 'Converting to physical schema');
  const response = await callAI(prompt, config);
  
  onProgress?.('Parsing response...', 'Building tables and foreign keys');
  const result = parsePhysicalResponse(response);
  
  onProgress?.('Finalizing...', `Created ${result.tables.length} tables`);
  return result;
};

// Suggest improvements for an entity
export const suggestEntityImprovements = async (
  entity: Entity,
  table: PhysicalTable | undefined,
  config: AIServiceConfig
): Promise<string[]> => {
  const prompt = `Analyze this data entity and suggest improvements:

Entity: ${entity.name}
Description: ${entity.description || 'No description'}
${table ? `Table: ${table.name}
Columns: ${table.attributes.map(a => `${a.name} (${a.dataType}${a.isPrimaryKey ? ', PK' : ''}${a.isForeignKey ? ', FK' : ''})`).join(', ')}` : 'No physical table defined yet'}

Suggest 3-5 specific improvements. Consider:
- Missing important attributes
- Data type improvements
- Normalization opportunities
- Common patterns (audit fields, soft delete, versioning)
- Naming conventions

Respond with a JSON array of strings, each being a specific suggestion.
IMPORTANT: Respond ONLY with the JSON array, no markdown code blocks or explanations.`;

  const response = await callAI(prompt, config);
  try {
    return JSON.parse(response);
  } catch {
    return ['Unable to parse AI suggestions'];
  }
};

// Call the AI API
export async function callAI(prompt: string, config: AIServiceConfig, imageData?: string): Promise<string> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  let model = config.model || 'gpt-4o-mini';
  
  // Use vision model if image is provided and current model doesn't support vision
  if (imageData && !model.includes('gpt-4o')) {
    model = 'gpt-4o-mini'; // Ensure we use a vision-capable model
  }

  // Build user message content
  let userContent: any;
  if (imageData) {
    // Vision API format with image
    userContent = [
      { type: 'text', text: prompt },
      { 
        type: 'image_url', 
        image_url: { 
          url: imageData,
          detail: 'high' // Use high detail for better schema detection
        } 
      },
    ];
  } else {
    // Text-only format
    userContent = prompt;
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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 16000, // Increased to handle large models with many entities/tables
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || `API request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Parse the AI response for a complete model
function parseModelResponse(response: string): AIGeneratedModel {
  try {
    // Clean up response - remove markdown code blocks if present
    let cleaned = response.trim();
    
    console.log('[AI] Raw response length:', response.length);
    console.log('[AI] Raw response (first 500 chars):', response.slice(0, 500));
    console.log('[AI] Raw response (last 500 chars):', response.slice(-500));
    
    // Check if response appears to be truncated
    if (!response.trim().endsWith('}') && !response.trim().endsWith(']')) {
      console.error('[AI] Response appears truncated - does not end with } or ]');
      throw new Error('AI response was truncated. The model is too complex - try simplifying your request or breaking it into smaller parts.');
    }
    
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (jsonError) {
      console.error('[AI] JSON parse error:', jsonError);
      console.error('[AI] Attempted to parse:', cleaned.slice(0, 1000));
      throw new Error(`Invalid JSON response from AI: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}. The response may be too large or malformed.`);
    }
    
    console.log('[AI] Raw parsed tables:', JSON.stringify(parsed.tables?.map((t: any) => ({ 
      name: t.name, 
      entityId: t.entityId,
      attrCount: t.attributes?.length || 0,
      firstAttr: t.attributes?.[0]?.name
    })), null, 2));
    
    // Ensure all IDs are valid UUIDs
    const entities: Entity[] = (parsed.entities || []).map((e: any) => ({
      id: e.id || uuidv4(),
      name: e.name || 'Unnamed Entity',
      description: e.description || '',
    }));

    const entityIdMap = new Map<string, string>();
    parsed.entities?.forEach((e: any, i: number) => {
      entityIdMap.set(e.id || e.name, entities[i].id);
      entityIdMap.set(e.name, entities[i].id); // Also map by name
    });

    const relationships: Relationship[] = (parsed.relationships || []).map((r: any) => ({
      id: r.id || uuidv4(),
      fromEntityId: entityIdMap.get(r.fromEntityId) || r.fromEntityId,
      toEntityId: entityIdMap.get(r.toEntityId) || r.toEntityId,
      label: r.label || '',
      fromCardinality: r.fromCardinality || '1',
      toCardinality: r.toCardinality || '0..*',
    }));

    const tables: PhysicalTable[] = (parsed.tables || []).map((t: any) => {
      const tableId = t.id || uuidv4();
      const attributes: Attribute[] = (t.attributes || []).map((a: any) => ({
        id: a.id || uuidv4(),
        name: a.name || 'column',
        dataType: a.dataType || 'varchar',
        isPrimaryKey: a.isPrimaryKey || false,
        isNullable: a.isNullable !== false,
        isForeignKey: a.isForeignKey || false,
        referencesTableId: a.referencesTableId,
        referencesAttributeId: a.referencesAttributeId,
      }));

      return {
        id: tableId,
        entityId: entityIdMap.get(t.entityId) || t.entityId,
        name: t.name || 'table',
        attributes,
      };
    });

    const tableIdMap = new Map<string, string>();
    parsed.tables?.forEach((t: any, i: number) => {
      tableIdMap.set(t.id || t.name, tables[i].id);
    });

    // Build attribute ID map
    const attrIdMap = new Map<string, string>();
    parsed.tables?.forEach((t: any, ti: number) => {
      t.attributes?.forEach((a: any, ai: number) => {
        attrIdMap.set(`${t.id || t.name}.${a.id || a.name}`, tables[ti].attributes[ai].id);
      });
    });

    const foreignKeys: ForeignKey[] = (parsed.foreignKeys || []).map((fk: any) => {
      const fromTableId = tableIdMap.get(fk.fromTableId) || fk.fromTableId;
      const toTableId = tableIdMap.get(fk.toTableId) || fk.toTableId;
      
      // Find the actual attribute IDs
      let fromAttrId = fk.fromAttributeId;
      let toAttrId = fk.toAttributeId;
      
      // Try to map attribute IDs if they're names
      const fromTable = tables.find(t => t.id === fromTableId);
      const toTable = tables.find(t => t.id === toTableId);
      
      if (fromTable && typeof fromAttrId === 'string') {
        const attr = fromTable.attributes.find(a => a.name === fromAttrId || a.id === fromAttrId);
        if (attr) fromAttrId = attr.id;
      }
      if (toTable && typeof toAttrId === 'string') {
        const attr = toTable.attributes.find(a => a.name === toAttrId || a.id === toAttrId);
        if (attr) toAttrId = attr.id;
      }

      return {
        id: fk.id || uuidv4(),
        fromTableId,
        toTableId,
        fromAttributeId: fromAttrId || uuidv4(),
        toAttributeId: toAttrId || uuidv4(),
        fromCardinality: fk.fromCardinality || '0..*',
        toCardinality: fk.toCardinality || '1',
      };
    });

    // Mark FK attributes
    foreignKeys.forEach(fk => {
      const table = tables.find(t => t.id === fk.fromTableId);
      if (table) {
        const attr = table.attributes.find(a => a.id === fk.fromAttributeId);
        if (attr) {
          attr.isForeignKey = true;
          attr.referencesTableId = fk.toTableId;
          attr.referencesAttributeId = fk.toAttributeId;
        }
      }
    });

    // Parse entity groups if present in the response
    const groups = (parsed.groups || []).map((g: any) => ({
      id: uuidv4(),
      name: g.name || 'Unnamed Group',
      entityIds: (g.entityIds || []).map((eid: string) => entityIdMap.get(eid) || eid),
      borderStyle: g.borderStyle || 'dashed',
      borderColor: g.borderColor,
      backgroundColor: g.backgroundColor,
      borderWidth: g.borderWidth || 2,
    }));

    return { entities, relationships, tables, foreignKeys, groups };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response);
    
    // Provide helpful error message
    if (error instanceof Error) {
      if (error.message.includes('truncated')) {
        throw error; // Already has good message
      } else if (error.message.includes('JSON')) {
        throw new Error('Failed to parse AI response. The diagram may be too complex. Try:\n- Breaking the diagram into smaller sections\n- Using text description instead of image\n- Simplifying the diagram before uploading');
      }
    }
    
    throw new Error('Failed to parse AI response. Please try again or use a simpler description.');
  }
}

// Parse enhancement response and merge with existing model
function parseEnhancementResponse(
  response: string,
  currentModel: {
    entities: Entity[];
    relationships: Relationship[];
    tables: PhysicalTable[];
    foreignKeys: ForeignKey[];
  }
): AIGeneratedModel {
  const parsed = parseModelResponse(response);
  
  console.log('[AI] Parsed response:', { 
    entities: parsed.entities.length, 
    tables: parsed.tables.length,
    tableDetails: parsed.tables.map(t => ({ name: t.name, attrCount: t.attributes.length, entityId: t.entityId }))
  });
  
  // Build name-to-id maps for existing entities/tables
  const entityNameToId = new Map<string, string>();
  currentModel.entities.forEach(e => entityNameToId.set(e.name.toLowerCase(), e.id));
  
  const tableNameToId = new Map<string, string>();
  const tableIdToInfo = new Map<string, { tableId: string; pkAttrId: string }>();
  currentModel.tables.forEach(t => {
    tableNameToId.set(t.name.toLowerCase(), t.id);
    const pkAttr = t.attributes.find(a => a.isPrimaryKey);
    if (pkAttr) {
      tableIdToInfo.set(t.id, { tableId: t.id, pkAttrId: pkAttr.id });
    }
  });

  // Build a map of new entity names to their IDs
  const newEntityNameToId = new Map<string, string>();
  parsed.entities.forEach(e => newEntityNameToId.set(e.name.toLowerCase(), e.id));

  // Combine both maps for relationship resolution
  const allEntityNameToId = new Map([...entityNameToId, ...newEntityNameToId]);

  // Update relationship references to use proper entity IDs
  // AI may return entity names instead of IDs, so we need to resolve them
  const resolvedRelationships = parsed.relationships.map(r => {
    let fromId = r.fromEntityId || '';
    let toId = r.toEntityId || '';
    
    // Check if fromEntityId is actually a name
    if (fromId) {
      const fromByName = allEntityNameToId.get(fromId.toLowerCase());
      if (fromByName) fromId = fromByName;
    }
    
    // Check if there's an entity in parsed results with this ID
    const fromEntity = parsed.entities.find(e => e.id === r.fromEntityId);
    if (fromEntity) {
      // Use existing entity ID if name matches
      const existingId = entityNameToId.get(fromEntity.name.toLowerCase());
      if (existingId) fromId = existingId;
      else fromId = fromEntity.id; // New entity, use its ID
    }
    
    // Check if toEntityId is actually a name
    if (toId) {
      const toByName = allEntityNameToId.get(toId.toLowerCase());
      if (toByName) toId = toByName;
    }
    
    // Check if there's an entity in parsed results with this ID
    const toEntity = parsed.entities.find(e => e.id === r.toEntityId);
    if (toEntity) {
      const existingId = entityNameToId.get(toEntity.name.toLowerCase());
      if (existingId) toId = existingId;
      else toId = toEntity.id;
    }
    
    return {
      ...r,
      id: uuidv4(), // Always generate new ID for relationships
      fromEntityId: fromId,
      toEntityId: toId,
    };
  });

  // Filter out entities that already exist (by name)
  const newEntities = parsed.entities.filter(e => 
    !entityNameToId.has(e.name.toLowerCase())
  );

  // Build new table name to id map
  const newTableNameToId = new Map<string, string>();
  parsed.tables.forEach(t => newTableNameToId.set(t.name.toLowerCase(), t.id));
  
  // Resolve entityId for tables - map entity names to actual entity IDs
  parsed.tables.forEach(t => {
    if (t.entityId) {
      // First try to find in new entities
      const newEntityId = newEntityNameToId.get(t.entityId.toLowerCase());
      // Then try existing entities
      const existingEntityId = entityNameToId.get(t.entityId.toLowerCase());
      
      if (newEntityId) {
        t.entityId = newEntityId;
      } else if (existingEntityId) {
        t.entityId = existingEntityId;
      }
      // If neither found, keep as is (might be a UUID already)
    }
  });
  
  console.log('[AI] After entity resolution:', parsed.tables.map(t => ({ name: t.name, entityId: t.entityId })));

  // Update FK references to use proper table/attribute IDs
  const resolvedForeignKeys = parsed.foreignKeys.map(fk => {
    let fromTableId = fk.fromTableId || '';
    let toTableId = fk.toTableId || '';
    let fromAttrId = fk.fromAttributeId || '';
    let toAttrId = fk.toAttributeId || '';
    
    // Resolve table IDs (could be names)
    const fromTableStr = (fk.fromTableId || '').toLowerCase();
    const toTableStr = (fk.toTableId || '').toLowerCase();
    const existingFromTable = fromTableStr ? tableNameToId.get(fromTableStr) : undefined;
    const existingToTable = toTableStr ? tableNameToId.get(toTableStr) : undefined;
    const newFromTable = fromTableStr ? newTableNameToId.get(fromTableStr) : undefined;
    const newToTable = toTableStr ? newTableNameToId.get(toTableStr) : undefined;
    
    if (existingFromTable) fromTableId = existingFromTable;
    else if (newFromTable) fromTableId = newFromTable;
    
    if (existingToTable) toTableId = existingToTable;
    else if (newToTable) toTableId = newToTable;
    
    // Try to find attribute IDs
    const allTables = [...currentModel.tables, ...parsed.tables];
    const fromTable = allTables.find(t => t.id === fromTableId || (fromTableStr && t.name.toLowerCase() === fromTableStr));
    const toTable = allTables.find(t => t.id === toTableId || (toTableStr && t.name.toLowerCase() === toTableStr));
    
    const fromAttrStr = (fk.fromAttributeId || '').toLowerCase();
    const toAttrStr = (fk.toAttributeId || '').toLowerCase();
    
    if (fromTable) {
      fromTableId = fromTable.id;
      const attr = fromTable.attributes.find(a => 
        a.id === fk.fromAttributeId || a.name === fk.fromAttributeId || (fromAttrStr && a.name.toLowerCase() === fromAttrStr)
      );
      if (attr) fromAttrId = attr.id;
    }
    if (toTable) {
      toTableId = toTable.id;
      const attr = toTable.attributes.find(a => 
        a.id === fk.toAttributeId || a.name === fk.toAttributeId || (toAttrStr && a.name.toLowerCase() === toAttrStr) || a.isPrimaryKey
      );
      if (attr) toAttrId = attr.id;
    }
    
    return {
      ...fk,
      id: uuidv4(),
      fromTableId,
      toTableId,
      fromAttributeId: fromAttrId,
      toAttributeId: toAttrId,
    };
  });

  // Filter out tables that already exist (by name)
  const newTables = parsed.tables.filter(t => 
    !tableNameToId.has(t.name.toLowerCase())
  );

  return {
    entities: newEntities,
    relationships: resolvedRelationships,
    tables: newTables,
    foreignKeys: resolvedForeignKeys,
  };
}

// Parse physical generation response
function parsePhysicalResponse(response: string): { tables: PhysicalTable[]; foreignKeys: ForeignKey[] } {
  try {
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    
    const tables: PhysicalTable[] = (parsed.tables || []).map((t: any) => ({
      id: uuidv4(),
      entityId: t.entityId,
      name: t.name || 'table',
      attributes: (t.attributes || []).map((a: any) => ({
        id: uuidv4(),
        name: a.name || 'column',
        dataType: a.dataType || 'varchar',
        isPrimaryKey: a.isPrimaryKey || false,
        isNullable: a.isNullable !== false,
        isForeignKey: a.isForeignKey || false,
      })),
    }));

    // Create attribute lookup for FK references
    const attrLookup = new Map<string, { tableId: string; attrId: string }>();
    tables.forEach(t => {
      t.attributes.forEach(a => {
        attrLookup.set(`${t.name}.${a.name}`, { tableId: t.id, attrId: a.id });
      });
    });

    const foreignKeys: ForeignKey[] = (parsed.foreignKeys || []).map((fk: any) => {
      const fromTable = tables.find(t => t.name === fk.fromTableName || t.id === fk.fromTableId);
      const toTable = tables.find(t => t.name === fk.toTableName || t.id === fk.toTableId);
      
      const fromAttr = fromTable?.attributes.find(a => 
        a.name === fk.fromAttributeName || a.id === fk.fromAttributeId
      );
      const toAttr = toTable?.attributes.find(a => 
        a.name === fk.toAttributeName || a.id === fk.toAttributeId
      );

      // Mark the attribute as FK
      if (fromAttr && toTable && toAttr) {
        fromAttr.isForeignKey = true;
        fromAttr.referencesTableId = toTable.id;
        fromAttr.referencesAttributeId = toAttr.id;
      }

      return {
        id: uuidv4(),
        fromTableId: fromTable?.id || fk.fromTableId,
        toTableId: toTable?.id || fk.toTableId,
        fromAttributeId: fromAttr?.id || fk.fromAttributeId,
        toAttributeId: toAttr?.id || fk.toAttributeId,
        fromCardinality: fk.fromCardinality || '0..*',
        toCardinality: fk.toCardinality || '1',
      };
    });

    return { tables, foreignKeys };
  } catch (error) {
    console.error('Failed to parse physical response:', error);
    throw new Error('Failed to generate physical tables. Please try again.');
  }
}

// Prompt templates for common scenarios
export const PROMPT_TEMPLATES = {
  ecommerce: 'An e-commerce platform with customers, products, orders, shopping cart, payments, reviews, and inventory management',
  blog: 'A blog platform with authors, posts, comments, categories, tags, and user subscriptions',
  crm: 'A customer relationship management (CRM) system with contacts, companies, deals, activities, and sales pipeline',
  project: 'A project management system with projects, tasks, team members, milestones, and time tracking',
  social: 'A social media platform with users, posts, comments, likes, follows, and notifications',
  inventory: 'An inventory management system with products, warehouses, stock movements, suppliers, and purchase orders',
  healthcare: 'A healthcare management system with patients, doctors, appointments, medical records, and prescriptions',
  education: 'An education platform with students, courses, enrollments, assignments, grades, and instructors',
};
