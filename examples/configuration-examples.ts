/**
 * Configuration Examples for hireach-d1
 * Shows different ways to configure the database connection
 */

import { D1ORM, createDatabaseService, createDatabaseServiceFromEnv, type D1ConnectionConfig } from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file
// Example 1: Explicit configuration (Recommended)
async function explicitConfigExample() {
    console.log('🔧 Example 1: Explicit Configuration');

    const config: D1ConnectionConfig = {
        token: "your_cloudflare_api_token",
        accountId: "your_account_id",
        databaseId: "your_database_id",
        databaseName: "your_database_name"
    };

    const db = await createDatabaseService(config);
    const orm = new D1ORM({ database: db, logging: true });

    console.log('✅ Database configured with explicit config');
    return orm;
}

// Example 2: Environment variables (Legacy)
async function environmentConfigExample() {
    console.log('🔧 Example 2: Environment Variables');

    // Requires these environment variables:
    // CLOUDFLARE_D1_TOKEN=your_token
    // CLOUDFLARE_ACCOUNT_ID=your_account_id
    // CLOUDFLARE_DATABASE_ID=your_database_id
    // CLOUDFLARE_DATABASE_NAME=your_database_name

    const db = await createDatabaseService(); // No config = fallback to env vars
    // OR use the explicit legacy function:
    // const db = await createDatabaseServiceFromEnv();

    const orm = new D1ORM({ database: db, logging: true });

    console.log('✅ Database configured from environment variables');
    return orm;
}

// Example 3: Dynamic configuration (e.g., from a config file or external service)
async function dynamicConfigExample() {
    console.log('🔧 Example 3: Dynamic Configuration');

    // This could come from a config file, database, API, etc.
    const config = await loadConfigFromSomewhere();

    const db = await createDatabaseService(config);
    const orm = new D1ORM({ database: db, logging: true });

    console.log('✅ Database configured dynamically');
    return orm;
}

// Mock function for dynamic config loading
async function loadConfigFromSomewhere(): Promise<D1ConnectionConfig> {
    // In real usage, this might read from:
    // - A JSON config file
    // - A remote API
    // - A database
    // - Command line arguments
    // - etc.

    return {
        token: process.env.CLOUDFLARE_D1_TOKEN || "fallback_token",
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "fallback_account",
        databaseId: process.env.CLOUDFLARE_DATABASE_ID || "fallback_db_id",
        databaseName: process.env.CLOUDFLARE_DATABASE_NAME || "fallback_db_name"
    };
}

// Example 4: Multiple database connections
async function multiDatabaseExample() {
    console.log('🔧 Example 4: Multiple Database Connections');

    // Production database
    const prodDb = await createDatabaseService({
        token: "prod_token",
        accountId: "prod_account",
        databaseId: "prod_database_id",
        databaseName: "production_db"
    });

    // Development database  
    const devDb = await createDatabaseService({
        token: "dev_token",
        accountId: "dev_account",
        databaseId: "dev_database_id",
        databaseName: "development_db"
    });

    const prodOrm = new D1ORM({ database: prodDb, logging: false });
    const devOrm = new D1ORM({ database: devDb, logging: true });

    console.log('✅ Multiple databases configured');
    return { prodOrm, devOrm };
}

export {
    explicitConfigExample,
    environmentConfigExample,
    dynamicConfigExample,
    multiDatabaseExample
};
