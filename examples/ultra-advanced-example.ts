/**
 * Ultra Advanced D1 ORM Example - Production-Ready Demonstration
 * 
 * This example demonstrates:
 * - Complex schema evolution and migrations
 * - Advanced CRUD operations with relationships
 * - Schema modifications and data migrations
 * - Performance optimizations and bulk operations
 * - Error handling and transaction management
 * - Real-world use cases and patterns
 */

import { D1ORM, FieldDefinition } from '../src/orm/index.js';
import { createDatabaseService } from '../src/index.js';
import dotenv from 'dotenv';
dotenv.config();
// Load environment variables from .env file
// Configuration
const config = {
    token: process.env.CLOUDFLARE_D1_TOKEN!,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    databaseName: process.env.CLOUDFLARE_DATABASE_NAME!
};
// Ultra Advanced Example Class
class UltraAdvancedExample {
    private orm: D1ORM;
    private models: {
        User?: any;
        Category?: any;
        Product?: any;
        Order?: any;
        OrderItem?: any;
        Review?: any;
        Wishlist?: any;
        InventoryLog?: any;
    } = {};
    private categoryRefs: any = {};

    constructor(orm: D1ORM) {
        this.orm = orm;
    }

    /**
     * Phase 1: Initial Schema Design - E-commerce Platform
     */
    async phase1_InitialSchema() {
        console.log('\n🏗️  PHASE 1: Initial E-commerce Schema Design');
        console.log('=============================================');

        // Users with comprehensive profile
        this.models.User = this.orm.define('User', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            email: {
                type: 'string',
                required: true,
                unique: true,
                maxLength: 255,
                validate: (email: string) => {
                    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return regex.test(email) || 'Invalid email format';
                }
            },
            username: {
                type: 'string',
                required: true,
                unique: true,
                minLength: 3,
                maxLength: 30
            },
            password_hash: {
                type: 'string',
                required: true,
                maxLength: 255
            },
            first_name: {
                type: 'string',
                required: true,
                maxLength: 50
            },
            last_name: {
                type: 'string',
                required: true,
                maxLength: 50
            },
            phone: {
                type: 'string',
                required: false,
                maxLength: 20,
                validate: (phone: string) => {
                    const regex = /^[\+]?[1-9][\d]{0,15}$/;
                    return regex.test(phone) || 'Invalid phone number';
                }
            },
            date_of_birth: {
                type: 'date',
                required: false
            },
            status: {
                type: 'string',
                required: true,
                default: 'active',
                enum: ['active', 'inactive', 'suspended', 'pending']
            },
            role: {
                type: 'string',
                required: true,
                default: 'customer',
                enum: ['customer', 'admin', 'manager', 'support']
            },
            email_verified_at: {
                type: 'date',
                required: false
            },
            last_login_at: {
                type: 'date',
                required: false
            },
            login_count: {
                type: 'number',
                required: true,
                default: 0,
                min: 0
            },
            preferences: {
                type: 'json',
                required: false,
                default: {}
            }
        }, {
            tableName: 'users',
            timestamps: true,
            softDeletes: true,
            indexes: [
                { fields: ['email'], unique: true },
                { fields: ['username'], unique: true },
                { fields: ['status'] },
                { fields: ['role'] },
                { fields: ['email_verified_at'] },
                { fields: ['last_login_at'] }
            ],
            hooks: {
                beforeCreate: async (userData) => {
                    console.log(`📝 Creating user: ${userData.email}`);
                    // Hash password in real implementation
                    userData.password_hash = `hashed_${userData.password_hash}`;
                },
                afterCreate: async (user) => {
                    console.log(`✅ User created: ${user.email} (ID: ${user.id})`);
                },
                beforeUpdate: async (data, where) => {
                    if (data.last_login_at) {
                        console.log(`🔐 User login recorded for: ${JSON.stringify(where)}`);
                    }
                }
            }
        });

