/**
 * Rails schema.rb parser.
 * Handles create_table blocks with complex options (id: :uuid, default: ->, comment:, force: :cascade)
 * and add_foreign_key statements with named constraints.
 */
import type { ParsedSchema, ParsedTable, ParsedColumn, ParsedForeignKey } from './types';

// Map Rails column types to SQL types
const railsToSqlType: Record<string, string> = {
  'string': 'varchar',
  'text': 'text',
  'integer': 'int',
  'bigint': 'bigint',
  'float': 'float',
  'decimal': 'decimal',
  'numeric': 'decimal',
  'datetime': 'timestamp',
  'date': 'date',
  'time': 'time',
  'boolean': 'boolean',
  'binary': 'bytea',
  'json': 'json',
  'jsonb': 'jsonb',
  'uuid': 'uuid',
  'inet': 'inet',
  'cidr': 'cidr',
  'macaddr': 'macaddr',
  'hstore': 'hstore',
  'serial': 'serial',
  'bigserial': 'bigserial',
  'money': 'money',
  'xml': 'xml',
  'point': 'point',
  'line': 'line',
  'polygon': 'polygon',
  'bit': 'bit',
  'interval': 'interval',
  'tsrange': 'tsrange',
  'daterange': 'daterange',
  'int4range': 'int4range',
  'int8range': 'int8range',
  'numrange': 'numrange',
};

/**
 * Simple English singularizer for Rails table name → FK column name conventions.
 * e.g. "users" → "user", "companies" → "company", "addresses" → "address"
 */
function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ses')) return word.slice(0, -2);
  if (word.endsWith('ves')) return word.slice(0, -3) + 'f';
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is')) {
    return word.slice(0, -1);
  }
  return word;
}

