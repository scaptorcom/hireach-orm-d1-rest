export interface D1Config {
    token: string;
    accountId: string;
    databaseId: string;
    databaseName: string;
}

export interface Migration {
    id: string;
    name: string;
    sql: string;
    timestamp: number;
    applied: boolean;
}

export interface TableSchema {
    name: string;
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    constraints: ConstraintInfo[];
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
    primaryKey: boolean;
    autoIncrement: boolean;
}

export interface IndexInfo {
    name: string;
    columns: string[];
    unique: boolean;
    type: 'BTREE' | 'HASH' | 'RTREE';
}

export interface ConstraintInfo {
    name: string;
    type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
    columns: string[];
    referencedTable?: string;
    referencedColumns?: string[];
}

export interface QueryResult<T = any> {
    results: T[];
    success: boolean;
    meta: {
        changes?: number;
        last_row_id?: number;
        rows_read?: number;
        rows_written?: number;
        duration?: number;
    };
    error?: string;
}

export interface DatabaseInfo {
    name: string;
    size: number;
    tables: string[];
    version: string;
    created_at: string;
}

export interface D1Response<T = any> {
    success: boolean;
    result: T;
    errors: Array<{
        code: number;
        message: string;
    }>;
    messages: string[];
}
