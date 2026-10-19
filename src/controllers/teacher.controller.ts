import { Request, Response } from 'express';
import { Teacher } from '../models/Teacher';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @desc    Create a new teacher
 * @route   POST /teachers
 * @access  Public
 */
export const createTeacher = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, specialization, experience } = req.body;

  const teacher = await Teacher.create({
    fullName,
    email: email.toLowerCase(),
    specialization,
    experience
  });

  return ApiResponse.created(res, 'Teacher created successfully', teacher);
});

/**
 * @desc    Get all teachers
 * @route   GET /teachers
 * @access  Public
 */
export const getTeachers = asyncHandler(async (_req: Request, res: Response) => {
  const teachers = await Teacher.find().sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'Teachers retrieved successfully', teachers);
});

/**
 * @desc    Get single teacher by ID
 * @route   GET /teachers/:id
 * @access  Public
 */
export const getTeacherById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const teacher = await Teacher.findById(id);

  if (!teacher) {
    throw ApiError.notFound(`Teacher with ID '${id}' not found`);
  }

  return ApiResponse.success(res, 200, 'Teacher retrieved successfully', teacher);
});
