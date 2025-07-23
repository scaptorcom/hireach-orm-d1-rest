// Main database service - recommended entry point
export { DatabaseService } from './classes/DatabaseService.js';

// Individual managers for advanced usage
export { D1DatabaseManager } from './classes/D1DatabaseManager.js';
export { MigrationManager } from './classes/MigrationManager.js';
export { ConfigManager } from './classes/ConfigManager.js';

// Types
export * from './types/database.js';

// Import for the convenience function
import { DatabaseService } from './classes/DatabaseService.js';
import { ConfigManager } from './classes/ConfigManager.js';
import { D1Config } from './types/database.js';

export interface D1ConnectionConfig {
    token: string;
    accountId: string;
    databaseId: string;
    databaseName: string;
}

// Convenience function to get a configured database service with explicit config
export async function createDatabaseService(config?: D1ConnectionConfig): Promise<DatabaseService> {
    const service = DatabaseService.getInstance();

    if (config) {
        // Use provided configuration
        const configManager = ConfigManager.getInstance();
        configManager.setConfig(config);
    }
    // If no config provided, will fall back to environment variables

    await service.initialize();
    return service;
}

// Legacy function for environment variable based configuration
export async function createDatabaseServiceFromEnv(): Promise<DatabaseService> {
    const service = DatabaseService.getInstance();
    await service.initialize();
    return service;
}
