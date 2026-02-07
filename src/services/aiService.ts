/**
 * AI Service for generating and enhancing data models
 * Supports OpenAI API (GPT-4) and compatible endpoints
 */

import { v4 as uuidv4 } from 'uuid';
import type { Entity, Relationship, PhysicalTable, ForeignKey, Attribute } from '../model/schemas';

// Types for AI responses
export interface AIGeneratedModel {
  entities: Entity[];
  relationships: Relationship[];
  tables: PhysicalTable[];
  foreignKeys: ForeignKey[];
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
}

// Local storage key for API settings
const AI_SETTINGS_KEY = 'sqlmodel-ai-settings';

// Get saved AI settings
export const getAISettings = (): AIServiceConfig | null => {
  try {
    const saved = localStorage.getItem(AI_SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
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

When generating data models, you should:
1. Create well-normalized database structures (3NF or higher when appropriate)
2. Use clear, descriptive names for entities, tables, and columns
3. Define appropriate relationships with correct cardinality
4. Include primary keys (usually UUID or auto-increment IDs)
5. Add relevant attributes with appropriate data types
6. Consider common patterns like audit fields (created_at, updated_at)

Data types should use common database types: uuid, varchar, text, int, bigint, decimal, boolean, date, timestamp, json

Cardinality options are: "1" (exactly one), "0..1" (zero or one), "1..*" (one or more), "0..*" (zero or more)

Always respond with valid JSON that matches the requested schema.`;

// Generate a complete data model from a description
export const generateDataModel = async (
  description: string,
  config: AIServiceConfig
): Promise<AIGeneratedModel> => {
  const prompt = `Generate a complete data model for the following system:

${description}

Respond with a JSON object containing:
- entities: Array of conceptual entities with id (uuid), name, description
- relationships: Array of relationships with id, fromEntityId, toEntityId, label, fromCardinality, toCardinality
- tables: Array of physical tables with id, entityId (matching entity), name (snake_case), attributes
- foreignKeys: Array of foreign keys with id, fromTableId, toTableId, fromAttributeId, toAttributeId, fromCardinality, toCardinality

Each table attribute should have: id, name, dataType, isPrimaryKey, isNullable, isForeignKey

Generate 3-8 entities depending on complexity. Include realistic attributes and proper relationships.

IMPORTANT: Respond ONLY with the JSON object, no markdown code blocks or explanations.`;

  const response = await callAI(prompt, config);
  return parseModelResponse(response);
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
  config: AIServiceConfig
): Promise<AIGeneratedModel> => {
  const prompt = `Given the current data model, enhance it based on the user's request.

CURRENT MODEL:
Entities: ${JSON.stringify(currentModel.entities.map(e => ({ name: e.name, description: e.description })), null, 2)}
Relationships: ${JSON.stringify(currentModel.relationships.map(r => ({
  from: currentModel.entities.find(e => e.id === r.fromEntityId)?.name,
  to: currentModel.entities.find(e => e.id === r.toEntityId)?.name,
  label: r.label
})), null, 2)}
Tables: ${JSON.stringify(currentModel.tables.map(t => ({
  name: t.name,
  columns: t.attributes.map(a => `${a.name} (${a.dataType})`)
})), null, 2)}

USER REQUEST: ${enhancementRequest}

Generate ONLY the NEW or MODIFIED elements that should be added/changed. Do not include existing entities/tables unless they are being modified.

Respond with a JSON object containing:
- entities: Array of NEW conceptual entities to add
- relationships: Array of NEW relationships to add (use placeholder entity names that match existing or new entity names)
- tables: Array of NEW physical tables to add
- foreignKeys: Array of NEW foreign keys to add

IMPORTANT: Respond ONLY with the JSON object, no markdown code blocks or explanations.`;

  const response = await callAI(prompt, config);
  return parseEnhancementResponse(response, currentModel);
};

// Generate physical tables from conceptual entities
export const generatePhysicalFromConceptual = async (
  entities: Entity[],
  relationships: Relationship[],
  config: AIServiceConfig
): Promise<{ tables: PhysicalTable[]; foreignKeys: ForeignKey[] }> => {
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

  const response = await callAI(prompt, config);
  return parsePhysicalResponse(response);
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
async function callAI(prompt: string, config: AIServiceConfig): Promise<string> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const model = config.model || 'gpt-4o';

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
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
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
    
    // Ensure all IDs are valid UUIDs
    const entities: Entity[] = (parsed.entities || []).map((e: any) => ({
      id: e.id || uuidv4(),
      name: e.name || 'Unnamed Entity',
      description: e.description || '',
    }));

    const entityIdMap = new Map<string, string>();
    parsed.entities?.forEach((e: any, i: number) => {
      entityIdMap.set(e.id || e.name, entities[i].id);
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

    return { entities, relationships, tables, foreignKeys };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response);
    throw new Error('Failed to parse AI response. Please try again.');
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
  
  // Build name-to-id maps for existing entities/tables
  const entityNameToId = new Map<string, string>();
  currentModel.entities.forEach(e => entityNameToId.set(e.name.toLowerCase(), e.id));
  
  const tableNameToId = new Map<string, string>();
  currentModel.tables.forEach(t => tableNameToId.set(t.name.toLowerCase(), t.id));

  // Update relationship references to use existing entity IDs where applicable
  parsed.relationships.forEach(r => {
    const fromEntity = parsed.entities.find(e => e.id === r.fromEntityId);
    const toEntity = parsed.entities.find(e => e.id === r.toEntityId);
    
    if (fromEntity) {
      const existingId = entityNameToId.get(fromEntity.name.toLowerCase());
      if (existingId) r.fromEntityId = existingId;
    }
    if (toEntity) {
      const existingId = entityNameToId.get(toEntity.name.toLowerCase());
      if (existingId) r.toEntityId = existingId;
    }
  });

  // Filter out entities that already exist (by name)
  const newEntities = parsed.entities.filter(e => 
    !entityNameToId.has(e.name.toLowerCase())
  );

  // Filter out tables that already exist (by name)
  const newTables = parsed.tables.filter(t => 
    !tableNameToId.has(t.name.toLowerCase())
  );

  return {
    entities: newEntities,
    relationships: parsed.relationships,
    tables: newTables,
    foreignKeys: parsed.foreignKeys,
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
