/**
 * Simple Usage Example - How to use hireach-d1 as an external library
 * This shows the simplest way to get started with the ORM
 */

import { D1ORM, createDatabaseService } from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Simple Blog Models Example
async function createBlogModels() {
    try {
        const CLOUDFLARE_D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN!;
        const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
        const CLOUDFLARE_DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID!;
        const CLOUDFLARE_DATABASE_NAME = process.env.CLOUDFLARE_DATABASE_NAME!;

        if (!CLOUDFLARE_D1_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_DATABASE_ID || !CLOUDFLARE_DATABASE_NAME) {
            throw new Error('Missing Cloudflare D1 configuration. Please set environment variables or pass config explicitly.');
        }

        // Check if we have configuration available
        const hasConfiguration = process.env.CLOUDFLARE_D1_TOKEN &&
            process.env.CLOUDFLARE_ACCOUNT_ID &&
            process.env.CLOUDFLARE_DATABASE_ID &&
            process.env.CLOUDFLARE_DATABASE_NAME;

        if (!hasConfiguration) {
            console.log('⚠️  Missing Cloudflare D1 configuration');
            console.log('📝 Please set environment variables or pass config explicitly');
            throw new Error('Configuration required. Please check .env.example for setup instructions');
        }

        // Option 1: Initialize database with explicit configuration (Recommended)
        const db = await createDatabaseService({
            token: process.env.CLOUDFLARE_D1_TOKEN!,
            accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
            databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
            databaseName: process.env.CLOUDFLARE_DATABASE_NAME!
        });

        // Option 2: Initialize database using environment variables (Legacy)
        // const db = await createDatabaseService();

        const orm = new D1ORM({
            database: db,
            logging: true
        });

        // Define a simple User model
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
                unique: true,
                validate: (email: string) => {
                    return email.includes('@') || 'Invalid email';
                }
            },
            age: {
                type: 'number',
                required: false,
                min: 13,
                max: 120
            },
            active: {
                type: 'boolean',
                default: true
            }
        }, {
            tableName: 'users',
            timestamps: true
        });

        // Define a simple Post model
        const Post = orm.define('Post', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            title: {
                type: 'string',
                required: true,
                maxLength: 200
            },
            content: {
                type: 'text',
                required: true
            },
            author_id: {
                type: 'number',
                required: true,
                references: {
                    table: 'users',
                    field: 'id',
                    onDelete: 'CASCADE'
                }
            },
            published: {
                type: 'boolean',
                default: false
            }
        }, {
            tableName: 'posts',
            timestamps: true
        });

        return { orm, User, Post };

    } catch (error) {
        console.error('❌ Failed to create blog models:', error);
        throw error;
    }
}

