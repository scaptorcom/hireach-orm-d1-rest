/**
 * Advanced Models Example - Complex relationships and validation
 * Demonstrates advanced features of D1 ORM
 */

import { D1ORM, FieldDefinition } from '../src/orm/index.js';
import { createDatabaseService } from '../src/index.js';

// Initialize ORM
const db = await createDatabaseService();
const orm = new D1ORM({
    database: db,
    autoSync: true,
    logging: true
});

// Define User model
const User = orm.define('User', {
    id: {
        type: 'number',
        primaryKey: true,
        autoIncrement: true,
        required: true
    },
    email: {
        type: 'string',
        required: true,
        unique: true,
        maxLength: 255,
        validate: (value: string) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) || 'Invalid email format';
        }
    },
    username: {
        type: 'string',
        required: true,
        unique: true,
        minLength: 3,
        maxLength: 50,
        validate: (value: string) => {
            return /^[a-zA-Z0-9_]+$/.test(value) || 'Username can only contain letters, numbers, and underscores';
        }
    },
    password_hash: {
        type: 'string',
        required: true,
        maxLength: 255
    },
    first_name: {
        type: 'string',
        required: true,
        maxLength: 100
    },
    last_name: {
        type: 'string',
        required: true,
        maxLength: 100
    },
    date_of_birth: {
        type: 'date',
        required: false
    },
    is_active: {
        type: 'boolean',
        required: true,
        default: true
    },
    role: {
        type: 'string',
        required: true,
        default: 'user',
        enum: ['user', 'admin', 'moderator']
    },
    last_login: {
        type: 'date',
        required: false
    }
}, {
    tableName: 'users',
    timestamps: true,
    softDeletes: true,
    indexes: [
        { fields: ['email'], unique: true },
        { fields: ['username'], unique: true },
        { fields: ['role'] },
        { fields: ['is_active', 'role'] }
    ],
    hooks: {
        beforeCreate: async (userData) => {
            console.log('About to create user:', userData.email);
        },
        afterCreate: async (user) => {
            console.log('User created successfully:', user.id);
        },
        beforeUpdate: async (data, where) => {
            if (data.last_login) {
                console.log('User logging in:', where);
            }
        }
    }
});

// Define Post model
const Post = orm.define('Post', {
    id: {
        type: 'number',
        primaryKey: true,
        autoIncrement: true,
        required: true
    },
    title: {
        type: 'string',
        required: true,
        maxLength: 200
    },
    slug: {
        type: 'string',
        required: true,
        unique: true,
        maxLength: 200
    },
    content: {
        type: 'text',
        required: true
    },
    excerpt: {
        type: 'string',
        required: false,
        maxLength: 500
    },
    status: {
        type: 'string',
        required: true,
        default: 'draft',
        enum: ['draft', 'published', 'archived']
    },
    user_id: {
        type: 'number',
        required: true,
        references: {
            table: 'users',
            field: 'id',
            onDelete: 'CASCADE'
        }
    },
    view_count: {
        type: 'number',
        required: true,
        default: 0,
        min: 0
    },
    featured: {
        type: 'boolean',
        required: true,
        default: false
    },
    published_at: {
        type: 'date',
        required: false
    },
    tags: {
        type: 'json',
        required: false,
        default: []
    }
}, {
    tableName: 'posts',
    timestamps: true,
    softDeletes: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] },
        { fields: ['published_at'] },
        { fields: ['status', 'published_at'] },
        { fields: ['featured', 'status'] }
    ],
    hooks: {
        beforeCreate: async (postData) => {
            // Auto-generate slug if not provided
            if (!postData.slug && postData.title) {
                postData.slug = postData.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
            }

            // Set published_at if status is published
            if (postData.status === 'published' && !postData.published_at) {
                postData.published_at = new Date();
            }
        },
        afterCreate: async (post) => {
            console.log('New post created:', post.title);
        }
    }
});

