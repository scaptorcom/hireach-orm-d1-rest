/**
 * Advanced Base Model for D1 ORM
 * Provides Sequelize/Mongoose-like functionality
 */

import { DatabaseService } from '../classes/DatabaseService.js';
import { QueryBuilder } from './QueryBuilder.js';
import { Schema } from './Schema.js';
import { QueryResult } from '../types/database.js';

export interface ModelHooks<T = any> {
    beforeCreate?: (data: Partial<T>) => Promise<void> | void;
    afterCreate?: (record: T) => Promise<void> | void;
    beforeUpdate?: (data: Partial<T>, where: Record<string, any>) => Promise<void> | void;
    afterUpdate?: (record: T) => Promise<void> | void;
    beforeDelete?: (where: Record<string, any>) => Promise<void> | void;
    afterDelete?: (deletedCount: number) => Promise<void> | void;
    beforeFind?: (query: QueryBuilder) => Promise<void> | void;
    afterFind?: (records: T[]) => Promise<void> | void;
}

export interface FindOptions {
    select?: string[];
    where?: Record<string, any>;
    orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    limit?: number;
    offset?: number;
    include?: string[]; // For relationships
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export class AdvancedModel<T extends Record<string, any> = any> {
    protected db: DatabaseService;
    protected schema: Schema;
    protected tableName: string;
    protected hooks: ModelHooks<T> = {};
    protected relationships: Map<string, any> = new Map();

    constructor(db: DatabaseService, schema: Schema, tableName?: string) {
        this.db = db;
        this.schema = schema;
        this.tableName = tableName || schema.tableName;
        schema.tableName = this.tableName;
    }

    /**
     * Register hooks
     */
    addHook<K extends keyof ModelHooks<T>>(event: K, handler: ModelHooks<T>[K]): void {
        this.hooks[event] = handler;
    }

    /**
     * Execute a query with error handling
     */
    protected async executeQuery<R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> {
        try {
            // Add debug logging for troubleshooting
            const isDebugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG_SQL === 'true';
            if (isDebugMode) {
                console.log('🔍 Executing SQL:', sql);
                console.log('📋 Parameters:', params);
            }

            const result = await this.db.query<R>(sql, params);
            if (!result.success) {
                const error = result.error || 'Query execution failed';
                throw new Error(this.parseDbError(error, sql));
            }
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Enhanced error with more context
            const enhancedError = new Error(`Database error: ${this.parseDbError(errorMessage, sql)}`);

            // Add debugging properties to the error
            if (error instanceof Error) {
                (enhancedError as any).originalError = error;
                (enhancedError as any).sql = sql;
                (enhancedError as any).params = params;
                (enhancedError as any).tableName = this.tableName;
            }

            throw enhancedError;
        }
    }

    /**
     * Parse database errors to provide more meaningful messages
     */
    private parseDbError(error: string, sql: string): string {
        const lowerError = error.toLowerCase();
        const lowerSql = sql.toLowerCase();

        // Check for common constraint violations
        if (lowerError.includes('unique constraint') || lowerError.includes('duplicate')) {
            // Try to extract field name from error or SQL
            let field = 'field';
            const uniqueMatch = error.match(/unique constraint failed: \w+\.(\w+)/i);
            if (uniqueMatch) {
                field = uniqueMatch[1];
            } else if (lowerSql.includes('insert')) {
                // Extract likely duplicate field from the context
                if (lowerSql.includes('email')) field = 'email';
                else if (lowerSql.includes('username')) field = 'username';
                else if (lowerSql.includes('slug')) field = 'slug';
                else if (lowerSql.includes('sku')) field = 'sku';
            }

            return `Duplicate entry detected. The ${field} already exists. Please use a different value.`;
        }

        if (lowerError.includes('foreign key constraint')) {
            return `Foreign key constraint violation. The referenced record does not exist or cannot be deleted due to existing relationships.`;
        }

        if (lowerError.includes('not null constraint')) {
            const notNullMatch = error.match(/not null constraint failed: \w+\.(\w+)/i);
            const field = notNullMatch ? notNullMatch[1] : 'required field';

            // Check if this field is marked as optional in ORM but required in DB
            const fieldDef = this.schema.fields[field];
            if (fieldDef && !fieldDef.required) {
                return `Database schema mismatch: Field '${field}' is optional in your ORM schema but required in the database. Consider running migrations or providing a default value.`;
            }

            return `Missing required field: ${field}. This field cannot be empty.`;
        }

        if (lowerError.includes('check constraint')) {
            return `Data validation failed. One or more values do not meet the required constraints.`;
        }

        if (lowerError.includes('http 400')) {
            if (lowerSql.includes('insert')) {
                // Provide more specific debugging information for insert failures
                const suggestions = [
                    'Check if all required fields are provided',
                    'Verify field types match your schema definition',
                    'Ensure no fields exceed maximum length constraints',
                    'Check for unique constraint violations',
                    'Verify foreign key references exist'
                ];

                return `Database insert failed. The query was rejected by Cloudflare D1. This usually indicates:\n` +
                    `• Schema mismatch between ORM and database\n` +
                    `• Missing required fields or invalid data types\n` +
                    `• Constraint violations (unique, foreign key, etc.)\n\n` +
                    `SQL: ${sql.length > 200 ? sql.substring(0, 200) + '...' : sql}\n\n` +
                    `Debugging suggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
            }
            if (lowerSql.includes('update')) {
                return `Database update failed. Check field constraints and data types.\n` +
                    `SQL: ${sql.length > 200 ? sql.substring(0, 200) + '...' : sql}`;
            }
            if (lowerSql.includes('select')) {
                return `Database query failed. Check table name and field references.\n` +
                    `SQL: ${sql.length > 200 ? sql.substring(0, 200) + '...' : sql}`;
            }
            return `Bad Request - The database query was malformed or contains invalid data.\n` +
                `SQL: ${sql.length > 200 ? sql.substring(0, 200) + '...' : sql}`;
        }

        if (lowerError.includes('http 401')) {
            return `Unauthorized - Invalid database credentials or access token.`;
        }

        if (lowerError.includes('http 403')) {
            return `Forbidden - Insufficient permissions to perform this operation.`;
        }

        if (lowerError.includes('http 404')) {
            return `Not Found - The specified database or resource does not exist.`;
        }

        if (lowerError.includes('http 429')) {
            return `Rate Limited - Too many requests. Please try again later.`;
        }

        if (lowerError.includes('http 500')) {
            return `Internal Server Error - A server-side error occurred.`;
        }

        // Return original error if no specific pattern matches
        return error;
    }

    /**
     * Create a new QueryBuilder for this model
     */
    query(): QueryBuilder {
        return new QueryBuilder(this.tableName);
    }

    /**
     * Create a new record
     */
    async create(data: Partial<T>): Promise<T> {
        // Execute beforeCreate hook
        if (this.hooks.beforeCreate) {
            await this.hooks.beforeCreate(data);
        }

        // Prepare data with defaults and timestamps
        const preparedData = this.prepareDataForInsert(data);

        // Add debug logging for insert operations
        const isDebugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG_SQL === 'true';
        if (isDebugMode) {
            console.log('🔍 Insert Debug Info:');
            console.log('📝 Original data:', data);
            console.log('🛠️ Prepared data:', preparedData);
            console.log('📋 Schema fields:', Object.keys(this.schema.fields));
            console.log('🏷️ Table name:', this.tableName);
        }

        // Validate prepared data (after defaults are added)
        const validation = this.schema.validate(preparedData);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Build INSERT query
        const fields = Object.keys(preparedData);
        const placeholders = fields.map(() => '?');
        const values = Object.values(preparedData);

        const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        const result = await this.executeQuery(sql, values);

        // Get the created record
        let createdRecord: T;
        if (result.meta.last_row_id) {
            const found = await this.findById(result.meta.last_row_id);
            if (!found) {
                throw new Error('Failed to retrieve created record');
            }
            createdRecord = found;
        } else {
            throw new Error('Failed to create record');
        }

        // Execute afterCreate hook
        if (this.hooks.afterCreate) {
            await this.hooks.afterCreate(createdRecord);
        }

        return createdRecord;
    }

    /**
     * Create a new record only if it doesn't already exist based on specified fields
     */
    async createIfNotExists(data: Partial<T>, uniqueFields: (keyof T)[]): Promise<{ record: T; created: boolean }> {
        // Build where condition for unique fields
        const whereConditions: any = {};
        for (const field of uniqueFields) {
            if (data[field] !== undefined) {
                whereConditions[field] = data[field];
            }
        }

        // Check if record already exists
        const existingRecord = await this.findOne({ where: whereConditions });

        if (existingRecord) {
            return { record: existingRecord, created: false };
        }

        // Create new record
        try {
            const newRecord = await this.create(data);
            return { record: newRecord, created: true };
        } catch (error) {
            // If creation fails due to unique constraint (race condition), try to find the existing record
            if (error instanceof Error && error.message.toLowerCase().includes('duplicate')) {
                const existingRecord = await this.findOne({ where: whereConditions });
                if (existingRecord) {
                    return { record: existingRecord, created: false };
                }
            }
            throw error;
        }
    }

    /**
     * Find record by ID
     */
    async findById(id: number | string): Promise<T | null> {
        const query = this.query().where('id', '=', id);

        if (this.hooks.beforeFind) {
            await this.hooks.beforeFind(query);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<T>(sql, params);
        const records = result.results;

        if (this.hooks.afterFind) {
            await this.hooks.afterFind(records);
        }

        return records[0] || null;
    }

    /**
     * Find one record by conditions
     */
    async findOne(options: FindOptions = {}): Promise<T | null> {
        const query = this.buildQueryFromOptions({ ...options, limit: 1 });

        if (this.hooks.beforeFind) {
            await this.hooks.beforeFind(query);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<T>(sql, params);
        const records = result.results;

        if (this.hooks.afterFind) {
            await this.hooks.afterFind(records);
        }

        return records[0] || null;
    }

    /**
     * Find all records
     */
    async findAll(options: FindOptions = {}): Promise<T[]> {
        const query = this.buildQueryFromOptions(options);

        if (this.hooks.beforeFind) {
            await this.hooks.beforeFind(query);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<T>(sql, params);
        const records = result.results;

        if (this.hooks.afterFind) {
            await this.hooks.afterFind(records);
        }

        return records;
    }

    /**
     * Find with pagination
     */
    async findAndCountAll(options: FindOptions & { page?: number; perPage?: number } = {}): Promise<PaginatedResult<T>> {
        const page = options.page || 1;
        const perPage = options.perPage || options.limit || 20;

        // Get total count
        const countQuery = this.buildQueryFromOptions(options);
        const { sql: countSql, params: countParams } = countQuery.buildCount();
        const countResult = await this.executeQuery<{ count: number }>(countSql, countParams);
        const total = countResult.results[0]?.count || 0;

        // Get records
        const query = this.buildQueryFromOptions({
            ...options,
            limit: perPage,
            offset: (page - 1) * perPage
        });

        if (this.hooks.beforeFind) {
            await this.hooks.beforeFind(query);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<T>(sql, params);
        const records = result.results;

        if (this.hooks.afterFind) {
            await this.hooks.afterFind(records);
        }

        const totalPages = Math.ceil(total / perPage);

        return {
            data: records,
            total,
            page,
            perPage,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
    }

    /**
     * Update records
     */
    async update(data: Partial<T>, where: Record<string, any>): Promise<number> {
        // Execute beforeUpdate hook
        if (this.hooks.beforeUpdate) {
            await this.hooks.beforeUpdate(data, where);
        }

        // Prepare data with timestamps
        const preparedData = this.prepareDataForUpdate(data);

        // Validate only the fields being updated (not required fields that aren't changing)
        const validation = this.validateUpdateData(preparedData);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Build UPDATE query
        const query = this.query();
        this.addWhereConditions(query, where);
        const { sql, params } = query.buildUpdate(preparedData);

        const result = await this.executeQuery(sql, params);
        const updatedCount = result.meta.changes || 0;

        // Execute afterUpdate hook (Note: we can't easily get the updated record here)
        if (this.hooks.afterUpdate && updatedCount > 0) {
            // For now, we'll skip the afterUpdate hook for bulk updates
            // Individual updates should use updateById
        }

        return updatedCount;
    }

    /**
     * Update record by ID
     */
    async updateById(id: number | string, data: Partial<T>): Promise<T | null> {
        const updatedCount = await this.update(data, { id });

        if (updatedCount > 0) {
            const updatedRecord = await this.findById(id);
            if (updatedRecord && this.hooks.afterUpdate) {
                await this.hooks.afterUpdate(updatedRecord);
            }
            return updatedRecord;
        }

        return null;
    }

    /**
     * Upsert (Update or Insert) - Updates if record exists, creates if it doesn't
     * @param data - The data to insert or update
     * @param uniqueFields - Fields that determine uniqueness (used to check if record exists)
     * @returns Object with the record and whether it was created or updated
     */
    async upsert(data: Partial<T>, uniqueFields: (keyof T)[]): Promise<{ record: T; created: boolean; updated: boolean }>;

    /**
     * Upsert (Update or Insert) - Prisma-style with where/create/update
     * @param options - Object with where, create, and update properties
     * @returns Object with the record and whether it was created or updated
     */
    async upsert(options: {
        where: Record<string, any>;
        create: Partial<T>;
        update: Partial<T>;
    }): Promise<{ record: T; created: boolean; updated: boolean }>;

    async upsert(
        dataOrOptions: Partial<T> | { where: Record<string, any>; create: Partial<T>; update: Partial<T> },
        uniqueFields?: (keyof T)[]
    ): Promise<{ record: T; created: boolean; updated: boolean }> {
        // Check if using Prisma-style syntax
        if (dataOrOptions && typeof dataOrOptions === 'object' && 'where' in dataOrOptions && 'create' in dataOrOptions && 'update' in dataOrOptions) {
            const options = dataOrOptions as { where: Record<string, any>; create: Partial<T>; update: Partial<T> };
            const { where, create, update } = options;

            // Check if record already exists
            const existingRecord = await this.findOne({ where });

            if (existingRecord) {
                // Record exists - update it
                const updatedRecord = await this.updateById(existingRecord.id, update);
                return {
                    record: updatedRecord || existingRecord,
                    created: false,
                    updated: true
                };
            } else {
                // Record doesn't exist - create it
                try {
                    const newRecord = await this.create(create);
                    return {
                        record: newRecord,
                        created: true,
                        updated: false
                    };
                } catch (error) {
                    // Handle race condition where record was created between our check and insert
                    if (error instanceof Error && error.message.toLowerCase().includes('duplicate')) {
                        const existingRecord = await this.findOne({ where });
                        if (existingRecord) {
                            const updatedRecord = await this.updateById(existingRecord.id, update);
                            return {
                                record: updatedRecord || existingRecord,
                                created: false,
                                updated: true
                            };
                        }
                    }
                    throw error;
                }
            }
        } else {
            // Original syntax - data and uniqueFields
            if (!uniqueFields) {
                throw new Error('uniqueFields parameter is required when using data/uniqueFields syntax');
            }

            const data = dataOrOptions as Partial<T>;

            // Build where condition for unique fields
            const whereConditions: any = {};
            for (const field of uniqueFields) {
                if (data[field] !== undefined) {
                    whereConditions[field] = data[field];
                }
            }

            // Check if record already exists
            const existingRecord = await this.findOne({ where: whereConditions });

            if (existingRecord) {
                // Record exists - update it
                const updatedRecord = await this.updateById(existingRecord.id, data);
                return {
                    record: updatedRecord || existingRecord,
                    created: false,
                    updated: true
                };
            } else {
                // Record doesn't exist - create it
                try {
                    const newRecord = await this.create(data);
                    return {
                        record: newRecord,
                        created: true,
                        updated: false
                    };
                } catch (error) {
                    // Handle race condition where record was created between our check and insert
                    if (error instanceof Error && error.message.toLowerCase().includes('duplicate')) {
                        const existingRecord = await this.findOne({ where: whereConditions });
                        if (existingRecord) {
                            const updatedRecord = await this.updateById(existingRecord.id, data);
                            return {
                                record: updatedRecord || existingRecord,
                                created: false,
                                updated: true
                            };
                        }
                    }
                    throw error;
                }
            }
        }
    }

    /**
     * Upsert by ID - Updates if record with ID exists, creates with specific ID if it doesn't
     * Note: This is useful when you want to specify the exact ID for new records
     * @param id - The ID to upsert
     * @param data - The data to insert or update
     * @returns Object with the record and whether it was created or updated
     */
    async upsertById(id: number | string, data: Partial<T>): Promise<{ record: T; created: boolean; updated: boolean }> {
        const existingRecord = await this.findById(id);

        if (existingRecord) {
            // Record exists - update it
            const updatedRecord = await this.updateById(id, data);
            return {
                record: updatedRecord || existingRecord,
                created: false,
                updated: true
            };
        } else {
            // Record doesn't exist - create it with the specified ID
            const dataWithId = { ...data, id } as Partial<T>;
            const newRecord = await this.create(dataWithId);
            return {
                record: newRecord,
                created: true,
                updated: false
            };
        }
    }

    /**
     * Delete records
     */
    async delete(where: Record<string, any>): Promise<number> {
        // Execute beforeDelete hook
        if (this.hooks.beforeDelete) {
            await this.hooks.beforeDelete(where);
        }

        // Build DELETE query
        const query = this.query();
        this.addWhereConditions(query, where);
        const { sql, params } = query.buildDelete();

        const result = await this.executeQuery(sql, params);
        const deletedCount = result.meta.changes || 0;

        // Execute afterDelete hook
        if (this.hooks.afterDelete) {
            await this.hooks.afterDelete(deletedCount);
        }

        return deletedCount;
    }

    /**
     * Delete record by ID
     */
    async deleteById(id: number | string): Promise<boolean> {
        const deletedCount = await this.delete({ id });
        return deletedCount > 0;
    }

    /**
     * Soft delete (if schema supports it)
     */
    async softDelete(where: Record<string, any>): Promise<number> {
        if (!this.schema.options.softDeletes) {
            throw new Error('Soft deletes not enabled for this model');
        }

        return await this.update({ deleted_at: new Date() } as unknown as Partial<T>, where);
    }

    /**
     * Restore soft deleted records
     */
    async restore(where: Record<string, any>): Promise<number> {
        if (!this.schema.options.softDeletes) {
            throw new Error('Soft deletes not enabled for this model');
        }

        return await this.update({ deleted_at: null } as unknown as Partial<T>, where);
    }

    /**
     * Count records
     */
    async count(where: Record<string, any> = {}): Promise<number> {
        const query = this.query();
        this.addWhereConditions(query, where);
        const { sql, params } = query.buildCount();

        const result = await this.executeQuery<{ count: number }>(sql, params);
        return result.results[0]?.count || 0;
    }

    /**
     * Check if record exists
     */
    async exists(where: Record<string, any>): Promise<boolean> {
        const count = await this.count(where);
        return count > 0;
    }

    /**
     * Bulk create records
     */
    async bulkCreate(records: Partial<T>[]): Promise<T[]> {
        const createdRecords: T[] = [];

        for (const record of records) {
            try {
                const created = await this.create(record);
                createdRecords.push(created);
            } catch (error) {
                console.error('Failed to create record:', error);
                // Continue with other records
            }
        }

        return createdRecords;
    }

    /**
     * Truncate table
     */
    async truncate(): Promise<void> {
        await this.executeQuery(`DELETE FROM ${this.tableName}`);
    }

    /**
     * Get table schema
     */
    getSchema(): Schema {
        return this.schema;
    }

    /**
     * Build query from options
     */
    protected buildQueryFromOptions(options: FindOptions): QueryBuilder {
        const query = this.query();

        if (options.select) {
            query.select(...options.select);
        }

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        if (options.orderBy) {
            for (const order of options.orderBy) {
                query.orderBy(order.field, order.direction);
            }
        }

        if (options.limit) {
            query.limit(options.limit);
        }

        if (options.offset) {
            query.offset(options.offset);
        }

        // Add soft delete filter if enabled
        if (this.schema.options.softDeletes && !this.schema.options.paranoid) {
            query.whereNull('deleted_at');
        }

        return query;
    }

    /**
     * Add WHERE conditions to query
     */
    protected addWhereConditions(query: QueryBuilder, conditions: Record<string, any>): void {
        for (const [field, value] of Object.entries(conditions)) {
            if (value === null) {
                query.whereNull(field);
            } else if (value === undefined) {
                continue;
            } else if (Array.isArray(value)) {
                query.whereIn(field, value);
            } else if (typeof value === 'object' && value.operator) {
                query.where(field, value.operator, value.value);
            } else {
                query.where(field, '=', value);
            }
        }
    }

    /**
     * Prepare data for INSERT
     */
    protected prepareDataForInsert(data: Partial<T>): Record<string, any> {
        const prepared: Record<string, any> = {};

        // Copy data, but exclude auto-increment fields
        for (const [fieldName, value] of Object.entries(data)) {
            const fieldDef = this.schema.fields[fieldName];
            // Exclude auto-increment fields unless explicitly provided
            if (!fieldDef?.autoIncrement || value !== undefined) {
                prepared[fieldName] = value;
            }
        }

        // Add default values for non-auto-increment fields
        for (const [fieldName, fieldDef] of Object.entries(this.schema.fields)) {
            if (!fieldDef.autoIncrement && prepared[fieldName] === undefined && fieldDef.default !== undefined) {
                if (typeof fieldDef.default === 'function') {
                    const defaultValue = fieldDef.default();
                    // Convert Date objects to ISO strings for database
                    prepared[fieldName] = defaultValue instanceof Date ? defaultValue.toISOString() : defaultValue;
                } else {
                    prepared[fieldName] = fieldDef.default;
                }
            }
        }

        // Handle potential schema mismatches: provide fallback defaults for optional fields
        // that might still be required in the database schema
        for (const [fieldName, fieldDef] of Object.entries(this.schema.fields)) {
            if (!fieldDef.autoIncrement && !fieldDef.required && prepared[fieldName] === undefined) {
                // Provide type-appropriate default values for optional fields
                // This helps when ORM schema is relaxed but DB schema still has NOT NULL constraints
                const fallbackDefaults: Record<string, any> = {
                    string: '',
                    number: 0,
                    boolean: false,
                    date: new Date().toISOString(),
                    text: '',
                    json: null
                };

                // Only add fallback if no explicit default was set
                if (fieldDef.default === undefined && fallbackDefaults[fieldDef.type] !== undefined) {
                    prepared[fieldName] = fallbackDefaults[fieldDef.type];
                }
            }
        }

        // Handle timestamps
        if (this.schema.options.timestamps) {
            const now = new Date().toISOString();
            if (!prepared.created_at) {
                prepared.created_at = now;
            }
            if (!prepared.updated_at) {
                prepared.updated_at = now;
            }
        }

        // Convert any Date objects to ISO strings
        for (const [key, value] of Object.entries(prepared)) {
            if (value instanceof Date) {
                prepared[key] = value.toISOString();
            }
        }

        return prepared;
    }

    /**
     * Prepare data for UPDATE
     */
    protected prepareDataForUpdate(data: Partial<T>): Record<string, any> {
        const prepared: Record<string, any> = { ...data };

        // Handle timestamps
        if (this.schema.options.timestamps) {
            prepared.updated_at = new Date().toISOString();
        }

        // Convert any Date objects to ISO strings
        for (const [key, value] of Object.entries(prepared)) {
            if (value instanceof Date) {
                prepared[key] = value.toISOString();
            }
        }

        // Remove fields that shouldn't be updated
        delete prepared.id;
        delete prepared.created_at;

        return prepared;
    }

    /**
     * Validate data for update (only validates fields being updated)
     */
    protected validateUpdateData(data: Record<string, any>): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (const [fieldName, value] of Object.entries(data)) {
            if (value === undefined) continue;

            const fieldDef = this.schema.fields[fieldName];
            if (!fieldDef) continue; // Field not in schema, skip

            // Type validation
            if (!this.validateFieldType(value, fieldDef.type)) {
                errors.push(`Field '${fieldName}' must be of type ${fieldDef.type}`);
                continue;
            }

            // String length validation
            if (fieldDef.type === 'string' && typeof value === 'string') {
                if (fieldDef.maxLength && value.length > fieldDef.maxLength) {
                    errors.push(`Field '${fieldName}' exceeds maximum length of ${fieldDef.maxLength}`);
                }
                if (fieldDef.minLength && value.length < fieldDef.minLength) {
                    errors.push(`Field '${fieldName}' is below minimum length of ${fieldDef.minLength}`);
                }
            }

            // Number range validation
            if (fieldDef.type === 'number' && typeof value === 'number') {
                if (fieldDef.max && value > fieldDef.max) {
                    errors.push(`Field '${fieldName}' exceeds maximum value of ${fieldDef.max}`);
                }
                if (fieldDef.min && value < fieldDef.min) {
                    errors.push(`Field '${fieldName}' is below minimum value of ${fieldDef.min}`);
                }
            }

            // Enum validation
            if (fieldDef.enum && fieldDef.enum.length > 0) {
                const enumValues = fieldDef.enum as (string | number)[];
                if (!enumValues.includes(value)) {
                    errors.push(`Field '${fieldName}' must be one of: ${enumValues.join(', ')}`);
                }
            }

            // Custom validation
            if (fieldDef.validate) {
                const validationResult = fieldDef.validate(value);
                if (validationResult !== true) {
                    errors.push(typeof validationResult === 'string' ? validationResult : `Field '${fieldName}' is invalid`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate field type
     */
    private validateFieldType(value: any, type: string): boolean {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'date':
                return value instanceof Date || typeof value === 'string';
            case 'text':
                return typeof value === 'string';
            case 'json':
                return true; // Any value can be JSON
            default:
                return true;
        }
    }

    /**
     * Debug helper to provide detailed information about insert failures
     */
    public debugInsertData(data: Partial<T>): {
        preparedData: Record<string, any>;
        validation: { isValid: boolean; errors: string[] };
        schemaInfo: Record<string, any>;
        suggestions: string[];
    } {
        const preparedData = this.prepareDataForInsert(data);
        const validation = this.schema.validate(preparedData);

        const schemaInfo: Record<string, any> = {};
        for (const [fieldName, fieldDef] of Object.entries(this.schema.fields)) {
            schemaInfo[fieldName] = {
                type: fieldDef.type,
                required: fieldDef.required,
                hasDefault: fieldDef.default !== undefined,
                autoIncrement: fieldDef.autoIncrement || false,
                unique: fieldDef.unique || false,
                maxLength: fieldDef.maxLength,
                enum: fieldDef.enum
            };
        }

        const suggestions: string[] = [];

        // Analyze potential issues
        for (const [fieldName, fieldDef] of Object.entries(this.schema.fields)) {
            const value = preparedData[fieldName];

            if (fieldDef.required && !fieldDef.autoIncrement && (value === undefined || value === null)) {
                suggestions.push(`Field '${fieldName}' is required but missing. Provide a value or add a default.`);
            }

            if (value !== undefined && value !== null) {
                if (fieldDef.type === 'string' && typeof value !== 'string') {
                    suggestions.push(`Field '${fieldName}' should be a string but got ${typeof value}.`);
                }

                if (fieldDef.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
                    suggestions.push(`Field '${fieldName}' should be a number but got ${typeof value}.`);
                }

                if (fieldDef.maxLength && typeof value === 'string' && value.length > fieldDef.maxLength) {
                    suggestions.push(`Field '${fieldName}' exceeds maximum length of ${fieldDef.maxLength} characters.`);
                }

                if (fieldDef.enum && Array.isArray(fieldDef.enum) && !(fieldDef.enum as (string | number)[]).includes(value)) {
                    suggestions.push(`Field '${fieldName}' must be one of: ${fieldDef.enum.join(', ')}.`);
                }
            }
        }

        if (suggestions.length === 0) {
            suggestions.push('No obvious issues found. The error might be related to database constraints or D1 API issues.');
        }

        return {
            preparedData,
            validation,
            schemaInfo,
            suggestions
        };
    }
}
