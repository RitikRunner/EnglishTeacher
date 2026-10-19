import { Router } from 'express';
import {
  createSession,
  getAvailableSessions,
  bookSession,
  markSessionComplete,
  getAllSessions,
  getSessionById
} from '../controllers/session.controller';
import { validate } from '../middlewares/validate';
import {
  createSessionSchema,
  getAvailableSessionsSchema,
  bookSessionSchema,
  completeSessionSchema
} from '../validations/session.validation';

const router = Router();

// API 2 - Create Session
router.post('/', validate(createSessionSchema), createSession);

// API 3 - Available Sessions for Booking (MongoDB Aggregation Pipeline)
router.get('/available', validate(getAvailableSessionsSchema), getAvailableSessions);

// API 4 - Book Session
router.post('/:id/book', validate(bookSessionSchema), bookSession);

// API 5 - Mark Session Complete
router.patch('/:id/complete', validate(completeSessionSchema), markSessionComplete);

// Utility - Get all sessions (with filters)
router.get('/', getAllSessions);

// Utility - Get session by ID
router.get('/:id', getSessionById);

export default router;
