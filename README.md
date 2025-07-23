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

## 📦 Installation

```bash
npm install hireach-d1
```

## 🎯 Quick Start

### 1. Initialize the ORM

```typescript
import { D1ORM, createDatabaseService } from "hireach-d1";

// Initialize database and ORM
const db = await createDatabaseService();
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

// Find records
const users = await User.findAll({
  where: { active: true },
  orderBy: [{ field: "created_at", direction: "DESC" }],
  limit: 10,
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

// Delete records
await User.deleteById(user.id);
```

## 📚 Documentation

For detailed documentation, examples, and API reference, visit our [GitHub repository](https://github.com/hireach/d1-orm).

### Examples

- [Simple Usage](examples/simple-orm-example.ts) - Basic CRUD operations
- [Advanced Models](examples/advanced-models.ts) - Complex schemas and relationships
- [Relationships](examples/relationships-example.ts) - Foreign keys and joins

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
// Bulk create
const users = await User.bulkCreate([
  { name: "John", email: "john@example.com" },
  { name: "Jane", email: "jane@example.com" },
]);

// Bulk update
const updatedCount = await User.update({ active: false }, { role: "temp" });
```

## 🔧 Configuration

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

- [ ] Advanced relationship handling (hasMany, belongsTo)
- [ ] Connection pooling
- [ ] Query caching
- [ ] Schema versioning
- [ ] More SQL functions and operators

## ❤️ Support

If you find this project helpful, please give it a ⭐️ on [GitHub](https://github.com/hireach/d1-orm)!

For questions, issues, or feature requests, please [open an issue](https://github.com/hireach/d1-orm/issues).
