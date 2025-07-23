/**
 * D1 ORM - Main exports
 * A Sequelize/Mongoose-like ORM for Cloudflare D1
 */

// Main ORM class
export { D1ORM, D1ORMOptions } from './D1ORM.js';

// Core classes
export { AdvancedModel, ModelHooks, FindOptions, PaginatedResult } from './AdvancedModel.js';
export { Schema, SchemaDefinition, SchemaOptions, FieldDefinition } from './Schema.js';
export { QueryBuilder, WhereOperator, OrderDirection, JoinType } from './QueryBuilder.js';

// Re-export database service for convenience
export { DatabaseService } from '../classes/DatabaseService.js';
export { createDatabaseService } from '../database.js';
