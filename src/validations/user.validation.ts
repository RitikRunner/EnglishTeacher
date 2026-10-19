import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdValidator = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format'
  });

export const createUserSchema = z.object({
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
    phone: z
      .string({ required_error: 'phone is required' })
      .trim()
      .min(7, 'phone number must be at least 7 characters')
      .max(20, 'phone number cannot exceed 20 characters')
  })
});

export const getUserSessionsSchema = z.object({
  params: z.object({
    id: objectIdValidator
  })
});
