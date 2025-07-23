import { Migration } from '../types/database.js';
import { D1DatabaseManager } from './D1DatabaseManager.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class MigrationManager {
    private db: D1DatabaseManager;
    private migrationsDir: string;

    constructor(db: D1DatabaseManager, migrationsDir: string = './migrations') {
        this.db = db;
        this.migrationsDir = migrationsDir;
        this.ensureMigrationsDirectory();
    }

    /**
     * Create migrations directory if it doesn't exist
     */
    private ensureMigrationsDirectory(): void {
        if (!fs.existsSync(this.migrationsDir)) {
            fs.mkdirSync(this.migrationsDir, { recursive: true });
        }
    }

    /**
     * Create a new migration file
     */
    async createMigration(name: string, sql: string): Promise<Migration> {
        const timestamp = Date.now();
        const id = uuidv4();
        const fileName = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
        const filePath = path.join(this.migrationsDir, fileName);

        const migration: Migration = {
            id,
            name,
            sql,
            timestamp,
            applied: false
        };

        // Create the migration file with metadata header
        const fileContent = `-- Migration: ${name}
-- ID: ${id}
-- Timestamp: ${timestamp}
-- Created: ${new Date().toISOString()}

${sql}`;

        fs.writeFileSync(filePath, fileContent, 'utf8');

        console.log(`Migration created: ${fileName}`);
        return migration;
    }

    /**
     * Load all migration files from the migrations directory
     */
    loadMigrationsFromFiles(): Migration[] {
        const migrations: Migration[] = [];

        if (!fs.existsSync(this.migrationsDir)) {
            return migrations;
        }

        const files = fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const filePath = path.join(this.migrationsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Extract metadata from comments
            const lines = content.split('\n');
            let name = '';
            let id = '';
            let timestamp = 0;
            let sqlStart = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('-- Migration:')) {
                    name = line.replace('-- Migration:', '').trim();
                } else if (line.startsWith('-- ID:')) {
                    id = line.replace('-- ID:', '').trim();
                } else if (line.startsWith('-- Timestamp:')) {
                    timestamp = parseInt(line.replace('-- Timestamp:', '').trim());
                } else if (!line.startsWith('--') && line.length > 0) {
                    sqlStart = i;
                    break;
                }
            }

            const sql = lines.slice(sqlStart).join('\n').trim();

            // Fallback to filename parsing if metadata is missing
            if (!name || !id || !timestamp) {
                const match = file.match(/^(\d+)_(.+)\.sql$/);
                if (match) {
                    timestamp = timestamp || parseInt(match[1]);
                    name = name || match[2].replace(/_/g, ' ');
                    id = id || uuidv4();
                }
            }

            if (name && id && timestamp && sql) {
                migrations.push({
                    id,
                    name,
                    sql,
                    timestamp,
                    applied: false
                });
            }
        }

        return migrations.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Get pending migrations (not yet applied)
     */
    async getPendingMigrations(): Promise<Migration[]> {
        const allMigrations = this.loadMigrationsFromFiles();
        const appliedMigrations = await this.db.getAppliedMigrations();
        const appliedIds = new Set(appliedMigrations.map(m => m.id));

        return allMigrations.filter(migration => !appliedIds.has(migration.id));
    }

    /**
     * Run all pending migrations
     */
    async runPendingMigrations(): Promise<void> {
        const pendingMigrations = await this.getPendingMigrations();

        if (pendingMigrations.length === 0) {
            console.log('No pending migrations to run');
            return;
        }

        console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

        for (const migration of pendingMigrations) {
            try {
                await this.db.runMigration(migration);
                console.log(`✓ Applied migration: ${migration.name}`);
            } catch (error) {
                console.error(`✗ Failed to apply migration: ${migration.name}`);
                console.error(error);
                throw error;
            }
        }

        console.log('All pending migrations applied successfully');
    }

    /**
     * Run a specific migration by ID
     */
    async runMigration(migrationId: string): Promise<void> {
        const allMigrations = this.loadMigrationsFromFiles();
        const migration = allMigrations.find(m => m.id === migrationId);

        if (!migration) {
            throw new Error(`Migration with ID ${migrationId} not found`);
        }

        await this.db.runMigration(migration);
    }

    /**
     * Get migration status
     */
    async getMigrationStatus(): Promise<{
        total: number;
        applied: number;
        pending: number;
        migrations: Array<Migration & { status: 'applied' | 'pending' }>;
    }> {
        const allMigrations = this.loadMigrationsFromFiles();
        const appliedMigrations = await this.db.getAppliedMigrations();
        const appliedIds = new Set(appliedMigrations.map(m => m.id));

        const migrations = allMigrations.map(migration => ({
            ...migration,
            status: appliedIds.has(migration.id) ? 'applied' : 'pending' as 'applied' | 'pending'
        }));

        return {
            total: allMigrations.length,
            applied: appliedMigrations.length,
            pending: allMigrations.length - appliedMigrations.length,
            migrations
        };
    }

    /**
     * Generate a migration to create a table
     */
    async generateCreateTableMigration(tableName: string, columns: Array<{
        name: string;
        type: string;
        nullable?: boolean;
        primaryKey?: boolean;
        autoIncrement?: boolean;
        defaultValue?: string;
    }>): Promise<Migration> {
        const columnDefinitions = columns.map(col => {
            let def = `  ${col.name} ${col.type}`;

            if (col.primaryKey) {
                def += ' PRIMARY KEY';
                if (col.autoIncrement) {
                    def += ' AUTOINCREMENT';
                }
            }

            if (col.nullable === false && !col.primaryKey) {
                def += ' NOT NULL';
            }

            if (col.defaultValue !== undefined) {
                def += ` DEFAULT ${col.defaultValue}`;
            }

            return def;
        }).join(',\n');

        const sql = `CREATE TABLE ${tableName} (\n${columnDefinitions}\n);`;

        return await this.createMigration(`create_${tableName}_table`, sql);
    }

    /**
     * Generate a migration to drop a table
     */
    async generateDropTableMigration(tableName: string): Promise<Migration> {
        const sql = `DROP TABLE IF EXISTS ${tableName};`;
        return await this.createMigration(`drop_${tableName}_table`, sql);
    }

    /**
     * Generate a migration to add a column
     */
    async generateAddColumnMigration(tableName: string, columnName: string, columnType: string, options: {
        nullable?: boolean;
        defaultValue?: string;
    } = {}): Promise<Migration> {
        let sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;

        if (options.nullable === false) {
            sql += ' NOT NULL';
        }

        if (options.defaultValue !== undefined) {
            sql += ` DEFAULT ${options.defaultValue}`;
        }

        sql += ';';

        return await this.createMigration(`add_${columnName}_to_${tableName}`, sql);
    }

    /**
     * Generate a migration to create an index
     */
    async generateCreateIndexMigration(tableName: string, indexName: string, columns: string[], unique: boolean = false): Promise<Migration> {
        const uniqueKeyword = unique ? 'UNIQUE ' : '';
        const sql = `CREATE ${uniqueKeyword}INDEX ${indexName} ON ${tableName} (${columns.join(', ')});`;

        return await this.createMigration(`create_${indexName}_index`, sql);
    }
}
