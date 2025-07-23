/**
 * Advanced Models Example - Complex relationships and validation
 * Demonstrates advanced features of D1 ORM
 */

import { D1ORM, FieldDefinition } from '../src/orm/index.js';
import { createDatabaseService } from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file
// Main function to run the example
async function runAdvancedExample() {
    try {
        console.log('🚀 Starting Advanced D1 ORM Example...');

        // Check if we have configuration - either explicit or from env
        let db;
        const CLOUDFLARE_D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
        const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
        const CLOUDFLARE_DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;
        const CLOUDFLARE_DATABASE_NAME = process.env.CLOUDFLARE_DATABASE_NAME;

        const hasExplicitConfig = CLOUDFLARE_D1_TOKEN &&
            CLOUDFLARE_ACCOUNT_ID &&
            CLOUDFLARE_DATABASE_ID &&
            CLOUDFLARE_DATABASE_NAME;

        if (hasExplicitConfig) {
            console.log('📋 Using environment variables for configuration');
            // Initialize ORM with explicit configuration (Recommended approach)
            db = await createDatabaseService({
                token: CLOUDFLARE_D1_TOKEN!,
                accountId: CLOUDFLARE_ACCOUNT_ID!,
                databaseId: CLOUDFLARE_DATABASE_ID!,
                databaseName: CLOUDFLARE_DATABASE_NAME!
            });
        } else {
            console.log('⚠️  No environment variables found.');
            console.log('📝 This example requires Cloudflare D1 configuration.');
            console.log('');
            console.log('To run this example:');
            console.log('1. Copy .env.example to .env');
            console.log('2. Fill in your Cloudflare D1 credentials');
            console.log('3. Run the example again');
            console.log('');
            console.log('Alternative: Pass configuration directly to createDatabaseService():');
            console.log('```typescript');
            console.log('const db = await createDatabaseService({');
            console.log('  token: "your-token",');
            console.log('  accountId: "your-account-id",');
            console.log('  databaseId: "your-database-id",');
            console.log('  databaseName: "your-database-name"');
            console.log('});');
            console.log('```');
            console.log('');
            console.log('✅ Example structure is valid, but requires configuration to run');
            return;
        }

        const orm = new D1ORM({
            database: db,
            autoSync: true,
            logging: true
        });

        console.log('✅ Database connection established');

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

        console.log('📋 Models defined successfully');

        // Demonstrate ORM usage
        await demonstrateORM(orm, User, Post, Comment, Category);

    } catch (error) {
        console.error('❌ Error in advanced example:', error);

        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }

        process.exit(1);
    }
}

// Usage examples function
async function demonstrateORM(orm: D1ORM, User: any, Post: any, Comment: any, Category: any) {
    try {
        console.log('🔄 Starting ORM demonstration...');

        // Sync all models to database
        console.log('📦 Syncing models to database...');
        await orm.sync({ force: true });
        console.log('✅ All models synced!');

        // Create a user
        console.log('👤 Creating user...');
        const user = await User.create({
            email: 'john@example.com',
            username: 'johndoe',
            password_hash: 'hashed_password_here',
            first_name: 'John',
            last_name: 'Doe',
            role: 'user'
        });
        console.log('✅ Created user:', user);

        // Create a category
        console.log('📂 Creating category...');
        const category = await Category.create({
            name: 'Technology',
            slug: 'technology',
            description: 'Posts about technology and programming'
        });
        console.log('✅ Created category:', category);

        // Create a post
        console.log('📝 Creating post...');
        const post = await Post.create({
            title: 'Getting Started with D1 ORM',
            content: 'This is a comprehensive guide to using the D1 ORM...',
            excerpt: 'Learn how to use D1 ORM effectively',
            status: 'published',
            user_id: user.id,
            published_at: new Date()
        });
        console.log('✅ Created post:', post);

        // Create a comment
        console.log('💬 Creating comment...');
        const comment = await Comment.create({
            content: 'Great article! Very helpful.',
            user_id: user.id,
            post_id: post.id,
            status: 'approved'
        });
        console.log('✅ Created comment:', comment);

        // Find users with pagination
        console.log('🔍 Finding users with pagination...');
        const usersResult = await User.findAndCountAll({
            where: { is_active: true },
            orderBy: [{ field: 'created_at', direction: 'DESC' }],
            page: 1,
            perPage: 10
        });
        console.log('✅ Users with pagination:', usersResult);

        // Complex query using QueryBuilder
        console.log('📊 Running complex query...');
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
        console.log('✅ Popular posts:', popularPosts);

        // Update with QueryBuilder
        console.log('🔄 Updating user...');
        const updatedCount = await User.update(
            { last_login: new Date() },
            { id: user.id }
        );
        console.log('✅ Updated users:', updatedCount);

        // Search posts
        console.log('🔎 Searching posts...');
        const searchResults = await Post.findAll({
            where: {
                status: 'published',
                title: { operator: 'LIKE', value: '%ORM%' }
            },
            orderBy: [{ field: 'published_at', direction: 'DESC' }],
            limit: 10
        });
        console.log('✅ Search results:', searchResults);

        // Count records
        console.log('🔢 Counting records...');
        const totalUsers = await User.count({ is_active: true });
        const totalPosts = await Post.count({ status: 'published' });
        console.log('✅ Totals:', { users: totalUsers, posts: totalPosts });

        // Test bulk operations
        console.log('📦 Testing bulk operations...');
        await testBulkOperations(orm, User, Post, Comment, Category);

        // Test relationships and connections
        console.log('🔗 Testing relationships and connections...');
        await testRelationshipsAndConnections(orm, User, Post, Comment, Category);

        // Test advanced querying with relationships
        console.log('🔍 Testing advanced relationship queries...');
        await testAdvancedRelationshipQueries(orm, User, Post, Comment, Category);

        console.log('🎉 Advanced example completed successfully!');

    } catch (error) {
        console.error('❌ Error in ORM demonstration:', error);
        throw error; // Re-throw to be caught by main function
    }
}

