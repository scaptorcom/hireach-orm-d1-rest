/**
 * Query Builder for D1 ORM
 * Provides a fluent interface for building SQL queries
 */

export type WhereOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'NOT LIKE' | 'IN' | 'NOT IN' | 'BETWEEN' | 'IS NULL' | 'IS NOT NULL';
export type OrderDirection = 'ASC' | 'DESC';
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

export interface WhereCondition {
    field: string;
    operator: WhereOperator;
    value?: any;
    values?: any[]; // For IN, NOT IN, BETWEEN
}

export interface JoinCondition {
    type: JoinType;
    table: string;
    on: string;
    alias?: string;
}

export interface OrderByCondition {
    field: string;
    direction: OrderDirection;
}

export class QueryBuilder {
    private _select: string[] = ['*'];
    private _from: string = '';
    private _where: WhereCondition[] = [];
    private _joins: JoinCondition[] = [];
    private _orderBy: OrderByCondition[] = [];
    private _groupBy: string[] = [];
    private _having: WhereCondition[] = [];
    private _limit?: number;
    private _offset?: number;
    private _distinct: boolean = false;

    constructor(tableName?: string) {
        if (tableName) {
            this._from = tableName;
        }
    }

    /**
     * Set the table to select from
     */
    from(tableName: string): QueryBuilder {
        this._from = tableName;
        return this;
    }

    /**
     * Set the fields to select
     */
    select(...fields: string[]): QueryBuilder {
        this._select = fields.length > 0 ? fields : ['*'];
        return this;
    }

    /**
     * Add DISTINCT to the query
     */
    distinct(): QueryBuilder {
        this._distinct = true;
        return this;
    }

    /**
     * Add WHERE conditions
     */
    where(field: string, operator: WhereOperator, value?: any): QueryBuilder {
        this._where.push({ field, operator, value });
        return this;
    }

    /**
     * Add WHERE IN condition
     */
    whereIn(field: string, values: any[]): QueryBuilder {
        this._where.push({ field, operator: 'IN', values });
        return this;
    }

    /**
     * Add WHERE NOT IN condition
     */
    whereNotIn(field: string, values: any[]): QueryBuilder {
        this._where.push({ field, operator: 'NOT IN', values });
        return this;
    }

    /**
     * Add WHERE BETWEEN condition
     */
    whereBetween(field: string, min: any, max: any): QueryBuilder {
        this._where.push({ field, operator: 'BETWEEN', values: [min, max] });
        return this;
    }

    /**
     * Add WHERE NULL condition
     */
    whereNull(field: string): QueryBuilder {
        this._where.push({ field, operator: 'IS NULL' });
        return this;
    }

    /**
     * Add WHERE NOT NULL condition
     */
    whereNotNull(field: string): QueryBuilder {
        this._where.push({ field, operator: 'IS NOT NULL' });
        return this;
    }

    /**
     * Add WHERE LIKE condition
     */
    whereLike(field: string, pattern: string): QueryBuilder {
        this._where.push({ field, operator: 'LIKE', value: pattern });
        return this;
    }

    /**
     * Add JOIN
     */
    join(table: string, on: string, type: JoinType = 'INNER', alias?: string): QueryBuilder {
        this._joins.push({ type, table, on, alias });
        return this;
    }

    /**
     * Add INNER JOIN
     */
    innerJoin(table: string, on: string, alias?: string): QueryBuilder {
        return this.join(table, on, 'INNER', alias);
    }

    /**
     * Add LEFT JOIN
     */
    leftJoin(table: string, on: string, alias?: string): QueryBuilder {
        return this.join(table, on, 'LEFT', alias);
    }

    /**
     * Add RIGHT JOIN
     */
    rightJoin(table: string, on: string, alias?: string): QueryBuilder {
        return this.join(table, on, 'RIGHT', alias);
    }

    /**
     * Add ORDER BY
     */
    orderBy(field: string, direction: OrderDirection = 'ASC'): QueryBuilder {
        this._orderBy.push({ field, direction });
        return this;
    }

    /**
     * Add GROUP BY
     */
    groupBy(...fields: string[]): QueryBuilder {
        this._groupBy.push(...fields);
        return this;
    }

    /**
     * Add HAVING conditions
     */
    having(field: string, operator: WhereOperator, value?: any): QueryBuilder {
        this._having.push({ field, operator, value });
        return this;
    }

    /**
     * Set LIMIT
     */
    limit(count: number): QueryBuilder {
        this._limit = count;
        return this;
    }

    /**
     * Set OFFSET
     */
    offset(count: number): QueryBuilder {
        this._offset = count;
        return this;
    }

    /**
     * Set pagination (limit and offset)
     */
    paginate(page: number, perPage: number): QueryBuilder {
        this._limit = perPage;
        this._offset = (page - 1) * perPage;
        return this;
    }

