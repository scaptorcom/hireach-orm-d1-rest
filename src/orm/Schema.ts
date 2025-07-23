/**
 * D1 ORM Schema Definition System
 * Similar to Mongoose/Sequelize schema definitions
 */

export interface FieldDefinition {
    type: 'string' | 'number' | 'boolean' | 'date' | 'text' | 'json';
    required?: boolean;
    unique?: boolean;
    primaryKey?: boolean;
    autoIncrement?: boolean;
    default?: any;
    maxLength?: number;
    minLength?: number;
    min?: number;
    max?: number;
    enum?: string[] | number[];
    validate?: (value: any) => boolean | string;
    index?: boolean;
    references?: {
        table: string;
        field: string;
        onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
        onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    };
}

export interface SchemaDefinition {
    [fieldName: string]: FieldDefinition;
}

export interface SchemaOptions {
    tableName?: string;
    timestamps?: boolean;
    softDeletes?: boolean;
    paranoid?: boolean;
    indexes?: Array<{
        fields: string[];
        unique?: boolean;
        name?: string;
    }>;
}

export class Schema {
    public fields: SchemaDefinition;
    public options: SchemaOptions;
    public tableName: string;

    constructor(definition: SchemaDefinition, options: SchemaOptions = {}) {
        this.fields = definition;
        this.options = {
            timestamps: true,
            softDeletes: false,
            paranoid: false,
            ...options
        };

        // Add timestamp fields if enabled
        if (this.options.timestamps) {
            this.fields.created_at = {
                type: 'date',
                required: true,
                default: () => new Date()
            };
            this.fields.updated_at = {
                type: 'date',
                required: true,
                default: () => new Date()
            };
        }

        // Add soft delete field if enabled
        if (this.options.softDeletes) {
            this.fields.deleted_at = {
                type: 'date',
                required: false,
                default: null
            };
        }

        this.tableName = options.tableName || '';
    }

    /**
     * Validate data against schema
     */
    validate(data: Record<string, any>): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (const [fieldName, fieldDef] of Object.entries(this.fields)) {
            const value = data[fieldName];

            // Check required fields (skip auto-increment fields during creation)
            if (fieldDef.required && !fieldDef.autoIncrement && (value === undefined || value === null)) {
                errors.push(`Field '${fieldName}' is required`);
                continue;
            }

            // Skip validation if value is undefined/null and not required
            if (value === undefined || value === null) {
                continue;
            }

            // Type validation
            if (!this.validateType(value, fieldDef.type)) {
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
     * Validate data type
     */
    private validateType(value: any, type: string): boolean {
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
     * Generate SQL CREATE TABLE statement
     */
    generateCreateTableSQL(): string {
        const columns: string[] = [];

        for (const [fieldName, fieldDef] of Object.entries(this.fields)) {
            let columnDef = `${fieldName} ${this.getSQLType(fieldDef)}`;

            if (fieldDef.primaryKey) {
                columnDef += ' PRIMARY KEY';
            }

            if (fieldDef.autoIncrement) {
                columnDef += ' AUTOINCREMENT';
            }

            if (fieldDef.required && !fieldDef.primaryKey) {
                columnDef += ' NOT NULL';
            }

            if (fieldDef.unique) {
                columnDef += ' UNIQUE';
            }

            if (fieldDef.default !== undefined) {
                if (typeof fieldDef.default === 'string') {
                    columnDef += ` DEFAULT '${fieldDef.default}'`;
                } else if (typeof fieldDef.default === 'number' || typeof fieldDef.default === 'boolean') {
                    columnDef += ` DEFAULT ${fieldDef.default}`;
                } else if (fieldDef.default === null) {
                    columnDef += ' DEFAULT NULL';
                } else if (typeof fieldDef.default === 'function') {
                    // For date fields with function defaults, use CURRENT_TIMESTAMP
                    if (fieldDef.type === 'date') {
                        columnDef += ' DEFAULT CURRENT_TIMESTAMP';
                    }
                }
            }

            columns.push(columnDef);
        }

        // Add foreign key constraints
        for (const [fieldName, fieldDef] of Object.entries(this.fields)) {
            if (fieldDef.references) {
                const onDelete = fieldDef.references.onDelete ? ` ON DELETE ${fieldDef.references.onDelete}` : '';
                const onUpdate = fieldDef.references.onUpdate ? ` ON UPDATE ${fieldDef.references.onUpdate}` : '';
                columns.push(`FOREIGN KEY (${fieldName}) REFERENCES ${fieldDef.references.table}(${fieldDef.references.field})${onDelete}${onUpdate}`);
            }
        }

        return `CREATE TABLE ${this.tableName} (\n  ${columns.join(',\n  ')}\n)`;
    }

    /**
     * Convert field type to SQL type
     */
    private getSQLType(fieldDef: FieldDefinition): string {
        switch (fieldDef.type) {
            case 'string':
                return fieldDef.maxLength ? `VARCHAR(${fieldDef.maxLength})` : 'TEXT';
            case 'number':
                return 'INTEGER';
            case 'boolean':
                return 'BOOLEAN';
            case 'date':
                return 'DATETIME';
            case 'text':
                return 'TEXT';
            case 'json':
                return 'TEXT'; // SQLite doesn't have native JSON, store as TEXT
            default:
                return 'TEXT';
        }
    }

    /**
     * Generate CREATE INDEX statements
     */
    generateIndexSQL(): string[] {
        const indexes: string[] = [];

        // Single field indexes
        for (const [fieldName, fieldDef] of Object.entries(this.fields)) {
            if (fieldDef.index && !fieldDef.primaryKey && !fieldDef.unique) {
                indexes.push(`CREATE INDEX idx_${this.tableName}_${fieldName} ON ${this.tableName}(${fieldName})`);
            }
        }

        // Composite indexes
        if (this.options.indexes) {
            for (const index of this.options.indexes) {
                const indexName = index.name || `idx_${this.tableName}_${index.fields.join('_')}`;
                const unique = index.unique ? 'UNIQUE ' : '';
                indexes.push(`CREATE ${unique}INDEX ${indexName} ON ${this.tableName}(${index.fields.join(', ')})`);
            }
        }

        return indexes;
    }
}
