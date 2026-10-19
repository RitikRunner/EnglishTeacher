import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { SessionStatus } from '../types';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @desc    Create a new user
 * @route   POST /users
 * @access  Public
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, phone } = req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw ApiError.conflict(`A user with email '${email}' already exists`);
  }

  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    phone
  });

  return ApiResponse.created(res, 'User created successfully', user);
});

/**
 * @desc    Get all users (utility endpoint)
 * @route   GET /users
 * @access  Public
 */
export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'Users retrieved successfully', users);
});

/**
 * @desc    Get user's session list separated into Upcoming and Completed sessions
 * @route   GET /users/:id/sessions
 * @access  Public
 * @note    MANDATORY REQUIREMENT: Implemented using MongoDB Aggregation Pipeline
 */
export const getUserSessions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate that user exists
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound(`User with ID '${id}' not found`);
  }

  const userObjectId = new mongoose.Types.ObjectId(id as string);

  // Aggregation pipeline to retrieve and separate sessions
  const aggregationResult = await Session.aggregate([
    {
      $match: {
        userId: userObjectId
      }
    },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    {
      $unwind: {
        path: '$teacher',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $facet: {
        upcomingSessions: [
          {
            $match: {
              status: SessionStatus.BOOKED
            }
          },
          {
            $sort: { startTime: 1 }
          },
          {
            $project: {
              _id: 1,
              status: 1,
              startTime: 1,
              endTime: 1,
              teacherId: 1,
              teacher: {
                _id: '$teacher._id',
                fullName: '$teacher.fullName',
                email: '$teacher.email',
                specialization: '$teacher.specialization',
                experience: '$teacher.experience'
              },
              createdAt: 1,
              updatedAt: 1
            }
          }
        ],
        completedSessions: [
          {
            $match: {
              status: SessionStatus.COMPLETED
            }
          },
          {
            $sort: { completedAt: -1, startTime: -1 }
          },
          {
            $project: {
              _id: 1,
              status: 1,
              startTime: 1,
              endTime: 1,
              completedAt: 1,
              teacherId: 1,
              teacher: {
                _id: '$teacher._id',
                fullName: '$teacher.fullName',
                email: '$teacher.email',
                specialization: '$teacher.specialization',
                experience: '$teacher.experience'
              },
              createdAt: 1,
              updatedAt: 1
            }
          }
        ]
      }
    }
  ]);

  const output = aggregationResult[0] || {
    upcomingSessions: [],
    completedSessions: []
  };

  return ApiResponse.success(res, 200, 'User sessions retrieved successfully', {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email
    },
    upcomingSessions: output.upcomingSessions,
    completedSessions: output.completedSessions
  });
});
