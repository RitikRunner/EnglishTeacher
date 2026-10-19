import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, statusCode = 200, message = 'Success', data?: T) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static created<T>(res: Response, message = 'Resource created successfully', data?: T) {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }
}