// Test bulk operations
async function testBulkOperations(orm: D1ORM, User: any, Post: any, Comment: any, Category: any) {
    try {
        console.log('  📊 Creating bulk test data...');

        // Bulk create users
        const bulkUsers: any[] = [];
        for (let i = 1; i <= 5; i++) {
            bulkUsers.push({
                email: `user${i}@example.com`,
                username: `user${i}`,
                password_hash: `hashed_password_${i}`,
                first_name: `User`,
                last_name: `${i}`,
                role: i <= 2 ? 'admin' : 'user',
                is_active: i % 2 === 0 // Mix of active/inactive
            });
        }

        const createdUsers = await User.bulkCreate(bulkUsers);
        console.log(`  ✅ Bulk created ${createdUsers.length} users`);

        // Bulk create categories
        const bulkCategories = [
            { name: 'Programming', slug: 'programming', description: 'Programming tutorials and tips' },
            { name: 'Web Development', slug: 'web-dev', description: 'Web development guides' },
            { name: 'Database', slug: 'database', description: 'Database management and optimization' },
            { name: 'DevOps', slug: 'devops', description: 'DevOps practices and tools' }
        ];

        const createdCategories = await Category.bulkCreate(bulkCategories);
        console.log(`  ✅ Bulk created ${createdCategories.length} categories`);

        // Bulk create posts
        const bulkPosts: any[] = [];
        for (let i = 1; i <= 10; i++) {
            bulkPosts.push({
                title: `Bulk Post ${i}: Advanced Topics`,
                content: `This is the content for bulk post ${i}. It contains detailed information about advanced topics.`,
                excerpt: `Excerpt for post ${i}`,
                status: i % 3 === 0 ? 'draft' : 'published',
                user_id: createdUsers[i % createdUsers.length].id,
                view_count: Math.floor(Math.random() * 1000),
                featured: i % 4 === 0,
                tags: [`tag${i}`, `bulk`, `test`]
            });
        }

        const createdPosts = await Post.bulkCreate(bulkPosts);
        console.log(`  ✅ Bulk created ${createdPosts.length} posts`);

        // Test bulk updates
        console.log('  🔄 Testing bulk updates...');

        // Bulk update users - activate all inactive users
        const inactiveUsersUpdate = await User.update(
            { is_active: true },
            { is_active: false }
        );
        console.log(`  ✅ Bulk updated ${inactiveUsersUpdate} inactive users to active`);

        // Bulk update posts - increase view count for published posts
        const publishedPosts = await Post.findAll({ where: { status: 'published' } });
        for (const post of publishedPosts) {
            await Post.updateById(post.id, {
                view_count: post.view_count + 100
            });
        }
        console.log(`  ✅ Bulk updated view counts for ${publishedPosts.length} published posts`);

        // Bulk update posts with conditional logic
        const featuredPostsUpdate = await Post.update(
            { featured: true },
            { view_count: { operator: '>', value: 500 } }
        );
        console.log(`  ✅ Bulk updated ${featuredPostsUpdate} high-view posts to featured`);

        // Test bulk delete (soft delete)
        console.log('  🗑️ Testing bulk soft deletes...');

        // Soft delete draft posts
        const draftPosts = await Post.findAll({ where: { status: 'draft' } });
        for (const draftPost of draftPosts) {
            await Post.deleteById(draftPost.id);
        }
        console.log(`  ✅ Soft deleted ${draftPosts.length} draft posts`);

        // Verify soft deletes - count should exclude deleted
        const activePostCount = await Post.count({ status: 'published' });
        const allPostsIncludingDeleted = await orm.raw('SELECT COUNT(*) as count FROM posts');
        console.log(`  📊 Active posts: ${activePostCount}, Total in DB: ${allPostsIncludingDeleted[0].count}`);

    } catch (error) {
        console.error('  ❌ Bulk operations test failed:', error);
        throw error;
    }
}

