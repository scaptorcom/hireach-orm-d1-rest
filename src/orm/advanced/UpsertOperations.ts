/**
 * Upsert Operations Mixin
 * Handles Update or Insert operations
 */

import { CrudOperations } from './CrudOperations.js';

export class UpsertOperations<T extends Record<string, any> = any> extends CrudOperations<T> {
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
}