// Usage demonstration
async function simpleUsageDemo() {
    try {
        console.log('🚀 Starting Simple ORM Example...');
        const { orm, User, Post } = await createBlogModels(); try {
            // Create tables
            await orm.sync({ force: true }); // Force recreate tables
            console.log('✅ Tables created successfully!');

            // Small delay to ensure tables are ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create a user
            const user = await User.create({
                name: 'Alice Johnson',
                email: 'alice@example.com',
                age: 28
            });
            console.log('✅ User created:', user);

            // Create a post
            const post = await Post.create({
                title: 'My First Blog Post',
                content: 'This is the content of my first blog post using D1 ORM!',
                author_id: user.id,
                published: true
            });
            console.log('✅ Post created:', post);

            // Find all users
            const allUsers = await User.findAll();
            console.log('✅ All users:', allUsers);

            // Find posts with pagination
            const postsResult = await Post.findAndCountAll({
                where: { published: true },
                page: 1,
                perPage: 10
            });
            console.log('✅ Published posts:', postsResult);

            // Update a user
            const updatedUser = await User.updateById(user.id, {
                age: 29
            });
            console.log('✅ Updated user:', updatedUser);

            // Search users
            const searchResults = await User.findAll({
                where: {
                    name: { operator: 'LIKE', value: '%Alice%' }
                }
            });
            console.log('✅ Search results:', searchResults);

            // Count records
            const userCount = await User.count();
            const postCount = await Post.count({ published: true });
            console.log('✅ Counts:', { users: userCount, posts: postCount });

            // Use query builder for complex queries
            const complexQuery = orm.query('posts')
                .select('posts.title', 'users.name as author')
                .leftJoin('users', 'posts.author_id = users.id')
                .where('posts.published', '=', true)
                .orderBy('posts.created_at', 'DESC')
                .limit(5);

            const { sql, params } = complexQuery.build();
            const results = await orm.raw(sql, params);
            console.log('✅ Complex query results:', results);

        } catch (error) {
            console.error('❌ Error in simple usage demo:', error);

            if (error instanceof Error) {
                console.error('Error details:', {
                    name: error.name,
                    message: error.message
                });
            }

            // Don't re-throw, let the demo continue to show other examples
        }
    } catch (error) {
        console.error('❌ Failed to run simple usage demo:', error);
        throw error;
    }
}
// Advanced usage with hooks
async function advancedUsageDemo() {
    try {
        console.log('🔧 Starting Advanced Usage Demo...');
        const db = await createDatabaseService();
        const orm = new D1ORM({ database: db, logging: true });

        // Define Product model with hooks
        const Product = orm.define('Product', {
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
            price: {
                type: 'number',
                required: true,
                min: 0
            },
            category: {
                type: 'string',
                required: true,
                enum: ['electronics', 'clothing', 'books', 'toys']
            },
            sku: {
                type: 'string',
                required: true,
                unique: true
            },
            in_stock: {
                type: 'boolean',
                default: true
            }
        }, {
            tableName: 'products',
            timestamps: true,
            softDeletes: true,
            hooks: {
                beforeCreate: async (productData) => {
                    // Auto-generate SKU if not provided
                    if (!productData.sku) {
                        productData.sku = `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    }
                    console.log('Creating product with SKU:', productData.sku);
                },
                afterCreate: async (product) => {
                    console.log('Product created successfully:', product.name);
                },
                beforeUpdate: async (data, where) => {
                    if (data.price) {
                        console.log('Price update detected for products matching:', where);
                    }
                }
            }
        });

        try {
            await orm.sync({ force: true });

            // Create products
            const products = await Product.bulkCreate([
                {
                    name: 'Laptop',
                    price: 999.99,
                    category: 'electronics'
                },
                {
                    name: 'T-Shirt',
                    price: 19.99,
                    category: 'clothing'
                },
                {
                    name: 'Programming Book',
                    price: 39.99,
                    category: 'books'
                }
            ]);
            console.log('✅ Products created:', products.length);

            // Find expensive products
            const expensiveProducts = await Product.findAll({
                where: {
                    price: { operator: '>', value: 50 }
                },
                orderBy: [{ field: 'price', direction: 'DESC' }]
            });
            console.log('✅ Expensive products:', expensiveProducts);

            // Update prices
            const updatedCount = await Product.update(
                { price: 899.99 },
                { category: 'electronics' }
            );
            console.log('✅ Updated products:', updatedCount);

            // Soft delete
            const softDeletedCount = await Product.softDelete({ category: 'toys' });
            console.log('✅ Soft deleted:', softDeletedCount);

            // Find with different conditions
            const clothingProducts = await Product.findAll({
                where: { category: 'clothing', in_stock: true }
            });
            console.log('✅ Clothing products:', clothingProducts);

        } catch (error) {
            console.error('❌ Error in advanced usage demo:', error);

            if (error instanceof Error) {
                console.error('Error details:', {
                    name: error.name,
                    message: error.message
                });
            }
        }
    } catch (error) {
        console.error('❌ Failed to run advanced usage demo:', error);
        throw error;
    }
}

// Export the examples
export {
    createBlogModels,
    simpleUsageDemo,
    advancedUsageDemo
};

// Main execution - run both demos if this file is executed directly
async function main() {
    try {
        console.log('🚀 Running Simple ORM Examples');
        console.log('==============================\n');

        // Run simple usage demo
        await simpleUsageDemo();

        console.log('\n' + '='.repeat(50) + '\n');

        // Run advanced usage demo
        await advancedUsageDemo();

        console.log('\n🎉 All examples completed successfully!');
    } catch (error) {
        console.error('❌ Examples failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

