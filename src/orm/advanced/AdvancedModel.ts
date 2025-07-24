/**
 * Advanced Model - Complete ORM functionality
 * Combines all operation types into a single comprehensive model
 */

import { UpsertOperations } from './UpsertOperations.js';
import { AggregateOperations } from './AggregateOperations.js';
import { DebugOperations } from './DebugOperations.js';

// Export interfaces for external use
export { ModelHooks, FindOptions, PaginatedResult } from './BaseModel.js';
export { AggregateOptions, AggregateResult } from './AggregateOperations.js';
export { BulkResult } from './BulkOperations.js';

/**
 * AdvancedModel with multiple inheritance using mixins
 * This class provides the complete ORM functionality
 */
export class AdvancedModel<T extends Record<string, any> = any> extends UpsertOperations<T> {
    // Aggregate operations
    async sum(field: keyof T, options: any = {}): Promise<number> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.sum(field, options);
    }

    async avg(field: keyof T, options: any = {}): Promise<number> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.avg(field, options);
    }

    async min(field: keyof T, options: any = {}): Promise<number | string | Date | null> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.min(field, options);
    }

    async max(field: keyof T, options: any = {}): Promise<number | string | Date | null> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.max(field, options);
    }

    async aggregate(operations: any, options: any = {}): Promise<any> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.aggregate(operations, options);
    }

    async groupBy(fields: (keyof T)[], options: any = {}): Promise<Array<Record<string, any> & { count: number }>> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.groupBy(fields, options);
    }

    async distinct(field: keyof T, options: any = {}): Promise<any[]> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.distinct(field, options);
    }

    async countDistinct(field: keyof T, options: any = {}): Promise<number> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.countDistinct(field, options);
    }

    async percentile(field: keyof T, percentile: number, options: any = {}): Promise<number | null> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.percentile(field, percentile, options);
    }

    async median(field: keyof T, options: any = {}): Promise<number | null> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.median(field, options);
    }

    async stats(field: keyof T, options: any = {}): Promise<{
        count: number;
        sum: number;
        avg: number;
        min: number | null;
        max: number | null;
        median?: number | null;
    }> {
        const aggregateOps = new AggregateOperations<T>(this.db, this.schema, this.tableName);
        return aggregateOps.stats(field, options);
    }

    // Count operations with flexible syntax
    async count(options: { where?: Record<string, any> }): Promise<number>;
    async count(where?: Record<string, any>): Promise<number>;
    async count(optionsOrWhere?: { where?: Record<string, any> } | Record<string, any>): Promise<number> {
        // Handle both syntaxes: count({ where: {...} }) and count({...})
        const where = optionsOrWhere && 'where' in optionsOrWhere
            ? optionsOrWhere.where || {}
            : optionsOrWhere || {};

        // Use the inherited count method from CrudOperations
        return super.count(where);
    }

    // Bulk operations
    async bulkCreate(records: Partial<T>[], options: any = {}): Promise<any> {
        const createdRecords: T[] = [];

        for (const record of records) {
            try {
                const created = await this.create(record);
                createdRecords.push(created);
            } catch (error) {
                if (!options.continueOnError) {
                    throw error;
                }
                console.error('Failed to create record:', error);
            }
        }

        return createdRecords;
    }

    async truncate(): Promise<void> {
        await this.executeQuery(`DELETE FROM ${this.tableName}`);
    }

    // Soft delete operations
    async softDelete(where: Record<string, any>): Promise<number> {
        if (!this.schema.options.softDeletes) {
            throw new Error('Soft deletes not enabled for this model');
        }

        const updateResult = await this.update({ deleted_at: new Date() } as unknown as Partial<T>, where);
        return updateResult.meta.changes || 0;
    }

    async restore(where: Record<string, any>): Promise<number> {
        if (!this.schema.options.softDeletes) {
            throw new Error('Soft deletes not enabled for this model');
        }

        const updateResult = await this.update({ deleted_at: null } as unknown as Partial<T>, where);
        return updateResult.meta.changes || 0;
    }

    // Debug operations
    public debugInsertData(data: Partial<T>): any {
        const debugOps = new DebugOperations<T>(this.db, this.schema, this.tableName);
        return debugOps.debugInsertData(data);
    }

    public async analyzeTable(): Promise<any> {
        // Simple analysis without complex dependencies
        const recordCount = await this.count();
        const suggestions: string[] = [];

        if (recordCount === 0) {
            suggestions.push('Table is empty - no analysis available');
        } else {
            suggestions.push(`Table has ${recordCount} records`);

            // Basic field analysis
            const schemaFields = Object.keys(this.schema.fields);
            suggestions.push(`Schema defines ${schemaFields.length} fields: ${schemaFields.join(', ')}`);
        }

        return {
            recordCount,
            suggestions,
            fieldCount: Object.keys(this.schema.fields).length
        };
    }
}
