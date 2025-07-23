import * as dotenv from 'dotenv';
import { D1Config } from '../types/database.js';

export class ConfigManager {
    private static instance: ConfigManager;
    private config: D1Config | null = null;

    private constructor() {
        this.loadConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Load configuration from environment variables
     */
    private loadConfig(): void {
        // Load environment variables from .env file
        dotenv.config();

        const token = process.env.CLOUDFLARE_D1_TOKEN;
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
        const databaseName = process.env.CLOUDFLARE_DATABASE_NAME;

        if (!token || !accountId || !databaseId || !databaseName) {
            const missingVars: string[] = [];
            if (!token) missingVars.push('CLOUDFLARE_D1_TOKEN');
            if (!accountId) missingVars.push('CLOUDFLARE_ACCOUNT_ID');
            if (!databaseId) missingVars.push('CLOUDFLARE_DATABASE_ID');
            if (!databaseName) missingVars.push('CLOUDFLARE_DATABASE_NAME');

            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        this.config = {
            token,
            accountId,
            databaseId,
            databaseName
        };
    }

    /**
     * Get the D1 configuration
     */
    public getConfig(): D1Config {
        if (!this.config) {
            throw new Error('Configuration not loaded. Make sure all required environment variables are set.');
        }
        return this.config;
    }

    /**
     * Validate configuration
     */
    public validateConfig(): boolean {
        try {
            const config = this.getConfig();
            return !!(config.token && config.accountId && config.databaseId && config.databaseName);
        } catch {
            return false;
        }
    }

    /**
     * Get configuration status
     */
    public getConfigStatus(): {
        valid: boolean;
        missingVariables: string[];
        config?: Partial<D1Config>;
    } {
        const requiredVars = [
            'CLOUDFLARE_D1_TOKEN',
            'CLOUDFLARE_ACCOUNT_ID',
            'CLOUDFLARE_DATABASE_ID',
            'CLOUDFLARE_DATABASE_NAME'
        ];

        const missingVariables = requiredVars.filter(varName => !process.env[varName]);
        const valid = missingVariables.length === 0;

        const result: any = {
            valid,
            missingVariables
        };

        if (valid && this.config) {
            result.config = {
                accountId: this.config.accountId,
                databaseId: this.config.databaseId,
                databaseName: this.config.databaseName,
                token: '***hidden***'
            };
        }

        return result;
    }

    /**
     * Update configuration manually (useful for testing)
     */
    public setConfig(config: D1Config): void {
        this.config = config;
    }

    /**
     * Reload configuration from environment
     */
    public reloadConfig(): void {
        this.loadConfig();
    }
}
