import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Teacher } from '../src/models/Teacher';
import { Session } from '../src/models/Session';
import { SessionStatus } from '../src/types';

describe('English Learning Platform - Backend API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Teacher.deleteMany({});
    await Session.deleteMany({});
  });

  describe('Health Check', () => {
    it('GET /health - should return 200 with status healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('API 1: POST /users - Create User', () => {
    it('should create a new user successfully with 201 Created', async () => {
      const payload = {
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+1-555-1234567'
      };

      const res = await request(app).post('/users').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.fullName).toBe(payload.fullName);
      expect(res.body.data.email).toBe(payload.email.toLowerCase());
      expect(res.body.data.phone).toBe(payload.phone);
      expect(res.body.data).toHaveProperty('createdAt');
      expect(res.body.data).toHaveProperty('updatedAt');
    });

    it('should return 409 Conflict if email is already registered', async () => {
      await User.create({
        fullName: 'Existing User',
        email: 'duplicate@example.com',
        phone: '+1-555-0000000'
      });

      const res = await request(app).post('/users').send({
        fullName: 'New User',
        email: 'duplicate@example.com',
        phone: '+1-555-9999999'
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return 400 Bad Request on invalid email format', async () => {
      const res = await request(app).post('/users').send({
        fullName: 'Invalid User',
        email: 'not-an-email',
        phone: '+1-555-1234567'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Validation Failed/i);
    });

    it('should return 400 Bad Request if required fields are missing', async () => {
      const res = await request(app).post('/users').send({
        fullName: 'Incomplete User'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('API 2: POST /sessions - Create Session', () => {
    let teacher: any;

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Prof. John Keating',
        email: 'keating@welton.edu',
        specialization: 'Poetry & Literature',
        experience: 15
      });
    });

    it('should create a session with default status AVAILABLE', async () => {
      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 7200000).toISOString();

      const res = await request(app).post('/sessions').send({
        teacherId: teacher._id.toString(),
        startTime,
        endTime
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.AVAILABLE);
      expect(res.body.data.userId).toBeNull();
      expect(res.body.data.teacherId.toString()).toBe(teacher._id.toString());
      expect(new Date(res.body.data.startTime).toISOString()).toBe(startTime);
      expect(new Date(res.body.data.endTime).toISOString()).toBe(endTime);
    });

    it('should return 404 Not Found if teacher does not exist', async () => {
      const fakeTeacherId = new mongoose.Types.ObjectId().toString();
      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 7200000).toISOString();

      const res = await request(app).post('/sessions').send({
        teacherId: fakeTeacherId,
        startTime,
        endTime
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not exist/i);
    });

    it('should return 400 Bad Request if endTime is earlier than or equal to startTime', async () => {
      const startTime = new Date(Date.now() + 7200000).toISOString();
      const endTime = new Date(Date.now() + 3600000).toISOString(); // End before start

      const res = await request(app).post('/sessions').send({
        teacherId: teacher._id.toString(),
        startTime,
        endTime
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/endTime must be greater than startTime/i);
    });

    it('should return 409 Conflict if teacher has an overlapping active session', async () => {
      const baseTime = Date.now() + 10000000;
      const start1 = new Date(baseTime);
      const end1 = new Date(baseTime + 3600000);

      // Create initial session
      await Session.create({
        teacherId: teacher._id,
        startTime: start1,
        endTime: end1,
        status: SessionStatus.AVAILABLE
      });

      // Attempt to create overlapping session
      const res = await request(app).post('/sessions').send({
        teacherId: teacher._id.toString(),
        startTime: new Date(baseTime + 1800000).toISOString(), // starts halfway through
        endTime: new Date(baseTime + 5400000).toISOString()
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/overlapping|interval/i);
    });
  });

  describe('API 3: GET /sessions/available - Available Sessions via Aggregation Pipeline', () => {
    let teacher: any;
    const testDate = new Date('2026-11-15T00:00:00.000Z');

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Dr. Gregory House',
        email: 'house@princeton.edu',
        specialization: 'Medical English & Diagnostics',
        experience: 20
      });

      // Session 1: AVAILABLE on testDate
      await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-11-15T10:00:00.000Z'),
        endTime: new Date('2026-11-15T11:00:00.000Z'),
        status: SessionStatus.AVAILABLE
      });

      // Session 2: AVAILABLE on testDate (afternoon)
      await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-11-15T14:00:00.000Z'),
        endTime: new Date('2026-11-15T15:00:00.000Z'),
        status: SessionStatus.AVAILABLE
      });

      // Session 3: BOOKED on testDate (should NOT be returned)
      const user = await User.create({
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '123456789'
      });
      await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-11-15T16:00:00.000Z'),
        endTime: new Date('2026-11-15T17:00:00.000Z'),
        status: SessionStatus.BOOKED
      });

      // Session 4: AVAILABLE on a DIFFERENT date (should NOT be returned)
      await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-11-16T10:00:00.000Z'),
        endTime: new Date('2026-11-16T11:00:00.000Z'),
        status: SessionStatus.AVAILABLE
      });
    });

    it('should return available sessions using numeric timestamp parameter', async () => {
      const timestamp = testDate.getTime();
      const res = await request(app).get(`/sessions/available?dateTimestamp=${timestamp}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalAvailable).toBe(2);
      expect(res.body.data.sessions.length).toBe(2);

      // Verify MongoDB aggregation projection and teacher lookup
      const session1 = res.body.data.sessions[0];
      expect(session1.status).toBe(SessionStatus.AVAILABLE);
      expect(session1.teacher).toBeDefined();
      expect(session1.teacher.fullName).toBe('Dr. Gregory House');
      expect(session1.teacher.specialization).toBe('Medical English & Diagnostics');
    });

    it('should return available sessions using ISO date string', async () => {
      const res = await request(app).get('/sessions/available?dateTimestamp=2026-11-15');

      expect(res.status).toBe(200);
      expect(res.body.data.totalAvailable).toBe(2);
    });

    it('should return 400 Bad Request if dateTimestamp query parameter is missing', async () => {
      const res = await request(app).get('/sessions/available');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 Bad Request if dateTimestamp is invalid', async () => {
      const res = await request(app).get('/sessions/available?dateTimestamp=not-a-date');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('API 4: POST /sessions/:id/book - Book Session', () => {
    let teacher: any;
    let user: any;
    let session: any;

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Prof. Minerva McGonagall',
        email: 'minerva@hogwarts.edu',
        specialization: 'Transfiguration of English Language',
        experience: 30
      });

      user = await User.create({
        fullName: 'Harry Potter',
        email: 'harry@hogwarts.edu',
        phone: '+44-7700-900077'
      });

      session = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-12-01T10:00:00.000Z'),
        endTime: new Date('2026-12-01T11:00:00.000Z'),
        status: SessionStatus.AVAILABLE
      });
    });

    it('should successfully book an AVAILABLE session and associate with user', async () => {
      const res = await request(app)
        .post(`/sessions/${session._id}/book`)
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.BOOKED);
      expect(res.body.data.userId._id.toString()).toBe(user._id.toString());

      // Verify in DB
      const updated = await Session.findById(session._id);
      expect(updated?.status).toBe(SessionStatus.BOOKED);
      expect(updated?.userId?.toString()).toBe(user._id.toString());
    });

    it('should return 404 Not Found if user does not exist', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/sessions/${session._id}/book`)
        .send({ userId: fakeUserId });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/user with id .* not found/i);
    });

    it('should return 404 Not Found if session does not exist', async () => {
      const fakeSessionId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/sessions/${fakeSessionId}/book`)
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/session with id .* not found/i);
    });

    it('should return 400 Bad Request when attempting to book an already BOOKED session', async () => {
      // First booking
      await request(app)
        .post(`/sessions/${session._id}/book`)
        .send({ userId: user._id.toString() });

      // Second booking attempt
      const res = await request(app)
        .post(`/sessions/${session._id}/book`)
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be booked again/i);
    });

    it('should return 400 Bad Request when attempting to book a COMPLETED session', async () => {
      session.status = SessionStatus.COMPLETED;
      session.completedAt = new Date();
      await session.save();

      const res = await request(app)
        .post(`/sessions/${session._id}/book`)
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/completed session cannot be booked/i);
    });
  });

  describe('API 5: PATCH /sessions/:id/complete - Mark Session Complete', () => {
    let teacher: any;
    let user: any;
    let session: any;

    beforeEach(async () => {
      teacher = await Teacher.create({
        fullName: 'Prof. Severus Snape',
        email: 'snape@hogwarts.edu',
        specialization: 'Potions & Concise Speech',
        experience: 18
      });

      user = await User.create({
        fullName: 'Hermione Granger',
        email: 'hermione@hogwarts.edu',
        phone: '+44-7700-900088'
      });

      session = await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        status: SessionStatus.BOOKED
      });
    });

    it('should mark a BOOKED session as COMPLETED and set completedAt', async () => {
      const res = await request(app).patch(`/sessions/${session._id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.COMPLETED);
      expect(res.body.data.completedAt).toBeDefined();

      // Verify in DB
      const updated = await Session.findById(session._id);
      expect(updated?.status).toBe(SessionStatus.COMPLETED);
      expect(updated?.completedAt).not.toBeNull();
    });

    it('should return 400 Bad Request if session is in AVAILABLE status (not yet booked)', async () => {
      session.status = SessionStatus.AVAILABLE;
      session.userId = null;
      await session.save();

      const res = await request(app).patch(`/sessions/${session._id}/complete`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/only booked sessions can be marked as completed/i);
    });

    it('should return 400 Bad Request if session is already COMPLETED', async () => {
      session.status = SessionStatus.COMPLETED;
      session.completedAt = new Date();
      await session.save();

      const res = await request(app).patch(`/sessions/${session._id}/complete`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already.*completed/i);
    });

    it('should return 404 Not Found if session ID does not exist', async () => {
      const fakeSessionId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).patch(`/sessions/${fakeSessionId}/complete`);

      expect(res.status).toBe(404);
    });
  });

  describe('API 6: GET /users/:id/sessions - User Session List via Aggregation Pipeline', () => {
    let teacher1: any;
    let teacher2: any;
    let user: any;

    beforeEach(async () => {
      teacher1 = await Teacher.create({
        fullName: 'Dr. Amy Pond',
        email: 'amy.pond@tardis.org',
        specialization: 'Creative Writing',
        experience: 7
      });

      teacher2 = await Teacher.create({
        fullName: 'Prof. Rory Williams',
        email: 'rory.williams@tardis.org',
        specialization: 'Technical & Medical Writing',
        experience: 9
      });

      user = await User.create({
        fullName: 'Rose Tyler',
        email: 'rose.tyler@parallel.org',
        phone: '+44-7700-111222'
      });

      // Session 1: Upcoming BOOKED session
      await Session.create({
        teacherId: teacher1._id,
        userId: user._id,
        startTime: new Date('2026-12-10T10:00:00.000Z'),
        endTime: new Date('2026-12-10T11:00:00.000Z'),
        status: SessionStatus.BOOKED
      });

      // Session 2: Another upcoming BOOKED session
      await Session.create({
        teacherId: teacher2._id,
        userId: user._id,
        startTime: new Date('2026-12-12T14:00:00.000Z'),
        endTime: new Date('2026-12-12T15:00:00.000Z'),
        status: SessionStatus.BOOKED
      });

      // Session 3: COMPLETED session
      await Session.create({
        teacherId: teacher1._id,
        userId: user._id,
        startTime: new Date('2026-10-01T10:00:00.000Z'),
        endTime: new Date('2026-10-01T11:00:00.000Z'),
        status: SessionStatus.COMPLETED,
        completedAt: new Date('2026-10-01T11:05:00.000Z')
      });

      // Session 4: Unrelated session belonging to a different user
      const otherUser = await User.create({
        fullName: 'Other User',
        email: 'other@example.com',
        phone: '9999999999'
      });
      await Session.create({
        teacherId: teacher2._id,
        userId: otherUser._id,
        startTime: new Date('2026-12-15T10:00:00.000Z'),
        endTime: new Date('2026-12-15T11:00:00.000Z'),
        status: SessionStatus.BOOKED
      });
    });

    it('should return sessions separated into upcomingSessions and completedSessions using Aggregation Pipeline', async () => {
      const res = await request(app).get(`/users/${user._id}/sessions`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('upcomingSessions');
      expect(res.body.data).toHaveProperty('completedSessions');

      const { upcomingSessions, completedSessions } = res.body.data;

      // Exactly 2 upcoming sessions
      expect(upcomingSessions.length).toBe(2);
      expect(upcomingSessions[0].status).toBe(SessionStatus.BOOKED);
      expect(upcomingSessions[0].teacher).toBeDefined();
      expect(upcomingSessions[0].teacher.fullName).toBeDefined();

      // Exactly 1 completed session
      expect(completedSessions.length).toBe(1);
      expect(completedSessions[0].status).toBe(SessionStatus.COMPLETED);
      expect(completedSessions[0].completedAt).toBeDefined();
      expect(completedSessions[0].teacher).toBeDefined();
      expect(completedSessions[0].teacher.fullName).toBe('Dr. Amy Pond');
    });

    it('should return 404 Not Found if user does not exist', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/users/${fakeUserId}/sessions`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 400 Bad Request for invalid user ID format', async () => {
      const res = await request(app).get('/users/invalid-id-format/sessions');
      expect(res.status).toBe(400);
    });
  });
});
