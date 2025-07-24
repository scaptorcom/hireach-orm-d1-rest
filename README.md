# D1 ORM

A powerful, type-safe ORM for Cloudflare D1 that provides a familiar API similar to Sequelize and Mongoose. Build database applications with ease using schema definitions, query builders, hooks, and more!

[![npm version](https://badge.fury.io/js/hireach-d1.svg)](https://badge.fury.io/js/hireach-d1)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **📝 Schema Definition** - Define models with type-safe schemas like Mongoose
- **🔍 Query Builder** - Fluent query interface for complex SQL operations
- **🎣 Hooks & Middleware** - beforeCreate, afterUpdate, and more lifecycle hooks
- **📊 Relationships** - Define foreign keys and table relationships
- **✅ Validation** - Built-in field validation with custom validators
- **📄 Pagination** - Easy pagination with findAndCountAll
- **🗃️ Migrations** - Auto-generate migrations from schema definitions
- **💾 Soft Deletes** - Optional soft delete functionality
- **📈 Timestamps** - Automatic created_at/updated_at handling
- **🔒 Type Safety** - Full TypeScript support with strong typing
- **🏗️ Modular Architecture** - Separated concerns with specialized operation classes
- **📊 Advanced Aggregates** - Statistical functions (sum, avg, percentile, median, groupBy)
- **🎨 Prisma-Style Syntax** - Familiar syntax with object-based options
- **🔄 Method Overloading** - Flexible API with multiple syntax styles
- **🐛 Enhanced Debugging** - Detailed error messages and query analysis tools

## 📦 Installation

```bash
npm install hireach-d1
```

## 🔧 Configuration

### **Method 1: Explicit Configuration (Recommended)**

Pass your Cloudflare D1 credentials directly to the `createDatabaseService` function:

```typescript
import { D1ORM, createDatabaseService } from "hireach-d1";

const db = await createDatabaseService({
  token: "your_cloudflare_api_token",
  accountId: "your_account_id",
  databaseId: "your_database_id",
  databaseName: "your_database_name",
});

const orm = new D1ORM({ database: db });
```

### **Method 2: Environment Variables (Legacy)**

Set these environment variables and call `createDatabaseService()` without parameters:

```env
CLOUDFLARE_D1_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_DATABASE_ID=your_database_id
CLOUDFLARE_DATABASE_NAME=your_database_name
```

```typescript
// Will automatically read from environment variables
const db = await createDatabaseService();
```

## 🎯 Quick Start

### 1. Initialize the ORM

```typescript
import { D1ORM, createDatabaseService } from "hireach-d1";

// Method 1: With explicit configuration (Recommended)
const db = await createDatabaseService({
  token: "your_cloudflare_api_token",
  accountId: "your_account_id",
  databaseId: "your_database_id",
  databaseName: "your_database_name",
});

// Method 2: Using environment variables (Legacy)
// Set CLOUDFLARE_D1_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_DATABASE_NAME
// const db = await createDatabaseService();

const orm = new D1ORM({
  database: db,
  logging: true,
});
```

### 2. Define Your Models

```typescript
// Define a User model
const User = orm.define(
  "User",
  {
    id: {
      type: "number",
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: "string",
      required: true,
      maxLength: 100,
    },
    email: {
      type: "string",
      required: true,
      unique: true,
      validate: (email: string) => {
        return email.includes("@") || "Invalid email";
      },
    },
    age: {
      type: "number",
      min: 13,
      max: 120,
    },
    active: {
      type: "boolean",
      default: true,
    },
  },
  {
    tableName: "users",
    timestamps: true, // Adds created_at/updated_at
    softDeletes: true, // Adds deleted_at for soft deletes
    hooks: {
      beforeCreate: async (userData) => {
        console.log("Creating user:", userData.email);
      },
      afterCreate: async (user) => {
        console.log("User created:", user.id);
      },
    },
  }
);
```

### 3. Create Tables

```typescript
// Sync all models to database
await orm.sync({ force: true }); // force: true drops existing tables
```

### 4. Use Your Models

```typescript
// Create records
const user = await User.create({
  name: "John Doe",
  email: "john@example.com",
  age: 30,
});

// Find records with enhanced syntax options
const users = await User.findAll({
  where: { active: true },
  orderBy: [{ field: "created_at", direction: "DESC" }], // Array format
  limit: 10,
});

// 🆕 Prisma-style syntax (v1.2.0+)
const payments = await PaymentHistory.findAll({
  where: { userId },
  orderBy: { createdAt: "DESC" }, // Object format
  take: 5, // Prisma-style limit
  select: {
    // Object format
    id: true,
    type: true,
    amount: true,
    status: true,
  },
});

// Find with pagination
const result = await User.findAndCountAll({
  where: { age: { operator: ">", value: 18 } },
  page: 1,
  perPage: 20,
});

// Update records
const updatedUser = await User.updateById(user.id, {
  age: 31,
});

// 🆕 Enhanced delete syntax (v1.2.0+)
await User.delete({ where: { id: user.id } }); // New syntax
await User.delete({ id: user.id }); // Legacy syntax (still works)
```

## 📊 Aggregate Functions (v1.2.0+)

```typescript
// Statistical operations
const totalRevenue = await Payment.sum("amount", {
  where: { status: "completed" },
});

const averageAge = await User.avg("age");
const oldestUser = await User.max("age");
const youngestUser = await User.min("age");

// Count with flexible syntax
const completedPayments = await Payment.count({
  where: { userId, status: "completed" },
});

// Advanced statistics
const ageStats = await User.stats("age", {
  where: { active: true },
});
// Returns: { count, sum, avg, min, max, median }

// Group by operations
const usersByRole = await User.groupBy(["role"], {
  where: { active: true },
});
// Returns: [{ role: 'admin', count: 5 }, { role: 'user', count: 150 }]

// Distinct values
const uniqueCountries = await User.distinct("country");
const uniqueCountryCount = await User.countDistinct("country");

// Percentile calculations
const p95ResponseTime = await ApiLog.percentile("responseTime", 95);
const medianResponseTime = await ApiLog.median("responseTime");
```

## 📚 Documentation

For detailed documentation, examples, and API reference, visit our [GitHub repository](https://github.com/hireach/d1-orm).

### Examples

- [Simple Usage](examples/simple-orm-example.ts) - Basic CRUD operations
- [Advanced Models](examples/advanced-models.ts) - Complex schemas and relationships
- [Relationships](examples/relationships-example.ts) - Foreign keys and joins

## 🏗️ Modular Architecture (v1.2.0+)

The ORM now features a modular architecture with specialized operation classes:

```typescript
import {
  AdvancedModel, // Complete ORM with all features
  BaseModel, // Core database operations
  CrudOperations, // Create, Read, Update, Delete
  UpsertOperations, // Update-or-Insert operations
  AggregateOperations, // Statistical functions
  BulkOperations, // Bulk processing
  DebugOperations, // Debug and analysis tools
} from "hireach-d1";

// The AdvancedModel combines all operation types
const User = new AdvancedModel(db, userSchema);

// Access to all operation types:
await User.create(data); // CRUD
await User.upsert(data, ["email"]); // Upsert
await User.sum("age"); // Aggregate
await User.bulkCreate(records); // Bulk
await User.analyzeTable(); // Debug
```

### Operation Classes

- **`BaseModel`**: Foundation with database connectivity and error handling
- **`CrudOperations`**: Standard Create, Read, Update, Delete operations
- **`UpsertOperations`**: Update-or-Insert with Prisma-style compatibility
- **`AggregateOperations`**: Statistical functions and data analysis
- **`BulkOperations`**: Efficient batch processing for large datasets
- **`DebugOperations`**: Development tools for debugging and analysis

## 🔍 Query Builder

```typescript
// Complex queries with joins
const posts = await orm
  .query("posts")
  .select("posts.title", "users.name as author")
  .leftJoin("users", "posts.user_id = users.id")
  .where("posts.published", "=", true)
  .orderBy("posts.created_at", "DESC")
  .limit(5);

const { sql, params } = posts.build();
const results = await orm.raw(sql, params);
```

## 🎣 Hooks & Lifecycle Events

```typescript
const Post = orm.define(
  "Post",
  {
    /* field definitions */
  },
  {
    hooks: {
      beforeCreate: async (data) => {
        // Auto-generate slug
        if (!data.slug && data.title) {
          data.slug = data.title.toLowerCase().replace(/\\s+/g, "-");
        }
      },
      afterCreate: async (post) => {
        console.log("New post created:", post.title);
      },
    },
  }
);
```

## 📄 Pagination

```typescript
const result = await User.findAndCountAll({
  where: { active: true },
  page: 1,
  perPage: 20,
  orderBy: [{ field: "created_at", direction: "DESC" }],
});

console.log({
  users: result.data,
  total: result.total,
  page: result.page,
  totalPages: result.totalPages,
  hasNext: result.hasNext,
  hasPrev: result.hasPrev,
});
```

## 🔗 Relationships & Foreign Keys

```typescript
const Post = orm.define("Post", {
  id: { type: "number", primaryKey: true, autoIncrement: true },
  title: { type: "string", required: true },
  user_id: {
    type: "number",
    required: true,
    references: {
      table: "users",
      field: "id",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
});
```

## ✅ Validation

```typescript
const User = orm.define("User", {
  email: {
    type: "string",
    required: true,
    validate: (email: string) => {
      const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      return emailRegex.test(email) || "Invalid email format";
    },
  },
  role: {
    type: "string",
    enum: ["user", "admin", "moderator"],
    default: "user",
  },
});
```

## 🗃️ Migrations

```typescript
// Generate migration for a model
const migration = orm.generateMigration("User");
console.log(migration);

// Generate migrations for all models
const allMigrations = orm.generateAllMigrations();
```

## 🔄 Bulk Operations

```typescript
// Bulk create with error handling
const result = await User.bulkCreate(
  [
    { name: "John", email: "john@example.com" },
    { name: "Jane", email: "jane@example.com" },
  ],
  { continueOnError: true }
);

console.log(`Created: ${result.length} users`);

// Bulk update (returns QueryResult with metadata)
const updateResult = await User.update({ active: false }, { role: "temp" });
console.log(`Updated: ${updateResult.meta.changes} users`);

// Bulk delete with new syntax
const deletedCount = await User.delete({
  where: { role: "temp" },
});
```

## � Debug & Analysis Tools (v1.2.0+)

```typescript
// Debug data before insertion
const debugInfo = User.debugInsertData({
  name: "Test User",
  email: "test@example.com",
});
console.log("Prepared data:", debugInfo);

// Analyze table structure and statistics
const analysis = await User.analyzeTable();
console.log({
  recordCount: analysis.recordCount,
  suggestions: analysis.suggestions,
  fieldCount: analysis.fieldCount,
});

// Enhanced error messages
try {
  await User.create({ name: "John" }); // Missing required email
} catch (error) {
  // Error: Field 'email' cannot be null
  console.error(error.message);
}
```

## �🔧 Configuration

```typescript
const orm = new D1ORM({
  database: db,
  autoSync: false, // Don't auto-sync schemas
  logging: true, // Enable SQL logging
});
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Roadmap

### ✅ Completed (v1.2.0)

- [x] **Modular architecture** with separated operation classes
- [x] **Advanced aggregate functions** (sum, avg, min, max, count, distinct, percentile, median, stats, groupBy)
- [x] **Prisma-style syntax** support for findAll operations
- [x] **Enhanced error handling** with detailed debugging information
- [x] **Method overloading** for flexible API usage

### 🚧 In Progress

- [ ] Advanced relationship handling (hasMany, belongsTo) with eager loading
- [ ] Query result caching system
- [ ] Connection pooling for better performance

### 🎯 Planned

- [ ] Schema versioning and automatic migrations
- [ ] More SQL functions and operators
- [ ] Database introspection tools
- [ ] Performance monitoring and optimization
- [ ] Real-time subscriptions for data changes

## ❤️ Support

If you find this project helpful, please give it a ⭐️ on [GitHub](https://github.com/hireach/d1-orm)!

For questions, issues, or feature requests, please [open an issue](https://github.com/hireach/d1-orm/issues).
