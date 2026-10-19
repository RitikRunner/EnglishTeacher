# Teacher Session Booking Platform - REST API

A production-grade REST API backend application built with **Node.js**, **TypeScript**, **Express.js**, **MongoDB**, and **Mongoose**. This platform enables teachers to schedule available time slots, allows registered users to book them, browse available sessions by date, view upcoming/completed sessions, and track session completion history.

---

## 🛠️ Mandatory Tech Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript (v5.7+)
- **Web Framework**: Express.js (v5)
- **Database**: MongoDB (Local or MongoDB Atlas, with zero-setup In-Memory MongoDB fallback)
- **ODM**: Mongoose (v8)
- **Validation**: Zod (v3.23)
- **Testing**: Jest + Supertest (Integration test suite with 25 passing test cases)
- **API Tooling**: Postman Collection (`postman_collection.json`)

---

## 🏗️ Architecture & Clean Coding Practices

This project strictly adheres to clean, layered backend architecture:

```
src/
├── config/
│   ├── env.ts              # Strongly-typed environment variables & defaults
│   └── database.ts         # Resilient Mongoose connection with automatic fallback
├── models/
│   ├── User.ts             # User schema with unique email constraint
│   ├── Teacher.ts          # Teacher schema
│   └── Session.ts          # Session schema with compound performance indexes
├── types/
│   └── index.ts            # Domain TypeScript interfaces and enums
├── utils/
│   ├── ApiError.ts         # Centralized HTTP error handler with status codes
│   ├── ApiResponse.ts      # Standardized JSON response envelope
│   └── asyncHandler.ts     # Higher-order async route wrapper
├── middlewares/
│   ├── errorHandler.ts     # Global centralized error handling middleware
│   └── validate.ts         # Generic Zod validation middleware (body, params, query)
├── validations/
│   ├── user.validation.ts  # Zod schemas for User endpoints
│   ├── session.validation.ts # Zod schemas for Session endpoints
│   └── teacher.validation.ts # Zod schemas for Teacher endpoints
├── controllers/
│   ├── user.controller.ts  # Handlers for User APIs (includes Aggregation for API 6)
│   ├── session.controller.ts # Handlers for Session APIs (includes Aggregation for API 3)
│   └── teacher.controller.ts # Handlers for Teacher APIs
├── routes/
│   ├── user.routes.ts      # /users routes
│   ├── session.routes.ts   # /sessions routes
│   ├── teacher.routes.ts   # /teachers routes
│   └── index.ts            # Root router & /health endpoint
├── scripts/
│   └── seed.ts             # Database seeder with realistic test data
├── app.ts                  # Express application configuration & security
└── server.ts               # Server startup & graceful shutdown handlers
```

---

## 🗄️ Database Schemas

### 1. User Schema
| Field | Type | Modifiers / Notes |
|---|---|---|
| `fullName` | `String` | Required, trimmed |
| `email` | `String` | Required, unique, lowercase, trimmed, indexed |
| `phone` | `String` | Required, trimmed |
| `createdAt` | `Date` | Timestamp |
| `updatedAt` | `Date` | Timestamp |

### 2. Teacher Schema
| Field | Type | Modifiers / Notes |
|---|---|---|
| `fullName` | `String` | Required, trimmed |
| `email` | `String` | Required, lowercase, trimmed |
| `specialization`| `String` | Required, trimmed |
| `experience` | `Number` | Required, non-negative (years of experience) |
| `createdAt` | `Date` | Timestamp |
| `updatedAt` | `Date` | Timestamp |

### 3. Session Schema
| Field | Type | Modifiers / Notes |
|---|---|---|
| `teacherId` | `ObjectId` | Ref to `Teacher`, required, indexed |
| `userId` | `ObjectId \| null` | Ref to `User`, default `null`, indexed |
| `startTime` | `Date` | Required, indexed |
| `endTime` | `Date` | Required, indexed |
| `status` | `String` | Enum: `AVAILABLE`, `BOOKED`, `COMPLETED` (default: `AVAILABLE`) |
| `completedAt` | `Date \| null` | Default `null` |
| `createdAt` | `Date` | Timestamp |
| `updatedAt` | `Date` | Timestamp |

*Compound Indexes*:
- `{ status: 1, startTime: 1 }` (Accelerates API 3 queries)
- `{ userId: 1, status: 1 }` (Accelerates API 6 queries)
- `{ teacherId: 1, startTime: 1, endTime: 1 }` (Accelerates overlap checks)

---

