/**
 * MySQL DDL parser.
 * Handles CREATE TABLE with inline CONSTRAINT, PRIMARY KEY, FOREIGN KEY, etc.
 */
import type { ParsedSchema, ParsedTable, ParsedColumn, ParsedForeignKey } from './types';

// Normalize MySQL types to canonical form
const normalizeType = (raw: string): string => {
  const t = raw.trim().toLowerCase();
  const base = t.replace(/\(.*\)/, '').trim();
  const map: Record<string, string> = {
    'int': 'int',
    'integer': 'int',
    'tinyint': 'tinyint',
    'smallint': 'smallint',
    'mediumint': 'mediumint',
    'bigint': 'bigint',
    'decimal': 'decimal',
    'numeric': 'decimal',
    'float': 'float',
    'double': 'double',
    'real': 'double',
    'bit': 'bit',
    'boolean': 'tinyint',
    'bool': 'tinyint',
    'char': 'char',
    'varchar': 'varchar',
    'binary': 'binary',
    'varbinary': 'varbinary',
    'tinyblob': 'tinyblob',
    'blob': 'blob',
    'mediumblob': 'mediumblob',
    'longblob': 'longblob',
    'tinytext': 'tinytext',
    'text': 'text',
    'mediumtext': 'mediumtext',
    'longtext': 'longtext',
    'enum': 'enum',
    'set': 'set',
    'date': 'date',
    'datetime': 'datetime',
    'timestamp': 'timestamp',
    'time': 'time',
    'year': 'year',
    'json': 'json',
  };
  return map[base] || t;
};

export const parseMySQLDDL = (ddl: string): ParsedSchema => {
  const tablesMap = new Map<string, ParsedTable>();
  let diagnosticsLog = '';

  // Normalize line endings, strip comments
  let normalizedDDL = ddl
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/--[^\n]*/g, '') // Single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
    .replace(/#[^\n]*/g, ''); // MySQL # comments

  // CREATE TABLE regex (supports backticks and quoted identifiers)
  const createTableRegex = /CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([\s\S]*?)\)(?:\s*ENGINE\s*=\s*\w+)?(?:\s*DEFAULT\s+CHARSET\s*=\s*\w+)?(?:\s*COLLATE\s*=\s*\w+)?;/gi;

  const tableMatches = [...normalizedDDL.matchAll(createTableRegex)];
  diagnosticsLog += `Found ${tableMatches.length} CREATE TABLE statement(s)\n`;

  for (const match of tableMatches) {
    const [, schemaName, tableName, bodyRaw] = match;
    const finalTableName = tableName.trim();
    const finalSchemaName = schemaName?.trim();
    diagnosticsLog += `\nProcessing table: ${finalSchemaName ? finalSchemaName + '.' : ''}${finalTableName}\n`;

    const columns: ParsedColumn[] = [];
    const fks: ParsedForeignKey[] = [];
    let pkColumns: string[] = [];

    // Split body by commas (handle nested parentheses for ENUM/SET)
    const bodyLines: string[] = [];
    let depth = 0;
    let currentLine = '';
    for (let i = 0; i < bodyRaw.length; i++) {
      const char = bodyRaw[i];
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (char === ',' && depth === 0) {
        bodyLines.push(currentLine.trim());
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) bodyLines.push(currentLine.trim());

    for (const line of bodyLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // PRIMARY KEY constraint
      if (/^PRIMARY\s+KEY/i.test(trimmed)) {
        const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          pkColumns = pkMatch[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
          diagnosticsLog += `  Found PRIMARY KEY: ${pkColumns.join(', ')}\n`;
        }
        continue;
      }

      // FOREIGN KEY constraint
      if (/^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY/i.test(trimmed)) {
        const fkMatch = trimmed.match(
          /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([^)]+)\)/i
        );
        if (fkMatch) {
          const [, fromCols, , refTable, toCols] = fkMatch;
          const fromColsArray = fromCols.split(',').map(c => c.trim().replace(/[`"]/g, ''));
          const toColsArray = toCols.split(',').map(c => c.trim().replace(/[`"]/g, ''));
          for (let i = 0; i < fromColsArray.length; i++) {
            fks.push({
              column: fromColsArray[i],
              referencedTable: refTable.trim(),
              referencedColumn: toColsArray[i] || toColsArray[0],
            });
            diagnosticsLog += `  Found FK: ${fromColsArray[i]} -> ${refTable}.${toColsArray[i]}\n`;
          }
        }
        continue;
      }

      // Column definition
      const colMatch = trimmed.match(/^`?(\w+)`?\s+([\w()]+(?:\s+UNSIGNED)?(?:\s+ZEROFILL)?)/i);
      if (colMatch) {
        const [, colName, colType] = colMatch;
        const columnName = colName.trim();
        const dataType = normalizeType(colType.trim());
        const notNull = /NOT\s+NULL/i.test(trimmed);
        const isPK = pkColumns.includes(columnName) || /PRIMARY\s+KEY/i.test(trimmed);

        columns.push({
          name: columnName,
          dataType: dataType,
          isNullable: !notNull && !isPK,
          isPrimaryKey: isPK,
        });
        diagnosticsLog += `  Column: ${columnName} ${dataType}${isPK ? ' (PK)' : ''}${notNull ? ' NOT NULL' : ''}\n`;
      }
    }

    // Mark PK columns
    for (const pkCol of pkColumns) {
      const col = columns.find(c => c.name === pkCol);
      if (col) col.isPrimaryKey = true;
    }

    tablesMap.set(finalTableName, {
      name: finalTableName,
      schema: finalSchemaName,
      columns,
      foreignKeys: fks,
    });
  }

  const tables = Array.from(tablesMap.values());
  return { tables, diagnostics: diagnosticsLog };
};
