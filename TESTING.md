# 🧪 Local Testing Guide for D1 ORM

## 🚀 Quick Start Testing

### 1. **Set Up Environment**

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Cloudflare D1 credentials
nano .env
```

Your `.env` should look like:
```env
CLOUDFLARE_D1_TOKEN=your_actual_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_DATABASE_ID=your_database_id_here
CLOUDFLARE_DATABASE_NAME=your_database_name_here
```

### 2. **Install Dependencies**

```bash
npm install
```

### 3. **Build the Project**

```bash
npm run build
```

### 4. **Run Examples**

```bash
# Test simple usage
npm run example:simple

# Test advanced models
npm run example:advanced

# Test relationships
npm run example:relationships
```

## 🔧 **Alternative Testing Methods**

### **Option A: Direct TypeScript Execution**

```bash
# Run examples directly with tsx
npx tsx examples/simple-orm-example.ts
npx tsx examples/advanced-models.ts
npx tsx examples/relationships-example.ts
```

### **Option B: Test Individual Components**

Create a test file to test specific components:

```bash
# Create a test file
touch test-local.ts
```

Example content for `test-local.ts`:
```typescript
import { D1ORM, createDatabaseService } from './src/index.js';

async function testORM() {
    try {
        console.log('🚀 Testing D1 ORM locally...');
        
        // Test database connection
        const db = await createDatabaseService();
        console.log('✅ Database service created');
        
        // Test ORM initialization
        const orm = new D1ORM({ database: db, logging: true });
        console.log('✅ ORM initialized');
        
        // Test simple model definition
        const TestModel = orm.define('TestModel', {
            id: { type: 'number', primaryKey: true, autoIncrement: true },
            name: { type: 'string', required: true }
        });
        console.log('✅ Model defined');
        
        // Test table creation
        await orm.sync({ force: true });
        console.log('✅ Tables synced');
        
        console.log('🎉 All tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testORM();
```

Then run:
```bash
npx tsx test-local.ts
```

### **Option C: Use Node.js REPL**

```bash
# Start Node.js with TypeScript support
npx tsx

# Then in the REPL:
# > const { D1ORM, createDatabaseService } = await import('./src/index.js');
# > const db = await createDatabaseService();
# > const orm = new D1ORM({ database: db });
# > // Test your code interactively
```

## 🛠️ **Development Workflow**

### **Watch Mode for Development**

```bash
# Start TypeScript compiler in watch mode
npm run dev

# In another terminal, run examples
npm run example:simple
```

### **Testing After Changes**

```bash
# 1. Rebuild
npm run build

# 2. Test examples
npm run example:simple

# 3. Or test specific functionality
npx tsx your-test-file.ts
```

## 🔍 **Debugging Tips**

### **Enable Logging**

In your test code:
```typescript
const orm = new D1ORM({ 
    database: db, 
    logging: true  // Enable SQL logging
});
```

### **Check Database Connection**

```typescript
// Test connection first
try {
    const result = await db.query('SELECT 1 as test');
    console.log('Database connected:', result);
} catch (error) {
    console.error('Database connection failed:', error);
}
```

### **Verify Environment Variables**

```typescript
console.log('Environment check:', {
    hasToken: !!process.env.CLOUDFLARE_D1_TOKEN,
    hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
    hasDatabaseId: !!process.env.CLOUDFLARE_DATABASE_ID,
    hasDatabaseName: !!process.env.CLOUDFLARE_DATABASE_NAME
});
```

## 📋 **Common Issues & Solutions**

### **Issue: Module not found**
```bash
# Make sure you've built the project
npm run build
```

### **Issue: Environment variables not loaded**
```bash
# Make sure .env file exists and has correct values
cat .env
```

### **Issue: D1 API errors**
```bash
# Check your Cloudflare credentials
# Ensure your D1 database exists
# Verify API token permissions
```

### **Issue: TypeScript errors**
```bash
# Check for compilation errors
npx tsc --noEmit
```

## 🎯 **Expected Output**

When tests run successfully, you should see:
```
🚀 Testing D1 ORM locally...
✅ Database service created
✅ ORM initialized  
✅ Model defined
✅ Tables synced
✅ User created: { id: 1, name: 'Test User', ... }
✅ All tests passed!
```

## 🚀 **Next Steps**

Once local testing works:
1. Create more complex test scenarios
2. Test edge cases and error handling
3. Benchmark performance
4. Prepare for publishing to npm

Happy testing! 🎉
