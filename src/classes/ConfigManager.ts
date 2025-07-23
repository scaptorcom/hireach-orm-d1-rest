import * as dotenv from 'dotenv';
import { D1Config } from '../types/database.js';

export enum ConfigStatus {
    READY = 'ready',
    MISSING_ENV_VARS = 'missing_env_vars',
    INVALID_CONFIG = 'invalid_config',
    NOT_INITIALIZED = 'not_initialized'
}

export interface ConfigValidationResult {
    isValid: boolean;
    status: ConfigStatus;
    missingVariables: string[];
    errors: string[];
    config?: Partial<D1Config>;
}

export class ConfigManager {
    private static instance: ConfigManager;
    private config: D1Config | null = null;
    private envLoaded: boolean = false;

    private constructor() {
        // Don't load config automatically, let it be set explicitly or fall back to env
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Load configuration from environment variables with proper error handling
     */
    private loadConfig(): D1Config {
        try {
            // Load environment variables from .env file if not already loaded
            if (!this.envLoaded) {
                dotenv.config();
                this.envLoaded = true;
            }

            const token = process.env.CLOUDFLARE_D1_TOKEN;
            const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
            const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
            const databaseName = process.env.CLOUDFLARE_DATABASE_NAME;

            // Validate required environment variables
            const missingVars: string[] = [];
            if (!token || token.trim() === '') missingVars.push('CLOUDFLARE_D1_TOKEN');
            if (!accountId || accountId.trim() === '') missingVars.push('CLOUDFLARE_ACCOUNT_ID');
            if (!databaseId || databaseId.trim() === '') missingVars.push('CLOUDFLARE_DATABASE_ID');
            if (!databaseName || databaseName.trim() === '') missingVars.push('CLOUDFLARE_DATABASE_NAME');

            if (missingVars.length > 0) {
                const error = new Error(`Missing or empty required environment variables: ${missingVars.join(', ')}`);
                error.name = 'ConfigurationError';
                throw error;
            }

            // Additional validation for non-empty values
            if (token && token.length < 10) {
                const error = new Error('CLOUDFLARE_D1_TOKEN appears to be invalid (too short)');
                error.name = 'ConfigurationError';
                throw error;
            }

            if (accountId && accountId.length < 10) {
                const error = new Error('CLOUDFLARE_ACCOUNT_ID appears to be invalid (too short)');
                error.name = 'ConfigurationError';
                throw error;
            }

            const config: D1Config = {
                token: token!.trim(),
                accountId: accountId!.trim(),
                databaseId: databaseId!.trim(),
                databaseName: databaseName!.trim()
            };

            this.config = config;
            return config;

        } catch (error) {
            if (error instanceof Error && error.name === 'ConfigurationError') {
                throw error; // Re-throw configuration errors as-is
            }

            // Wrap other errors
            const configError = new Error(`Failed to load configuration from environment: ${error instanceof Error ? error.message : String(error)}`);
            configError.name = 'ConfigurationError';
            throw configError;
        }
    }

    /**
     * Get the D1 configuration with comprehensive error handling
     */
    public getConfig(): D1Config {
        try {
            if (!this.config) {
                // Try to load from environment variables as fallback
                return this.loadConfig();
            }
            return this.config;
        } catch (error) {
            if (error instanceof Error && error.name === 'ConfigurationError') {
                throw error; // Re-throw with original error details
            }

            // Handle unexpected errors
            const configError = new Error(`Configuration retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
            configError.name = 'ConfigurationError';
            throw configError;
        }
    }

    /**
     * Validate configuration with detailed error reporting
     */
    public validateConfig(): ConfigValidationResult {
        try {
            const config = this.getConfig();

            const errors: string[] = [];

            // Validate each field
            if (!config.token || config.token.trim() === '') {
                errors.push('Token is required and cannot be empty');
            } else if (config.token.length < 10) {
                errors.push('Token appears to be invalid (too short)');
            }

            if (!config.accountId || config.accountId.trim() === '') {
                errors.push('Account ID is required and cannot be empty');
            } else if (config.accountId.length < 10) {
                errors.push('Account ID appears to be invalid (too short)');
            }

            if (!config.databaseId || config.databaseId.trim() === '') {
                errors.push('Database ID is required and cannot be empty');
            }

            if (!config.databaseName || config.databaseName.trim() === '') {
                errors.push('Database name is required and cannot be empty');
            }

            const isValid = errors.length === 0;

            return {
                isValid,
                status: isValid ? ConfigStatus.READY : ConfigStatus.INVALID_CONFIG,
                missingVariables: [],
                errors,
                config: isValid ? {
                    accountId: config.accountId,
                    databaseId: config.databaseId,
                    databaseName: config.databaseName,
                    token: '***hidden***'
                } : undefined
            };

        } catch (error) {
            const isConfigError = error instanceof Error && error.name === 'ConfigurationError';
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (isConfigError && errorMessage.includes('Missing or empty required environment variables')) {
                // Extract missing variables from error message
                const match = errorMessage.match(/Missing or empty required environment variables: (.+)/);
                const missingVars = match ? match[1].split(', ') : [];

                return {
                    isValid: false,
                    status: ConfigStatus.MISSING_ENV_VARS,
                    missingVariables: missingVars,
                    errors: [errorMessage]
                };
            }

            return {
                isValid: false,
                status: ConfigStatus.NOT_INITIALIZED,
                missingVariables: [],
                errors: [errorMessage]
            };
        }
    }

    /**
     * Get configuration status with comprehensive error handling
     */
    public getConfigStatus(): ConfigValidationResult {
        return this.validateConfig();
    }

    /**
     * Update configuration manually with validation
     */
    public setConfig(config: D1Config): void {
        try {
            // Validate the provided config
            if (!config || typeof config !== 'object') {
                throw new Error('Config must be a valid object');
            }

            const requiredFields = ['token', 'accountId', 'databaseId', 'databaseName'];
            const missingFields = requiredFields.filter(field => !config[field as keyof D1Config] || String(config[field as keyof D1Config]).trim() === '');

            if (missingFields.length > 0) {
                throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
            }

            // Trim all string values
            this.config = {
                token: config.token.trim(),
                accountId: config.accountId.trim(),
                databaseId: config.databaseId.trim(),
                databaseName: config.databaseName.trim()
            };

        } catch (error) {
            const configError = new Error(`Failed to set configuration: ${error instanceof Error ? error.message : String(error)}`);
            configError.name = 'ConfigurationError';
            throw configError;
        }
    }

    /**
     * Reload configuration from environment with error handling
     */
    public reloadConfig(): void {
        try {
            this.config = null; // Clear current config
            this.envLoaded = false; // Force reload of env vars
            this.loadConfig(); // This will throw if there are issues
        } catch (error) {
            const configError = new Error(`Failed to reload configuration: ${error instanceof Error ? error.message : String(error)}`);
            configError.name = 'ConfigurationError';
            throw configError;
        }
    }

    /**
     * Reset configuration (useful for testing)
     */
    public resetConfig(): void {
        this.config = null;
        this.envLoaded = false;
    }

    /**
     * Check if configuration is ready without throwing errors
     */
    public isConfigReady(): boolean {
        try {
            const validation = this.validateConfig();
            return validation.isValid;
        } catch {
            return false;
        }
    }
}
