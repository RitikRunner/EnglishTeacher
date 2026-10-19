import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Session } from '../models/Session';
import { Teacher } from '../models/Teacher';
import { User } from '../models/User';
import { SessionStatus } from '../types';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @desc    Create a new session for a teacher (Default: AVAILABLE)
 * @route   POST /sessions
 * @access  Public
 */
export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, startTime, endTime } = req.body;

  // 1. Validate teacher exists
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw ApiError.notFound(`Teacher with ID '${teacherId}' does not exist`);
  }

  // 2. Parse and validate dates
  const startDate = new Date(
    typeof startTime === 'number'
      ? startTime
      : isNaN(Number(startTime))
      ? startTime
      : Number(startTime)
  );
  const endDate = new Date(
    typeof endTime === 'number'
      ? endTime
      : isNaN(Number(endTime))
      ? endTime
      : Number(endTime)
  );

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw ApiError.badRequest('Invalid date format for startTime or endTime');
  }

  if (endDate.getTime() <= startDate.getTime()) {
    throw ApiError.badRequest('endTime must be greater than startTime');
  }

  // 3. Check for overlapping sessions for this teacher
  const conflictingSession = await Session.findOne({
    teacherId: teacher._id,
    status: { $ne: SessionStatus.COMPLETED },
    $or: [
      {
        startTime: { $lt: endDate },
        endTime: { $gt: startDate }
      }
    ]
  });

  if (conflictingSession) {
    throw ApiError.conflict(
      'Teacher already has another active session scheduled during this time interval',
      {
        conflictingSessionId: conflictingSession._id,
        startTime: conflictingSession.startTime,
        endTime: conflictingSession.endTime
      }
    );
  }

  // 4. Create the session with default status = AVAILABLE
  const session = await Session.create({
    teacherId: teacher._id,
    userId: null,
    startTime: startDate,
    endTime: endDate,
    status: SessionStatus.AVAILABLE,
    completedAt: null
  });

  return ApiResponse.created(res, 'Session created successfully', session);
});

/**
 * @desc    Get all AVAILABLE sessions for a given date
 * @route   GET /sessions/available?dateTimestamp={timestamp}
 * @access  Public
 * @note    MANDATORY REQUIREMENT: Implemented using MongoDB Aggregation Pipeline
 */
export const getAvailableSessions = asyncHandler(async (req: Request, res: Response) => {
  const { dateTimestamp } = req.query;

  if (!dateTimestamp) {
    throw ApiError.badRequest('Query parameter dateTimestamp is required');
  }

  // Parse dateTimestamp (supports unix timestamp in seconds, milliseconds, or ISO date string)
  let baseDate: Date;
  const numericVal = Number(dateTimestamp);

  if (!isNaN(numericVal)) {
    // If <= 10 digits (e.g. 1718000000), interpret as seconds; else milliseconds
    baseDate = new Date(numericVal > 10000000000 ? numericVal : numericVal * 1000);
  } else {
    baseDate = new Date(dateTimestamp as string);
  }

  if (isNaN(baseDate.getTime())) {
    throw ApiError.badRequest('dateTimestamp must be a valid numeric unix timestamp or date string');
  }

  // Compute start and end of the UTC day
  const startOfDay = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), 0, 0, 0, 0)
  );
  const endOfDay = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), 23, 59, 59, 999)
  );

  // Aggregation Pipeline
  const availableSessions = await Session.aggregate([
    {
      $match: {
        status: SessionStatus.AVAILABLE,
        startTime: {
          $gte: startOfDay,
          $lte: endOfDay
        }
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
      $unwind: '$teacher'
    },
    {
      $sort: {
        startTime: 1
      }
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
  ]);

  return ApiResponse.success(res, 200, 'Available sessions retrieved successfully', {
    date: startOfDay.toISOString().split('T')[0],
    queryTimestamp: dateTimestamp,
    totalAvailable: availableSessions.length,
    sessions: availableSessions
  });
});

