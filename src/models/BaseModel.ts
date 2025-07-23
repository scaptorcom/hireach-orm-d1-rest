import { DatabaseService } from '../classes/DatabaseService.js';
import { QueryResult } from '../types/database.js';

export abstract class BaseModel {
    protected db: DatabaseService;
    protected tableName: string;

    constructor(db: DatabaseService, tableName: string) {
        this.db = db;
        this.tableName = tableName;
    }

    /**
     * Execute a query with error handling
     */
    protected async executeQuery<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        try {
            const result = await this.db.query<T>(sql, params);
            if (!result.success) {
                throw new Error(result.error || 'Query execution failed');
            }
            return result;
        } catch (error) {
            throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if a record exists by ID
     */
    protected async exists(id: number): Promise<boolean> {
        const result = await this.executeQuery<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`,
            [id]
        );
        return result.results[0]?.count > 0;
    }

    /**
     * Get the total count of records in the table
     */
    async count(whereClause?: string, params?: any[]): Promise<number> {
        let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        if (whereClause) {
            sql += ` ${whereClause}`;
        }

        const result = await this.executeQuery<{ count: number }>(sql, params || []);
        return result.results[0]?.count || 0;
    }

    /**
     * Delete all records from the table (use with caution)
     */
    async truncate(): Promise<void> {
        await this.executeQuery(`DELETE FROM ${this.tableName}`);
    }

    /**
     * Get table schema information
     */
    async getTableInfo(): Promise<any> {
        return await this.db.getTableSchema(this.tableName);
    }

    /**
     * Check if the table exists
     */
    async tableExists(): Promise<boolean> {
        return await this.db.tableExists(this.tableName);
    }

    /**
     * Build UPDATE SET clause from data object
     */
    protected buildUpdateSet(data: Record<string, any>, excludeFields: string[] = ['id', 'created_at']): { setClause: string; params: any[] } {
        const fields: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && !excludeFields.includes(key)) {
                fields.push(`${key} = ?`);
                params.push(value);
            }
        }

        // Always update the updated_at field if it exists
        if (!excludeFields.includes('updated_at')) {
            fields.push('updated_at = CURRENT_TIMESTAMP');
        }

        return {
            setClause: fields.join(', '),
            params
        };
    }

    /**
     * Build INSERT fields and values from data object
     */
    protected buildInsertClause(data: Record<string, any>, excludeFields: string[] = ['id']): { fields: string; placeholders: string; params: any[] } {
        const fields: string[] = [];
        const placeholders: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && !excludeFields.includes(key)) {
                fields.push(key);
                placeholders.push('?');
                params.push(value);
            }
        }

        // Add created_at and updated_at if they don't exist
        if (!fields.includes('created_at')) {
            fields.push('created_at');
            placeholders.push('CURRENT_TIMESTAMP');
        }
        if (!fields.includes('updated_at')) {
            fields.push('updated_at');
            placeholders.push('CURRENT_TIMESTAMP');
        }

        return {
            fields: fields.join(', '),
            placeholders: placeholders.join(', '),
            params
        };
    }
}
