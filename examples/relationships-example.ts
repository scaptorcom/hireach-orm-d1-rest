/**
 * Relationships Example - Foreign keys and complex queries
 * Shows how to handle relationships between models
 */

import { D1ORM, createDatabaseService } from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file
async function relationshipsExample() {
    // Initialize database and ORM with explicit configuration
    const db = await createDatabaseService({
        token: process.env.CLOUDFLARE_D1_TOKEN!,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
        databaseName: process.env.CLOUDFLARE_DATABASE_NAME!
    });

    const orm = new D1ORM({
        database: db,
        logging: true
    });

    // Define User model
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
        role: {
            type: 'string',
            enum: ['admin', 'editor', 'user'],
            default: 'user'
        }
    }, {
        tableName: 'users',
        timestamps: true
    });

    // Define Category model
    const Category = orm.define('Category', {
        id: {
            type: 'number',
            primaryKey: true,
            autoIncrement: true
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
            unique: true
        },
        description: {
            type: 'text'
        }
    }, {
        tableName: 'categories',
        timestamps: true
    });

    // Define Post model with foreign keys
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
        slug: {
            type: 'string',
            required: true,
            unique: true
        },
        content: {
            type: 'text',
            required: true
        },
        excerpt: {
            type: 'string',
            maxLength: 300
        },
        status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            default: 'draft'
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
        category_id: {
            type: 'number',
            required: true,
            references: {
                table: 'categories',
                field: 'id',
                onDelete: 'SET NULL'
            }
        },
        published_at: {
            type: 'date'
        }
    }, {
        tableName: 'posts',
        timestamps: true,
        hooks: {
            beforeCreate: async (data) => {
                // Auto-generate slug from title
                if (!data.slug && data.title) {
                    data.slug = data.title
                        .toLowerCase()
                        .replace(/[^a-z0-9 -]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                        .trim();
                }

                // Set published_at if status is published
                if (data.status === 'published' && !data.published_at) {
                    data.published_at = new Date().toISOString();
                }
            }
        }
    });

    // Define Comment model
    const Comment = orm.define('Comment', {
        id: {
            type: 'number',
            primaryKey: true,
            autoIncrement: true
        },
        content: {
            type: 'text',
            required: true
        },
        author_name: {
            type: 'string',
            required: true,
            maxLength: 100
        },
        author_email: {
            type: 'string',
            required: true,
            validate: (email: string) => {
                return email.includes('@') || 'Invalid email';
            }
        },
        status: {
            type: 'string',
            enum: ['pending', 'approved', 'spam'],
            default: 'pending'
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
            references: {
                table: 'comments',
                field: 'id',
                onDelete: 'CASCADE'
            }
        }
    }, {
        tableName: 'comments',
        timestamps: true
    });

    try {
        // Create tables
        await orm.sync({ force: true });
        console.log('✅ Tables created successfully!');

        // Create sample data
        console.log('\n📝 Creating sample data...');

        // Create users
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin'
        });

        const editor = await User.create({
            name: 'Jane Editor',
            email: 'jane@example.com',
            role: 'editor'
        });

        // Create categories
        const techCategory = await Category.create({
            name: 'Technology',
            slug: 'technology',
            description: 'Posts about technology and programming'
        });

        const designCategory = await Category.create({
            name: 'Design',
            slug: 'design',
            description: 'Posts about web design and UI/UX'
        });

        // Create posts
        const post1 = await Post.create({
            title: 'Getting Started with D1 ORM',
            content: 'This is a comprehensive guide to using D1 ORM...',
            excerpt: 'Learn how to use D1 ORM effectively',
            status: 'published',
            author_id: admin.id,
            category_id: techCategory.id
        });

        const post2 = await Post.create({
            title: 'Modern Web Design Principles',
            content: 'Design principles for modern web applications...',
            excerpt: 'Key principles for better web design',
            status: 'published',
            author_id: editor.id,
            category_id: designCategory.id
        });

        // Create comments
        const comment1 = await Comment.create({
            content: 'Great article! Very helpful.',
            author_name: 'John Doe',
            author_email: 'john@example.com',
            status: 'approved',
            post_id: post1.id
        });

        const reply = await Comment.create({
            content: 'I agree! Thanks for the feedback.',
            author_name: 'Admin User',
            author_email: 'admin@example.com',
            status: 'approved',
            post_id: post1.id,
            parent_id: comment1.id
        });

        console.log('✅ Sample data created!');

        // Demonstrate complex queries
        console.log('\n🔍 Running complex queries...');

        // 1. Find all published posts with author and category info
        const publishedPostsQuery = orm.query('posts')
            .select(
                'posts.id',
                'posts.title',
                'posts.excerpt',
                'posts.published_at',
                'users.name as author_name',
                'categories.name as category_name'
            )
            .leftJoin('users', 'posts.author_id = users.id')
            .leftJoin('categories', 'posts.category_id = categories.id')
            .where('posts.status', '=', 'published')
            .orderBy('posts.published_at', 'DESC');

        const { sql: postsSQL, params: postsParams } = publishedPostsQuery.build();
        const publishedPosts = await orm.raw(postsSQL, postsParams);
        console.log('📄 Published posts with authors:', publishedPosts);

        // 2. Count posts by category
        const categoryCountsQuery = orm.query('categories')
            .select(
                'categories.name',
                'COUNT(posts.id) as post_count'
            )
            .leftJoin('posts', 'categories.id = posts.category_id')
            .groupBy('categories.id', 'categories.name')
            .orderBy('post_count', 'DESC');

        const { sql: countsSQL, params: countsParams } = categoryCountsQuery.build();
        const categoryCounts = await orm.raw(countsSQL, countsParams);
        console.log('📊 Posts by category:', categoryCounts);

        // 3. Find posts with comment counts
        const postsWithCommentsQuery = orm.query('posts')
            .select(
                'posts.title',
                'users.name as author',
                'COUNT(comments.id) as comment_count'
            )
            .leftJoin('users', 'posts.author_id = users.id')
            .leftJoin('comments', 'posts.id = comments.post_id AND comments.status = "approved"')
            .where('posts.status', '=', 'published')
            .groupBy('posts.id', 'posts.title', 'users.name')
            .orderBy('comment_count', 'DESC');

        const { sql: commentsSQL, params: commentsParams } = postsWithCommentsQuery.build();
        const postsWithComments = await orm.raw(commentsSQL, commentsParams);
        console.log('💬 Posts with comment counts:', postsWithComments);

        // 4. Find users who have published posts
        const activeAuthorsQuery = orm.query('users')
            .select(
                'users.name',
                'users.email',
                'users.role',
                'COUNT(posts.id) as published_posts'
            )
            .leftJoin('posts', 'users.id = posts.author_id AND posts.status = "published"')
            .groupBy('users.id')
            .having('published_posts', '>', 0)
            .orderBy('published_posts', 'DESC');

        const { sql: authorsSQL, params: authorsParams } = activeAuthorsQuery.build();
        const activeAuthors = await orm.raw(authorsSQL, authorsParams);
        console.log('✍️ Active authors:', activeAuthors);

        // 5. Find comment threads (comments with replies)
        const commentThreadsQuery = orm.query('comments')
            .select(
                'parent.content as parent_comment',
                'parent.author_name as parent_author',
                'child.content as reply_comment',
                'child.author_name as reply_author',
                'posts.title as post_title'
            )
            .from('comments as parent')
            .leftJoin('comments as child', 'parent.id = child.parent_id')
            .leftJoin('posts', 'parent.post_id = posts.id')
            .where('parent.parent_id', 'IS NULL')
            .where('parent.status', '=', 'approved')
            .orderBy('parent.created_at', 'ASC');

        const { sql: threadsSQL, params: threadsParams } = commentThreadsQuery.build();
        const commentThreads = await orm.raw(threadsSQL, threadsParams);
        console.log('🧵 Comment threads:', commentThreads);

        // Model-level queries with relationships
        console.log('\n🔗 Model-level relationship queries...');

        // Find all posts by a specific author
        const adminPosts = await Post.findAll({
            where: { author_id: admin.id },
            orderBy: [{ field: 'created_at', direction: 'DESC' }]
        });
        console.log('📝 Admin posts:', adminPosts.length);

        // Find posts in a specific category
        const techPosts = await Post.findAll({
            where: {
                category_id: techCategory.id,
                status: 'published'
            }
        });
        console.log('💻 Tech posts:', techPosts.length);

        // Find comments for a specific post
        const post1Comments = await Comment.findAll({
            where: {
                post_id: post1.id,
                status: 'approved'
            },
            orderBy: [{ field: 'created_at', direction: 'ASC' }]
        });
        console.log('💬 Comments for first post:', post1Comments.length);

        // Pagination example
        const paginatedPosts = await Post.findAndCountAll({
            where: { status: 'published' },
            page: 1,
            perPage: 10,
            orderBy: [{ field: 'published_at', direction: 'DESC' }]
        });
        console.log('📄 Paginated posts:', {
            total: paginatedPosts.total,
            page: paginatedPosts.page,
            totalPages: paginatedPosts.totalPages
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Export the example
export { relationshipsExample };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    relationshipsExample().catch(console.error);
}
