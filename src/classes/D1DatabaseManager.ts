import {
    D1Config,
    Migration,
    TableSchema,
    QueryResult,
    DatabaseInfo,
    D1Response,
    ColumnInfo,
    IndexInfo,
    ConstraintInfo
} from '../types/database.js';

export class D1DatabaseManager {
    private config: D1Config;
    private baseUrl: string;

    constructor(config: D1Config) {
        this.config = config;
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}`;
    }

    /**
     * Execute a raw SQL query
     */
    async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        try {
            const response = await this.makeRequest('/query', {
                method: 'POST',
                body: JSON.stringify({
                    sql,
                    params
                })
            });

            if (!response.success) {
                throw new Error(response.errors?.[0]?.message || 'Query failed');
            }

            // The actual results are in result[0] for D1 API
            const queryResult = response.result[0];

            return {
                results: queryResult?.results || [],
                success: queryResult?.success || true,
                meta: queryResult?.meta || {}
            };
        } catch (error) {
            return {
                results: [],
                success: false,
                meta: {},
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Execute multiple SQL statements in a batch
     */
    async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<QueryResult[]> {
        try {
            const response = await this.makeRequest('/batch', {
                method: 'POST',
                body: JSON.stringify(statements)
            });

            if (!response.success) {
                throw new Error(response.errors?.[0]?.message || 'Batch query failed');
            }

            // For batch requests, result is an array of query results
            return response.result.map((result: any) => ({
                results: result.results || [],
                success: result.success,
                meta: result.meta || {},
                error: result.error
            }));
        } catch (error) {
            throw new Error(`Batch execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get database information
     */
    async getDatabaseInfo(): Promise<DatabaseInfo> {
        try {
            const response = await this.makeRequest('', {
                method: 'GET'
            });

            if (!response.success) {
                throw new Error(response.errors?.[0]?.message || 'Failed to get database info');
            }

            const tables = await this.listTables();

            return {
                name: response.result.name || this.config.databaseName,
                size: response.result.file_size || 0,
                tables: tables.map(t => t.name),
                version: response.result.version || 'unknown',
                created_at: response.result.created_at || new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to get database info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List all tables in the database
     */
    async listTables(): Promise<Array<{ name: string; type: string }>> {
        const result = await this.query<{ name: string; type: string }>(
            "SELECT name, type FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );

        if (!result.success) {
            throw new Error(result.error || 'Failed to list tables');
        }

        return result.results;
    }

    /**
     * Get schema information for a specific table
     */
    async getTableSchema(tableName: string): Promise<TableSchema> {
        try {
            // Get column information
            const columnsResult = await this.query<any>(
                `PRAGMA table_info(${tableName})`
            );

            if (!columnsResult.success) {
                throw new Error(`Table '${tableName}' not found`);
            }

            const columns: ColumnInfo[] = columnsResult.results.map((col: any) => ({
                name: col.name,
                type: col.type,
                nullable: !col.notnull,
                defaultValue: col.dflt_value,
                primaryKey: !!col.pk,
                autoIncrement: col.type.toLowerCase().includes('integer') && !!col.pk
            }));

            // Get index information
            const indexesResult = await this.query<any>(
                `PRAGMA index_list(${tableName})`
            );

            const indexes: IndexInfo[] = [];
            if (indexesResult.success) {
                for (const idx of indexesResult.results) {
                    const indexInfoResult = await this.query<any>(
                        `PRAGMA index_info(${idx.name})`
                    );

                    if (indexInfoResult.success) {
                        indexes.push({
                            name: idx.name,
                            columns: indexInfoResult.results.map((col: any) => col.name),
                            unique: !!idx.unique,
                            type: 'BTREE' // SQLite primarily uses B-tree indexes
                        });
                    }
                }
            }

            // Get foreign key information
            const fkResult = await this.query<any>(
                `PRAGMA foreign_key_list(${tableName})`
            );

            const constraints: ConstraintInfo[] = [];

            // Add primary key constraints
            const pkColumns = columns.filter(col => col.primaryKey).map(col => col.name);
            if (pkColumns.length > 0) {
                constraints.push({
                    name: `pk_${tableName}`,
                    type: 'PRIMARY KEY',
                    columns: pkColumns
                });
            }

            // Add foreign key constraints
            if (fkResult.success) {
                fkResult.results.forEach((fk: any) => {
                    constraints.push({
                        name: `fk_${tableName}_${fk.from}`,
                        type: 'FOREIGN KEY',
                        columns: [fk.from],
                        referencedTable: fk.table,
                        referencedColumns: [fk.to]
                    });
                });
            }

            return {
                name: tableName,
                columns,
                indexes,
                constraints
            };
        } catch (error) {
            throw new Error(`Failed to get schema for table '${tableName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get schemas for all tables
     */
    async getAllTableSchemas(): Promise<TableSchema[]> {
        const tables = await this.listTables();
        const schemas: TableSchema[] = [];

        for (const table of tables) {
            try {
                const schema = await this.getTableSchema(table.name);
                schemas.push(schema);
            } catch (error) {
                console.warn(`Failed to get schema for table '${table.name}':`, error);
            }
        }

        return schemas;
    }

    /**
     * Create a new table
     */
    async createTable(tableName: string, columns: ColumnInfo[]): Promise<QueryResult> {
        const columnDefinitions = columns.map(col => {
            let def = `${col.name} ${col.type}`;

            if (col.primaryKey) {
                def += ' PRIMARY KEY';
                if (col.autoIncrement) {
                    def += ' AUTOINCREMENT';
                }
            }

            if (!col.nullable && !col.primaryKey) {
                def += ' NOT NULL';
            }

            if (col.defaultValue !== undefined) {
                def += ` DEFAULT ${col.defaultValue}`;
            }

            return def;
        }).join(', ');

        const sql = `CREATE TABLE ${tableName} (${columnDefinitions})`;
        return await this.query(sql);
    }

    /**
     * Drop a table
     */
    async dropTable(tableName: string): Promise<QueryResult> {
        return await this.query(`DROP TABLE IF EXISTS ${tableName}`);
    }

    /**
     * Check if a table exists
     */
    async tableExists(tableName: string): Promise<boolean> {
        const result = await this.query<{ count: number }>(
            "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
            [tableName]
        );

        return result.success && result.results[0]?.count > 0;
    }

    /**
     * Create the migrations table if it doesn't exist
     */
    private async ensureMigrationsTable(): Promise<void> {
        const exists = await this.tableExists('_migrations');

        if (!exists) {
            await this.query(`
        CREATE TABLE _migrations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sql TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
        }
    }

    /**
     * Run a migration
     */
    async runMigration(migration: Migration): Promise<void> {
        await this.ensureMigrationsTable();

        // Check if migration already applied
        const existing = await this.query<{ id: string }>(
            'SELECT id FROM _migrations WHERE id = ?',
            [migration.id]
        );

        if (existing.success && existing.results.length > 0) {
            throw new Error(`Migration ${migration.id} has already been applied`);
        }

        try {
            // Run the migration SQL
            const result = await this.query(migration.sql);

            if (!result.success) {
                throw new Error(result.error || 'Migration failed');
            }

            // Record the migration
            await this.query(
                'INSERT INTO _migrations (id, name, sql, timestamp) VALUES (?, ?, ?, ?)',
                [migration.id, migration.name, migration.sql, migration.timestamp]
            );

            console.log(`Migration ${migration.id} applied successfully`);
        } catch (error) {
            throw new Error(`Failed to run migration ${migration.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get all applied migrations
     */
    async getAppliedMigrations(): Promise<Migration[]> {
        await this.ensureMigrationsTable();

        const result = await this.query<any>(
            'SELECT * FROM _migrations ORDER BY timestamp ASC'
        );

        if (!result.success) {
            return [];
        }

        return result.results.map(row => ({
            id: row.id,
            name: row.name,
            sql: row.sql,
            timestamp: row.timestamp,
            applied: true
        }));
    }

    /**
     * Rollback a migration (if possible)
     */
    async rollbackMigration(migrationId: string): Promise<void> {
        await this.ensureMigrationsTable();

        const result = await this.query(
            'DELETE FROM _migrations WHERE id = ?',
            [migrationId]
        );

        if (!result.success) {
            throw new Error(`Failed to rollback migration ${migrationId}`);
        }

        console.log(`Migration ${migrationId} rolled back`);
    }

    /**
     * Execute a raw HTTP request to the Cloudflare API
     */
    private async makeRequest(endpoint: string, options: RequestInit): Promise<D1Response> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.config.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json() as D1Response<any>;
    }

    /**
     * Test database connectivity
     */
    async testConnection(): Promise<boolean> {
        try {
            const result = await this.query('SELECT 1 as test');
            return result.success;
        } catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    }

    /**
     * Get database statistics
     */
    async getStats(): Promise<{
        tableCount: number;
        totalRecords: number;
        databaseSize: number;
    }> {
        try {
            const tables = await this.listTables();
            let totalRecords = 0;

            for (const table of tables) {
                const result = await this.query<{ count: number }>(
                    `SELECT COUNT(*) as count FROM ${table.name}`
                );
                if (result.success) {
                    totalRecords += result.results[0]?.count || 0;
                }
            }

            const dbInfo = await this.getDatabaseInfo();

            return {
                tableCount: tables.length,
                totalRecords,
                databaseSize: dbInfo.size
            };
        } catch (error) {
            throw new Error(`Failed to get database stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