// Test relationships and connections
async function testRelationshipsAndConnections(orm: D1ORM, User: any, Post: any, Comment: any, Category: any) {
    try {
        console.log('  🔗 Testing model relationships...');

        // Get a user and their posts
        const userWithPosts = await User.findOne({ where: { role: 'user' } });
        if (!userWithPosts) {
            console.log('  ⚠️ No regular users found for relationship testing');
            return;
        }

        // Find all posts by this user
        const userPosts = await Post.findAll({
            where: { user_id: userWithPosts.id }
        });
        console.log(`  ✅ Found ${userPosts.length} posts by user ${userWithPosts.username}`);

        // Create relationships through comments
        console.log('  💬 Creating comment relationships...');

        const otherUsers = await User.findAll({
            where: {
                id: { operator: '!=', value: userWithPosts.id },
                role: 'user'
            },
            limit: 3
        });

        // Create comments from different users on posts
        for (const post of userPosts.slice(0, 2)) {
            for (const commenter of otherUsers) {
                await Comment.create({
                    content: `Great post "${post.title}"! This is a comment from ${commenter.username}.`,
                    user_id: commenter.id,
                    post_id: post.id,
                    status: 'approved'
                });
            }
        }

        // Create nested comments (replies)
        const parentComment = await Comment.findOne();
        if (parentComment) {
            await Comment.create({
                content: 'This is a reply to the above comment.',
                user_id: userWithPosts.id,
                post_id: parentComment.post_id,
                parent_id: parentComment.id,
                status: 'approved'
            });
            console.log('  ✅ Created nested comment (reply)');
        }

        // Test category relationships
        console.log('  📂 Testing category relationships...');

        const categories = await Category.findAll({ limit: 2 });
        if (categories.length >= 2) {
            // Create parent-child category relationship
            await Category.updateById(categories[1].id, {
                parent_id: categories[0].id
            });
            console.log(`  ✅ Created parent-child relationship: ${categories[0].name} -> ${categories[1].name}`);

            // Find child categories
            const childCategories = await Category.findAll({
                where: { parent_id: categories[0].id }
            });
            console.log(`  ✅ Found ${childCategories.length} child categories`);
        }

        // Test connection integrity
        console.log('  🔍 Testing connection integrity...');

        // Verify user-post connections
        const userPostConnections = await orm.raw(`
            SELECT u.username, COUNT(p.id) as post_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id AND p.deleted_at IS NULL
            GROUP BY u.id, u.username
            ORDER BY post_count DESC
        `);
        console.log('  📊 User-Post connections:', userPostConnections);

        // Verify post-comment connections
        const postCommentConnections = await orm.raw(`
            SELECT p.title, COUNT(c.id) as comment_count
            FROM posts p
            LEFT JOIN comments c ON p.id = c.post_id AND c.deleted_at IS NULL
            WHERE p.deleted_at IS NULL
            GROUP BY p.id, p.title
            ORDER BY comment_count DESC
        `);
        console.log('  📊 Post-Comment connections:', postCommentConnections);

    } catch (error) {
        console.error('  ❌ Relationships test failed:', error);
        throw error;
    }
}

