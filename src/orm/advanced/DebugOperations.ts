/**
 * Debug Operations - Analysis and debugging tools
 */

import { BaseModel } from './BaseModel.js';
import { DatabaseService } from '../../classes/DatabaseService.js';
import { Schema } from '../Schema.js';

export class DebugOperations<T extends Record<string, any> = any> extends BaseModel<T> {
    constructor(db: DatabaseService, schema: Schema, tableName: string) {
        super(db, schema, tableName);
    }

    /**
     * Debug insert data preparation
     */
    public debugInsertData(data: Partial<T>): any {
        const prepared = this.prepareDataForInsert(data);
        console.log('Debug Insert Data:');
        console.log('Original:', data);
        console.log('Prepared:', prepared);
        console.log('Table:', this.tableName);
        console.log('Schema fields:', Object.keys(this.schema.fields));
        return prepared;
    }

    /**
     * Analyze table structure and data
     */
    public async analyzeTable(): Promise<{
        tableName: string;
        recordCount: number;
        schemaFields: string[];
        sampleRecord: T | null;
        fieldAnalysis: Record<string, any>;
        suggestions: string[];
    }> {
        try {
            // Get basic counts using direct SQL since we can't access other classes
            const countResult = await this.executeQuery(`SELECT COUNT(*) as total FROM ${this.tableName}`);
            const recordCount = countResult.results?.[0]?.total || 0;

            // Get a sample record
            const sampleResult = await this.executeQuery(`SELECT * FROM ${this.tableName} LIMIT 1`);
            const sampleRecord = sampleResult.results?.[0] as T || null;

            const schemaFields = Object.keys(this.schema.fields);
            const suggestions: string[] = [];
            const fieldAnalysis: Record<string, any> = {};

            if (recordCount === 0) {
                suggestions.push('Table is empty - consider adding sample data');
            } else {
                suggestions.push(`Table has ${recordCount} records`);

                if (recordCount > 10000) {
                    suggestions.push('Large table - consider adding indexes for better performance');
                }

                // Analyze fields if we have a sample record
                if (sampleRecord) {
                    for (const fieldName of schemaFields) {
                        const value = sampleRecord[fieldName];
                        fieldAnalysis[fieldName] = {
                            type: typeof value,
                            isNull: value === null,
                            sample: value
                        };
                    }
                }
            }

            // Check for missing timestamps
            if (!this.schema.options.timestamps && sampleRecord) {
                if (!sampleRecord.created_at && !sampleRecord.updated_at) {
                    suggestions.push('Consider enabling timestamps for audit trail');
                }
            }

            return {
                tableName: this.tableName,
                recordCount,
                schemaFields,
                sampleRecord,
                fieldAnalysis,
                suggestions
            };
        } catch (error) {
            return {
                tableName: this.tableName,
                recordCount: 0,
                schemaFields: Object.keys(this.schema.fields),
                sampleRecord: null,
                fieldAnalysis: {},
                suggestions: [`Error analyzing table: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }

    /**
     * Debug query execution with detailed logging
     */
    public async debugQuery(sql: string, params: any[] = []): Promise<any> {
        console.log('=== Debug Query ===');
        console.log('SQL:', sql);
        console.log('Params:', params);
        console.log('Table:', this.tableName);

        try {
            const start = Date.now();
            const result = await this.executeQuery(sql, params);
            const duration = Date.now() - start;

            console.log('=== Query Result ===');
            console.log('Duration:', `${duration}ms`);
            console.log('Rows affected:', result.meta?.changes || 0);
            console.log('Results count:', result.results?.length || 0);
            console.log('First result:', result.results?.[0] || 'No results');
            console.log('==================');

            return result;
        } catch (error) {
            console.log('=== Query Error ===');
            console.log('Error:', error);
            console.log('==================');
            throw error;
        }
    }

    /**
     * Get table schema information
     */
    public async getTableInfo(): Promise<any> {
        try {
            const result = await this.executeQuery(`PRAGMA table_info(${this.tableName})`);
            return {
                tableName: this.tableName,
                columns: result.results || [],
                schemaDefinition: this.schema.fields
            };
        } catch (error) {
            throw new Error(`Failed to get table info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate data against schema
     */
    public validateData(data: Partial<T>): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required fields
        for (const [fieldName, fieldDef] of Object.entries(this.schema.fields)) {
            if (fieldDef.required && !fieldDef.autoIncrement) {
                if (data[fieldName as keyof T] === undefined || data[fieldName as keyof T] === null) {
                    errors.push(`Required field '${fieldName}' is missing`);
                }
            }
        }

        // Check for unknown fields
        for (const key of Object.keys(data)) {
            if (!this.schema.fields[key]) {
                warnings.push(`Field '${key}' is not defined in schema`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Prepare data for insert (exposed for debugging)
     */
    public prepareDataForInsert(data: Partial<T>): Record<string, any> {
        const prepared: Record<string, any> = { ...data };

        // Add timestamps if enabled
        if (this.schema.options.timestamps) {
            const now = new Date();
            if (!prepared.created_at) prepared.created_at = now;
            if (!prepared.updated_at) prepared.updated_at = now;
        }

        // Convert undefined to null
        Object.keys(prepared).forEach(key => {
            if (prepared[key] === undefined) {
                prepared[key] = null;
            }
        });

        return prepared;
    }
}