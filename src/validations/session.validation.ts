import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdValidator = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format'
  });

const dateStringOrNumberValidator = z.union([
  z.string().datetime({ message: 'startTime/endTime must be a valid ISO 8601 date string' }),
  z.string().refine((val) => !isNaN(Date.parse(val)) || !isNaN(Number(val)), {
    message: 'Must be a valid date or numeric timestamp'
  }),
  z.number()
]);

export const createSessionSchema = z.object({
  body: z
    .object({
      teacherId: objectIdValidator,
      startTime: dateStringOrNumberValidator,
      endTime: dateStringOrNumberValidator
    })
    .refine(
      (data) => {
        const start = new Date(typeof data.startTime === 'number' ? data.startTime : isNaN(Number(data.startTime)) ? data.startTime : Number(data.startTime));
        const end = new Date(typeof data.endTime === 'number' ? data.endTime : isNaN(Number(data.endTime)) ? data.endTime : Number(data.endTime));
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end.getTime() > start.getTime();
      },
      {
        message: 'endTime must be greater than startTime',
        path: ['endTime']
      }
    )
});

export const getAvailableSessionsSchema = z.object({
  query: z.object({
    dateTimestamp: z
      .string({ required_error: 'dateTimestamp query parameter is required' })
      .min(1, 'dateTimestamp cannot be empty')
      .refine(
        (val) => {
          // Check if valid numeric epoch (e.g., 1718000000000 or 1718000000) or valid date string (e.g. 2026-10-20)
          const num = Number(val);
          if (!isNaN(num) && num > 0) return true;
          const parsed = Date.parse(val);
          return !isNaN(parsed);
        },
        {
          message: 'dateTimestamp must be a valid numeric unix timestamp or date string'
        }
      )
  })
});

export const bookSessionSchema = z.object({
  params: z.object({
    id: objectIdValidator
  }),
  body: z.object({
    userId: objectIdValidator
  })
});

export const completeSessionSchema = z.object({
  params: z.object({
    id: objectIdValidator
  })
});
