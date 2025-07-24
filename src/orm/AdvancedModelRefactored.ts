/**
 * Advanced Model for D1 ORM with enhanced features
 * 
 * Features:
 * - CRUD operations with enhanced error handling
 * - Method overloading for flexible syntax
 * - Aggregate functions (sum, avg, min, max, count, etc.)
 * - Bulk operations
 * - Debug capabilities
 * - Modular architecture
 * 
 * @version 1.2.0
 */

// Export the new modular AdvancedModel
export { AdvancedModel } from './advanced/AdvancedModel.js';

// Re-export all interfaces for convenience
export type {
    ModelHooks,
    FindOptions,
    PaginatedResult,
    AggregateOptions,
    AggregateResult,
    BulkResult
} from './advanced/AdvancedModel.js';
