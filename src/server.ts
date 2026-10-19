import { app } from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(config.PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Server running in ${config.NODE_ENV} mode`);
      console.log(`📡 Listening on http://localhost:${config.PORT}`);
      console.log(`🩺 Health check: http://localhost:${config.PORT}/health`);
      console.log(`===============================================`);
    });

    // Graceful shutdown
    const handleShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      console.error('💥 Unhandled Rejection at:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      console.error('💥 Uncaught Exception thrown:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
