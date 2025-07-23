/**
 * Test Required Fields with Default Values
 * This tests the behavior of required fields that have default values
 */

import { D1ORM, createDatabaseService } from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRequiredFieldsWithDefaults() {
    try {
        console.log('🧪 Testing Required Fields with Default Values...\n');

        const db = await createDatabaseService({
            token: process.env.CLOUDFLARE_D1_TOKEN!,
            accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
            databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
            databaseName: process.env.CLOUDFLARE_DATABASE_NAME!
        });

        const orm = new D1ORM({ database: db, logging: true });

        // Test Model 1: Required field with static default value
        const Settings = orm.define('Settings', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            user_id: {
                type: 'number',
                required: true
            },
            theme: {
                type: 'string',
                required: true,
                default: 'light',  // Required but has default
                enum: ['light', 'dark', 'auto']
            },
            notifications: {
                type: 'boolean',
                required: true,
                default: true  // Required but has default
            },
            language: {
                type: 'string',
                required: false,
                default: 'en'  // Not required, has default
            }
        }, {
            tableName: 'settings_test',
            timestamps: true
        });

        // Test Model 2: Required field with function default value
        const Orders = orm.define('Orders', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            order_number: {
                type: 'string',
                required: true,
                default: () => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`  // Required but has function default
            },
            status: {
                type: 'string',
                required: true,
                default: 'pending',  // Required but has default
                enum: ['pending', 'processing', 'completed', 'cancelled']
            },
            total: {
                type: 'number',
                required: true  // Required, NO default - should fail if not provided
            }
        }, {
            tableName: 'orders_test',
            timestamps: false
        });

        await orm.sync({ force: true });
        console.log('✅ Tables created\n');

        // Test 1: Create with minimal data (required fields with defaults should work)
        console.log('🧪 Test 1: Create with minimal data (required fields have defaults)');
        try {
            const setting1 = await Settings.create({
                user_id: 1
                // theme and notifications are required but have defaults
                // language is not required and has default
            });
            console.log('✅ Success - Required fields with defaults work:', setting1);
        } catch (error) {
            console.log('❌ Failed - Required fields with defaults:', error.message);
        }

        // Test 2: Create with some overrides
        console.log('\n🧪 Test 2: Create with overriding some defaults');
        try {
            const setting2 = await Settings.create({
                user_id: 2,
                theme: 'dark',  // Override default
                language: 'es'  // Override default
                // notifications will use default (true)
            });
            console.log('✅ Success - Overriding defaults works:', setting2);
        } catch (error) {
            console.log('❌ Failed - Overriding defaults:', error.message);
        }

        // Test 3: Create with function default (order_number)
        console.log('\n🧪 Test 3: Create with function defaults');
        try {
            const order1 = await Orders.create({
                total: 99.99  // Only provide required field without default
                // order_number and status should use defaults
            });
            console.log('✅ Success - Function defaults work:', order1);
        } catch (error) {
            console.log('❌ Failed - Function defaults:', error.message);
        }

        // Test 4: Missing required field without default (should fail)
        console.log('\n🧪 Test 4: Missing required field without default (should fail)');
        try {
            const order2 = await Orders.create({
                // Missing 'total' which is required and has no default
                // order_number and status should use defaults
            });
            console.log('❌ Unexpected success - should have failed:', order2);
        } catch (error) {
            console.log('✅ Expected failure - Missing required field:', error.message);
        }

        // Test 5: Invalid enum value (should fail)
        console.log('\n🧪 Test 5: Invalid enum value (should fail)');
        try {
            const setting3 = await Settings.create({
                user_id: 3,
                theme: 'rainbow'  // Invalid enum value
            });
            console.log('❌ Unexpected success - should have failed:', setting3);
        } catch (error) {
            console.log('✅ Expected failure - Invalid enum:', error.message);
        }

        console.log('\n📊 Summary:');
        console.log('• Required fields WITH defaults: Should work when not provided');
        console.log('• Required fields WITHOUT defaults: Should fail when not provided');
        console.log('• Function defaults: Should execute and provide values');
        console.log('• Validation: Should still apply to default and provided values');

    } catch (error) {
        console.error('❌ Test setup failed:', error);
    }
}

async function testSchemaChanges() {
    try {
        console.log('\n🔄 Testing Schema Changes...\n');

        const db = await createDatabaseService({
            token: process.env.CLOUDFLARE_D1_TOKEN!,
            accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
            databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
            databaseName: process.env.CLOUDFLARE_DATABASE_NAME!
        });

        // Original schema with required fields
        console.log('🧪 Step 1: Create original schema with required fields');
        const orm1 = new D1ORM({ database: db, logging: true });

        const User = orm1.define('User', {
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
                unique: true
            },
            age: {
                type: 'number',
                required: true,  // This will be removed later
                min: 13,
                max: 120
            },
            phone: {
                type: 'string',
                required: true   // This will be made optional later
            }
        }, {
            tableName: 'users_schema_test',
            timestamps: true
        });

        await orm1.sync({ force: true });
        console.log('✅ Original schema created');

        // Insert some data with original schema
        const user1 = await User.create({
            name: 'John Doe',
            email: 'john@example.com',
            age: 30,
            phone: '+1234567890'
        });
        console.log('✅ Data inserted with original schema:', user1);

        // Modified schema - remove required from some fields
        console.log('\n🧪 Step 2: Modify schema (remove required constraints)');
        const orm2 = new D1ORM({ database: db, logging: true });

        const UserModified = orm2.define('User', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: 'string',
                required: true,  // Still required
                maxLength: 100
            },
            email: {
                type: 'string',
                required: true,  // Still required
                unique: true
            },
            age: {
                type: 'number',
                required: false,  // Changed from required to optional
                min: 13,
                max: 120
            },
            phone: {
                type: 'string',
                required: false   // Changed from required to optional
            }
        }, {
            tableName: 'users_schema_test',
            timestamps: true
        });

        // Note: We're NOT calling sync() here to test schema compatibility
        console.log('✅ Modified schema defined (age and phone now optional)');

        // Test inserting with modified schema (missing previously required fields)
        console.log('\n🧪 Step 3: Test inserting with relaxed schema');
        try {
            const user2 = await UserModified.create({
                name: 'Jane Smith',
                email: 'jane@example.com'
                // age and phone are now optional - not provided
            });
            console.log('✅ Success - Insert with relaxed schema works:', user2);
        } catch (error) {
            console.log('❌ Failed - Insert with relaxed schema:', error.message);
        }

        // Test reading existing data
        console.log('\n🧪 Step 4: Test reading existing data with modified schema');
        try {
            const allUsers = await UserModified.findAll();
            console.log('✅ Success - Reading existing data works:', allUsers);
        } catch (error) {
            console.log('❌ Failed - Reading existing data:', error.message);
        }

        // Test updating existing data
        console.log('\n🧪 Step 5: Test updating existing data');
        try {
            const updatedUser = await UserModified.updateById(user1.id, {
                name: 'John Doe Updated'
                // Not updating age or phone
            });
            console.log('✅ Success - Updating existing data works:', updatedUser);
        } catch (error) {
            console.log('❌ Failed - Updating existing data:', error.message);
        }

        console.log('\n📊 Schema Change Summary:');
        console.log('• Removing required constraints: Generally safe for existing data');
        console.log('• Adding required constraints: May fail if existing data has nulls');
        console.log('• ORM schema changes: Only affect validation, not database structure');
        console.log('• Database migrations: Would be needed for actual schema changes');

    } catch (error) {
        console.error('❌ Schema change test failed:', error);
    }
}

// Main execution
async function main() {
    try {
        await testRequiredFieldsWithDefaults();
        await testSchemaChanges();
        console.log('\n🎉 All tests completed!');
    } catch (error) {
        console.error('❌ Tests failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { testRequiredFieldsWithDefaults, testSchemaChanges };
