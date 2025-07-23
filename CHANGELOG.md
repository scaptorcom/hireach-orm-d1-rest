# Changelog

All notable changes to this project will be documented in this file.

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
