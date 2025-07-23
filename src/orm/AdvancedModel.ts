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
            const result = await this.db.query<R>(sql, params);
            if (!result.success) {
                throw new Error(result.error || 'Query execution failed');
            }
            return result;
        } catch (error) {
            throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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
        const prepared: Record<string, any> = { ...data };

        // Add default values
        for (const [fieldName, fieldDef] of Object.entries(this.schema.fields)) {
            if (prepared[fieldName] === undefined && fieldDef.default !== undefined) {
                if (typeof fieldDef.default === 'function') {
                    const defaultValue = fieldDef.default();
                    // Convert Date objects to ISO strings for database
                    prepared[fieldName] = defaultValue instanceof Date ? defaultValue.toISOString() : defaultValue;
                } else {
                    prepared[fieldName] = fieldDef.default;
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
}
