import { Schema, model, Document, Types } from 'mongoose';
import { ISession, SessionStatus } from '../types';

export interface SessionDocument extends Omit<ISession, '_id'>, Document {}

const sessionSchema = new Schema<SessionDocument>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SessionStatus),
        message: 'Status must be AVAILABLE, BOOKED, or COMPLETED'
      },
      default: SessionStatus.AVAILABLE,
      index: true
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index for optimizing available sessions queries and user session queries
sessionSchema.index({ status: 1, startTime: 1 });
sessionSchema.index({ userId: 1, status: 1 });
sessionSchema.index({ teacherId: 1, startTime: 1, endTime: 1 });

export const Session = model<SessionDocument>('Session', sessionSchema);
