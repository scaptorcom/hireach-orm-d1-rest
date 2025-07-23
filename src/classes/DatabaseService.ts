import { D1DatabaseManager } from './D1DatabaseManager.js';
import { MigrationManager } from './MigrationManager.js';
import { ConfigManager } from './ConfigManager.js';
import { TableSchema, QueryResult, DatabaseInfo } from '../types/database.js';

export class DatabaseService {
    private static instance: DatabaseService;
    private dbManager: D1DatabaseManager | null = null;
    private migrationManager: MigrationManager | null = null;
    private configManager: ConfigManager;
    private initialized: boolean = false;

    private constructor() {
        this.configManager = ConfigManager.getInstance();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    /**
     * Initialize the database service with comprehensive error handling
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return; // Already initialized
        }

        try {
            console.log('🔄 Initializing database service...');

            // Get configuration (this will now work after setConfig is called)
            const config = this.configManager.getConfig();

            // Initialize managers
            this.dbManager = new D1DatabaseManager(config);
            this.migrationManager = new MigrationManager(this.dbManager);

            // Test connection with timeout
            const connectionTimeout = 30000; // 30 seconds
            const connectionPromise = this.dbManager.testConnection();
            const timeoutPromise = new Promise<boolean>((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), connectionTimeout);
            });

            const isConnected = await Promise.race([connectionPromise, timeoutPromise]);

            if (!isConnected) {
                const error = new Error('Failed to establish database connection - check your configuration and network');
                error.name = 'DatabaseConnectionError';
                throw error;
            }

            console.log('✅ Database connection established successfully');

            // Run pending migrations with error handling
            try {
                console.log('🔄 Checking for pending migrations...');
                await this.migrationManager.runPendingMigrations();
                console.log('✅ Migration check completed');
            } catch (error) {
                const migrationError = new Error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
                migrationError.name = 'MigrationError';
                console.error('❌ Migration error:', error);
                throw migrationError;
            }

            this.initialized = true;
            console.log('🎉 Database service initialized successfully');

        } catch (error) {
            // Enhanced error context for initialization failures
            if (error instanceof Error) {
                if (error.name === 'DatabaseConnectionError' || error.name === 'MigrationError' || error.name === 'ConfigurationError') {
                    throw error; // Re-throw specific errors as-is
                }

                const initError = new Error(`Database service initialization failed: ${error.message}`);
                initError.name = 'DatabaseInitializationError';
                initError.stack = error.stack;
                throw initError;
            }

            const initError = new Error(`Database service initialization failed: ${String(error)}`);
            initError.name = 'DatabaseInitializationError';
            throw initError;
        }
    }    /**
     * Get database manager instance
     */
    public getDbManager(): D1DatabaseManager {
        if (!this.dbManager) {
            throw new Error('DatabaseService not initialized. Call initialize() first.');
        }
        return this.dbManager;
    }

    /**
     * Get migration manager instance
     */
    public getMigrationManager(): MigrationManager {
        if (!this.migrationManager) {
            throw new Error('DatabaseService not initialized. Call initialize() first.');
        }
        return this.migrationManager;
    }

    /**
     * Get configuration manager instance
     */
    public getConfigManager(): ConfigManager {
        return this.configManager;
    }

    // Convenience methods that delegate to the database manager

    /**
     * Execute a SQL query with enhanced error handling
     */
    public async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        try {
            if (!sql || typeof sql !== 'string' || sql.trim() === '') {
                throw new Error('SQL query cannot be empty');
            }

            return await this.getDbManager().query<T>(sql, params);
        } catch (error) {
            const queryError = new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
            queryError.name = 'QueryExecutionError';
            throw queryError;
        }
    }

    /**
     * Execute multiple SQL statements in a batch with enhanced error handling
     */
    public async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<QueryResult[]> {
        try {
            if (!statements || !Array.isArray(statements) || statements.length === 0) {
                throw new Error('Batch statements cannot be empty');
            }

            // Validate each statement
            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i];
                if (!stmt.sql || typeof stmt.sql !== 'string' || stmt.sql.trim() === '') {
                    throw new Error(`Statement ${i + 1} has invalid SQL`);
                }
            }

