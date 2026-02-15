/**
 * Prisma schema parser.
 * Handles model blocks, field types, @id, @relation directives,
 * @map, @@map, and enum definitions.
 */
import type { ParsedSchema, ParsedTable, ParsedColumn, ParsedForeignKey } from './types';

// Map Prisma scalar types to SQL types
const prismaToSqlType: Record<string, string> = {
  'string': 'varchar',
  'int': 'int',
  'float': 'float',
  'boolean': 'boolean',
  'datetime': 'timestamp',
  'json': 'json',
  'bigint': 'bigint',
  'decimal': 'decimal',
  'bytes': 'bytea',
};

interface PrismaModel {
  name: string;
  dbName?: string; // @@map("actual_table_name")
  fields: PrismaField[];
}

interface PrismaField {
  name: string;
  type: string;
  isOptional: boolean;
  isList: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  dbName?: string; // @map("actual_column_name")
  defaultValue?: string;
  // Relation info
  relationName?: string;
  relationFields?: string[];
  relationReferences?: string[];
  relationOnDelete?: string;
}

export const parsePrismaSchema = (schema: string): ParsedSchema => {
  let diagnosticsLog = '';

  // Normalize line endings
  const normalizedSchema = schema.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // ──────────────────────────────────────────────────────────────────────
  // PASS 1: Extract model blocks
  // ──────────────────────────────────────────────────────────────────────
  const models: PrismaModel[] = [];
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  const modelMatches = [...normalizedSchema.matchAll(modelRegex)];

  diagnosticsLog += `Found ${modelMatches.length} model(s)\n`;

  for (const match of modelMatches) {
    const modelName = match[1];
    const body = match[2];

    diagnosticsLog += `\n── Model: ${modelName} ──\n`;

    const fields: PrismaField[] = [];

    // Check for @@map("table_name")
    const mapMatch = /@@map\s*\(\s*"([^"]+)"\s*\)/.exec(body);
    const dbName = mapMatch ? mapMatch[1] : undefined;

    // Parse field lines (skip empty lines, comments, @@-level attributes)
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

      const field = parseField(trimmed);
      if (field) {
        fields.push(field);
        diagnosticsLog += `  ✓ ${field.name} (${field.type}${field.isPrimaryKey ? ', PK' : ''}${field.relationName ? `, relation: ${field.relationName}` : ''})\n`;
      }
    }

    models.push({ name: modelName, dbName, fields });
  }

  // ──────────────────────────────────────────────────────────────────────
  // PASS 2: Extract enums (for type reference, though we don't create tables for them)
  // ──────────────────────────────────────────────────────────────────────
  const enumNames = new Set<string>();
  const enumRegex = /enum\s+(\w+)\s*\{/g;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(normalizedSchema))) {
    enumNames.add(enumMatch[1]);
  }

  // ──────────────────────────────────────────────────────────────────────
  // PASS 3: Convert models to tables
  // ──────────────────────────────────────────────────────────────────────
  // Build a map of model name → table name for relation resolution
  const modelToTableName = new Map<string, string>();
  for (const model of models) {
    modelToTableName.set(model.name, model.dbName || model.name);
  }

  const tables: ParsedTable[] = [];

  for (const model of models) {
    const tableName = model.dbName || model.name;
    const columns: ParsedColumn[] = [];
    const foreignKeys: ParsedForeignKey[] = [];

    for (const field of model.fields) {
      // Skip relation fields (virtual — they don't correspond to columns)
      if (field.relationName && !field.relationFields?.length) {
        // This is a virtual relation field (e.g. `posts Post[]`), skip
        continue;
      }

      // If the field has @relation with fields/references, it's a FK column holder
      if (field.relationName && field.relationFields?.length && field.relationReferences?.length) {
        // The actual column is defined by relationFields, not this field
        // We'll process FKs from this relation, but the columns come from the scalar fields
        const targetTableName = modelToTableName.get(field.type) || field.type;
        for (let i = 0; i < field.relationFields.length; i++) {
          const fkCol = field.relationFields[i];
          const refCol = field.relationReferences[i] || 'id';
          foreignKeys.push({
            column: fkCol,
            referencedTable: targetTableName,
            referencedColumn: refCol,
          });
          diagnosticsLog += `  → FK: ${fkCol} → ${targetTableName}.${refCol}\n`;
        }
        continue;
      }

      // Check if this is a relation type (another model name) without explicit @relation
      const isModelType = models.some(m => m.name === field.type);
      if (isModelType && !field.relationFields?.length) {
        // Virtual relation field — skip
        continue;
      }

      // Regular scalar field → column
      const colName = field.dbName || field.name;
      const sqlType = resolveFieldType(field, enumNames);
      const isNullable = field.isOptional && !field.isPrimaryKey;

      columns.push({
        name: colName,
        dataType: sqlType,
        isPrimaryKey: field.isPrimaryKey,
        isNullable,
      });
    }

    diagnosticsLog += `  Table "${tableName}": ${columns.length} column(s), ${foreignKeys.length} FK(s)\n`;

    if (columns.length > 0) {
      tables.push({ name: tableName, columns, foreignKeys });
    }
  }

  const totalFKs = tables.reduce((n, t) => n + t.foreignKeys.length, 0);
  diagnosticsLog += `\nTotal: ${tables.length} table(s), ${totalFKs} FK(s)\n`;

  return { tables, diagnostics: diagnosticsLog };
};