/**
 * @desc    Book an available session
 * @route   POST /sessions/:id/book
 * @access  Public
 */
export const bookSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  // 1. Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound(`User with ID '${userId}' not found`);
  }

  // 2. Verify session exists
  const session = await Session.findById(id);
  if (!session) {
    throw ApiError.notFound(`Session with ID '${id}' not found`);
  }

  // 3. Check session status
  if (session.status === SessionStatus.BOOKED) {
    throw ApiError.badRequest('A booked session cannot be booked again');
  }

  if (session.status === SessionStatus.COMPLETED) {
    throw ApiError.badRequest('A completed session cannot be booked');
  }

  if (session.status !== SessionStatus.AVAILABLE) {
    throw ApiError.badRequest(`Only AVAILABLE sessions can be booked. Current status is ${session.status}`);
  }

  // 4. Atomically book the session (prevents race conditions)
  const updatedSession = await Session.findOneAndUpdate(
    {
      _id: id,
      status: SessionStatus.AVAILABLE
    },
    {
      $set: {
        status: SessionStatus.BOOKED,
        userId: user._id
      }
    },
    { new: true }
  )
    .populate('teacherId', 'fullName email specialization experience')
    .populate('userId', 'fullName email phone');

  if (!updatedSession) {
    throw ApiError.badRequest('Session was booked by another user concurrently or is no longer available');
  }

  return ApiResponse.success(res, 200, 'Session booked successfully', updatedSession);
});

/**
 * @desc    Mark a booked session as complete
 * @route   PATCH /sessions/:id/complete
 * @access  Public
 */
export const markSessionComplete = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // 1. Verify session exists
  const session = await Session.findById(id);
  if (!session) {
    throw ApiError.notFound(`Session with ID '${id}' not found`);
  }

  // 2. Validate current status: only BOOKED sessions can be marked as completed
  if (session.status === SessionStatus.COMPLETED) {
    throw ApiError.badRequest('Session has already been marked as COMPLETED');
  }

  if (session.status === SessionStatus.AVAILABLE) {
    throw ApiError.badRequest(
      'Only BOOKED sessions can be marked as completed. This session is currently AVAILABLE'
    );
  }

  if (session.status !== SessionStatus.BOOKED) {
    throw ApiError.badRequest(
      `Only BOOKED sessions can be marked as completed. Current status is ${session.status}`
    );
  }

  // 3. Update status to COMPLETED and set completedAt
  session.status = SessionStatus.COMPLETED;
  session.completedAt = new Date();
  await session.save();

  const populatedSession = await Session.findById(session._id)
    .populate('teacherId', 'fullName email specialization experience')
    .populate('userId', 'fullName email phone');

  return ApiResponse.success(res, 200, 'Session marked as completed successfully', populatedSession);
});

/**
 * @desc    Get all sessions with optional filters (utility endpoint)
 * @route   GET /sessions
 * @access  Public
 */
export const getAllSessions = asyncHandler(async (req: Request, res: Response) => {
  const { status, teacherId, userId } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (teacherId && mongoose.Types.ObjectId.isValid(teacherId as string)) filter.teacherId = teacherId;
  if (userId && mongoose.Types.ObjectId.isValid(userId as string)) filter.userId = userId;

  const sessions = await Session.find(filter)
    .populate('teacherId', 'fullName email specialization experience')
    .populate('userId', 'fullName email phone')
    .sort({ startTime: -1 });

  return ApiResponse.success(res, 200, 'Sessions retrieved successfully', sessions);
});

/**
 * @desc    Get session by ID (utility endpoint)
 * @route   GET /sessions/:id
 * @access  Public
 */
export const getSessionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    throw ApiError.badRequest('Invalid session ID format');
  }

  const session = await Session.findById(id)
    .populate('teacherId', 'fullName email specialization experience')
    .populate('userId', 'fullName email phone');

  if (!session) {
    throw ApiError.notFound(`Session with ID '${id}' not found`);
  }

  return ApiResponse.success(res, 200, 'Session retrieved successfully', session);
});
