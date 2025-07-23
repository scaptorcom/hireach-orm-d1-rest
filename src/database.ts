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

// Convenience function to get a configured database service
export async function createDatabaseService(): Promise<DatabaseService> {
    const service = DatabaseService.getInstance();
    await service.initialize();
    return service;
}
