/**
 * Oracle DDL parser.
 * Handles CREATE TABLE with inline and ALTER TABLE CONSTRAINT statements.
 */
import type { ParsedSchema, ParsedTable, ParsedColumn, ParsedForeignKey } from './types';

// Normalize Oracle types to canonical form
const normalizeType = (raw: string): string => {
  const t = raw.trim().toLowerCase();
  const base = t.replace(/\(.*\)/, '').trim();
  const map: Record<string, string> = {
    'number': 'number',
    'integer': 'number',
    'int': 'number',
    'smallint': 'number',
    'float': 'float',
    'binary_float': 'binary_float',
    'binary_double': 'binary_double',
    'varchar2': 'varchar2',
    'varchar': 'varchar2',
    'char': 'char',
    'nchar': 'nchar',
    'nvarchar2': 'nvarchar2',
    'clob': 'clob',
    'nclob': 'nclob',
    'blob': 'blob',
    'bfile': 'bfile',
    'long': 'long',
    'long raw': 'long raw',
    'raw': 'raw',
    'date': 'date',
    'timestamp': 'timestamp',
    'timestamp with time zone': 'timestamp with time zone',
    'timestamp with local time zone': 'timestamp with local time zone',
    'interval year to month': 'interval year to month',
    'interval day to second': 'interval day to second',
    'rowid': 'rowid',
    'urowid': 'urowid',
  };
  return map[base] || t;
};

export const parseOracleDDL = (ddl: string): ParsedSchema => {
  const tablesMap = new Map<string, ParsedTable>();
  let diagnosticsLog = '';

  // Normalize line endings, strip comments
  let normalizedDDL = ddl
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/--[^\n]*/g, '') // Single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Block comments

  // CREATE TABLE regex (supports double quotes for identifiers)
  const createTableRegex = /CREATE\s+(?:GLOBAL\s+TEMPORARY\s+)?TABLE\s+(?:"?(\w+)"?\.)?("?\w+"?)\s*\(([\s\S]*?)\)(?:\s*(?:TABLESPACE|STORAGE|ORGANIZATION|PARTITION|ENABLE|DISABLE|AS|SELECT)[\s\S]*?)?;/gi;

  const tableMatches = [...normalizedDDL.matchAll(createTableRegex)];
  diagnosticsLog += `Found ${tableMatches.length} CREATE TABLE statement(s)\n`;

  for (const match of tableMatches) {
    const [, schemaName, tableName, bodyRaw] = match;
    const finalTableName = tableName.trim().replace(/"/g, '');
    const finalSchemaName = schemaName?.trim().replace(/"/g, '');
    diagnosticsLog += `\nProcessing table: ${finalSchemaName ? finalSchemaName + '.' : ''}${finalTableName}\n`;

    const columns: ParsedColumn[] = [];
    const fks: ParsedForeignKey[] = [];
    let pkColumns: string[] = [];

    // Split body by commas (handle nested parentheses)
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
      if (/^(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY/i.test(trimmed)) {
        const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pkMatch) {
          pkColumns = pkMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
          diagnosticsLog += `  Found PRIMARY KEY: ${pkColumns.join(', ')}\n`;
        }
        continue;
      }

      // FOREIGN KEY constraint
      if (/^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY/i.test(trimmed)) {
        const fkMatch = trimmed.match(
          /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:"?(\w+)"?\.)?("?\w+"?)\s*\(([^)]+)\)/i
        );
        if (fkMatch) {
          const [, fromCols, , refTable, toCols] = fkMatch;
          const fromColsArray = fromCols.split(',').map(c => c.trim().replace(/"/g, ''));
          const toColsArray = toCols.split(',').map(c => c.trim().replace(/"/g, ''));
          for (let i = 0; i < fromColsArray.length; i++) {
            fks.push({
              column: fromColsArray[i],
              referencedTable: refTable.trim().replace(/"/g, ''),
              referencedColumn: toColsArray[i] || toColsArray[0],
            });
            diagnosticsLog += `  Found FK: ${fromColsArray[i]} -> ${refTable}.${toColsArray[i]}\n`;
          }
        }
        continue;
      }

      // Column definition
      const colMatch = trimmed.match(/^"?(\w+)"?\s+([\w\s()]+?)(?:\s+(?:DEFAULT|NOT\s+NULL|NULL|PRIMARY|REFERENCES|CONSTRAINT|ENABLE|DISABLE))?/i);
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

  // Parse ALTER TABLE ADD CONSTRAINT statements for FKs
  const alterTableRegex = /ALTER\s+TABLE\s+(?:"?(\w+)"?\.)?("?\w+"?)\s+ADD\s+(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:"?(\w+)"?\.)?("?\w+"?)\s*\(([^)]+)\)/gi;
  const alterMatches = [...normalizedDDL.matchAll(alterTableRegex)];

  for (const match of alterMatches) {
    const [, , tableName, fromCols, , refTable, toCols] = match;
    const finalTableName = tableName.trim().replace(/"/g, '');
    const table = tablesMap.get(finalTableName);
    if (!table) continue;

    const fromColsArray = fromCols.split(',').map(c => c.trim().replace(/"/g, ''));
    const toColsArray = toCols.split(',').map(c => c.trim().replace(/"/g, ''));
    for (let i = 0; i < fromColsArray.length; i++) {
      table.foreignKeys.push({
        column: fromColsArray[i],
        referencedTable: refTable.trim().replace(/"/g, ''),
        referencedColumn: toColsArray[i] || toColsArray[0],
      });
      diagnosticsLog += `  ALTER TABLE FK: ${fromColsArray[i]} -> ${refTable}.${toColsArray[i]}\n`;
    }
  }

  const tables = Array.from(tablesMap.values());
  return { tables, diagnostics: diagnosticsLog };
};