// Define Comment model
const Comment = orm.define('Comment', {
    id: {
        type: 'number',
        primaryKey: true,
        autoIncrement: true,
        required: true
    },
    content: {
        type: 'text',
        required: true,
        minLength: 1,
        maxLength: 2000
    },
    user_id: {
        type: 'number',
        required: true,
        references: {
            table: 'users',
            field: 'id',
            onDelete: 'CASCADE'
        }
    },
    post_id: {
        type: 'number',
        required: true,
        references: {
            table: 'posts',
            field: 'id',
            onDelete: 'CASCADE'
        }
    },
    parent_id: {
        type: 'number',
        required: false,
        references: {
            table: 'comments',
            field: 'id',
            onDelete: 'CASCADE'
        }
    },
    status: {
        type: 'string',
        required: true,
        default: 'pending',
        enum: ['pending', 'approved', 'rejected', 'spam']
    },
    ip_address: {
        type: 'string',
        required: false,
        maxLength: 45
    }
}, {
    tableName: 'comments',
    timestamps: true,
    softDeletes: true,
    indexes: [
        { fields: ['post_id'] },
        { fields: ['user_id'] },
        { fields: ['parent_id'] },
        { fields: ['status'] },
        { fields: ['post_id', 'status'] }
    ]
});

// Define Category model
const Category = orm.define('Category', {
    id: {
        type: 'number',
        primaryKey: true,
        autoIncrement: true,
        required: true
    },
    name: {
        type: 'string',
        required: true,
        unique: true,
        maxLength: 100
    },
    slug: {
        type: 'string',
        required: true,
        unique: true,
        maxLength: 100
    },
    description: {
        type: 'text',
        required: false
    },
    parent_id: {
        type: 'number',
        required: false,
        references: {
            table: 'categories',
            field: 'id',
            onDelete: 'SET NULL'
        }
    },
    sort_order: {
        type: 'number',
        required: true,
        default: 0
    },
    is_active: {
        type: 'boolean',
        required: true,
        default: true
    }
}, {
    tableName: 'categories',
    timestamps: true,
    indexes: [
        { fields: ['parent_id'] },
        { fields: ['is_active'] },
        { fields: ['sort_order'] }
    ]
});

// Usage examples
async function demonstrateORM() {
    try {
        // Sync all models to database
        await orm.sync({ force: true });
        console.log('All models synced!');

        // Create a user
        const user = await User.create({
            email: 'john@example.com',
            username: 'johndoe',
            password_hash: 'hashed_password_here',
            first_name: 'John',
            last_name: 'Doe',
            role: 'user'
        });
        console.log('Created user:', user);

        // Create a category
        const category = await Category.create({
            name: 'Technology',
            slug: 'technology',
            description: 'Posts about technology and programming'
        });

        // Create a post
        const post = await Post.create({
            title: 'Getting Started with D1 ORM',
            content: 'This is a comprehensive guide to using the D1 ORM...',
            excerpt: 'Learn how to use D1 ORM effectively',
            status: 'published',
            user_id: user.id,
            published_at: new Date()
        });
        console.log('Created post:', post);

        // Create a comment
        const comment = await Comment.create({
            content: 'Great article! Very helpful.',
            user_id: user.id,
            post_id: post.id,
            status: 'approved'
        });

        // Find users with pagination
        const usersResult = await User.findAndCountAll({
            where: { is_active: true },
            orderBy: [{ field: 'created_at', direction: 'DESC' }],
            page: 1,
            perPage: 10
        });
        console.log('Users with pagination:', usersResult);

        // Complex query using QueryBuilder
        const popularPosts = await orm.raw(`
            SELECT p.*, u.username, COUNT(c.id) as comment_count
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN comments c ON p.id = c.post_id AND c.status = 'approved'
            WHERE p.status = 'published'
            GROUP BY p.id
            HAVING comment_count > 0
            ORDER BY p.view_count DESC, comment_count DESC
            LIMIT 5
        `);
        console.log('Popular posts:', popularPosts);

        // Update with QueryBuilder
        const updatedCount = await User.update(
            { last_login: new Date() },
            { id: user.id }
        );
        console.log('Updated users:', updatedCount);

        // Search posts
        const searchResults = await Post.findAll({
            where: {
                status: 'published',
                title: { operator: 'LIKE', value: '%ORM%' }
            },
            orderBy: [{ field: 'published_at', direction: 'DESC' }],
            limit: 10
        });
        console.log('Search results:', searchResults);

        // Count records
        const totalUsers = await User.count({ is_active: true });
        const totalPosts = await Post.count({ status: 'published' });
        console.log('Totals:', { users: totalUsers, posts: totalPosts });

    } catch (error) {
        console.error('Error:', error);
    }
}

// Export models and ORM instance
export { orm, User, Post, Comment, Category, demonstrateORM };
