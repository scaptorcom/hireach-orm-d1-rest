/**
 * D1 ORM - Main ORM class
 * Provides Sequelize/Mongoose-like functionality for Cloudflare D1
 */

import { DatabaseService } from '../classes/DatabaseService.js';
import { AdvancedModel, ModelHooks } from './AdvancedModel.js';
import { Schema, SchemaDefinition, SchemaOptions } from './Schema.js';
import { QueryBuilder } from './QueryBuilder.js';

export interface D1ORMOptions {
    database: DatabaseService;
    autoSync?: boolean; // Automatically sync schemas to database
    logging?: boolean;
}

export class D1ORM {
    private db: DatabaseService;
    private models: Map<string, AdvancedModel> = new Map();
    private schemas: Map<string, Schema> = new Map();
    private options: D1ORMOptions;

    constructor(options: D1ORMOptions) {
        this.db = options.database;
        this.options = {
            autoSync: false,
            logging: false,
            ...options
        };
    }

    /**
     * Define a model
     */
    define<T extends Record<string, any> = any>(
        modelName: string,
        schemaDefinition: SchemaDefinition,
        options: SchemaOptions & { hooks?: ModelHooks<T> } = {}
    ): AdvancedModel<T> {
        const { hooks, ...schemaOptions } = options;

        // Create schema
        const schema = new Schema(schemaDefinition, {
            tableName: schemaOptions.tableName || modelName.toLowerCase(),
            ...schemaOptions
        });

        // Create model
        const model = new AdvancedModel<T>(this.db, schema, schema.tableName);

        // Add hooks if provided
        if (hooks) {
            for (const [event, handler] of Object.entries(hooks)) {
                if (handler) {
                    model.addHook(event as keyof ModelHooks<T>, handler);
                }
            }
        }

        // Store model and schema
        this.models.set(modelName, model);
        this.schemas.set(modelName, schema);

        if (this.options.logging) {
            console.log(`Model '${modelName}' defined with table '${schema.tableName}'`);
        }

        return model;
    }

    /**
     * Get a defined model
     */
    model<T extends Record<string, any> = any>(modelName: string): AdvancedModel<T> {
        const model = this.models.get(modelName);
        if (!model) {
            throw new Error(`Model '${modelName}' not found. Did you define it?`);
        }
        return model as AdvancedModel<T>;
    }

    /**
     * Get all defined models
     */
    getModels(): Map<string, AdvancedModel> {
        return new Map(this.models);
    }

    /**
     * Get schema for a model
     */
    getSchema(modelName: string): Schema {
        const schema = this.schemas.get(modelName);
        if (!schema) {
            throw new Error(`Schema for model '${modelName}' not found`);
        }
        return schema;
    }

    /**
     * Sync all models to database (create tables)
     */
    async sync(options: { force?: boolean; alter?: boolean } = {}): Promise<void> {
        const { force = false } = options;

        if (this.options.logging) {
            console.log('Syncing models to database...');
        }

        for (const [modelName, schema] of this.schemas.entries()) {
            try {
                await this.syncModel(modelName, schema, { force });

                if (this.options.logging) {
                    console.log(`✓ Synced model '${modelName}' (table: ${schema.tableName})`);
                }
            } catch (error) {
                console.error(`✗ Failed to sync model '${modelName}':`, error);
                throw error;
            }
        }

        if (this.options.logging) {
            console.log('All models synced successfully!');
        }
    }

    /**
     * Sync a single model to database
     */
    async syncModel(modelName: string, schema: Schema, options: { force?: boolean } = {}): Promise<void> {
        const { force = false } = options;

        // Check if table exists
        const tableExists = await this.db.tableExists(schema.tableName);

        if (tableExists && force) {
            // Drop and recreate table
            await this.db.query(`DROP TABLE ${schema.tableName}`);
            if (this.options.logging) {
                console.log(`Dropped existing table '${schema.tableName}'`);
            }
        }

        if (!tableExists || force) {
            // Create table
            const createTableSQL = schema.generateCreateTableSQL();
            await this.db.query(createTableSQL);

            // Create indexes
            const indexStatements = schema.generateIndexSQL();
            for (const indexSQL of indexStatements) {
                await this.db.query(indexSQL);
            }
        }
    }

