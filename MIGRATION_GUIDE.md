# Migration Guide: v1.1.x → v1.2.0

This guide helps you migrate from D1 ORM v1.1.x to v1.2.0, which introduces modular architecture, enhanced FindOptions, and aggregate functions.

## 🚨 Breaking Changes

### 1. Update Method Return Type

**BREAKING CHANGE**: The `update()` method now returns `QueryResult<T>` instead of `number`.

```typescript
// ❌ OLD (v1.1.x)
const affectedRows = await User.update({ active: false }, { role: "temp" });
console.log(`Updated ${affectedRows} users`);

// ✅ NEW (v1.2.0)
const updateResult = await User.update({ active: false }, { role: "temp" });
const affectedRows = updateResult.meta.changes || 0;
console.log(`Updated ${affectedRows} users`);

// 💡 Access additional metadata
console.log({
  duration: updateResult.meta.duration,
  rowsRead: updateResult.meta.rows_read,
  rowsWritten: updateResult.meta.rows_written
});
```

### 2. Enhanced Error Handling

Error messages are now more detailed and specific:

```typescript
// ❌ OLD: Generic error messages
// ✅ NEW: Specific error categories
try {
  await User.create({ name: "John" }); // Missing email
} catch (error) {
  // Old: "Validation failed"
  // New: "Field 'email' cannot be null"
  console.error(error.message);
}
```

## 🆕 New Features (Fully Backward Compatible)

### 1. Prisma-Style Syntax

Your existing code continues to work, plus you can now use Prisma-style syntax:

```typescript
// ✅ EXISTING SYNTAX (still works)
const users = await User.findAll({
  select: ['id', 'name', 'email'],
  orderBy: [{ field: 'created_at', direction: 'DESC' }],
  limit: 10,
  offset: 20
});

// 🆕 NEW PRISMA-STYLE SYNTAX (v1.2.0+)
const users = await User.findAll({
  select: { id: true, name: true, email: true },
  orderBy: { created_at: 'DESC' },
  take: 10,
  skip: 20
});

// 🆕 MIXED SYNTAX (also works)
const users = await User.findAll({
  select: ['id', 'name'],           // Array format
  orderBy: { created_at: 'DESC' },  // Object format
  take: 10                          // Prisma-style
});
```

### 2. Enhanced Delete Syntax

```typescript
// ✅ EXISTING SYNTAX (still works)
await User.delete({ role: "temp" });

// 🆕 NEW EXPLICIT SYNTAX (v1.2.0+)
await User.delete({ where: { role: "temp" } });
```

### 3. Flexible Count Operations

```typescript
// ✅ EXISTING SYNTAX (still works)
const count = await User.count({ active: true });

// 🆕 NEW EXPLICIT SYNTAX (v1.2.0+)
const count = await User.count({ where: { active: true } });
```

### 4. Aggregate Functions

```typescript
// 🆕 NEW: Statistical operations
const totalRevenue = await Payment.sum('amount');
const averageAge = await User.avg('age');
const oldestUser = await User.max('created_at');

// 🆕 NEW: Advanced statistics
const stats = await User.stats('age', {
  where: { active: true }
});
// Returns: { count, sum, avg, min, max, median }

// 🆕 NEW: Group operations
const usersByRole = await User.groupBy(['role']);
// Returns: [{ role: 'admin', count: 5 }]

// 🆕 NEW: Distinct operations
const uniqueCountries = await User.distinct('country');
const uniqueCount = await User.countDistinct('country');
```

### 5. Debug and Analysis Tools

```typescript
// 🆕 NEW: Debug data preparation
const debugInfo = User.debugInsertData({
  name: "Test",
  email: "test@example.com"
});

// 🆕 NEW: Table analysis
const analysis = await User.analyzeTable();
console.log({
  recordCount: analysis.recordCount,
  suggestions: analysis.suggestions
});
```

## 📦 Import Changes

No import changes required! The modular architecture is internal:

```typescript
// ✅ SAME IMPORTS (no changes needed)
import { D1ORM, createDatabaseService, AdvancedModel } from "hireach-d1";

// 🆕 OPTIONAL: Import specific operation classes if needed
import { 
  BaseModel, 
  CrudOperations, 
  AggregateOperations 
} from "hireach-d1";
```

## 🔍 How to Update Your Code

### Step 1: Update Package

```bash
npm install hireach-d1@1.2.0
```

### Step 2: Fix Breaking Changes

Search your codebase for `.update(` calls and update them:

```bash
# Find all update calls
grep -r "\.update(" src/

# Common patterns to fix:
# - const count = await Model.update(...)
# - const result = await Model.update(...)
```

Replace with:

```typescript
const updateResult = await Model.update(data, where);
const count = updateResult.meta.changes || 0;
```

### Step 3: Optional Enhancements

Gradually adopt new features:

1. **Use Prisma-style syntax** for better readability
2. **Add aggregate functions** for statistics
3. **Use new debug tools** for development
4. **Adopt explicit where syntax** for consistency

## ⚡ Performance Notes

### Improvements in v1.2.0:

- **Better error handling** with faster error categorization
- **Modular architecture** with reduced memory footprint
- **Enhanced query metadata** for performance monitoring
- **Optimized aggregate functions** for statistical operations

### Migration Performance:

- **Zero-downtime**: All changes are backward compatible
- **Gradual adoption**: Migrate features incrementally
- **No schema changes**: Database structure unchanged

## 🆘 Troubleshooting

### Common Migration Issues:

1. **Update method errors**:
   ```typescript
   // Error: Cannot read property 'changes' of undefined
   // Fix: Check that you're accessing result.meta.changes
   const result = await Model.update(data, where);
   const count = result.meta?.changes || 0; // Safe access
   ```

2. **TypeScript errors with new syntax**:
   ```bash
   # Solution: Update TypeScript definitions
   npm install hireach-d1@1.2.0 --save
   ```

3. **Import errors**:
   ```typescript
   // Old working imports continue to work
   import { AdvancedModel } from "hireach-d1";
   ```

## 📞 Support

Need help with migration?

- 📖 [Full Documentation](https://github.com/hireach/d1-orm)
- 🐛 [Report Issues](https://github.com/hireach/d1-orm/issues)
- 💬 [Discussions](https://github.com/hireach/d1-orm/discussions)

---

**Migration Summary**: Most code continues to work without changes. Only the `update()` method return type requires updates. All new features are additive and optional.
