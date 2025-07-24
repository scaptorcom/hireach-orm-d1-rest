# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-01-24

### Added

- **Modular Architecture**: Complete refactoring of AdvancedModel into specialized operation classes

  - `BaseModel`: Core database operations and error handling
  - `CrudOperations`: Create, Read, Update, Delete operations
  - `UpsertOperations`: Update-or-Insert operations with method overloading
  - `AggregateOperations`: Statistical and aggregate functions (sum, avg, min, max, count, distinct, percentile, median, stats, groupBy)
  - `BulkOperations`: Bulk processing capabilities
  - `DebugOperations`: Debug and analysis tools

- **Enhanced Aggregate Functions**: Comprehensive statistical operations

  - `sum()`, `avg()`, `min()`, `max()` - Basic aggregate functions
  - `count()` with flexible syntax: `count({ where: {...} })` and `count({...})`
  - `distinct()`, `countDistinct()` - Unique value operations
  - `percentile()`, `median()` - Statistical percentile calculations
  - `stats()` - Complete statistical summary
  - `groupBy()` - Group records with aggregate counts

- **Prisma-Style Syntax Support**: Enhanced FindOptions interface

  - `take` and `skip` aliases for `limit` and `offset`
  - Object format for `select`: `{ id: true, name: true, email: false }`
  - Object format for `orderBy`: `{ createdAt: 'DESC', name: 'ASC' }`
  - Backward compatibility with existing array-based syntax

- **Method Overloading**: Enhanced delete operations
  - New syntax: `delete({ where: { userId } })`
  - Legacy syntax still supported: `delete({ userId })`

### Changed

- **BREAKING**: `update()` method now returns `QueryResult<T>` instead of `number`

  - Provides access to full query metadata (duration, rows affected, etc.)
  - All dependent functions updated to extract `result.meta.changes`
  - Better debugging capabilities with detailed query information

- **Enhanced Error Handling**: Improved error parsing and debugging
  - Detailed SQL error messages with table context
  - Enhanced debug logging for development environments
  - Better error categorization for common D1/SQLite errors

### Enhanced

- **FindOptions Interface**: Support for multiple syntax styles

  - Array format: `select: ['id', 'name']`, `orderBy: [{ field: 'name', direction: 'ASC' }]`
  - Object format: `select: { id: true, name: true }`, `orderBy: { name: 'ASC' }`
  - String format: `orderBy: 'name'`

- **Bulk Operations**: Improved bulk processing with better error handling
- **Debug Tools**: Enhanced table analysis and data inspection capabilities
- **TypeScript Support**: Improved type safety across all operation classes

### Migration Guide

```typescript
// ✅ New Prisma-style syntax (now supported)
const payments = await Model.findAll({
  where: { userId },
  orderBy: { createdAt: "DESC" }, // Object format
  take: 5, // Prisma-style limit
  select: {
    // Object format
    id: true,
    amount: true,
    status: true,
  },
});

// ✅ New count syntax
const count = await Model.count({
  where: { userId, status: "completed" },
});

// ✅ Enhanced delete syntax
const deleted = await Model.delete({
  where: { userId },
});

// ⚠️ Update method return type change
// OLD: const affectedRows = await Model.update(data, where);
// NEW: const result = await Model.update(data, where);
//      const affectedRows = result.meta.changes || 0;
```

## [1.1.0] - 2024-01-XX

### Added

- Flexible configuration API for database connections
- Support for explicit configuration parameters in `createDatabaseService()`
- New `D1ConnectionConfig` interface for better type safety
- Configuration examples showing multiple setup approaches

### Changed

- **BREAKING**: `createDatabaseService()` now accepts optional configuration parameters
- ConfigManager now supports lazy loading of environment variables
- Improved developer experience by reducing dependency on environment variables

### Enhanced

- Updated all examples to demonstrate both explicit config and environment variable approaches
- Comprehensive documentation for configuration options
- Added configuration-examples.ts with practical usage patterns

### Migration Guide

```typescript
// Old approach (still supported as fallback)
const db = await createDatabaseService();

// New recommended approach
const db = await createDatabaseService({
  accountId: "your-account-id",
  databaseId: "your-database-id",
  token: "your-token",
  databaseName: "your-database-name",
});
```

## [1.0.0] - 2024-01-XX

### Added

- Initial release of Hireach D1 ORM
- Core ORM functionality for Cloudflare D1
- TypeScript support with full type safety
- Migration system
- Query Builder with advanced features
- Relationship support (hasMany, belongsTo, hasOne)
- Model validation and sanitization
- Configuration management system
- Comprehensive examples and documentation
