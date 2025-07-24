/**
 * Base class with core database operations
 */

import { DatabaseService } from '../../classes/DatabaseService.js';
import { QueryBuilder } from '../QueryBuilder.js';
import { Schema } from '../Schema.js';
import { QueryResult } from '../../types/database.js';

export interface FindOptions {
    where?: Record<string, any>;
    orderBy?: string | Record<string, 'ASC' | 'DESC'> | Array<{ field: string; direction: 'ASC' | 'DESC' }>;
    limit?: number;
    take?: number; // Prisma-style alias for limit
    offset?: number;
    skip?: number; // Prisma-style alias for offset
    select?: string[] | Record<string, boolean>; // Support both array and object formats
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

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

export class BaseModel<T extends Record<string, any> = any> {
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
     * Get table schema
     */
    getSchema(): Schema {
        return this.schema;
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
}
