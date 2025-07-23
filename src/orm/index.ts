/**
 * D1 ORM - Main exports
 * A Sequelize/Mongoose-like ORM for Cloudflare D1
 */

// Main ORM class
export { D1ORM, D1ORMOptions } from './D1ORM';

// Core classes
export { AdvancedModel, ModelHooks, FindOptions, PaginatedResult } from './AdvancedModel';
export { Schema, SchemaDefinition, SchemaOptions, FieldDefinition } from './Schema';
export { QueryBuilder, WhereOperator, OrderDirection, JoinType } from './QueryBuilder';

// Re-export database service for convenience
export { DatabaseService } from '../classes/DatabaseService';
export { createDatabaseService } from '../database';
