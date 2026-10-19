import { Router } from 'express';
import {
  createTeacher,
  getTeachers,
  getTeacherById
} from '../controllers/teacher.controller';
import { validate } from '../middlewares/validate';
import {
  createTeacherSchema,
  getTeacherByIdSchema
} from '../validations/teacher.validation';

const router = Router();

// Create Teacher
router.post('/', validate(createTeacherSchema), createTeacher);

// Get All Teachers
router.get('/', getTeachers);

// Get Teacher by ID
router.get('/:id', validate(getTeacherByIdSchema), getTeacherById);

export default router;
