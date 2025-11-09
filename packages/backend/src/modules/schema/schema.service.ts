import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { WeaviateService } from '../weaviate/weaviate.service';
import { UploadSchemaDto } from './dto/upload-schema.dto';
import { SyncSchemaDto } from './dto/sync-schema.dto';
import { DatabaseDialect } from '@prisma/client';
import { Parser } from 'node-sql-parser';
import * as pg from 'pg';
import * as mysql from 'mysql2/promise';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeyInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

interface ForeignKeyInfo {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

@Injectable()
export class SchemaService {
  private readonly logger = new Logger(SchemaService.name);
  private readonly parser = new Parser();

  constructor(
    private readonly prisma: PrismaService,
    private readonly weaviateService: WeaviateService,
    @InjectQueue('schema-indexing') private readonly schemaIndexingQueue: Queue,
  ) {}

  async uploadSchema(userId: string, dto: UploadSchemaDto) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Parse the schema
    const tables = await this.parseSchema(dto.schemaText, dto.dialect);

    // Generate schema summary
    const schemaSummary = this.generateSchemaSummary(tables);

    // Store the schema
    const schema = await this.prisma.projectSchema.upsert({
      where: { projectId: dto.projectId },
      create: {
        projectId: dto.projectId,
        schemaText: dto.schemaText,
        schemaSummary,
        tables: tables as any,
        dialect: dto.dialect,
        connectionString: dto.connectionString,
        isAutoDiscovery: false,
        lastSyncedAt: new Date(),
      },
      update: {
        schemaText: dto.schemaText,
        schemaSummary,
        tables: tables as any,
        dialect: dto.dialect,
        connectionString: dto.connectionString,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(`Schema uploaded for project ${dto.projectId}`);

    // Queue schema indexing in Weaviate (async with retries) - fire and forget
    this.queueSchemaIndexing(project.id, project.name, dto.schemaText, schemaSummary).catch(err => {
      this.logger.error(`Failed to queue indexing for project ${dto.projectId}: ${err?.message}`);
    });

    return schema;
  }

  async syncSchema(userId: string, dto: SyncSchemaDto) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // Auto-discover schema from database
    const { schemaText, tables, dialect } = await this.discoverSchema(dto.connectionString);

    // Generate schema summary
    const schemaSummary = this.generateSchemaSummary(tables);

    // Store the schema
    const schema = await this.prisma.projectSchema.upsert({
      where: { projectId: dto.projectId },
      create: {
        projectId: dto.projectId,
        schemaText,
        schemaSummary,
        tables: tables as any,
        dialect,
        connectionString: dto.connectionString,
        isAutoDiscovery: true,
        lastSyncedAt: new Date(),
      },
      update: {
        schemaText,
        schemaSummary,
        tables: tables as any,
        dialect,
        connectionString: dto.connectionString,
        isAutoDiscovery: true,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(`Schema synced for project ${dto.projectId}`);

    // Queue schema indexing in Weaviate (async with retries) - fire and forget
    this.queueSchemaIndexing(project.id, project.name, schemaText, schemaSummary).catch(err => {
      this.logger.error(`Failed to queue indexing for project ${dto.projectId}: ${err?.message}`);
    });

    return schema;
  }

  private async indexSchemaInBackground(projectId: string, projectName: string, schemaText: string, schemaSummary: string) {
    // Fire-and-forget indexing to avoid blocking API responses.
    // Wrap in an immediately-invoked async function so we do not await it here.
    (async () => {
      try {
        await this.weaviateService.indexProjectSchema(projectId, projectName, schemaText, schemaSummary);
        this.logger.log(`Schema indexed in Weaviate for project ${projectId}`);
      } catch (error) {
        this.logger.error(`Failed to index schema in Weaviate for project ${projectId}: ${error?.message || error}`);
        // Silent fail - indexing is optional and should not affect user flow
      }
    })();
  }

  /**
   * Queue schema indexing job in Redis/Bull for background processing with retries
   */
  private async queueSchemaIndexing(
    projectId: string,
    projectName: string,
    schemaText: string,
    schemaSummary: string,
  ): Promise<void> {
    try {
      await this.schemaIndexingQueue.add(
        'index-schema',
        {
          projectId,
          projectName,
          schemaText,
          schemaSummary,
        },
        {
          attempts: 3, // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5s delay, then exponential backoff
          },
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for debugging
        },
      );

      this.logger.log(`Schema indexing job queued for project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to queue schema indexing for project ${projectId}: ${error?.message || error}`);
      // Don't throw - queuing failure should not affect the main flow
    }
  }

  async getSchema(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const schema = await this.prisma.projectSchema.findUnique({
      where: { projectId },
    });

    if (!schema) {
      throw new NotFoundException('Schema not found for this project');
    }

    return schema;
  }

  async deleteSchema(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    await this.prisma.projectSchema.delete({
      where: { projectId },
    });

    this.logger.log(`Schema deleted for project ${projectId}`);
  }

  private async parseSchema(schemaText: string, dialect: DatabaseDialect): Promise<TableInfo[]> {
    try {
      const tables: TableInfo[] = [];

      // Use node-sql-parser to parse the schema
      const dialectMap = {
        POSTGRESQL: 'postgresql',
        MYSQL: 'mysql',
        SQLITE: 'sqlite',
      };

      const ast = this.parser.astify(schemaText, {
        database: dialectMap[dialect as keyof typeof dialectMap] as any,
      });

      // Extract table information from AST
      const statements = Array.isArray(ast) ? ast : [ast];

      for (const statement of statements) {
        if (statement.type === 'create' && statement.keyword === 'table') {
          const tableName = typeof statement.table === 'string' 
            ? statement.table 
            : (statement.table as any)?.[0]?.table || 'unknown';

          const columns: ColumnInfo[] = [];
          const primaryKeys: string[] = [];
          const foreignKeys: ForeignKeyInfo[] = [];

          // Extract columns
          if (statement.create_definitions) {
            for (const def of statement.create_definitions as any[]) {
              if (def.resource === 'column') {
                columns.push({
                  name: def.column?.column || def.column,
                  type: this.formatColumnType(def.definition),
                  nullable: !def.nullable?.value || def.nullable.value !== 'not null',
                  defaultValue: def.default_val?.value?.value,
                });
              }

              // Extract primary keys
              if (def.constraint_type === 'primary key') {
                const pkColumns = Array.isArray(def.definition) 
                  ? def.definition.map((col: any) => col.column)
                  : [];
                primaryKeys.push(...pkColumns);
              }

              // Extract foreign keys
              if (def.constraint_type === 'foreign key') {
                const fkDef = def.definition?.[0];
                const refDef = def.reference_definition;
                if (fkDef && refDef) {
                  foreignKeys.push({
                    columnName: fkDef.column || '',
                    referencedTable: refDef.table?.[0]?.table || refDef.table || '',
                    referencedColumn: refDef.definition?.[0]?.column || '',
                  });
                }
              }
            }
          }

          tables.push({
            name: tableName,
            columns,
            primaryKey: primaryKeys.length > 0 ? primaryKeys : undefined,
            foreignKeys: foreignKeys.length > 0 ? foreignKeys : undefined,
          });
        }
      }

      return tables;
    } catch (error) {
      this.logger.error('Failed to parse schema:', error);
      throw new BadRequestException('Invalid SQL schema format');
    }
  }

  private formatColumnType(definition: any): string {
    if (!definition) return 'unknown';
    if (definition.dataType) {
      const baseType = definition.dataType.toUpperCase();
      if (definition.length) {
        return `${baseType}(${definition.length})`;
      }
      return baseType;
    }
    return 'unknown';
  }

  private async discoverSchema(connectionString: string): Promise<{
    schemaText: string;
    tables: TableInfo[];
    dialect: DatabaseDialect;
  }> {
    const url = new URL(connectionString);
    const protocol = url.protocol.replace(':', '');

    if (protocol === 'postgresql' || protocol === 'postgres') {
      return this.discoverPostgresSchema(connectionString);
    } else if (protocol === 'mysql') {
      return this.discoverMySQLSchema(connectionString);
    } else {
      throw new BadRequestException('Unsupported database dialect');
    }
  }

  private async discoverPostgresSchema(connectionString: string): Promise<{
    schemaText: string;
    tables: TableInfo[];
    dialect: DatabaseDialect;
  }> {
    const client = new pg.Client(connectionString);

    try {
      await client.connect();

      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);

      const tables: TableInfo[] = [];
      let schemaText = '';

      for (const row of tablesResult.rows) {
        const tableName = row.table_name;

        // Get columns
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        const columns: ColumnInfo[] = columnsResult.rows.map((col) => ({
          name: col.column_name,
          type: col.character_maximum_length
            ? `${col.data_type}(${col.character_maximum_length})`
            : col.data_type,
          nullable: col.is_nullable === 'YES',
          defaultValue: col.column_default,
        }));

        // Get primary keys
        const pkResult = await client.query(`
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary
        `, [tableName]);

        const primaryKey = pkResult.rows.map((row) => row.attname);

        tables.push({
          name: tableName,
          columns,
          primaryKey: primaryKey.length > 0 ? primaryKey : undefined,
        });

        // Generate CREATE TABLE statement
        schemaText += `CREATE TABLE ${tableName} (\n`;
        schemaText += columns
          .map((col) => {
            let def = `  ${col.name} ${col.type}`;
            if (!col.nullable) def += ' NOT NULL';
            if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
            return def;
          })
          .join(',\n');
        if (primaryKey.length > 0) {
          schemaText += `,\n  PRIMARY KEY (${primaryKey.join(', ')})`;
        }
        schemaText += '\n);\n\n';
      }

      return {
        schemaText: schemaText.trim(),
        tables,
        dialect: 'POSTGRESQL' as DatabaseDialect,
      };
    } catch (error) {
      this.logger.error('Failed to discover PostgreSQL schema:', error);
      
      // Provide helpful error messages
      if (error.code === '28000' || error.code === '28P01') {
        // Authentication errors
        const message = error.message || '';
        if (message.includes('does not exist')) {
          throw new BadRequestException(
            'Database user does not exist. Please use a valid PostgreSQL username (e.g., "postgres"), not an email address.'
          );
        }
        throw new BadRequestException(
          'Database authentication failed. Please check your username and password. ' +
          'Note: Use your PostgreSQL username (e.g., "postgres"), not an email address.'
        );
      } else if (error.code === 'ECONNREFUSED') {
        throw new BadRequestException(
          'Could not connect to database. Please check that the host and port are correct and the database is running.'
        );
      } else if (error.code === '3D000') {
        throw new BadRequestException('Database does not exist');
      } else if (error.message?.includes('does not exist')) {
        throw new BadRequestException(
          `Database connection failed: ${error.message}. ` +
          'Make sure you\'re using a valid PostgreSQL username (not an email address).'
        );
      }
      
      throw new BadRequestException(
        `Failed to connect to database: ${error.message || 'Unknown error'}`
      );
    } finally {
      await client.end();
    }
  }

  private async discoverMySQLSchema(connectionString: string): Promise<{
    schemaText: string;
    tables: TableInfo[];
    dialect: DatabaseDialect;
  }> {
    const connection = await mysql.createConnection(connectionString);

    try {
      // Get database name from connection string
      const url = new URL(connectionString);
      const dbName = url.pathname.replace('/', '');

      // Get all tables
      const [tablesResult] = await connection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [dbName]);

      const tables: TableInfo[] = [];
      let schemaText = '';

      for (const row of tablesResult as any[]) {
        const tableName = row.table_name || row.TABLE_NAME;

        // Get columns
        const [columnsResult] = await connection.query(`
          SELECT 
            column_name,
            column_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = ? AND table_schema = ?
          ORDER BY ordinal_position
        `, [tableName, dbName]);

        const columns: ColumnInfo[] = (columnsResult as any[]).map((col) => ({
          name: col.column_name || col.COLUMN_NAME,
          type: col.column_type || col.COLUMN_TYPE,
          nullable: (col.is_nullable || col.IS_NULLABLE) === 'YES',
          defaultValue: col.column_default || col.COLUMN_DEFAULT,
        }));

        tables.push({
          name: tableName,
          columns,
        });

        // Generate CREATE TABLE statement
        schemaText += `CREATE TABLE ${tableName} (\n`;
        schemaText += columns
          .map((col) => {
            let def = `  ${col.name} ${col.type}`;
            if (!col.nullable) def += ' NOT NULL';
            if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
            return def;
          })
          .join(',\n');
        schemaText += '\n);\n\n';
      }

      return {
        schemaText: schemaText.trim(),
        tables,
        dialect: 'MYSQL' as DatabaseDialect,
      };
    } catch (error) {
      this.logger.error('Failed to discover MySQL schema:', error);
      
      // Provide helpful error messages
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new BadRequestException(
          'Database authentication failed. Please check your username and password. ' +
          'Note: Use your MySQL username (e.g., "root"), not an email address.'
        );
      } else if (error.code === 'ECONNREFUSED') {
        throw new BadRequestException(
          'Could not connect to database. Please check that the host and port are correct and the database is running.'
        );
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        throw new BadRequestException('Database does not exist');
      }
      
      throw new BadRequestException(
        `Failed to connect to database: ${error.message || 'Unknown error'}`
      );
    } finally {
      await connection.end();
    }
  }

  private generateSchemaSummary(tables: TableInfo[]): string {
    const summary: string[] = [];

    summary.push(`Database contains ${tables.length} table(s):\n`);

    for (const table of tables) {
      summary.push(`\n### ${table.name}`);
      summary.push(`Columns: ${table.columns.length}`);

      for (const col of table.columns) {
        const nullable = col.nullable ? 'NULL' : 'NOT NULL';
        summary.push(`  - ${col.name}: ${col.type} ${nullable}`);
      }

      if (table.primaryKey && table.primaryKey.length > 0) {
        summary.push(`Primary Key: ${table.primaryKey.join(', ')}`);
      }

      if (table.foreignKeys && table.foreignKeys.length > 0) {
        summary.push('Foreign Keys:');
        for (const fk of table.foreignKeys) {
          summary.push(`  - ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}`);
        }
      }
    }

    return summary.join('\n');
  }
}
