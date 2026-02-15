/**
 * Shared types for all schema parsers.
 * Each parser (Rails, PostgreSQL, Prisma, Snowflake) produces a ParsedSchema
 * which gets converted to the store model by importParsedSchema().
 */

export interface ParsedColumn {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
}

export interface ParsedForeignKey {
  /** Column name in the source (child) table */
  column: string;
  /** Name of the referenced (parent) table */
  referencedTable: string;
  /** Column name in the referenced table (usually 'id') */
  referencedColumn: string;
}

export interface ParsedTable {
  name: string;
  database?: string;
  schema?: string;
  columns: ParsedColumn[];
  foreignKeys: ParsedForeignKey[];
}

export interface ParsedSchema {
  tables: ParsedTable[];
  diagnostics: string;
}

export type SupportedFormat = 'rails' | 'postgres' | 'prisma' | 'snowflake';