export const parseRailsSchema = (schema: string): ParsedSchema => {
  const tables: ParsedTable[] = [];
  let diagnosticsLog = '';

  // Normalize line endings
  const normalizedSchema = schema.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // ──────────────────────────────────────────────────────────────────────
  // PASS 1: Extract create_table blocks
  // ──────────────────────────────────────────────────────────────────────
  // Match: create_table "name", <anything on same line> do |t|
  //   ... body ...
  // end
  // Uses [^\n]*? to skip complex options (id: :uuid, default: -> { ... }, comment: "...", force: :cascade)
  const tableRegex = /create_table\s+["']([^"']+)["']([^\n]*?)\s+do\s+\|(\w+)\|([\s\S]*?)^\s*end/gm;
  const matches = [...normalizedSchema.matchAll(tableRegex)];

  diagnosticsLog += `Found ${matches.length} create_table block(s)\n`;

  for (const match of matches) {
    const tableName = match[1];
    const tableOptions = match[2] || '';
    const blockVar = match[3]; // Usually 't'
    const tableBody = match[4];

    diagnosticsLog += `\n── Table: ${tableName} ──\n`;

    const columns: ParsedColumn[] = [];
    const foreignKeys: ParsedForeignKey[] = [];

    // Detect id settings
    const hasNoPrimaryKey = /id:\s*false/.test(tableOptions);
    const customIdMatch = /id:\s*:(\w+)/.exec(tableOptions);
    const idType = customIdMatch ? (railsToSqlType[customIdMatch[1]] || customIdMatch[1]) : 'bigint';

    // Add implicit id column unless disabled
    if (!hasNoPrimaryKey) {
      columns.push({ name: 'id', dataType: idType, isPrimaryKey: true, isNullable: false });
      diagnosticsLog += `  ✓ id (${idType}, PK)\n`;
    }

    // ── Parse column definitions ──
    // Matches: t.string "name", ... OR t.string :name, ...
    const columnRegex = new RegExp(
      `${blockVar}\\.(\\w+)\\s+(?:["']([^"']+)["']|:(\\w+))([^\\n]*)`, 'g'
    );
    const columnMatches = [...tableBody.matchAll(columnRegex)];

    for (const colMatch of columnMatches) {
      const railsType = colMatch[1];
      const colName = colMatch[2] || colMatch[3]; // String or symbol
      const options = colMatch[4] || '';

      // Handle t.timestamps (adds created_at + updated_at)
      if (railsType === 'timestamps') {
        columns.push({ name: 'created_at', dataType: 'timestamp', isPrimaryKey: false, isNullable: false });
        columns.push({ name: 'updated_at', dataType: 'timestamp', isPrimaryKey: false, isNullable: false });
        diagnosticsLog += `  ✓ created_at (timestamp)\n  ✓ updated_at (timestamp)\n`;
        continue;
      }

      // Skip index-only lines
      if (railsType === 'index') continue;

      const isNullable = !options.includes('null: false');

      // Handle t.references / t.belongs_to (inline FK)
      if (railsType === 'references' || railsType === 'belongs_to') {
        const fkColName = colName.endsWith('_id') ? colName : `${colName}_id`;

        // Detect type: :uuid on the reference
        const refTypeMatch = /type:\s*:(\w+)/.exec(options);
        const refType = refTypeMatch ? (railsToSqlType[refTypeMatch[1]] || refTypeMatch[1]) : idType;

        // Detect foreign_key: { to_table: "xxx" }
        const toTableMatch = /to_table:\s*["':]+([^"'}\s]+)/.exec(options);
        // Default: pluralize the reference name
        const referencedTable = toTableMatch
          ? toTableMatch[1]
          : (colName.endsWith('_id') ? colName.slice(0, -3) : colName) + 's';

        // Check if foreign_key: false to skip FK creation
        const noFK = /foreign_key:\s*false/.test(options);

        columns.push({ name: fkColName, dataType: refType, isPrimaryKey: false, isNullable });

        if (!noFK) {
          foreignKeys.push({ column: fkColName, referencedTable, referencedColumn: 'id' });
          diagnosticsLog += `  ✓ ${fkColName} (${refType}, FK → ${referencedTable}.id)\n`;
        } else {
          diagnosticsLog += `  ✓ ${fkColName} (${refType}, no FK)\n`;
        }
        continue;
      }

      // Regular column
      const sqlType = railsToSqlType[railsType] || railsType;
      columns.push({ name: colName, dataType: sqlType, isPrimaryKey: false, isNullable });
      diagnosticsLog += `  ✓ ${colName} (${sqlType})\n`;
    }

    diagnosticsLog += `  Total: ${columns.length} column(s)\n`;

    if (columns.length > 0) {
      tables.push({ name: tableName, columns, foreignKeys });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // PASS 2: Parse standalone add_foreign_key statements
  // ──────────────────────────────────────────────────────────────────────
  // Matches various forms:
  //   add_foreign_key "tasks", "projects"
  //   add_foreign_key "tasks", "users", column: "assignee_id", name: "fk_tasks_assignee"
  //   add_foreign_key "tasks", "projects", name: "fk_tasks_project"
  //   add_foreign_key "comments", "users", column: :author_id, primary_key: :id
  const fkRegex = /add_foreign_key\s+["']([^"']+)["'],\s*["']([^"']+)["']([^\n]*)/g;
  const fkMatches = [...normalizedSchema.matchAll(fkRegex)];

  diagnosticsLog += `\nFound ${fkMatches.length} add_foreign_key statement(s)\n`;

  for (const fkMatch of fkMatches) {
    const fromTableName = fkMatch[1];
    const toTableName = fkMatch[2];
    const options = fkMatch[3] || '';

    // Extract column: option (string or symbol)
    const columnMatch = /column:\s*["':]+([^"',}\s]+)/.exec(options);
    // Default column name: singularize referenced table name + _id
    const column = columnMatch ? columnMatch[1] : `${singularize(toTableName)}_id`;

    // Extract primary_key: option
    const pkMatch = /primary_key:\s*["':]+([^"',}\s]+)/.exec(options);
    const primaryKey = pkMatch ? pkMatch[1] : 'id';

    const table = tables.find(t => t.name === fromTableName);
    if (table) {
      // Avoid duplicate FKs
      const alreadyExists = table.foreignKeys.some(
        fk => fk.column.toLowerCase() === column.toLowerCase() &&
              fk.referencedTable.toLowerCase() === toTableName.toLowerCase()
      );
      if (!alreadyExists) {
        table.foreignKeys.push({ column, referencedTable: toTableName, referencedColumn: primaryKey });
        diagnosticsLog += `  ✓ FK: ${fromTableName}.${column} → ${toTableName}.${primaryKey}\n`;
      } else {
        diagnosticsLog += `  ○ Skipped duplicate: ${fromTableName}.${column} → ${toTableName}.${primaryKey}\n`;
      }
    } else {
      diagnosticsLog += `  ✗ Table "${fromTableName}" not found for FK\n`;
    }
  }

  diagnosticsLog += `\nTotal: ${tables.length} table(s), ${tables.reduce((n, t) => n + t.foreignKeys.length, 0)} FK(s)\n`;

  return { tables, diagnostics: diagnosticsLog };
};