## 🚀 Quick Start & Setup Instructions

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/RitikRunner/EnglishTeacher.git
cd EnglishTeacher
npm install
```

### 2. Configure Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Default configuration in `.env`:
```env
PORT=8000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/english_learning_platform
USE_MEMORY_DB=false
```

> **Zero-Setup Support**: If you do not have a local MongoDB daemon running, the application automatically boots an in-memory MongoDB instance with zero configuration required! You can also connect to any local or cloud MongoDB Atlas URI by setting `MONGO_URI`.

### 3. Seed Realistic Demo Data

Run the database seeder to populate sample users, teachers, available slots, and completed sessions:

```bash
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start on **`http://localhost:8000`**.

### 5. Run Automated Tests

Execute the 25-case integration test suite:

```bash
npm test
```

### 6. Build for Production

```bash
npm run build
npm start
```

---

## 📡 API Reference & Endpoints

### API 1: Create User
- **Route**: `POST /users`
- **Description**: Registers a new user with a unique email.
- **Request Body**:
  ```json
  {
    "fullName": "Alice Walker",
    "email": "alice.walker@example.com",
    "phone": "+1-555-0142"
  }
  ```
- **Responses**:
  - `201 Created`: User successfully created.
  - `400 Bad Request`: Validation failure (missing required fields or invalid email format).
  - `409 Conflict`: Email is already registered.

---

### Helper: Create Teacher
- **Route**: `POST /teachers`
- **Description**: Registers a teacher profile.
- **Request Body**:
  ```json
  {
    "fullName": "Dr. Eleanor Vance",
    "email": "eleanor.vance@cambridge.edu",
    "specialization": "Business English & IELTS Preparation",
    "experience": 8
  }
  ```
- **Responses**:
  - `201 Created`: Teacher created.
  - `400 Bad Request`: Validation failure.

---

### API 2: Create Session
- **Route**: `POST /sessions`
- **Description**: Teacher creates a new session. Default status is `AVAILABLE`. Validates that teacher exists, `endTime > startTime`, and checks that the teacher has no overlapping active session.
- **Request Body**:
  ```json
  {
    "teacherId": "6ad63d59ea72123da2d8f005",
    "startTime": "2026-10-25T10:00:00.000Z",
    "endTime": "2026-10-25T11:00:00.000Z"
  }
  ```
- **Responses**:
  - `201 Created`: Session created with default status `AVAILABLE`.
  - `400 Bad Request`: `endTime` is not greater than `startTime` or invalid date format.
  - `404 Not Found`: Teacher does not exist.
  - `409 Conflict`: Teacher already has an active session scheduled during this time window.

---

### API 3: Available Sessions for Booking
- **Route**: `GET /sessions/available?dateTimestamp={timestamp}`
- **Description**: Returns all `AVAILABLE` sessions for the supplied date.
- **Mandatory Feature**: Implemented using the **MongoDB Aggregation Pipeline**.
- **Query Parameter**:
  - `dateTimestamp`: Accepts Unix millisecond epoch (e.g. `1792886400000`), Unix second epoch (e.g. `1792886400`), or ISO date string (e.g. `2026-10-25`).
- **Aggregation Pipeline Breakdown**:
  ```ts
  [
    // 1. Filter only AVAILABLE sessions within UTC bounds of the selected date
    {
      $match: {
        status: "AVAILABLE",
        startTime: { $gte: startOfDayUTC, $lte: endOfDayUTC }
      }
    },
    // 2. Join teacher details
    {
      $lookup: {
        from: "teachers",
        localField: "teacherId",
        foreignField: "_id",
        as: "teacher"
      }
    },
    // 3. Unwind teacher array into single object
    { $unwind: "$teacher" },
    // 4. Sort chronologically
    { $sort: { startTime: 1 } },
    // 5. Clean projection
    {
      $project: {
        _id: 1,
        status: 1,
        startTime: 1,
        endTime: 1,
        teacherId: 1,
        teacher: {
          _id: "$teacher._id",
          fullName: "$teacher.fullName",
          email: "$teacher.email",
          specialization: "$teacher.specialization",
          experience: "$teacher.experience"
        },
        createdAt: 1,
        updatedAt: 1
      }
    }
  ]
  ```
- **Responses**:
  - `200 OK`: List of available sessions on the given date with embedded teacher details.
  - `400 Bad Request`: Missing or invalid `dateTimestamp`.

---

