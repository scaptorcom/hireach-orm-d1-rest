/**
 * Aggregate Operations
 * Handles aggregate functions like sum, avg, min, max, etc.
 */

import { BaseModel } from './BaseModel.js';

export interface AggregateOptions {
    where?: Record<string, any>;
    groupBy?: string[];
    having?: Record<string, any>;
}

export interface AggregateResult {
    count?: number;
    sum?: number;
    avg?: number;
    min?: number | string | Date;
    max?: number | string | Date;
    groupBy?: Record<string, any>;
}

export class AggregateOperations<T extends Record<string, any> = any> extends BaseModel<T> {
    /**
     * Count records with optional conditions
     */
    async count(options: AggregateOptions = {}): Promise<number> {
        const query = this.query();

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        const { sql, params } = query.buildCount();
        const result = await this.executeQuery<{ count: number }>(sql, params);
        return result.results[0]?.count || 0;
    }

    /**
     * Sum values of a numeric field
     */
    async sum(field: keyof T, options: AggregateOptions = {}): Promise<number> {
        const query = this.query().select(`SUM(${String(field)}) as sum`);

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<{ sum: number }>(sql, params);
        return result.results[0]?.sum || 0;
    }

    /**
     * Calculate average of a numeric field
     */
    async avg(field: keyof T, options: AggregateOptions = {}): Promise<number> {
        const query = this.query().select(`AVG(${String(field)}) as avg`);

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<{ avg: number }>(sql, params);
        return result.results[0]?.avg || 0;
    }

    /**
     * Find minimum value of a field
     */
    async min(field: keyof T, options: AggregateOptions = {}): Promise<number | string | Date | null> {
        const query = this.query().select(`MIN(${String(field)}) as min`);

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<{ min: number | string | Date }>(sql, params);
        return result.results[0]?.min || null;
    }

    /**
     * Find maximum value of a field
     */
    async max(field: keyof T, options: AggregateOptions = {}): Promise<number | string | Date | null> {
        const query = this.query().select(`MAX(${String(field)}) as max`);

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<{ max: number | string | Date }>(sql, params);
        return result.results[0]?.max || null;
    }

    /**
     * Perform multiple aggregate operations at once
     */
    async aggregate(operations: {
        count?: boolean;
        sum?: (keyof T)[];
        avg?: (keyof T)[];
        min?: (keyof T)[];
        max?: (keyof T)[];
    }, options: AggregateOptions = {}): Promise<AggregateResult | AggregateResult[]> {
        const selectParts: string[] = [];

        if (operations.count) {
            selectParts.push('COUNT(*) as count');
        }

        if (operations.sum) {
            for (const field of operations.sum) {
                selectParts.push(`SUM(${String(field)}) as sum_${String(field)}`);
            }
        }

        if (operations.avg) {
            for (const field of operations.avg) {
                selectParts.push(`AVG(${String(field)}) as avg_${String(field)}`);
            }
        }

        if (operations.min) {
            for (const field of operations.min) {
                selectParts.push(`MIN(${String(field)}) as min_${String(field)}`);
            }
        }

        if (operations.max) {
            for (const field of operations.max) {
                selectParts.push(`MAX(${String(field)}) as max_${String(field)}`);
            }
        }

        if (selectParts.length === 0) {
            throw new Error('At least one aggregate operation must be specified');
        }

        const query = this.query().select(...selectParts);

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        if (options.groupBy) {
            for (const field of options.groupBy) {
                query.groupBy(field);
                // Add group by fields to select
                if (!selectParts.some(part => part.includes(field))) {
                    query.select(field);
                }
            }
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<any>(sql, params);

        if (options.groupBy) {
            // Return array of results for grouped data
            return result.results as AggregateResult[];
        } else {
            // Return single result object
            return result.results[0] || {} as AggregateResult;
        }
    }

    /**
     * Group by field(s) and count
     */
    async groupBy(fields: (keyof T)[], options: AggregateOptions = {}): Promise<Array<Record<string, any> & { count: number }>> {
        const fieldStrings = fields.map(f => String(f));
        const query = this.query()
            .select(...fieldStrings, 'COUNT(*) as count')
            .groupBy(...fieldStrings);

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<Record<string, any> & { count: number }>(sql, params);
        return result.results;
    }

    /**
     * Get distinct values for a field
     */
    async distinct(field: keyof T, options: AggregateOptions = {}): Promise<any[]> {
        const query = this.query().select(`DISTINCT ${String(field)} as value`);

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<{ value: any }>(sql, params);
        return result.results.map(row => row.value);
    }

    /**
     * Count distinct values for a field
     */
    async countDistinct(field: keyof T, options: AggregateOptions = {}): Promise<number> {
        const query = this.query().select(`COUNT(DISTINCT ${String(field)}) as count`);

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        const { sql, params } = query.build();
        const result = await this.executeQuery<{ count: number }>(sql, params);
        return result.results[0]?.count || 0;
    }

    /**
     * Get percentile value for a numeric field
     */
    async percentile(field: keyof T, percentile: number, options: AggregateOptions = {}): Promise<number | null> {
        if (percentile < 0 || percentile > 100) {
            throw new Error('Percentile must be between 0 and 100');
        }

        // SQLite doesn't have built-in percentile functions, so we'll use a workaround
        const query = this.query();

        if (options.where) {
            this.addWhereConditions(query, options.where);
        }

        // First get the count
        const countResult = await this.count(options);
        if (countResult === 0) {
            return null;
        }

        // Calculate the position
        const position = Math.ceil((percentile / 100) * countResult);

        // Get the value at that position
        const valueQuery = this.query()
            .select(String(field))
            .orderBy(String(field), 'ASC')
            .limit(1)
            .offset(position - 1);

        if (options.where) {
            this.addWhereConditions(valueQuery, options.where);
        }

        const { sql, params } = valueQuery.build();
        const result = await this.executeQuery<any>(sql, params);
        return result.results[0]?.[String(field)] || null;
    }

    /**
     * Get median value for a numeric field
     */
    async median(field: keyof T, options: AggregateOptions = {}): Promise<number | null> {
        return this.percentile(field, 50, options);
    }

    /**
     * Get statistical summary of a numeric field
     */
    async stats(field: keyof T, options: AggregateOptions = {}): Promise<{
        count: number;
        sum: number;
        avg: number;
        min: number | null;
        max: number | null;
        median?: number | null;
    }> {
        const [count, sum, avg, min, max] = await Promise.all([
            this.count(options),
            this.sum(field, options),
            this.avg(field, options),
            this.min(field, options),
            this.max(field, options)
        ]);

        return {
            count,
            sum,
            avg,
            min: min as number | null,
            max: max as number | null
        };
    }
}