    /**
     * Build the SQL query and parameters
     */
    build(): { sql: string; params: any[] } {
        const params: any[] = [];
        let sql = '';

        // SELECT clause
        const distinct = this._distinct ? 'DISTINCT ' : '';
        sql += `SELECT ${distinct}${this._select.join(', ')}`;

        // FROM clause
        if (this._from) {
            sql += ` FROM ${this._from}`;
        }

        // JOIN clauses
        for (const join of this._joins) {
            const tableAlias = join.alias ? `${join.table} AS ${join.alias}` : join.table;
            sql += ` ${join.type} JOIN ${tableAlias} ON ${join.on}`;
        }

        // WHERE clause
        if (this._where.length > 0) {
            const whereConditions = this._where.map(condition => {
                return this.buildWhereCondition(condition, params);
            });
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        // GROUP BY clause
        if (this._groupBy.length > 0) {
            sql += ` GROUP BY ${this._groupBy.join(', ')}`;
        }

        // HAVING clause
        if (this._having.length > 0) {
            const havingConditions = this._having.map(condition => {
                return this.buildWhereCondition(condition, params);
            });
            sql += ` HAVING ${havingConditions.join(' AND ')}`;
        }

        // ORDER BY clause
        if (this._orderBy.length > 0) {
            const orderConditions = this._orderBy.map(order => `${order.field} ${order.direction}`);
            sql += ` ORDER BY ${orderConditions.join(', ')}`;
        }

        // LIMIT clause
        if (this._limit !== undefined) {
            sql += ` LIMIT ${this._limit}`;
        }

        // OFFSET clause
        if (this._offset !== undefined) {
            sql += ` OFFSET ${this._offset}`;
        }

        return { sql, params };
    }

    /**
     * Build WHERE condition string
     */
    private buildWhereCondition(condition: WhereCondition, params: any[]): string {
        const { field, operator, value, values } = condition;

        switch (operator) {
            case 'IS NULL':
            case 'IS NOT NULL':
                return `${field} ${operator}`;

            case 'IN':
            case 'NOT IN':
                if (values && values.length > 0) {
                    const placeholders = values.map(() => '?').join(', ');
                    params.push(...values);
                    return `${field} ${operator} (${placeholders})`;
                }
                return '1=0'; // No values provided, return false condition

            case 'BETWEEN':
                if (values && values.length === 2) {
                    params.push(values[0], values[1]);
                    return `${field} ${operator} ? AND ?`;
                }
                return '1=0'; // Invalid BETWEEN values

            default:
                params.push(value);
                return `${field} ${operator} ?`;
        }
    }

    /**
     * Create a new QueryBuilder instance
     */
    static create(tableName?: string): QueryBuilder {
        return new QueryBuilder(tableName);
    }

    /**
     * Clone the current query builder
     */
    clone(): QueryBuilder {
        const cloned = new QueryBuilder();
        cloned._select = [...this._select];
        cloned._from = this._from;
        cloned._where = [...this._where];
        cloned._joins = [...this._joins];
        cloned._orderBy = [...this._orderBy];
        cloned._groupBy = [...this._groupBy];
        cloned._having = [...this._having];
        cloned._limit = this._limit;
        cloned._offset = this._offset;
        cloned._distinct = this._distinct;
        return cloned;
    }

    /**
     * Build COUNT query
     */
    buildCount(): { sql: string; params: any[] } {
        const params: any[] = [];
        let sql = `SELECT COUNT(*) as count FROM ${this._from}`;

        // JOIN clauses
        for (const join of this._joins) {
            const tableAlias = join.alias ? `${join.table} AS ${join.alias}` : join.table;
            sql += ` ${join.type} JOIN ${tableAlias} ON ${join.on}`;
        }

        // WHERE clause
        if (this._where.length > 0) {
            const whereConditions = this._where.map(condition => {
                return this.buildWhereCondition(condition, params);
            });
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        // GROUP BY clause
        if (this._groupBy.length > 0) {
            sql += ` GROUP BY ${this._groupBy.join(', ')}`;
        }

        // HAVING clause
        if (this._having.length > 0) {
            const havingConditions = this._having.map(condition => {
                return this.buildWhereCondition(condition, params);
            });
            sql += ` HAVING ${havingConditions.join(' AND ')}`;
        }

        return { sql, params };
    }

    /**
     * Build UPDATE query
     */
    buildUpdate(data: Record<string, any>): { sql: string; params: any[] } {
        const params: any[] = [];
        const setClause: string[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                setClause.push(`${key} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) {
            throw new Error('No fields to update');
        }

        let sql = `UPDATE ${this._from} SET ${setClause.join(', ')}`;

        // WHERE clause
        if (this._where.length > 0) {
            const whereConditions = this._where.map(condition => {
                return this.buildWhereCondition(condition, params);
            });
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        return { sql, params };
    }

    /**
     * Build DELETE query
     */
    buildDelete(): { sql: string; params: any[] } {
        const params: any[] = [];
        let sql = `DELETE FROM ${this._from}`;

        // WHERE clause
        if (this._where.length > 0) {
            const whereConditions = this._where.map(condition => {
                return this.buildWhereCondition(condition, params);
            });
            sql += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        return { sql, params };
    }
}
