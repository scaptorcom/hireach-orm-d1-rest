import { D1DatabaseManager } from './D1DatabaseManager.js';
import { MigrationManager } from './MigrationManager.js';
import { ConfigManager } from './ConfigManager.js';
import { TableSchema, QueryResult, DatabaseInfo } from '../types/database.js';

export class DatabaseService {
    private static instance: DatabaseService;
    private dbManager: D1DatabaseManager;
    private migrationManager: MigrationManager;
    private configManager: ConfigManager;

    private constructor() {
        this.configManager = ConfigManager.getInstance();
        const config = this.configManager.getConfig();

        this.dbManager = new D1DatabaseManager(config);
        this.migrationManager = new MigrationManager(this.dbManager);
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    /**
     * Initialize the database service
     */
    public async initialize(): Promise<void> {
        console.log('Initializing database service...');

        // Test connection
        const isConnected = await this.dbManager.testConnection();
        if (!isConnected) {
            throw new Error('Failed to connect to the database');
        }

        console.log('Database connection established successfully');

        // Run pending migrations
        try {
            await this.migrationManager.runPendingMigrations();
        } catch (error) {
            console.error('Failed to run migrations:', error);
            throw error;
        }

        console.log('Database service initialized successfully');
    }

    /**
     * Get database manager instance
     */
    public getDbManager(): D1DatabaseManager {
        return this.dbManager;
    }

    /**
     * Get migration manager instance
     */
    public getMigrationManager(): MigrationManager {
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
     * Execute a SQL query
     */
    public async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        return await this.dbManager.query<T>(sql, params);
    }

    /**
     * Execute multiple SQL statements in a batch
     */
    public async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<QueryResult[]> {
        return await this.dbManager.batch(statements);
    }

    /**
     * Get database information
     */
    public async getDatabaseInfo(): Promise<DatabaseInfo> {
        return await this.dbManager.getDatabaseInfo();
    }

    /**
     * List all tables
     */
    public async listTables(): Promise<Array<{ name: string; type: string }>> {
        return await this.dbManager.listTables();
    }

    /**
     * Get table schema
     */
    public async getTableSchema(tableName: string): Promise<TableSchema> {
        return await this.dbManager.getTableSchema(tableName);
    }

    /**
     * Get all table schemas
     */
    public async getAllTableSchemas(): Promise<TableSchema[]> {
        return await this.dbManager.getAllTableSchemas();
    }

    /**
     * Check if a table exists
     */
    public async tableExists(tableName: string): Promise<boolean> {
        return await this.dbManager.tableExists(tableName);
    }

    /**
     * Get database statistics
     */
    public async getStats(): Promise<{
        tableCount: number;
        totalRecords: number;
        databaseSize: number;
    }> {
        return await this.dbManager.getStats();
    }

    /**
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
        const connectionOk = await this.dbManager.testConnection();
        if (!connectionOk) {
            errors.push('Database connection failed');
            status = 'unhealthy';
        }

        // Check configuration
        const configOk = this.configManager.validateConfig();
        if (!configOk) {
            errors.push('Configuration is invalid');
            status = 'unhealthy';
        }

        // Check migrations
        let migrationStatus: 'up-to-date' | 'pending' | 'error' = 'up-to-date';
        let pendingCount = 0;
        let appliedCount = 0;

        try {
            const migrationInfo = await this.migrationManager.getMigrationStatus();
            pendingCount = migrationInfo.pending;
            appliedCount = migrationInfo.applied;

            if (pendingCount > 0) {
                migrationStatus = 'pending';
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
