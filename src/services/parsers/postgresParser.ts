/**
 * PostgreSQL DDL parser.
 * Handles CREATE TABLE, ALTER TABLE ADD CONSTRAINT, inline REFERENCES,
 * PRIMARY KEY, FOREIGN KEY constraints, and COMMENT ON statements.
 */
import type { ParsedSchema, ParsedTable, ParsedColumn, ParsedForeignKey } from './types';

// Common PostgreSQL type aliases → canonical form
const normalizeType = (raw: string): string => {
  const t = raw.trim().toLowerCase();
  // Strip precision/length: varchar(255) → varchar, numeric(10,2) → numeric
  const base = t.replace(/\(.*\)/, '').trim();
  const map: Record<string, string> = {
    'character varying': 'varchar',
    'character': 'char',
    'double precision': 'float8',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    'time without time zone': 'time',
    'time with time zone': 'timetz',
    'int4': 'int',
    'int8': 'bigint',
    'int2': 'smallint',
    'float4': 'real',
    'float8': 'float',
    'bool': 'boolean',
    'bytea': 'bytea',
  };
  return map[base] || t; // Return full type with precision if no mapping
};

export const parsePostgresqlDDL = (ddl: string): ParsedSchema => {
  const tablesMap = new Map<string, ParsedTable>();
  let diagnosticsLog = '';

  // Normalize line endings, strip comments
  let normalizedDDL = ddl
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/--[^\n]*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

  // ──────────────────────────────────────────────────────────────────────
  // PASS 1: Extract CREATE TABLE statements
  // ──────────────────────────────────────────────────────────────────────
  // Matches: CREATE TABLE [IF NOT EXISTS] [schema.]table_name ( ... );
  const createTableRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(([\s\S]*?)\)\s*;/gi;

  const tableMatches = [...normalizedDDL.matchAll(createTableRegex)];
  diagnosticsLog += `Found ${tableMatches.length} CREATE TABLE statement(s)\n`;

  for (const match of tableMatches) {
    const schemaName = match[1] || undefined;
    const tableName = match[2];
    const body = match[3];

    diagnosticsLog += `\n── Table: ${schemaName ? schemaName + '.' : ''}${tableName} ──\n`;

    const columns: ParsedColumn[] = [];
    const foreignKeys: ParsedForeignKey[] = [];

    // Split body by commas, but respect parentheses nesting
    const parts = splitByComma(body);

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // ── Table-level PRIMARY KEY ──
      const pkMatch = /^\s*(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(trimmed);
      if (pkMatch) {
        const pkCols = pkMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
        for (const col of columns) {
          if (pkCols.some(pk => pk.toLowerCase() === col.name.toLowerCase())) {
            col.isPrimaryKey = true;
          }
        }
        diagnosticsLog += `  ✓ PRIMARY KEY(${pkCols.join(', ')})\n`;
        continue;
      }

      // ── Table-level FOREIGN KEY ──
      const fkMatch = /^\s*(?:CONSTRAINT\s+"?(\w+)"?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+"?(?:(\w+)\.)?"?(\w+)"?\s*\(([^)]+)\)/i.exec(trimmed);
      if (fkMatch) {
        const fkCols = fkMatch[2].split(',').map(c => c.trim().replace(/"/g, ''));
        const refTable = fkMatch[4];
        const refCols = fkMatch[5].split(',').map(c => c.trim().replace(/"/g, ''));
        for (let i = 0; i < fkCols.length; i++) {
          foreignKeys.push({
            column: fkCols[i],
            referencedTable: refTable,
            referencedColumn: refCols[i] || 'id',
          });
          diagnosticsLog += `  ✓ FK: ${fkCols[i]} → ${refTable}.${refCols[i] || 'id'}\n`;
        }
        continue;
      }

      // ── UNIQUE / CHECK constraints (skip) ──
      if (/^\s*(?:CONSTRAINT\s+\w+\s+)?(?:UNIQUE|CHECK)\s*/i.test(trimmed)) {
        continue;
      }

      // ── Column definition ──
      // Match: "col_name" type [options...] or col_name type [options...]
      const colMatch = /^\s*"?(\w+)"?\s+(.+)$/i.exec(trimmed);
      if (!colMatch) continue;

      const colName = colMatch[1];
      const rest = colMatch[2];

      // Skip if this looks like a keyword, not a column name
      if (/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|EXCLUDE)$/i.test(colName)) continue;

      // Extract type — everything before the first option keyword or REFERENCES
      const typeMatch = /^([\w\s]+(?:\([^)]*\))?)\s*/i.exec(rest);
      if (!typeMatch) continue;

      const rawType = typeMatch[1].trim();
      const dataType = normalizeType(rawType);
      const optionsPart = rest.slice(typeMatch[0].length);

      const isPrimaryKey = /PRIMARY\s+KEY/i.test(optionsPart);
      const isNotNull = /NOT\s+NULL/i.test(optionsPart);
      const isNullable = !isPrimaryKey && !isNotNull;

      columns.push({ name: colName, dataType, isPrimaryKey, isNullable });
      diagnosticsLog += `  ✓ ${colName} (${dataType}${isPrimaryKey ? ', PK' : ''}${isNotNull ? ', NOT NULL' : ''})\n`;

      // ── Inline REFERENCES on column ──
      const inlineRefMatch = /REFERENCES\s+"?(?:(\w+)\.)?"?(\w+)"?\s*\(\s*"?(\w+)"?\s*\)/i.exec(optionsPart);
      if (inlineRefMatch) {
        const refTable = inlineRefMatch[2];
        const refCol = inlineRefMatch[3];
        foreignKeys.push({ column: colName, referencedTable: refTable, referencedColumn: refCol });
        diagnosticsLog += `    → FK: ${colName} → ${refTable}.${refCol}\n`;
      }
    }

    diagnosticsLog += `  Total: ${columns.length} column(s), ${foreignKeys.length} FK(s)\n`;

    if (columns.length > 0) {
      const key = tableName.toLowerCase();
      tablesMap.set(key, { name: tableName, schema: schemaName, columns, foreignKeys });
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // PASS 2: ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
  // ──────────────────────────────────────────────────────────────────────
  const alterFKRegex = /ALTER\s+(?:TABLE\s+)?(?:ONLY\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ADD\s+CONSTRAINT\s+"?(\w+)"?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+"?(?:(\w+)\.)?"?(\w+)"?\s*\(([^)]+)\)/gi;

  const alterMatches = [...normalizedDDL.matchAll(alterFKRegex)];
  diagnosticsLog += `\nFound ${alterMatches.length} ALTER TABLE ... FOREIGN KEY statement(s)\n`;

  for (const m of alterMatches) {
    const fromTable = m[2];
    const fkCols = m[4].split(',').map(c => c.trim().replace(/"/g, ''));
    const refTable = m[6];
    const refCols = m[7].split(',').map(c => c.trim().replace(/"/g, ''));

    const table = tablesMap.get(fromTable.toLowerCase());
    if (table) {
      for (let i = 0; i < fkCols.length; i++) {
        const exists = table.foreignKeys.some(
          fk => fk.column.toLowerCase() === fkCols[i].toLowerCase() &&
                fk.referencedTable.toLowerCase() === refTable.toLowerCase()
        );
        if (!exists) {
          table.foreignKeys.push({
            column: fkCols[i],
            referencedTable: refTable,
            referencedColumn: refCols[i] || 'id',
          });
          diagnosticsLog += `  ✓ FK: ${fromTable}.${fkCols[i]} → ${refTable}.${refCols[i] || 'id'}\n`;
        }
      }
    } else {
      diagnosticsLog += `  ✗ Table "${fromTable}" not found for ALTER TABLE FK\n`;
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // PASS 3: ALTER TABLE ... ADD PRIMARY KEY
  // ──────────────────────────────────────────────────────────────────────
  const alterPKRegex = /ALTER\s+(?:TABLE\s+)?(?:ONLY\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ADD\s+CONSTRAINT\s+"?\w+"?\s+PRIMARY\s+KEY\s*\(([^)]+)\)/gi;

  const alterPKMatches = [...normalizedDDL.matchAll(alterPKRegex)];
  for (const m of alterPKMatches) {
    const tblName = m[2];
    const pkCols = m[3].split(',').map(c => c.trim().replace(/"/g, ''));
    const table = tablesMap.get(tblName.toLowerCase());
    if (table) {
      for (const col of table.columns) {
        if (pkCols.some(pk => pk.toLowerCase() === col.name.toLowerCase())) {
          col.isPrimaryKey = true;
        }
      }
    }
  }

  const tables = [...tablesMap.values()];
  const totalFKs = tables.reduce((n, t) => n + t.foreignKeys.length, 0);
  diagnosticsLog += `\nTotal: ${tables.length} table(s), ${totalFKs} FK(s)\n`;

  return { tables, diagnostics: diagnosticsLog };
};

/**
 * Split a SQL body string by top-level commas, respecting nested parentheses.
 */
function splitByComma(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const ch of body) {
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}
