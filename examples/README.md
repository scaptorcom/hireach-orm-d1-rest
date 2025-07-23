# D1 ORM Examples

This folder contains practical examples demonstrating how to use D1 ORM in real-world scenarios.

## 📁 Examples

### 1. `simple-orm-example.ts`

**Basic Usage Example**

Shows the fundamentals of D1 ORM:

- Model definition with basic field types
- CRUD operations (Create, Read, Update, Delete)
- Simple queries and filtering
- Basic validation
- Lifecycle hooks

**Run:**

```bash
npm run example:simple
```

### 2. `advanced-models.ts`

**Complex Models Example**

Demonstrates advanced model features:

- Complex field validation
- Custom validators
- Enums and constraints
- Soft deletes
- Timestamps
- Advanced hooks

**Run:**

```bash
npm run example:advanced
```

### 3. `relationships-example.ts`

**Relationships and Complex Queries**

Shows how to work with related data:

- Foreign key relationships
- Complex JOIN queries
- Query builder usage
- Data aggregation
- Comment threading
- Pagination with relationships

**Run:**

```bash
npm run example:relationships
```

## 🚀 Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up your environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your Cloudflare D1 credentials
   ```

3. **Run any example:**

   ```bash
   # Simple example
   npm run example:simple

   # Advanced models
   npm run example:advanced

   # Relationships
   npm run example:relationships
   ```

## 🔧 Configuration

Each example uses the `createDatabaseService()` function to connect to your D1 database. Make sure you have:

1. **Cloudflare D1 Database** set up
2. **Environment variables** configured:
   ```env
   CLOUDFLARE_D1_TOKEN=your_token_here
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_DATABASE_ID=your_database_id
   CLOUDFLARE_DATABASE_NAME=your_database_name
   ```

## 📚 What You'll Learn

### Basic Concepts

- Defining models with schemas
- Field types and validation
- CRUD operations
- Query building

### Advanced Features

- Relationships and foreign keys
- Complex queries with JOINs
- Pagination
- Hooks and middleware
- Soft deletes
- Bulk operations

### Real-World Patterns

- Blog system with users, posts, and comments
- E-commerce with products and categories
- Comment threading
- User roles and permissions

## 🎯 Next Steps

After running these examples:

1. **Study the code** to understand the patterns
2. **Modify the examples** to experiment with different features
3. **Build your own models** based on your application needs
4. **Read the full documentation** in the main README

## 🤝 Contributing

Found an issue or want to add a new example? Please:

1. Fork the repository
2. Create a new example file
3. Add documentation
4. Submit a pull request

## 📝 License

These examples are part of the D1 ORM project and are licensed under the MIT License.
