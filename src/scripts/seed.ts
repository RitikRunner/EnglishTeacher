import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Teacher } from '../models/Teacher';
import { Session } from '../models/Session';
import { SessionStatus } from '../types';

export const runSeed = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    await connectDatabase();

    // Clear existing collections
    await User.deleteMany({});
    await Teacher.deleteMany({});
    await Session.deleteMany({});
    console.log('🧹 Cleared existing User, Teacher, and Session records.');

    // 1. Seed Users
    const users = await User.create([
      {
        fullName: 'Alice Walker',
        email: 'alice.walker@example.com',
        phone: '+1-555-0142'
      },
      {
        fullName: 'Bob Martinez',
        email: 'bob.martinez@example.com',
        phone: '+1-555-0199'
      }
    ]);
    console.log(`✅ Seeded ${users.length} Users.`);

    // 2. Seed Teachers
    const teachers = await Teacher.create([
      {
        fullName: 'Dr. Eleanor Vance',
        email: 'eleanor.vance@example.com',
        specialization: 'Business English & IELTS Preparation',
        experience: 8
      },
      {
        fullName: 'Prof. Marcus Chen',
        email: 'marcus.chen@example.com',
        specialization: 'Advanced Grammar & Phonetics',
        experience: 12
      },
      {
        fullName: 'Sarah Jenkins',
        email: 'sarah.jenkins@example.com',
        specialization: 'Conversational Fluency & Accent Reduction',
        experience: 6
      }
    ]);
    console.log(`✅ Seeded ${teachers.length} Teachers.`);

    // Current date references
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    // Times for today
    const slot1Start = new Date(today.getTime() + 10 * 60 * 60 * 1000); // 10:00 AM UTC
    const slot1End = new Date(today.getTime() + 11 * 60 * 60 * 1000);   // 11:00 AM UTC

    const slot2Start = new Date(today.getTime() + 14 * 60 * 60 * 1000); // 02:00 PM UTC
    const slot2End = new Date(today.getTime() + 15 * 60 * 60 * 1000);   // 03:00 PM UTC

    const slot3Start = new Date(today.getTime() + 16 * 60 * 60 * 1000); // 04:00 PM UTC
    const slot3End = new Date(today.getTime() + 17 * 60 * 60 * 1000);   // 05:00 PM UTC

    // Times for past (completed) session
    const pastStart = new Date(today.getTime() - 48 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000);
    const pastEnd = new Date(today.getTime() - 48 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000);
    const pastCompletedAt = new Date(pastEnd.getTime() + 5 * 60 * 1000);

    // 3. Seed Sessions
    const sessions = await Session.create([
      // Session 1: AVAILABLE today (Eleanor)
      {
        teacherId: teachers[0]._id,
        userId: null,
        startTime: slot1Start,
        endTime: slot1End,
        status: SessionStatus.AVAILABLE,
        completedAt: null
      },
      // Session 2: AVAILABLE today (Marcus)
      {
        teacherId: teachers[1]._id,
        userId: null,
        startTime: slot2Start,
        endTime: slot2End,
        status: SessionStatus.AVAILABLE,
        completedAt: null
      },
      // Session 3: BOOKED for Alice today (Sarah)
      {
        teacherId: teachers[2]._id,
        userId: users[0]._id,
        startTime: slot3Start,
        endTime: slot3End,
        status: SessionStatus.BOOKED,
        completedAt: null
      },
      // Session 4: COMPLETED for Alice (Eleanor)
      {
        teacherId: teachers[0]._id,
        userId: users[0]._id,
        startTime: pastStart,
        endTime: pastEnd,
        status: SessionStatus.COMPLETED,
        completedAt: pastCompletedAt
      }
    ]);
    console.log(`✅ Seeded ${sessions.length} Sessions.`);

    console.log('\n================ SAMPLE IDS FOR TESTING ================');
    console.log(`Alice Walker User ID:     ${users[0]._id}`);
    console.log(`Bob Martinez User ID:       ${users[1]._id}`);
    console.log(`Eleanor Vance Teacher ID:   ${teachers[0]._id}`);
    console.log(`Marcus Chen Teacher ID:     ${teachers[1]._id}`);
    console.log(`Available Session ID:       ${sessions[0]._id}`);
    console.log(`Booked Session ID:          ${sessions[2]._id}`);
    console.log(`Completed Session ID:       ${sessions[3]._id}`);
    console.log(`Today's Timestamp:          ${today.getTime()} (${today.toISOString()})`);
    console.log('========================================================\n');

    await disconnectDatabase();
    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  runSeed();
}
