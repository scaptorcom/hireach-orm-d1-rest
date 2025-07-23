/**
 * Database Error Debugging Helper
 * This script helps debug specific database errors with detailed output
 */

import { D1ORM, createDatabaseService } from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugDatabaseError() {
    try {
        console.log('🔍 Starting Database Error Debug Session...\n');

        // Enable debug mode
        process.env.DEBUG_SQL = 'true';
        process.env.NODE_ENV = 'development';

        const db = await createDatabaseService({
            token: process.env.CLOUDFLARE_D1_TOKEN!,
            accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
            databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
            databaseName: process.env.CLOUDFLARE_DATABASE_NAME!
        });

        const orm = new D1ORM({ database: db, logging: true });

        // Define a simple User model to test
        const User = orm.define('User', {
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
                required: false,
                min: 13,
                max: 120
            },
            status: {
                type: 'string',
                required: true,
                default: 'active',
                enum: ['active', 'inactive', 'pending']
            }
        }, {
            tableName: 'debug_users',
            timestamps: true
        });

        // Create table
        console.log('🏗️ Creating table...');
        await orm.sync({ force: true });
        console.log('✅ Table created successfully\n');

        // Test data scenarios that commonly cause errors
        const testCases = [
            {
                name: 'Valid data',
                data: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    age: 30
                }
            },
            {
                name: 'Missing required field (no email)',
                data: {
                    name: 'Jane Smith',
                    age: 25
                }
            },
            {
                name: 'Invalid enum value',
                data: {
                    name: 'Bob Wilson',
                    email: 'bob@example.com',
                    status: 'unknown' // Invalid enum value
                }
            },
            {
                name: 'String too long',
                data: {
                    name: 'A'.repeat(150), // Exceeds maxLength of 100
                    email: 'long@example.com'
                }
            },
            {
                name: 'Invalid age (too young)',
                data: {
                    name: 'Young User',
                    email: 'young@example.com',
                    age: 5 // Below minimum of 13
                }
            },
            {
                name: 'Wrong data type (age as string)',
                data: {
                    name: 'Type Error User',
                    email: 'type@example.com',
                    age: 'thirty' // Should be number
                }
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n🧪 Testing: ${testCase.name}`);
            console.log('📝 Data:', JSON.stringify(testCase.data, null, 2));

            try {
                // Use debug helper to analyze the data first
                const debugInfo = User.debugInsertData(testCase.data);

                console.log('🔍 Debug Analysis:');
                console.log('📋 Prepared Data:', JSON.stringify(debugInfo.preparedData, null, 2));
                console.log('✅ Validation Valid:', debugInfo.validation.isValid);

                if (!debugInfo.validation.isValid) {
                    console.log('❌ Validation Errors:', debugInfo.validation.errors);
                }

                if (debugInfo.suggestions.length > 0) {
                    console.log('💡 Suggestions:');
                    debugInfo.suggestions.forEach(suggestion => {
                        console.log(`   • ${suggestion}`);
                    });
                }

                // Attempt to create the record
                const result = await User.create(testCase.data);
                console.log('✅ Success:', result);

            } catch (error) {
                console.log('❌ Error occurred:');

                if (error instanceof Error) {
                    console.log('📝 Error Message:', error.message);

                    // Show additional debug info if available
                    const errorWithDebug = error as any;
                    if (errorWithDebug.sql) {
                        console.log('🔍 SQL Query:', errorWithDebug.sql);
                    }
                    if (errorWithDebug.params) {
                        console.log('📋 Parameters:', errorWithDebug.params);
                    }
                    if (errorWithDebug.tableName) {
                        console.log('🏷️ Table:', errorWithDebug.tableName);
                    }
                    if (errorWithDebug.originalError) {
                        console.log('🔧 Original Error:', errorWithDebug.originalError.message);
                    }
                }

                console.log(''); // Empty line for readability
            }
        }

        console.log('\n📊 Debug Session Complete!');
        console.log('\nTo enable debug mode in your application, set:');
        console.log('• process.env.DEBUG_SQL = "true"');
        console.log('• process.env.NODE_ENV = "development"');

    } catch (error) {
        console.error('❌ Debug session failed:', error);
    }
}

// Export for use in other scripts
export { debugDatabaseError };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    debugDatabaseError();
}
