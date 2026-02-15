export interface ParsedColumn {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
}

export interface ParsedForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface ParsedTable {
  name: string;
  database?: string;
  schema?: string;
  columns: ParsedColumn[];
  foreignKeys: ParsedForeignKey[];
}

export const parseSnowflakeDDL = (ddl: string): { tables: ParsedTable[], diagnostics: string } => {
  const tables: ParsedTable[] = [];
  let diagnosticsLog = '';
  
  // Normalize line endings and remove extra whitespace
  const normalizedDDL = ddl.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Find CREATE TABLE statements with a simpler approach
  const tableRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRANSIENT\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)\s*\(/gi;
  const matches = [...normalizedDDL.matchAll(tableRegex)];
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const fullTableName = match[1];
    
    // Parse fully qualified name: DATABASE.SCHEMA.TABLE or SCHEMA.TABLE or TABLE
    const nameParts = fullTableName.split('.');
    let tableName: string;
    let schemaName: string | undefined;
    let databaseName: string | undefined;
    
    if (nameParts.length === 3) {
      // DATABASE.SCHEMA.TABLE
      databaseName = nameParts[0];
      schemaName = nameParts[1];
      tableName = nameParts[2];
    } else if (nameParts.length === 2) {
      // SCHEMA.TABLE (or DATABASE.TABLE, but typically SCHEMA.TABLE)
      schemaName = nameParts[0];
      tableName = nameParts[1];
    } else {
      // Just TABLE
      tableName = nameParts[0];
    }
    
    // Find the table body between ( and );
    const startIdx = match.index! + match[0].length;
    let endIdx = normalizedDDL.indexOf(');', startIdx);
    
    if (endIdx === -1) continue;
    
    const tableBody = normalizedDDL.substring(startIdx, endIdx).trim();
    
    const columns: ParsedColumn[] = [];
    const foreignKeys: ParsedForeignKey[] = [];
    const primaryKeyColumns = new Set<string>();
    
    // Extract primary key constraint
    const pkMatch = tableBody.match(/(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) {
      const pkCols = pkMatch[1].split(',').map(c => c.trim().toLowerCase());
      pkCols.forEach(col => primaryKeyColumns.add(col));
    }
    
    // Extract foreign key constraints
    const fkMatches = [...tableBody.matchAll(/(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/gi)];
    for (const fkMatch of fkMatches) {
      foreignKeys.push({
        column: fkMatch[1].trim(),
        referencedTable: fkMatch[2].split('.').pop() || fkMatch[2],
        referencedColumn: fkMatch[3].trim(),
      });
    }
    
    // Parse columns - split by line breaks
    const lines = tableBody.split('\n').map(l => l.trim()).filter(l => l);
    
    diagnosticsLog += `\n=== Table: ${tableName} ===\n`;
    diagnosticsLog += `Table body length: ${tableBody.length}\n`;
    diagnosticsLog += `Lines found: ${lines.length}\n`;
    
    for (const line of lines) {
      // Remove trailing comma
      const cleanLine = line.replace(/,$/, '').trim();
      
      diagnosticsLog += `\nLine: "${cleanLine}"\n`;
      
      // Skip constraints
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|CONSTRAINT|UNIQUE|CHECK)/i.test(cleanLine)) {
        diagnosticsLog += '  -> Skipped (constraint)\n';
        continue;
      }
      
      // Parse: COLUMN_NAME TYPE [constraints]
      // Split by whitespace to get column name and type
      const parts = cleanLine.split(/\s+/);
      diagnosticsLog += `  -> Parts: [${parts.join(', ')}]\n`;
      
      if (parts.length < 2) {
        diagnosticsLog += '  -> Skipped (too few parts)\n';
        continue;
      }
      
      const colName = parts[0];
      const dataType = parts[1];
      const rest = cleanLine.substring(colName.length + dataType.length).toLowerCase();
      
      const isNullable = !rest.includes('not null');
      const isPrimaryKey = primaryKeyColumns.has(colName.toLowerCase());
      
      diagnosticsLog += `  -> ✓ Column: ${colName}, Type: ${dataType}\n`;
      
      columns.push({
        name: colName,
        dataType,
        isPrimaryKey,
        isNullable,
      });
    }
    
    diagnosticsLog += `\nTotal columns: ${columns.length}\n`;
    
    if (columns.length > 0) {
      tables.push({
        name: tableName,
        database: databaseName,
        schema: schemaName,
        columns,
        foreignKeys,
      });
    }
  }
  
  return { tables, diagnostics: diagnosticsLog };
};
