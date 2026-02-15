import type { ImportFormatConfig } from './ImportDialog';
import { parseRailsSchema } from '../../services/parsers/railsParser';
import { parsePostgresqlDDL } from '../../services/parsers/postgresParser';
import { parsePrismaSchema } from '../../services/parsers/prismaParser';
import { parseSnowflakeDDL } from '../../services/parsers/snowflakeDDLParser';

export const railsConfig: ImportFormatConfig = {
  id: 'rails',
  formatName: 'Rails Schema',
  placeholder: 'Paste your Rails schema.rb content here...',
  fileAccept: '.rb',
  parseFunction: parseRailsSchema,
  instructions: {
    description: (
      <div style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.6' }}>
        <p style={{ margin: '0 0 12px 0' }}>
          To export your Rails schema, run the following command in your Rails project directory:
        </p>
        <p style={{ margin: '12px 0', fontSize: '12px', color: '#6b7280' }}>
          This will generate (or update) your <code>db/schema.rb</code> file, which you can then paste here or upload using the button above.
        </p>
      </div>
    ),
    codeBlocks: [
      {
        id: 'rails-export',
        title: 'Export Rails Schema',
        code: 'bundle exec rails db:schema:dump',
      },
    ],
  },
};

export const snowflakeConfig: ImportFormatConfig = {
  id: 'snowflake',
  formatName: 'Snowflake',
  placeholder: 'Paste your Snowflake DDL here...',
  fileAccept: '.sql',
  parseFunction: parseSnowflakeDDL,
  instructions: {
    description: (
      <div style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.6' }}>
        <p style={{ margin: '0 0 12px 0' }}>
          To export DDL from Snowflake, use the <code>GET_DDL</code> function in a SQL worksheet. You can export at the database or schema level.
        </p>
      </div>
    ),
    codeBlocks: [
      {
        id: 'snowflake-database',
        title: 'Database-Level DDL',
        code: `SELECT GET_DDL('database', '<DATABASE_NAME>', true);`,
      },
      {
        id: 'snowflake-schema',
        title: 'Schema-Level DDL',
        code: `SELECT GET_DDL('schema', '<DATABASE_NAME>.<SCHEMA_NAME>', true);`,
      },
    ],
  },
};

export const postgresConfig: ImportFormatConfig = {
  id: 'postgres',
  formatName: 'Postgres',
  placeholder: 'Paste your PostgreSQL DDL here...',
  fileAccept: '.sql',
  parseFunction: parsePostgresqlDDL,
  instructions: {
    description: (
      <div style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.6' }}>
        <p style={{ margin: '0 0 12px 0' }}>
          To export your PostgreSQL schema, use <code>pg_dump</code> with the <code>--schema-only</code> flag:
        </p>
        <p style={{ margin: '12px 0', fontSize: '12px', color: '#6b7280' }}>
          Replace <code>&lt;database_name&gt;</code> with your actual database name. This will export just the table definitions, indexes, and constraints without the data.
        </p>
        <p style={{ margin: '12px 0', fontSize: '12px', color: '#6b7280' }}>
          You can also export a specific schema by adding <code>--schema=&lt;schema_name&gt;</code> to the command.
        </p>
      </div>
    ),
    codeBlocks: [
      {
        id: 'postgres-export',
        title: 'Export PostgreSQL Schema',
        code: 'pg_dump --schema-only <database_name> > schema.sql',
      },
      {
        id: 'postgres-schema',
        title: 'Export Specific Schema',
        code: 'pg_dump --schema-only --schema=<schema_name> <database_name> > schema.sql',
      },
    ],
  },
};

export const prismaConfig: ImportFormatConfig = {
  id: 'prisma',
  formatName: 'Prisma Schema',
  placeholder: 'Paste your Prisma schema.prisma content here...',
  fileAccept: '.prisma',
  parseFunction: parsePrismaSchema,
  instructions: {
    description: (
      <div style={{ fontSize: '13px', color: '#8b949e', lineHeight: '1.6' }}>
        <p style={{ margin: '0 0 12px 0' }}>
          Your Prisma schema file is typically located at <code>prisma/schema.prisma</code> in your project directory.
        </p>
        <p style={{ margin: '12px 0', fontSize: '12px', color: '#6b7280' }}>
          Copy the entire contents of your <code>schema.prisma</code> file and paste it here, or use the upload button above.
        </p>
        <p style={{ margin: '12px 0', fontSize: '12px', color: '#6b7280' }}>
          The parser will extract all models and their relationships from your schema.
        </p>
      </div>
    ),
    codeBlocks: [
      {
        id: 'prisma-location',
        title: 'Default Prisma Schema Location',
        code: 'prisma/schema.prisma',
      },
    ],
  },
};