        // Categories with hierarchical structure
        this.models.Category = this.orm.define('Category', {
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
                required: false
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
            },
            image_url: {
                type: 'string',
                required: false,
                maxLength: 500
            },
            meta_title: {
                type: 'string',
                required: false,
                maxLength: 200
            },
            meta_description: {
                type: 'string',
                required: false,
                maxLength: 500
            }
        }, {
            tableName: 'categories',
            timestamps: true,
            indexes: [
                { fields: ['slug'], unique: true },
                { fields: ['parent_id'] },
                { fields: ['is_active'] },
                { fields: ['sort_order'] }
            ]
        });

        // Products with complex attributes
        this.models.Product = this.orm.define('Product', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            name: {
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
            description: {
                type: 'text',
                required: false
            },
            short_description: {
                type: 'string',
                required: false,
                maxLength: 500
            },
            sku: {
                type: 'string',
                required: true,
                unique: true,
                maxLength: 50
            },
            price: {
                type: 'number',
                required: true,
                min: 0
            },
            cost_price: {
                type: 'number',
                required: false,
                min: 0
            },
            category_id: {
                type: 'number',
                required: true
            },
            brand: {
                type: 'string',
                required: false,
                maxLength: 100
            },
            weight: {
                type: 'number',
                required: false,
                min: 0
            },
            dimensions: {
                type: 'json',
                required: false,
                default: {}
            },
            stock_quantity: {
                type: 'number',
                required: true,
                default: 0,
                min: 0
            },
            status: {
                type: 'string',
                required: true,
                default: 'draft',
                enum: ['draft', 'active', 'inactive', 'discontinued']
            },
            is_featured: {
                type: 'boolean',
                required: true,
                default: false
            },
            tags: {
                type: 'json',
                required: false,
                default: []
            },
            attributes: {
                type: 'json',
                required: false,
                default: {}
            },
            images: {
                type: 'json',
                required: false,
                default: []
            }
        }, {
            tableName: 'products',
            timestamps: true,
            softDeletes: true,
            indexes: [
                { fields: ['slug'], unique: true },
                { fields: ['sku'], unique: true },
                { fields: ['category_id'] },
                { fields: ['status'] },
                { fields: ['is_featured'] },
                { fields: ['price'] },
                { fields: ['stock_quantity'] }
            ],
            hooks: {
                beforeCreate: async (productData) => {
                    if (!productData.slug && productData.name) {
                        productData.slug = productData.name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '');
                    }
                    if (!productData.sku) {
                        productData.sku = `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    }
                }
            }
        });

        // Orders system
        this.models.Order = this.orm.define('Order', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            order_number: {
                type: 'string',
                required: true,
                unique: true,
                maxLength: 50
            },
            user_id: {
                type: 'number',
                required: true
            },
            status: {
                type: 'string',
                required: true,
                default: 'pending',
                enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
            },
            subtotal: {
                type: 'number',
                required: true,
                min: 0
            },
            tax_amount: {
                type: 'number',
                required: true,
                default: 0,
                min: 0
            },
            shipping_amount: {
                type: 'number',
                required: true,
                default: 0,
                min: 0
            },
            discount_amount: {
                type: 'number',
                required: true,
                default: 0,
                min: 0
            },
            total_amount: {
                type: 'number',
                required: true,
                min: 0
            },
            currency: {
                type: 'string',
                required: true,
                default: 'USD',
                maxLength: 3
            },
            payment_status: {
                type: 'string',
                required: true,
                default: 'pending',
                enum: ['pending', 'paid', 'failed', 'refunded', 'partial_refund']
            },
            payment_method: {
                type: 'string',
                required: false,
                maxLength: 50
            },
            shipping_address: {
                type: 'json',
                required: true
            },
            billing_address: {
                type: 'json',
                required: true
            },
            notes: {
                type: 'text',
                required: false
            },
            shipped_at: {
                type: 'date',
                required: false
            },
            delivered_at: {
                type: 'date',
                required: false
            }
        }, {
            tableName: 'orders',
            timestamps: true,
            indexes: [
                { fields: ['order_number'], unique: true },
                { fields: ['user_id'] },
                { fields: ['status'] },
                { fields: ['payment_status'] },
                { fields: ['created_at'] }
            ],
            hooks: {
                beforeCreate: async (orderData) => {
                    if (!orderData.order_number) {
                        orderData.order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
                    }
                }
            }
        });

        // Order Items
        this.models.OrderItem = this.orm.define('OrderItem', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            order_id: {
                type: 'number',
                required: true
            },
            product_id: {
                type: 'number',
                required: true
            },
            quantity: {
                type: 'number',
                required: true,
                min: 1
            },
            unit_price: {
                type: 'number',
                required: true,
                min: 0
            },
            total_price: {
                type: 'number',
                required: true,
                min: 0
            },
            product_snapshot: {
                type: 'json',
                required: false
            }
        }, {
            tableName: 'order_items',
            timestamps: true,
            indexes: [
                { fields: ['order_id'] },
                { fields: ['product_id'] },
                { fields: ['order_id', 'product_id'] }
            ]
        });

        console.log('🔄 Syncing initial schema...');
        await this.orm.sync({ force: true });
        console.log('✅ Phase 1 schema created successfully!');
    }

    /**
     * Phase 2: Populate with Test Data
     */
    async phase2_PopulateData() {
        console.log('\n📊 PHASE 2: Populating with Comprehensive Test Data');
        console.log('==================================================');

        // Create categories
        console.log('📂 Creating categories...');

        try {
            const electronics = await this.models.Category.create({
                name: 'Electronics',
                slug: 'electronics',
                description: 'Electronic devices and gadgets',
                meta_title: 'Electronics - Latest Gadgets',
                meta_description: 'Discover the latest electronic devices and gadgets'
            });
            console.log('✅ Created Electronics category:', electronics.id);

            const smartphones = await this.models.Category.create({
                name: 'Smartphones',
                slug: 'smartphones',
                description: 'Latest smartphones and mobile devices',
                parent_id: electronics.id,
                sort_order: 1
            });
            console.log('✅ Created Smartphones category:', smartphones.id);

            const laptops = await this.models.Category.create({
                name: 'Laptops',
                slug: 'laptops',
                description: 'Laptops and notebooks',
                parent_id: electronics.id,
                sort_order: 2
            });
            console.log('✅ Created Laptops category:', laptops.id);

            const clothing = await this.models.Category.create({
                name: 'Clothing',
                slug: 'clothing',
                description: 'Fashion and apparel',
                meta_title: 'Fashion & Clothing',
                meta_description: 'Trendy clothing and fashion items'
            });
            console.log('✅ Created Clothing category:', clothing.id);

            console.log(`✅ Created ${await this.models.Category.count()} categories`);

            // Store references for later use
            this.categoryRefs = { electronics, smartphones, laptops, clothing };

        } catch (error) {
            console.error('❌ Error creating categories:', error);
            throw error;
        }

        // Create users with different roles
        console.log('👥 Creating users...');
        const users: any[] = [];

        // Admin user
        users.push(await this.models.User.create({
            email: 'admin-ultra@example.com',
            username: 'admin-ultra',
            password_hash: 'admin123',
            first_name: 'John',
            last_name: 'Admin',
            phone: '+1234567890',
            role: 'admin',
            status: 'active',
            email_verified_at: new Date(),
            preferences: {
                theme: 'dark',
                notifications: true,
                language: 'en'
            }
        }));

        // Customer users
        const customerData = [
            { email: 'alice-ultra@example.com', username: 'alice-ultra', first_name: 'Alice', last_name: 'Johnson' },
            { email: 'bob-ultra@example.com', username: 'bob-ultra', first_name: 'Bob', last_name: 'Smith' },
            { email: 'charlie-ultra@example.com', username: 'charlie-ultra', first_name: 'Charlie', last_name: 'Brown' },
            { email: 'diana-ultra@example.com', username: 'diana-ultra', first_name: 'Diana', last_name: 'Wilson' }
        ];

        for (const customer of customerData) {
            users.push(await this.models.User.create({
                ...customer,
                password_hash: 'password123',
                phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
                role: 'customer',
                status: 'active',
                email_verified_at: new Date(),
                preferences: {
                    newsletter: Math.random() > 0.5,
                    sms_notifications: Math.random() > 0.5
                }
            }));
        }

        console.log(`✅ Created ${users.length} users`);

        // Create products
        console.log('🛍️  Creating products...');
        const products: any[] = [];

        // Smartphones
        const smartphoneData = [
            {
                name: 'iPhone 15 Pro',
                price: 999.99,
                cost_price: 700.00,
                category_id: this.categoryRefs.smartphones.id,
                brand: 'Apple',
                stock_quantity: 50,
                status: 'active',
                is_featured: true,
                description: 'Latest iPhone with advanced features',
                short_description: 'Premium smartphone with exceptional camera',
                weight: 0.221,
                dimensions: { length: 159.9, width: 76.7, height: 8.25 },
                attributes: { color: 'Titanium Blue', storage: '256GB', ram: '8GB' },
                tags: ['smartphone', 'apple', 'premium', 'latest'],
                images: ['iphone15-1.jpg', 'iphone15-2.jpg']
            },
            {
                name: 'Samsung Galaxy S24',
                price: 899.99,
                cost_price: 650.00,
                category_id: this.categoryRefs.smartphones.id,
                brand: 'Samsung',
                stock_quantity: 75,
                status: 'active',
                description: 'Powerful Android smartphone with AI features',
                short_description: 'AI-powered smartphone with excellent display',
                weight: 0.196,
                dimensions: { length: 158.5, width: 75.9, height: 7.7 },
                attributes: { color: 'Phantom Black', storage: '256GB', ram: '12GB' },
                tags: ['smartphone', 'samsung', 'android', 'ai'],
                images: ['galaxy-s24-1.jpg', 'galaxy-s24-2.jpg']
            }
        ];

        for (const phone of smartphoneData) {
            products.push(await this.models.Product.create(phone));
        }

        // Laptops
        const laptopData = [
            {
                name: 'MacBook Air M3',
                price: 1299.99,
                cost_price: 900.00,
                category_id: this.categoryRefs.laptops.id,
                brand: 'Apple',
                stock_quantity: 30,
                status: 'active',
                is_featured: true,
                description: 'Ultra-thin laptop with M3 chip',
                short_description: 'Lightweight laptop with incredible performance',
                weight: 1.24,
                dimensions: { length: 304.1, width: 215.0, height: 11.3 },
                attributes: { color: 'Space Gray', storage: '512GB SSD', ram: '16GB', processor: 'M3' },
                tags: ['laptop', 'apple', 'ultrabook', 'm3'],
                images: ['macbook-air-1.jpg', 'macbook-air-2.jpg']
            },
            {
                name: 'Dell XPS 13',
                price: 1199.99,
                cost_price: 850.00,
                category_id: this.categoryRefs.laptops.id,
                brand: 'Dell',
                stock_quantity: 25,
                status: 'active',
                description: 'Premium Windows ultrabook',
                short_description: 'Compact and powerful Windows laptop',
                weight: 1.27,
                dimensions: { length: 295.7, width: 198.1, height: 14.8 },
                attributes: { color: 'Platinum Silver', storage: '1TB SSD', ram: '16GB', processor: 'Intel i7' },
                tags: ['laptop', 'dell', 'windows', 'ultrabook'],
                images: ['xps13-1.jpg', 'xps13-2.jpg']
            }
        ];

        for (const laptop of laptopData) {
            products.push(await this.models.Product.create(laptop));
        }

        console.log(`✅ Created ${products.length} products`);

        // Create orders
        console.log('📦 Creating orders...');
        const orders: any[] = [];

        for (let i = 0; i < 10; i++) {
            const user = users[Math.floor(Math.random() * (users.length - 1)) + 1]; // Exclude admin
            const orderProducts = products.slice(0, Math.floor(Math.random() * 3) + 1);

            let subtotal = 0;
            const orderItems: any[] = [];

            for (const product of orderProducts) {
                const quantity = Math.floor(Math.random() * 3) + 1;
                const unitPrice = product.price;
                const totalPrice = quantity * unitPrice;
                subtotal += totalPrice;

                orderItems.push({
                    product_id: product.id,
                    quantity,
                    unit_price: unitPrice,
                    total_price: totalPrice,
                    product_snapshot: {
                        name: product.name,
                        sku: product.sku,
                        brand: product.brand
                    }
                });
            }

            const taxAmount = subtotal * 0.08; // 8% tax
            const shippingAmount = subtotal > 100 ? 0 : 9.99;
            const totalAmount = subtotal + taxAmount + shippingAmount;

            const order = await this.models.Order.create({
                user_id: user.id,
                subtotal,
                tax_amount: taxAmount,
                shipping_amount: shippingAmount,
                total_amount: totalAmount,
                payment_status: Math.random() > 0.2 ? 'paid' : 'pending',
                payment_method: ['credit_card', 'paypal', 'bank_transfer'][Math.floor(Math.random() * 3)],
                status: ['pending', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
                shipping_address: {
                    name: `${user.first_name} ${user.last_name}`,
                    address_line_1: `${Math.floor(Math.random() * 9999) + 1} Main St`,
                    city: 'Anytown',
                    state: 'NY',
                    postal_code: '12345',
                    country: 'US'
                },
                billing_address: {
                    name: `${user.first_name} ${user.last_name}`,
                    address_line_1: `${Math.floor(Math.random() * 9999) + 1} Main St`,
                    city: 'Anytown',
                    state: 'NY',
                    postal_code: '12345',
                    country: 'US'
                }
            });

            // Create order items
            for (const itemData of orderItems) {
                await this.models.OrderItem.create({
                    order_id: order.id,
                    product_id: itemData.product_id,
                    quantity: itemData.quantity,
                    unit_price: itemData.unit_price,
                    total_price: itemData.total_price,
                    product_snapshot: itemData.product_snapshot
                });
            }

            orders.push(order);
        }

        console.log(`✅ Created ${orders.length} orders with items`);
    }

    /**
     * Phase 3: Advanced CRUD Operations
     */
    async phase3_AdvancedCRUD() {
        console.log('\n🔧 PHASE 3: Advanced CRUD Operations');
        console.log('====================================');

        // Complex queries with joins
        console.log('📊 Running complex queries...');

        // Top selling products
        const topProducts = await this.orm.raw(`
            SELECT 
                p.name,
                p.price,
                p.brand,
                SUM(oi.quantity) as total_sold,
                SUM(oi.total_price) as total_revenue,
                AVG(oi.unit_price) as avg_price
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.payment_status = 'paid'
            GROUP BY p.id, p.name, p.price, p.brand
            ORDER BY total_sold DESC
            LIMIT 5
        `);
        console.log('🏆 Top Selling Products:', topProducts);

        // Customer spending analysis
        const customerAnalysis = await this.orm.raw(`
            SELECT 
                u.email,
                u.first_name,
                u.last_name,
                COUNT(o.id) as total_orders,
                SUM(o.total_amount) as total_spent,
                AVG(o.total_amount) as avg_order_value,
                MAX(o.created_at) as last_order_date
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id AND o.payment_status = 'paid'
            WHERE u.role = 'customer'
            GROUP BY u.id, u.email, u.first_name, u.last_name
            ORDER BY total_spent DESC
        `);
        console.log('💰 Customer Analysis:', customerAnalysis);

        // Bulk updates
        console.log('📈 Performing bulk operations...');

        // Update user login counts with separate queries to avoid validation issues
        const customers = await this.models.User.findAll({ where: { role: 'customer' } });
        for (const customer of customers) {
            await this.models.User.updateById(customer.id, {
                last_login_at: new Date(),
                login_count: customer.login_count + 1
            });
        }

        // Apply discount to featured products
        const featuredProducts = await this.models.Product.findAll({ where: { is_featured: true } });
        for (const product of featuredProducts) {
            await this.models.Product.updateById(product.id, {
                price: Math.round(product.price * 0.9 * 100) / 100 // 10% discount, rounded to 2 decimals
            });
        }

        console.log('✅ Bulk operations completed');

        // Advanced search and filtering
        console.log('🔍 Advanced search operations...');

        // Search products by multiple criteria
        const searchResults = await this.models.Product.findAll({
            where: {
                status: 'active',
                price: { operator: 'BETWEEN', value: [500, 1500] },
                brand: { operator: 'IN', value: ['Apple', 'Samsung'] },
                name: { operator: 'LIKE', value: '%Pro%' }
            },
            orderBy: [
                { field: 'is_featured', direction: 'DESC' },
                { field: 'price', direction: 'ASC' }
            ],
            limit: 10
        });
        console.log(`🔍 Search Results: Found ${searchResults.length} products`);

        // Pagination example
        const paginatedOrders = await this.models.Order.findAndCountAll({
            where: { payment_status: 'paid' },
            orderBy: [{ field: 'created_at', direction: 'DESC' }],
            page: 1,
            perPage: 5
        });
        console.log('📄 Paginated Orders:', {
            total: paginatedOrders.total,
            page: paginatedOrders.page,
            totalPages: paginatedOrders.totalPages
        });
    }

    /**
     * Phase 4: Schema Evolution and Migrations
     */
    async phase4_SchemaEvolution() {
        console.log('\n🔄 PHASE 4: Schema Evolution and Migrations');
        console.log('============================================');

        // Add new fields to existing models
        console.log('📝 Adding new fields to products...');

        // Simulate adding review system
        this.models.Review = this.orm.define('Review', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            product_id: {
                type: 'number',
                required: true,
                references: {
                    table: 'products',
                    field: 'id',
                    onDelete: 'CASCADE'
                }
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
            rating: {
                type: 'number',
                required: true,
                min: 1,
                max: 5
            },
            title: {
                type: 'string',
                required: true,
                maxLength: 200
            },
            comment: {
                type: 'text',
                required: false
            },
            is_verified_purchase: {
                type: 'boolean',
                required: true,
                default: false
            },
            helpful_votes: {
                type: 'number',
                required: true,
                default: 0,
                min: 0
            },
            status: {
                type: 'string',
                required: true,
                default: 'pending',
                enum: ['pending', 'approved', 'rejected']
            }
        }, {
            tableName: 'reviews',
            timestamps: true,
            indexes: [
                { fields: ['product_id'] },
                { fields: ['user_id'] },
                { fields: ['rating'] },
                { fields: ['status'] },
                { fields: ['product_id', 'user_id'], unique: true }
            ]
        });

        // Wishlist system
        this.models.Wishlist = this.orm.define('Wishlist', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
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
            product_id: {
                type: 'number',
                required: true,
                references: {
                    table: 'products',
                    field: 'id',
                    onDelete: 'CASCADE'
                }
            },
            added_at: {
                type: 'date',
                required: true,
                default: () => new Date()
            }
        }, {
            tableName: 'wishlists',
            timestamps: false,
            indexes: [
                { fields: ['user_id'] },
                { fields: ['product_id'] },
                { fields: ['user_id', 'product_id'], unique: true }
            ]
        });

        // Inventory tracking
        this.models.InventoryLog = this.orm.define('InventoryLog', {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncrement: true
            },
            product_id: {
                type: 'number',
                required: true,
                references: {
                    table: 'products',
                    field: 'id',
                    onDelete: 'CASCADE'
                }
            },
            type: {
                type: 'string',
                required: true,
                enum: ['restock', 'sale', 'adjustment', 'return', 'damage']
            },
            quantity_change: {
                type: 'number',
                required: true
            },
            previous_quantity: {
                type: 'number',
                required: true
            },
            new_quantity: {
                type: 'number',
                required: true
            },
            reason: {
                type: 'string',
                required: false,
                maxLength: 500
            },
            user_id: {
                type: 'number',
                required: false,
                references: {
                    table: 'users',
                    field: 'id'
                }
            },
            reference_type: {
                type: 'string',
                required: false,
                enum: ['order', 'manual', 'system']
            },
            reference_id: {
                type: 'number',
                required: false
            }
        }, {
            tableName: 'inventory_logs',
            timestamps: true,
            indexes: [
                { fields: ['product_id'] },
                { fields: ['type'] },
                { fields: ['created_at'] },
                { fields: ['reference_type', 'reference_id'] }
            ]
        });

        console.log('🔄 Syncing new schema...');
        await this.orm.sync({ alter: true }); // Use alter instead of force to preserve data

        // Populate new tables with sample data
        console.log('📊 Populating new tables...');

        // Add reviews (using createIfNotExists to handle duplicates gracefully)
        const products = await this.models.Product.findAll({ limit: 4 });
        const customers = await this.models.User.findAll({ where: { role: 'customer' } });
        let reviewsCreated = 0;
        let reviewsSkipped = 0;

        for (const product of products) {
            // Try to create reviews from different customers
            const shuffledCustomers = customers.sort(() => 0.5 - Math.random());
            const numReviews = Math.min(customers.length, Math.floor(Math.random() * 3) + 1);

            for (let i = 0; i < numReviews; i++) {
                const customer = shuffledCustomers[i];

                const { record, created } = await this.models.Review.createIfNotExists({
                    product_id: product.id,
                    user_id: customer.id,
                    rating: Math.floor(Math.random() * 5) + 1,
                    title: `Great product review from ${customer.first_name}`,
                    comment: `This product exceeded my expectations. Quality is excellent and delivery was fast.`,
                    is_verified_purchase: Math.random() > 0.3,
                    status: 'approved'
                }, ['product_id', 'user_id']);

                if (created) {
                    reviewsCreated++;
                } else {
                    reviewsSkipped++;
                }
            }
        }

        console.log(`✅ Created ${reviewsCreated} reviews, skipped ${reviewsSkipped} duplicates`);

        // Add wishlist items (using createIfNotExists to handle duplicates gracefully)
        let wishlistsCreated = 0;
        let wishlistsSkipped = 0;

        for (const customer of customers) {
            const randomProducts = products.sort(() => 0.5 - Math.random()).slice(0, 2);
            for (const product of randomProducts) {
                const { record, created } = await this.models.Wishlist.createIfNotExists({
                    user_id: customer.id,
                    product_id: product.id
                }, ['user_id', 'product_id']);

                if (created) {
                    wishlistsCreated++;
                } else {
                    wishlistsSkipped++;
                }
            }
        }

        console.log(`✅ Created ${wishlistsCreated} wishlist items, skipped ${wishlistsSkipped} duplicates`);

        console.log('✅ Schema evolution completed successfully!');
    }

    /**
     * Phase 5: Performance Testing and Optimization
     */
    async phase5_PerformanceTesting() {
        console.log('\n⚡ PHASE 5: Performance Testing and Optimization');
        console.log('===============================================');

        // Bulk operations test
        console.log('🔄 Testing bulk operations...');
        const startTime = Date.now();

        // Bulk create test data
        const bulkProducts: any[] = [];
        for (let i = 0; i < 100; i++) {
            bulkProducts.push({
                name: `Bulk Product ${i + 1}`,
                price: Math.random() * 1000 + 100,
                category_id: 1,
                stock_quantity: Math.floor(Math.random() * 100),
                status: 'active'
            });
        }

        await this.models.Product.bulkCreate(bulkProducts);
        console.log(`✅ Bulk created 100 products in ${Date.now() - startTime}ms`);

        // Index usage verification
        console.log('📊 Verifying index usage...');
        const indexTest = await this.orm.raw(`
            EXPLAIN QUERY PLAN 
            SELECT * FROM products 
            WHERE status = 'active' AND price BETWEEN 100 AND 500
        `);
        console.log('📈 Query plan:', indexTest);

        // Transaction simulation
        console.log('🔄 Testing transaction-like operations...');
        try {
            // Simulate order processing
            const product = await this.models.Product.findOne({ where: { stock_quantity: { operator: '>', value: 0 } } });
            const customer = await this.models.User.findOne({ where: { role: 'customer' } });

            if (product && customer) {
                // Check stock
                if (product.stock_quantity >= 1) {
                    // Create order
                    const order = await this.models.Order.create({
                        user_id: customer.id,
                        subtotal: product.price,
                        tax_amount: product.price * 0.08,
                        total_amount: product.price * 1.08,
                        payment_status: 'paid',
                        shipping_address: { name: 'Test Address' },
                        billing_address: { name: 'Test Address' }
                    });

                    // Create order item
                    await this.models.OrderItem.create({
                        order_id: order.id,
                        product_id: product.id,
                        quantity: 1,
                        unit_price: product.price,
                        total_price: product.price
                    });

                    // Update stock
                    await this.models.Product.updateById(product.id, {
                        stock_quantity: product.stock_quantity - 1
                    });

                    // Log inventory change
                    await this.models.InventoryLog.create({
                        product_id: product.id,
                        type: 'sale',
                        quantity_change: -1,
                        previous_quantity: product.stock_quantity,
                        new_quantity: product.stock_quantity - 1,
                        reason: 'Product sold',
                        user_id: customer.id,
                        reference_type: 'order',
                        reference_id: order.id
                    });

                    console.log('✅ Transaction simulation completed successfully');
                }
            }
        } catch (error) {
            console.error('❌ Transaction simulation failed:', error);
        }
    }

    /**
     * Phase 6: Data Analysis and Reporting
     */
    async phase6_DataAnalysis() {
        console.log('\n📊 PHASE 6: Data Analysis and Reporting');
        console.log('=======================================');

        // Sales analytics
        const salesReport = await this.orm.raw(`
            SELECT 
                DATE(o.created_at) as order_date,
                COUNT(o.id) as total_orders,
                SUM(o.total_amount) as total_revenue,
                AVG(o.total_amount) as avg_order_value,
                COUNT(DISTINCT o.user_id) as unique_customers
            FROM orders o
            WHERE o.payment_status = 'paid'
            GROUP BY DATE(o.created_at)
            ORDER BY order_date DESC
            LIMIT 7
        `);
        console.log('📈 Daily Sales Report:', salesReport);

        // Product performance
        const productReport = await this.orm.raw(`
            SELECT 
                p.name,
                p.price,
                p.stock_quantity,
                COALESCE(SUM(oi.quantity), 0) as total_sold,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(r.id) as review_count
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
            LEFT JOIN reviews r ON p.id = r.product_id AND r.status = 'approved'
            WHERE p.status = 'active'
            GROUP BY p.id, p.name, p.price, p.stock_quantity
            ORDER BY total_sold DESC
            LIMIT 10
        `);
        console.log('🛍️  Product Performance Report:', productReport);

        // Customer segments
        const customerSegments = await this.orm.raw(`
            SELECT 
                CASE 
                    WHEN total_spent >= 1000 THEN 'VIP'
                    WHEN total_spent >= 500 THEN 'Premium'
                    WHEN total_spent >= 100 THEN 'Regular'
                    ELSE 'New'
                END as segment,
                COUNT(*) as customer_count,
                AVG(total_spent) as avg_spent,
                SUM(total_spent) as segment_revenue
            FROM (
                SELECT 
                    u.id,
                    COALESCE(SUM(o.total_amount), 0) as total_spent
                FROM users u
                LEFT JOIN orders o ON u.id = o.user_id AND o.payment_status = 'paid'
                WHERE u.role = 'customer'
                GROUP BY u.id
            ) customer_totals
            GROUP BY segment
            ORDER BY avg_spent DESC
        `);
        console.log('👥 Customer Segments:', customerSegments);

        // Inventory alerts
        const lowStockProducts = await this.models.Product.findAll({
            where: {
                stock_quantity: { operator: '<=', value: 10 },
                status: 'active'
            },
            orderBy: [{ field: 'stock_quantity', direction: 'ASC' }],
            limit: 10
        });
        console.log(`⚠️  Low Stock Alert: ${lowStockProducts.length} products need restocking`);

        // Summary statistics
        const stats = {
            totalUsers: await this.models.User.count(),
            totalProducts: await this.models.Product.count(),
            totalOrders: await this.models.Order.count(),
            totalRevenue: await this.orm.raw(`
                SELECT SUM(total_amount) as revenue 
                FROM orders 
                WHERE payment_status = 'paid'
            `).then(result => result[0]?.revenue || 0),
            avgOrderValue: await this.orm.raw(`
                SELECT AVG(total_amount) as avg_value 
                FROM orders 
                WHERE payment_status = 'paid'
            `).then(result => result[0]?.avg_value || 0)
        };

        console.log('📊 Platform Statistics:', stats);
    }

    /**
     * Run all phases
     */
    async runUltraAdvancedDemo() {
        const startTime = Date.now();
        console.log('🚀 STARTING ULTRA ADVANCED D1 ORM DEMONSTRATION');
        console.log('==============================================');

        try {

            await this.phase1_InitialSchema();
            await this.phase2_PopulateData();
            await this.phase3_AdvancedCRUD();
            await this.phase4_SchemaEvolution();
            await this.phase5_PerformanceTesting();
            await this.phase6_DataAnalysis();

            const totalTime = Date.now() - startTime;
            console.log('\n🎉 ULTRA ADVANCED DEMONSTRATION COMPLETED!');
            console.log('==========================================');
            console.log(`⏱️  Total execution time: ${totalTime}ms`);
            console.log('✅ All operations completed successfully');
            console.log('\n📋 Demonstration Summary:');
            console.log('- ✅ Complex schema design with relationships');
            console.log('- ✅ Comprehensive data population');
            console.log('- ✅ Advanced CRUD operations');
            console.log('- ✅ Schema evolution and migrations');
            console.log('- ✅ Performance testing');
            console.log('- ✅ Data analysis and reporting');
            console.log('\n🏆 D1 ORM is production-ready and highly reliable!');

        } catch (error) {
            console.error('❌ Ultra advanced demo failed:', error);
            throw error;
        }
    }
}

// Main execution function
async function runUltraAdvancedExample() {

    console.log('🔧 Initializing Ultra Advanced D1 ORM Example...');

    try {
        // Initialize database connection

        const db = await createDatabaseService(config);
        console.log('✅ Database connection established');

        // Initialize ORM
        const orm = new D1ORM({
            database: db,
            logging: true
        });

        // Run the ultra advanced demo
        const demo = new UltraAdvancedExample(orm);
        await demo.runUltraAdvancedDemo();

    } catch (error) {
        console.error('❌ Ultra advanced example failed:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 10).join('\n')
            });
        }
        process.exit(1);
    }
}

// Export for use in other files
export { UltraAdvancedExample, runUltraAdvancedExample };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runUltraAdvancedExample();
}