    /**
     * Generate migration for a model
     */
    generateMigration(modelName: string): string {
        const schema = this.getSchema(modelName);
        const createTableSQL = schema.generateCreateTableSQL();
        const indexStatements = schema.generateIndexSQL();

        let migration = `-- Migration for ${modelName}\n`;
        migration += `-- Created at: ${new Date().toISOString()}\n\n`;
        migration += `${createTableSQL};\n\n`;

        if (indexStatements.length > 0) {
            migration += `-- Indexes\n`;
            for (const indexSQL of indexStatements) {
                migration += `${indexSQL};\n`;
            }
        }

        return migration;
    }

    /**
     * Generate migrations for all models
     */
    generateAllMigrations(): Map<string, string> {
        const migrations = new Map<string, string>();

        for (const modelName of this.models.keys()) {
            migrations.set(modelName, this.generateMigration(modelName));
        }

        return migrations;
    }

    /**
     * Drop all tables
     */
    async drop(options: { cascade?: boolean } = {}): Promise<void> {
        if (this.options.logging) {
            console.log('Dropping all tables...');
        }

        for (const [modelName, schema] of this.schemas.entries()) {
            try {
                const tableExists = await this.db.tableExists(schema.tableName);
                if (tableExists) {
                    await this.db.query(`DROP TABLE ${schema.tableName}`);

                    if (this.options.logging) {
                        console.log(`✓ Dropped table '${schema.tableName}'`);
                    }
                }
            } catch (error) {
                console.error(`✗ Failed to drop table '${schema.tableName}':`, error);
                if (!options.cascade) {
                    throw error;
                }
            }
        }

        if (this.options.logging) {
            console.log('All tables dropped!');
        }
    }

    /**
     * Validate all models
     */
    validateModels(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (const [modelName, schema] of this.schemas.entries()) {
            // Check for required fields
            let hasPrimaryKey = false;
            for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
                if (fieldDef.primaryKey) {
                    hasPrimaryKey = true;
                    break;
                }
            }

            if (!hasPrimaryKey) {
                errors.push(`Model '${modelName}' has no primary key defined`);
            }

            // Check for invalid field references
            for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
                if (fieldDef.references) {
                    // Here you could add validation for foreign key references
                    // For now, we'll just check if the table name is not empty
                    if (!fieldDef.references.table || !fieldDef.references.field) {
                        errors.push(`Model '${modelName}' field '${fieldName}' has invalid reference`);
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a raw query builder
     */
    query(tableName?: string): QueryBuilder {
        return new QueryBuilder(tableName);
    }

    /**
     * Execute raw SQL
     */
    async raw<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const result = await this.db.query<T>(sql, params);
        if (!result.success) {
            throw new Error(result.error || 'Query execution failed');
        }
        return result.results;
    }

    /**
     * Begin transaction
     */
    async transaction<T>(callback: (trx: D1ORM) => Promise<T>): Promise<T> {
        // Note: D1 doesn't support traditional transactions yet
        // This is a placeholder for future implementation
        // For now, we'll just execute the callback
        return await callback(this);
    }

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
        // D1 doesn't need explicit closing, but we can clear our models
        this.models.clear();
        this.schemas.clear();

        if (this.options.logging) {
            console.log('ORM connection closed');
        }
    }

    /**
     * Get database instance
     */
    getDatabase(): DatabaseService {
        return this.db;
    }

    /**
     * Enable/disable logging
     */
    setLogging(enabled: boolean): void {
        this.options.logging = enabled;
    }
}

// Export types for convenience
export { Schema, SchemaDefinition, SchemaOptions, FieldDefinition } from './Schema.js';
export { QueryBuilder, WhereOperator, OrderDirection, JoinType } from './QueryBuilder.js';
export { AdvancedModel, ModelHooks, FindOptions, PaginatedResult } from './AdvancedModel.js';
