import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  PORT: number;
  NODE_ENV: string;
  MONGO_URI: string;
  USE_MEMORY_DB: boolean;
}

export const config: AppConfig = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/english_learning_platform',
  USE_MEMORY_DB: process.env.USE_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test'
};
