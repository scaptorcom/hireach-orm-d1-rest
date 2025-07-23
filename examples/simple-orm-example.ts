/**
 * Simple Usage Example - How to use hireach-d1 as an external library
 * This shows the simplest way to get started with the ORM
 */

import { D1ORM, createDatabaseService } from '../src/index.js';

// Simple Blog Models Example
async function createBlogModels() {
    // Initialize database and ORM
    const db = await createDatabaseService();
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
}

// Usage demonstration
async function simpleUsageDemo() {
    const { orm, User, Post } = await createBlogModels();

    try {
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
        console.error('❌ Error:', error);
    }
}

// Advanced usage with hooks
async function advancedUsageDemo() {
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
        console.error('❌ Error:', error);
    }
}

// Export the examples
export {
    createBlogModels,
    simpleUsageDemo,
    advancedUsageDemo
};

// Run simple demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    simpleUsageDemo().catch(console.error);
}
