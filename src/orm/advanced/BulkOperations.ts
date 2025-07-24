/**
 * Bulk Operations
 * Handles bulk insert, update, delete operations
 */

import { UpsertOperations } from './UpsertOperations.js';

export interface BulkResult {
    created: number;
    updated: number;
    deleted: number;
    errors: Array<{ index: number; error: string; data?: any }>;
}

export class BulkOperations<T extends Record<string, any> = any> extends UpsertOperations<T> {
    /**
     * Bulk create records with error handling
     */
    async bulkCreate(records: Partial<T>[], options: {
        continueOnError?: boolean;
        chunkSize?: number;
    } = {}): Promise<BulkResult> {
        const result: BulkResult = {
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };

        const { continueOnError = true, chunkSize = 100 } = options;

        // Process in chunks to avoid overwhelming the database
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);

            for (let j = 0; j < chunk.length; j++) {
                const record = chunk[j];
                const recordIndex = i + j;

                try {
                    await this.create(record);
                    result.created++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push({
                        index: recordIndex,
                        error: errorMessage,
                        data: record
                    });

                    if (!continueOnError) {
                        throw new Error(`Bulk create failed at record ${recordIndex}: ${errorMessage}`);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Bulk update records
     */
    async bulkUpdate(
        updates: Array<{ where: Record<string, any>; data: Partial<T> }>,
        options: { continueOnError?: boolean } = {}
    ): Promise<BulkResult> {
        const result: BulkResult = {
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };

        const { continueOnError = true } = options;

        for (let i = 0; i < updates.length; i++) {
            const { where, data } = updates[i];

            try {
                const updatedCount = await this.update(data, where);
                result.updated += updatedCount.meta.changes || 0;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push({
                    index: i,
                    error: errorMessage,
                    data: { where, data }
                });

                if (!continueOnError) {
                    throw new Error(`Bulk update failed at update ${i}: ${errorMessage}`);
                }
            }
        }

        return result;
    }

    /**
     * Bulk delete records
     */
    async bulkDelete(
        conditions: Array<Record<string, any>>,
        options: { continueOnError?: boolean } = {}
    ): Promise<BulkResult> {
        const result: BulkResult = {
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };

        const { continueOnError = true } = options;

        for (let i = 0; i < conditions.length; i++) {
            const where = conditions[i];

            try {
                const deletedCount = await this.delete(where);
                result.deleted += deletedCount;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push({
                    index: i,
                    error: errorMessage,
                    data: where
                });

                if (!continueOnError) {
                    throw new Error(`Bulk delete failed at condition ${i}: ${errorMessage}`);
                }
            }
        }

        return result;
    }

    /**
     * Bulk upsert records
     */
    async bulkUpsert(
        records: Array<{ data: Partial<T>; uniqueFields: (keyof T)[] }>,
        options: { continueOnError?: boolean; chunkSize?: number } = {}
    ): Promise<BulkResult> {
        const result: BulkResult = {
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };

        const { continueOnError = true, chunkSize = 50 } = options;

        // Process in chunks to avoid overwhelming the database
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);

            for (let j = 0; j < chunk.length; j++) {
                const { data, uniqueFields } = chunk[j];
                const recordIndex = i + j;

                try {
                    const upsertResult = await this.upsert(data, uniqueFields);
                    if (upsertResult.created) {
                        result.created++;
                    } else if (upsertResult.updated) {
                        result.updated++;
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push({
                        index: recordIndex,
                        error: errorMessage,
                        data: { data, uniqueFields }
                    });

                    if (!continueOnError) {
                        throw new Error(`Bulk upsert failed at record ${recordIndex}: ${errorMessage}`);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Truncate table (delete all records)
     */
    async truncate(): Promise<void> {
        await this.executeQuery(`DELETE FROM ${this.tableName}`);
    }

    /**
     * Batch insert using SQL VALUES clause (more efficient for large datasets)
     * Note: This bypasses hooks and validations for performance
     */
    async batchInsert(
        records: Partial<T>[],
        options: { chunkSize?: number; skipValidation?: boolean } = {}
    ): Promise<BulkResult> {
        const result: BulkResult = {
            created: 0,
            updated: 0,
            deleted: 0,
            errors: []
        };

        if (records.length === 0) {
            return result;
        }

        const { chunkSize = 500, skipValidation = false } = options;

        // Get field names from the first record and schema
        const firstRecord = records[0];
        const fieldNames = Object.keys(firstRecord).filter(field => {
            const fieldDef = this.schema.fields[field];
            return !fieldDef?.autoIncrement; // Exclude auto-increment fields
        });

        if (fieldNames.length === 0) {
            throw new Error('No valid fields found for batch insert');
        }

        // Process in chunks
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);

            try {
                const preparedRecords: Record<string, any>[] = [];

                for (const record of chunk) {
                    const prepared = this.prepareDataForInsert(record);

                    if (!skipValidation) {
                        const validation = this.schema.validate(prepared);
                        if (!validation.isValid) {
                            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
                        }
                    }

                    preparedRecords.push(prepared);
                }

                // Build batch INSERT query
                const placeholders = fieldNames.map(() => '?').join(', ');
                const valuesClause = chunk.map(() => `(${placeholders})`).join(', ');
                const sql = `INSERT INTO ${this.tableName} (${fieldNames.join(', ')}) VALUES ${valuesClause}`;

                // Flatten all values
                const allValues: any[] = [];
                for (const prepared of preparedRecords) {
                    for (const field of fieldNames) {
                        allValues.push(prepared[field]);
                    }
                }

                await this.executeQuery(sql, allValues);
                result.created += chunk.length;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                // Add error for each record in the failed chunk
                for (let j = 0; j < chunk.length; j++) {
                    result.errors.push({
                        index: i + j,
                        error: errorMessage,
                        data: chunk[j]
                    });
                }
            }
        }

        return result;
    }
}