            return await this.getDbManager().batch(statements);
        } catch (error) {
            const batchError = new Error(`Batch execution failed: ${error instanceof Error ? error.message : String(error)}`);
            batchError.name = 'BatchExecutionError';
            throw batchError;
        }
    }

    /**
     * Get database information
     */
    public async getDatabaseInfo(): Promise<DatabaseInfo> {
        return await this.getDbManager().getDatabaseInfo();
    }

    /**
     * List all tables
     */
    public async listTables(): Promise<Array<{ name: string; type: string }>> {
        return await this.getDbManager().listTables();
    }

    /**
     * Get table schema
     */
    public async getTableSchema(tableName: string): Promise<TableSchema> {
        return await this.getDbManager().getTableSchema(tableName);
    }

    /**
     * Get all table schemas
     */
    public async getAllTableSchemas(): Promise<TableSchema[]> {
        return await this.getDbManager().getAllTableSchemas();
    }

    /**
     * Check if a table exists
     */
    public async tableExists(tableName: string): Promise<boolean> {
        return await this.getDbManager().tableExists(tableName);
    }

    /**
     * Get database statistics
     */
    public async getStats(): Promise<{
        tableCount: number;
        totalRecords: number;
        databaseSize: number;
    }> {
        return await this.getDbManager().getStats();
    }    /**
     * Create a sample users table (useful for testing)
     */
    public async createSampleUsersTable(): Promise<QueryResult> {
        const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
        return await this.query(sql);
    }

    /**
     * Create a sample posts table (useful for testing)
     */
    public async createSamplePostsTable(): Promise<QueryResult> {
        const sql = `
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        user_id INTEGER NOT NULL,
        published BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;
        return await this.query(sql);
    }

    /**
     * Insert sample data for testing
     */
    public async insertSampleData(): Promise<void> {
        // Insert sample users
        await this.query(`
      INSERT OR IGNORE INTO users (id, email, name) VALUES 
      (1, 'john@example.com', 'John Doe'),
      (2, 'jane@example.com', 'Jane Smith'),
      (3, 'bob@example.com', 'Bob Johnson')
    `);

        // Insert sample posts
        await this.query(`
      INSERT OR IGNORE INTO posts (id, title, content, user_id, published) VALUES 
      (1, 'First Post', 'This is the content of the first post', 1, true),
      (2, 'Second Post', 'This is the content of the second post', 1, false),
      (3, 'Jane''s Post', 'This is Jane''s first post', 2, true),
      (4, 'Bob''s Draft', 'This is Bob''s draft post', 3, false)
    `);

        console.log('Sample data inserted successfully');
    }

    /**
     * Run a comprehensive database health check
     */
    public async healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        checks: {
            connection: boolean;
            configuration: boolean;
            migrations: {
                status: 'up-to-date' | 'pending' | 'error';
                pending: number;
                applied: number;
            };
            tables: number;
            totalRecords: number;
        };
        errors: string[];
    }> {
        const errors: string[] = [];
        let status: 'healthy' | 'unhealthy' = 'healthy';

        // Check connection
        const connectionOk = this.dbManager ? await this.dbManager.testConnection() : false;
        if (!connectionOk) {
            errors.push('Database connection failed');
            status = 'unhealthy';
        }

        // Check configuration
        const configValidation = this.configManager.validateConfig();
        const configOk = configValidation.isValid;
        if (!configOk) {
            errors.push(`Configuration is invalid: ${configValidation.errors.join(', ')}`);
            status = 'unhealthy';
        }

        // Check migrations
        let migrationStatus: 'up-to-date' | 'pending' | 'error' = 'up-to-date';
        let pendingCount = 0;
        let appliedCount = 0;

        try {
            if (this.migrationManager) {
                const migrationInfo = await this.migrationManager.getMigrationStatus();
                pendingCount = migrationInfo.pending;
                appliedCount = migrationInfo.applied;

                if (pendingCount > 0) {
                    migrationStatus = 'pending';
                }
            } else {
                migrationStatus = 'error';
                errors.push('Migration manager not initialized');
                status = 'unhealthy';
            }
        } catch (error) {
            migrationStatus = 'error';
            errors.push(`Migration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            status = 'unhealthy';
        }

        // Get table count and total records
        let tableCount = 0;
        let totalRecords = 0;

        try {
            const stats = await this.getStats();
            tableCount = stats.tableCount;
            totalRecords = stats.totalRecords;
        } catch (error) {
            errors.push(`Stats check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            status = 'unhealthy';
        }

        return {
            status,
            checks: {
                connection: connectionOk,
                configuration: configOk,
                migrations: {
                    status: migrationStatus,
                    pending: pendingCount,
                    applied: appliedCount
                },
                tables: tableCount,
                totalRecords
            },
            errors
        };
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        // Perform any necessary cleanup
        console.log('Database service cleanup completed');
    }
}
