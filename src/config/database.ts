import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './env';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDatabase = async (): Promise<void> => {
  try {
    if (config.USE_MEMORY_DB) {
      console.log('⚡ Starting in-memory MongoDB instance (USE_MEMORY_DB is enabled)...');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`✅ Connected to In-Memory MongoDB at ${memoryUri}`);
      return;
    }

    try {
      console.log(`⏳ Connecting to MongoDB at ${config.MONGO_URI}...`);
      await mongoose.connect(config.MONGO_URI, {
        serverSelectionTimeoutMS: 4000
      });
      console.log(`✅ Connected to MongoDB successfully (${config.MONGO_URI})`);
    } catch (primaryErr) {
      console.warn(`⚠️ Could not connect to local/configured MongoDB at ${config.MONGO_URI}.`);
      console.warn('⚡ Automatically falling back to in-memory MongoDB for seamless local development & testing...');
      mongoMemoryServer = await MongoMemoryServer.create();
      const fallbackUri = mongoMemoryServer.getUri();
      await mongoose.connect(fallbackUri);
      console.log(`✅ Connected to In-Memory MongoDB fallback at ${fallbackUri}`);
    }
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
};
