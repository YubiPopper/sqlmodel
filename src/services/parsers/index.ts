/**
 * Main parser entry point.
 * Dynamically imports the appropriate parser based on format.
 */
import type { ParsedSchema, SupportedFormat } from './types';

export type { ParsedSchema, ParsedTable, ParsedColumn, ParsedForeignKey, SupportedFormat } from './types';
export { importParsedSchema } from './importSchema';

export async function parse(content: string, format: SupportedFormat): Promise<ParsedSchema> {
  switch (format) {
    case 'rails': {
      const { parseRailsSchema } = await import('./railsParser');
      return parseRailsSchema(content);
    }
    case 'postgres': {
      const { parsePostgresqlDDL } = await import('./postgresParser');
      return parsePostgresqlDDL(content);
    }
    case 'prisma': {
      const { parsePrismaSchema } = await import('./prismaParser');
      return parsePrismaSchema(content);
    }
    case 'snowflake': {
      const { parseSnowflakeDDL } = await import('./snowflakeDDLParser');
      return parseSnowflakeDDL(content);
    }
    case 'mysql': {
      const { parseMySQLDDL } = await import('./mysqlParser');
      return parseMySQLDDL(content);
    }
    case 'oracle': {
      const { parseOracleDDL } = await import('./oracleParser');
      return parseOracleDDL(content);
    }
    default:
      return { tables: [], diagnostics: `Unknown format: ${format}` };
  }
}
