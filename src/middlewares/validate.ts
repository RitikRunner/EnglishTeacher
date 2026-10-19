import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export const validate = (schema: ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Express 5 compatibility: req.query has only a getter, so mutate properties instead of reassigning
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.params !== undefined && typeof req.params === 'object') {
        Object.assign(req.params, parsed.params);
      }
      if (parsed.query !== undefined && typeof req.query === 'object') {
        Object.assign(req.query, parsed.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.issues.map((issue) => ({
          field: issue.path.join('.').replace(/^(body|query|params)\.?/, ''),
          message: issue.message
        }));

        const errorMessage = errorDetails.map((e) => e.message).join('; ');
        return next(new ApiError(400, `Validation Failed: ${errorMessage}`, errorDetails));
      }
      next(error);
    }
  };
};