### API 4: Book Session
- **Route**: `POST /sessions/:id/book`
- **Description**: Books an available session for a user.
- **Rules Enforced**:
  - User must exist.
  - Session must exist.
  - Only `AVAILABLE` sessions can be booked.
  - A booked session cannot be booked again.
  - Concurrency Safe: Uses atomic `Session.findOneAndUpdate({ _id: id, status: 'AVAILABLE' }, ...)` to eliminate race conditions if two users book simultaneously.
- **Request Body**:
  ```json
  {
    "userId": "6ad63d45ea72123da2d8f002"
  }
  ```
- **Responses**:
  - `200 OK`: Session booked; status changed to `BOOKED` and linked to `userId`.
  - `400 Bad Request`: Session is already booked or completed.
  - `404 Not Found`: User or session not found.

---

### API 5: Mark Session Complete
- **Route**: `PATCH /sessions/:id/complete`
- **Description**: Marks a completed session.
- **Rules Enforced**:
  - Session must exist.
  - Only `BOOKED` sessions can be marked as completed (returns 400 if `AVAILABLE` or already `COMPLETED`).
  - Sets `status: COMPLETED` and records `completedAt` timestamp.
- **Responses**:
  - `200 OK`: Session updated to `COMPLETED` with `completedAt`.
  - `400 Bad Request`: Session is not in `BOOKED` status.
  - `404 Not Found`: Session not found.

---

### API 6: User Session List
- **Route**: `GET /users/:id/sessions`
- **Description**: Returns all sessions for a user, neatly separated into:
  - **Upcoming Sessions** (`status: BOOKED`)
  - **Completed Sessions** (`status: COMPLETED`)
- **Mandatory Feature**: Implemented using the **MongoDB Aggregation Pipeline** with `$facet`.
- **Aggregation Pipeline Breakdown**:
  ```ts
  [
    // 1. Filter sessions belonging to this user
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    // 2. Join teacher information
    {
      $lookup: {
        from: "teachers",
        localField: "teacherId",
        foreignField: "_id",
        as: "teacher"
      }
    },
    { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },
    // 3. Facet into two distinct categories in a single database roundtrip
    {
      $facet: {
        upcomingSessions: [
          { $match: { status: "BOOKED" } },
          { $sort: { startTime: 1 } },
          { $project: { _id: 1, status: 1, startTime: 1, endTime: 1, teacher: 1, createdAt: 1, updatedAt: 1 } }
        ],
        completedSessions: [
          { $match: { status: "COMPLETED" } },
          { $sort: { completedAt: -1, startTime: -1 } },
          { $project: { _id: 1, status: 1, startTime: 1, endTime: 1, completedAt: 1, teacher: 1, createdAt: 1, updatedAt: 1 } }
        ]
      }
    }
  ]
  ```
- **Responses**:
  - `200 OK`: JSON object containing `{ upcomingSessions: [...], completedSessions: [...] }`.
  - `400 Bad Request`: Invalid ObjectId format.
  - `404 Not Found`: User not found.

---

## 📮 Postman Collection

A complete, automated Postman Collection is included at:
**`./postman_collection.json`**

### Features of the Collection:
- Automated Variable Persistence: Creating a user, teacher, or session automatically saves their `_id` into collection variables (`userId`, `teacherId`, `sessionId`, `dateTimestamp`).
- Pre-request timestamp generation for seamless date querying.
- Can be imported directly into Postman or Thunder Client and executed sequentially with zero manual setup!

To import into Postman:
1. Open Postman.
2. Click **Import** (top left).
3. Select `postman_collection.json` from the repository root.
4. Run requests in folder order.

---

## 🧪 Automated Integration Tests

Comprehensive test coverage implemented in `tests/api.test.ts` using **Jest**, **Supertest**, and **MongoMemoryServer**:

```bash
npm test
```

### Verified Scenarios:
- Health check uptime & status
- User creation with valid fields & unique email enforcement (409)
- Zod schema validations for invalid email & missing payload attributes (400)
- Teacher session creation with default `AVAILABLE` status (201)
- Validation: `endTime` must be strictly greater than `startTime` (400)
- Overlapping teacher session conflict detection (409)
- MongoDB Aggregation Pipeline query on `GET /sessions/available` (200)
- Booking session: updating status to `BOOKED` and associating user (200)
- Atomic protection against double booking (400)
- Guarding against booking non-existent sessions or users (404)
- Marking booked sessions as `COMPLETED` with timestamp (200)
- Guarding against completing unbooked or already-completed sessions (400)
- MongoDB Aggregation Pipeline query on `GET /users/:id/sessions` separating upcoming and completed sessions (200)

---

## ⚖️ License
ISC