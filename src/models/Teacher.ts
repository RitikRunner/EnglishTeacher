import { Schema, model, Document } from 'mongoose';
import { ITeacher } from '../types';

export interface TeacherDocument extends Omit<ITeacher, '_id'>, Document {}

const teacherSchema = new Schema<TeacherDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'Teacher full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Teacher email is required'],
      lowercase: true,
      trim: true
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true
    },
    experience: {
      type: Number,
      required: [true, 'Experience in years is required'],
      min: [0, 'Experience cannot be negative']
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

export const Teacher = model<TeacherDocument>('Teacher', teacherSchema);
