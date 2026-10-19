import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdValidator = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format'
  });

export const createTeacherSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: 'fullName is required' })
      .trim()
      .min(2, 'fullName must be at least 2 characters')
      .max(100, 'fullName cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address format'),
    specialization: z
      .string({ required_error: 'specialization is required' })
      .trim()
      .min(2, 'specialization must be at least 2 characters'),
    experience: z
      .number({ required_error: 'experience is required' })
      .min(0, 'experience cannot be negative')
  })
});

export const getTeacherByIdSchema = z.object({
  params: z.object({
    id: objectIdValidator
  })
});
