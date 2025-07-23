/**
 * Test Upsert vs Update vs CreateIfNotExists
 * Demonstrates the differences between these operations
 */

import { D1ORM } from '../src/orm/index.js';
import { createDatabaseService } from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
    token: process.env.CLOUDFLARE_D1_TOKEN || 'PHC0fExwg0zF1Yf3bHrGspdbU6aESoXCHS_eCxpg',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '3999a90f4a54d4d5ae548e9c288ae7e7',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || '400a6d2c-0026-4db7-9a24-594b39715eb7',
    databaseName: process.env.CLOUDFLARE_DATABASE_NAME || 'd1-test'
};

async function testUpsertOperations() {
    console.log('🧪 Testing Update vs Upsert vs CreateIfNotExists');
    console.log('================================================');

    try {
        // Initialize database connection
        const db = await createDatabaseService(config);
        const orm = new D1ORM({ database: db, logging: true });

        // Define a simple Product model
        const Product = orm.define('Product', {
            id: { type: 'number', primaryKey: true, autoIncrement: true },
            sku: { type: 'string', required: true, unique: true },
            name: { type: 'string', required: true },
            price: { type: 'number', required: true, min: 0 },
            category: { type: 'string', required: true },
            stock: { type: 'number', required: true, default: 0 }
        }, {
            tableName: 'test_products',
            timestamps: true
        });

        await orm.sync({ force: true });

        console.log('\n📦 Initial Setup: Creating some test products...');

        // Create initial products
        const product1 = await Product.create({
            sku: 'LAPTOP001',
            name: 'Gaming Laptop',
            price: 1299.99,
            category: 'electronics',
            stock: 10
        });
        console.log('✅ Created product 1:', { id: product1.id, sku: product1.sku, name: product1.name });

        const product2 = await Product.create({
            sku: 'PHONE001',
            name: 'Smartphone',
            price: 699.99,
            category: 'electronics',
            stock: 25
        });
        console.log('✅ Created product 2:', { id: product2.id, sku: product2.sku, name: product2.name });

        console.log('\n🔄 Test 1: UPDATE Operation');
        console.log('----------------------------');

        // Update existing product
        const updateCount = await Product.update(
            { price: 1199.99, stock: 8 },
            { sku: 'LAPTOP001' }
        );
        console.log(`✅ Updated ${updateCount} product(s) with SKU LAPTOP001`);

        // Try to update non-existing product
        const updateCount2 = await Product.update(
            { price: 599.99 },
            { sku: 'NONEXISTENT' }
        );
        console.log(`⚠️  Tried to update non-existing SKU - updated ${updateCount2} product(s)`);

        console.log('\n🔄 Test 2: UPSERT Operation (Original Syntax)');
        console.log('----------------------------------------------');

        // Upsert existing product (should update)
        const upsert1 = await Product.upsert({
            sku: 'LAPTOP001',
            name: 'Updated Gaming Laptop',
            price: 1099.99,
            category: 'electronics',
            stock: 5
        }, ['sku']);
        console.log(`✅ Upsert existing: ${upsert1.created ? 'Created' : 'Updated'} - ${upsert1.record.name}`);

        // Upsert non-existing product (should create)
        const upsert2 = await Product.upsert({
            sku: 'TABLET001',
            name: 'New Tablet',
            price: 399.99,
            category: 'electronics',
            stock: 15
        }, ['sku']);
        console.log(`✅ Upsert new: ${upsert2.created ? 'Created' : 'Updated'} - ${upsert2.record.name}`);

        console.log('\n🔄 Test 3: UPSERT Operation (Prisma-style Syntax)');
        console.log('------------------------------------------------');

        // Upsert existing product using Prisma-style (should update)
        const upsert3 = await Product.upsert({
            where: { sku: 'PHONE001' },
            create: {
                sku: 'PHONE001',
                name: 'Brand New Smartphone',
                price: 799.99,
                category: 'electronics',
                stock: 20
            },
            update: {
                name: 'Updated Smartphone Pro',
                price: 649.99,
                stock: 35
            }
        });
        console.log(`✅ Prisma-style upsert existing: ${upsert3.created ? 'Created' : 'Updated'} - ${upsert3.record.name}`);

        // Upsert non-existing product using Prisma-style (should create)
        const upsert4 = await Product.upsert({
            where: { sku: 'HEADPHONES001' },
            create: {
                sku: 'HEADPHONES001',
                name: 'Wireless Headphones',
                price: 199.99,
                category: 'electronics',
                stock: 25
            },
            update: {
                name: 'Updated Headphones',
                price: 179.99
            }
        });
        console.log(`✅ Prisma-style upsert new: ${upsert4.created ? 'Created' : 'Updated'} - ${upsert4.record.name}`);

        console.log('\n🔄 Test 4: UPSERT BY ID Operation');
        console.log('-----------------------------------');

        // Upsert existing ID (should update)
        const upsertById1 = await Product.upsertById(product2.id, {
            name: 'Updated Smartphone',
            price: 649.99,
            stock: 30
        });
        console.log(`✅ UpsertById existing: ${upsertById1.created ? 'Created' : 'Updated'} - ${upsertById1.record.name}`);

        // Upsert with new ID (should create) - Note: This might not work with auto-increment IDs
        try {
            const upsertById2 = await Product.upsertById(999, {
                sku: 'WATCH001',
                name: 'Smartwatch',
                price: 299.99,
                category: 'electronics',
                stock: 12
            });
            console.log(`✅ UpsertById new: ${upsertById2.created ? 'Created' : 'Updated'} - ${upsertById2.record.name}`);
        } catch (error) {
            console.log('⚠️  UpsertById with specific ID failed (expected with auto-increment):', error instanceof Error ? error.message : error);
        }

        console.log('\n🔄 Test 5: CREATE IF NOT EXISTS Operation');
        console.log('------------------------------------------');

        // CreateIfNotExists with existing SKU (should return existing)
        const createIfNotExists1 = await Product.createIfNotExists({
            sku: 'LAPTOP001',
            name: 'Another Laptop',
            price: 999.99,
            category: 'electronics',
            stock: 3
        }, ['sku']);
        console.log(`✅ CreateIfNotExists existing: ${createIfNotExists1.created ? 'Created' : 'Found existing'} - ${createIfNotExists1.record.name}`);

        // CreateIfNotExists with new SKU (should create)
        const createIfNotExists2 = await Product.createIfNotExists({
            sku: 'MOUSE001',
            name: 'Gaming Mouse',
            price: 89.99,
            category: 'electronics',
            stock: 50
        }, ['sku']);
        console.log(`✅ CreateIfNotExists new: ${createIfNotExists2.created ? 'Created' : 'Found existing'} - ${createIfNotExists2.record.name}`);

        console.log('\n📊 Final Results: All products in database');
        console.log('===========================================');

        const allProducts = await Product.findAll({
            orderBy: [{ field: 'id', direction: 'ASC' }]
        });

        allProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.sku} - ${product.name} - $${product.price} - Stock: ${product.stock}`);
        });

        console.log('\n📋 Summary of Operations:');
        console.log('========================');
        console.log('• UPDATE: Modifies existing records, does nothing if not found');
        console.log('• UPSERT (Original): Updates if exists, creates if not (requires uniqueFields)');
        console.log('• UPSERT (Prisma-style): Uses where/create/update pattern (more flexible)');
        console.log('• UPSERT BY ID: Updates by ID if exists, creates with specific ID if not');
        console.log('• CREATE IF NOT EXISTS: Creates only if not found, returns existing if found');
        console.log('\n🎯 Use Cases:');
        console.log('• UPDATE: When you know record exists and only want to modify');
        console.log('• UPSERT (Original): When you want to ensure data exists with latest values');
        console.log('• UPSERT (Prisma-style): When you need different data for create vs update');
        console.log('• CREATE IF NOT EXISTS: When you want to create only if missing');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testUpsertOperations();
}

export { testUpsertOperations };