/**
 * Parse a single Prisma field line.
 * Format: fieldName Type? @attribute1 @attribute2(...)
 */
function parseField(line: string): PrismaField | null {
  // Match: name Type[?][] @attrs...
  const fieldMatch = /^(\w+)\s+(\w+)(\?)?(\[\])?\s*(.*)$/.exec(line);
  if (!fieldMatch) return null;

  const name = fieldMatch[1];
  const type = fieldMatch[2];
  const isOptional = fieldMatch[3] === '?';
  const isList = fieldMatch[4] === '[]';
  const attrs = fieldMatch[5] || '';

  // Skip if the name looks like a Prisma keyword
  if (['model', 'enum', 'datasource', 'generator'].includes(name)) return null;

  const isPrimaryKey = /@id\b/.test(attrs);
  const isUnique = /@unique\b/.test(attrs);

  // @map("col_name")
  const mapMatch = /@map\s*\(\s*"([^"]+)"\s*\)/.exec(attrs);
  const dbName = mapMatch ? mapMatch[1] : undefined;

  // @default(...)
  const defaultMatch = /@default\s*\(([^)]+)\)/.exec(attrs);
  const defaultValue = defaultMatch ? defaultMatch[1] : undefined;

  // @relation(...)
  let relationName: string | undefined;
  let relationFields: string[] | undefined;
  let relationReferences: string[] | undefined;
  let relationOnDelete: string | undefined;

  const relationMatch = /@relation\s*\(([^)]*(?:\[[^\]]*\])*[^)]*)\)/.exec(attrs);
  if (relationMatch) {
    const relContent = relationMatch[1];

    // relation name (first unnamed string arg or name: "...")
    const nameMatch = /(?:name:\s*)?["']([^"']+)["']/.exec(relContent);
    relationName = nameMatch ? nameMatch[1] : type;

    // fields: [col1, col2]
    const fieldsMatch = /fields:\s*\[([^\]]+)\]/.exec(relContent);
    if (fieldsMatch) {
      relationFields = fieldsMatch[1].split(',').map(f => f.trim());
    }

    // references: [col1, col2]
    const refsMatch = /references:\s*\[([^\]]+)\]/.exec(relContent);
    if (refsMatch) {
      relationReferences = refsMatch[1].split(',').map(r => r.trim());
    }

    // onDelete: Cascade
    const onDeleteMatch = /onDelete:\s*(\w+)/.exec(relContent);
    relationOnDelete = onDeleteMatch ? onDeleteMatch[1] : undefined;
  }

  return {
    name,
    type,
    isOptional,
    isList,
    isPrimaryKey,
    isUnique,
    dbName,
    defaultValue,
    relationName,
    relationFields,
    relationReferences,
    relationOnDelete,
  };
}

/**
 * Resolve a Prisma field type to a SQL type.
 */
function resolveFieldType(field: PrismaField, enumNames: Set<string>): string {
  const t = field.type.toLowerCase();

  // Check if it's a known scalar
  if (prismaToSqlType[t]) return prismaToSqlType[t];

  // Enum → varchar
  if (enumNames.has(field.type)) return 'varchar';

  // Auto-increment detection via @default(autoincrement())
  if (field.defaultValue?.includes('autoincrement')) {
    if (t === 'int') return 'serial';
    if (t === 'bigint') return 'bigserial';
  }

  // UUID detection via @default(uuid())
  if (field.defaultValue?.includes('uuid')) return 'uuid';

  // Fallback: return as-is
  return field.type;
}
