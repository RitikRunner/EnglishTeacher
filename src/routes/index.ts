import { Router } from 'express';
import userRoutes from './user.routes';
import sessionRoutes from './session.routes';
import teacherRoutes from './teacher.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount resource routes
router.use('/users', userRoutes);
router.use('/sessions', sessionRoutes);
router.use('/teachers', teacherRoutes);

export default router;
