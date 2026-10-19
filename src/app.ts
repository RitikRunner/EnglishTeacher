import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { ApiError } from './utils/ApiError';
import { config } from './config/env';

export const createApp = (): Application => {
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(cors());

  // Request parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging (disabled during automated test runs)
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Base welcome route
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      message: 'Teacher Session Booking REST API is active',
      documentation: 'See README.md and Postman Collection for usage',
      health: '/health'
    });
  });

  // Mount API routes
  app.use('/', routes);

  // Catch-all 404 handler for undefined endpoints
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
  });

  // Global centralized error handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