// Test advanced relationship queries
async function testAdvancedRelationshipQueries(orm: D1ORM, User: any, Post: any, Comment: any, Category: any) {
    try {
        console.log('  🔍 Testing advanced relationship queries...');

        // Complex JOIN query - Users with their post and comment stats
        const userStats = await orm.raw(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.role,
                COUNT(DISTINCT p.id) as total_posts,
                COUNT(DISTINCT c.id) as total_comments,
                AVG(p.view_count) as avg_post_views,
                MAX(p.created_at) as last_post_date,
                MAX(c.created_at) as last_comment_date
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id AND p.deleted_at IS NULL
            LEFT JOIN comments c ON u.id = c.user_id AND c.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
            GROUP BY u.id, u.username, u.email, u.role
            ORDER BY total_posts DESC, total_comments DESC
        `);
        console.log('  📊 User statistics with relationships:', userStats);

        // Posts with full relationship data
        const postsWithRelations = await orm.raw(`
            SELECT 
                p.id,
                p.title,
                p.status,
                p.view_count,
                u.username as author,
                COUNT(c.id) as comment_count,
                GROUP_CONCAT(DISTINCT c.content) as sample_comments
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN comments c ON p.id = c.post_id AND c.deleted_at IS NULL AND c.status = 'approved'
            WHERE p.deleted_at IS NULL
            GROUP BY p.id, p.title, p.status, p.view_count, u.username
            ORDER BY comment_count DESC, p.view_count DESC
            LIMIT 5
        `);
        console.log('  📊 Posts with full relationship data:', postsWithRelations);

        // Nested relationship query - Comments with post and author info
        const commentsWithContext = await orm.raw(`
            SELECT 
                c.id,
                c.content,
                c.status,
                c.created_at,
                u.username as commenter,
                p.title as post_title,
                author.username as post_author,
                CASE WHEN c.parent_id IS NOT NULL THEN 'Reply' ELSE 'Top-level' END as comment_type
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN posts p ON c.post_id = p.id
            JOIN users author ON p.user_id = author.id
            WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL
            ORDER BY c.created_at DESC
            LIMIT 10
        `);
        console.log('  📊 Comments with full context:', commentsWithContext);

        // Category hierarchy query
        const categoryHierarchy = await orm.raw(`
            SELECT 
                parent.name as parent_category,
                child.name as child_category,
                child.id as child_id,
                child.sort_order
            FROM categories parent
            LEFT JOIN categories child ON parent.id = child.parent_id
            WHERE parent.parent_id IS NULL
            ORDER BY parent.name, child.sort_order
        `);
        console.log('  📊 Category hierarchy:', categoryHierarchy);

        // Advanced aggregation - Most active users
        const mostActiveUsers = await orm.raw(`
            SELECT 
                u.username,
                u.role,
                (COUNT(DISTINCT p.id) * 2 + COUNT(DISTINCT c.id)) as activity_score,
                COUNT(DISTINCT p.id) as posts,
                COUNT(DISTINCT c.id) as comments,
                SUM(p.view_count) as total_post_views
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id AND p.deleted_at IS NULL
            LEFT JOIN comments c ON u.id = c.user_id AND c.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
            GROUP BY u.id, u.username, u.role
            HAVING activity_score > 0
            ORDER BY activity_score DESC
            LIMIT 5
        `);
        console.log('  🏆 Most active users:', mostActiveUsers);

        // Test relationship constraints and data integrity
        console.log('  🔒 Testing relationship constraints...');

        // Try to find orphaned records (shouldn't exist with proper relationships)
        const orphanedComments = await orm.raw(`
            SELECT c.id, c.content
            FROM comments c
            LEFT JOIN posts p ON c.post_id = p.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE (p.id IS NULL OR u.id IS NULL) AND c.deleted_at IS NULL
        `);
        console.log(`  📊 Orphaned comments found: ${orphanedComments.length}`);

        const orphanedPosts = await orm.raw(`
            SELECT p.id, p.title
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE u.id IS NULL AND p.deleted_at IS NULL
        `);
        console.log(`  📊 Orphaned posts found: ${orphanedPosts.length}`);

        // Test cascading relationships
        console.log('  🔄 Testing cascading operations...');

        const testUser = await User.findOne({ where: { role: 'user' } });
        if (testUser) {
            const userPostsBefore = await Post.count({ user_id: testUser.id });
            const userCommentsBefore = await Comment.count({ user_id: testUser.id });

            console.log(`  📊 Before deletion - User ${testUser.username}: ${userPostsBefore} posts, ${userCommentsBefore} comments`);

            // Note: In a real scenario, you'd test actual cascading deletes
            // For this demo, we'll just show the relationship counts
        }

        console.log('  ✅ Advanced relationship queries completed successfully');

    } catch (error) {
        console.error('  ❌ Advanced relationship queries failed:', error);
        throw error;
    }
}

// Run the example
runAdvancedExample();
