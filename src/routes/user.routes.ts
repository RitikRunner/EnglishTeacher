import { Router } from 'express';
import { createUser, getUsers, getUserSessions } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { createUserSchema, getUserSessionsSchema } from '../validations/user.validation';

const router = Router();

// API 1 - Create User
router.post('/', validate(createUserSchema), createUser);

// Utility - Get all users
router.get('/', getUsers);

// API 6 - User Session List (Separated into Upcoming and Completed via Aggregation)
router.get('/:id/sessions', validate(getUserSessionsSchema), getUserSessions);

export default router;
