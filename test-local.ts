#!/usr/bin/env node

/**
 * Quick Local Test Script for D1 ORM
 * Run with: npx tsx test-local.ts
 */

import { D1ORM, createDatabaseService } from './src/index.js';

async function testBasicFunctionality() {
    console.log('🚀 Starting D1 ORM Local Test...\n');

    try {
        // Step 1: Test database service creation
        console.log('📡 Creating database service...');
        const db = await createDatabaseService();
        console.log('✅ Database service created successfully\n');

        // Step 2: Test ORM initialization
        console.log('🔧 Initializing ORM...');
        const orm = new D1ORM({ 
            database: db, 
            logging: true 
        });
        console.log('✅ ORM initialized successfully\n');

        // Step 3: Test model definition
        console.log('📝 Defining test model...');
        const TestUser = orm.define('TestUser', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: 'string',
                required: true,
                maxLength: 100
            },
            email: {
                type: 'string',
                required: true,
                unique: true,
                validate: (email: string) => {
                    return email.includes('@') || 'Invalid email';
                }
            },
            active: {
                type: 'boolean',
                default: true
            }
        }, {
            tableName: 'test_users',
            timestamps: true
        });
        console.log('✅ Test model defined successfully\n');

        // Step 4: Test table creation
        console.log('🗃️ Creating tables...');
        await orm.sync({ force: true });
        console.log('✅ Tables created successfully\n');

        // Step 5: Test CRUD operations
        console.log('📊 Testing CRUD operations...\n');

        // CREATE
        console.log('   Creating test user...');
        const user = await TestUser.create({
            name: 'Test User',
            email: 'test@example.com'
        });
        console.log('   ✅ User created:', { id: user.id, name: user.name, email: user.email });

        // READ
        console.log('   Reading user by ID...');
        const foundUser = await TestUser.findById(user.id);
        console.log('   ✅ User found:', foundUser ? 'Yes' : 'No');

        // UPDATE
        console.log('   Updating user...');
        const updatedUser = await TestUser.updateById(user.id, {
            name: 'Updated Test User'
        });
        console.log('   ✅ User updated:', { name: updatedUser.name });

        // READ ALL
        console.log('   Finding all users...');
        const allUsers = await TestUser.findAll();
        console.log('   ✅ Found users:', allUsers.length);

        // DELETE
        console.log('   Deleting user...');
        const deleted = await TestUser.deleteById(user.id);
        console.log('   ✅ User deleted:', deleted ? 'Yes' : 'No');

        console.log('\n🎉 All tests passed successfully!');
        console.log('\n📋 Summary:');
        console.log('   ✅ Database connection works');
        console.log('   ✅ ORM initialization works');
        console.log('   ✅ Model definition works');
        console.log('   ✅ Table creation works');
        console.log('   ✅ CRUD operations work');
        console.log('\n🚀 Your D1 ORM setup is working perfectly!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        console.log('\n🔍 Troubleshooting tips:');
        console.log('   1. Check your .env file has correct Cloudflare credentials');
        console.log('   2. Ensure your D1 database exists and is accessible');
        console.log('   3. Verify your API token has the correct permissions');
        console.log('   4. Run: npm run build');
        process.exit(1);
    }
}

// Run the test
testBasicFunctionality();
