# 🛡️ Member 4: Database Architecture & Authentication Service

> **Microservice & Module for SaaS Team Collaboration Platform**  
> **Role:** Member 4 — Database Design, Data Modeling, JWT Authentication, and Security Middleware

---

## 📌 Overview

This repository contains the standalone **Database Architecture and Authentication Service** for the multi-tenant SaaS Team Collaboration Platform. It provides end-to-end user identity management, multi-tenant organization provisioning, workspace association, Role-Based Access Control (RBAC), and dual-mode database persistence.

### Key Capabilities
- **Multi-Tenant Data Modeling:** Complete Mongoose schemas for `User`, `Organization`, `Workspace`, and `Membership` with relational integrity and data sanitization.
- **Dual-Mode Database Engine:** Automatic fallback to an in-memory database (`memoryDb.js`) if local MongoDB is not running, ensuring zero-setup developer onboarding and fast test execution.
- **Secure Authentication:** BCrypt password hashing (10 salt rounds) and stateless JSON Web Tokens (JWT) signed with configurable expiration.
- **Role-Based Access Control (RBAC):** Middleware for hierarchical permission enforcement (`owner`, `manager`, `employee`).
- **Tenant Isolation Middleware:** Automatic scoping of queries to the authenticated user's organization to prevent cross-tenant data leaks.
- **Brute-Force & Abuse Protection:** In-memory sliding-window rate limiters on sensitive auth endpoints (`/login`, `/register`).

---

## 📁 Repository Structure

```text
member-4-database-authentication/
│
├── config/
│   ├── db.js                # MongoDB connection manager with in-memory fallback
│   └── memoryDb.js          # Zero-setup in-memory database store with synthetic seed
│
├── models/
│   ├── index.js             # Model proxy export (switches MongoDB / MemoryDB dynamically)
│   ├── User.js              # User schema with pre-save hashing & password validation
│   ├── Organization.js      # Multi-tenant Organization schema with auto-slug generation
│   ├── Workspace.js         # Team workspace schema bound to organization
│   └── Membership.js        # Organization membership join model with compound indexing
│
├── controllers/
│   └── authController.js    # Auth business logic (register, login, getMe, getOrgUsers)
│
├── routes/
│   └── authRoutes.js        # Express router with rate limiting & protection middlewares
│
├── middlewares/
│   ├── authMiddleware.js    # JWT Bearer token validator & req.user injector
│   ├── rateLimit.js         # Sliding-window rate limiters for auth endpoints
│   ├── roleMiddleware.js    # RBAC (authorizeRoles) and tenant scoping (scopeToOrganization)
│   └── errorHandler.js      # Centralized error formatting & status code handler
│
├── utils/
│   └── token.js             # JWT signing, verification, and secret safety checks
│
├── tests/
│   └── auth.test.js         # Integration tests for auth, models, and middlewares
│
├── server.js                # Standalone Express server entrypoint & health checks
├── .env.example             # Template for required environment variables
├── .gitignore               # Ignored files (node_modules, .env, logs)
├── package.json             # NPM metadata and dependencies
└── README.md                # Comprehensive documentation
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- *(Optional)* **MongoDB** running locally on port `27017` (If MongoDB is not installed, the in-memory fallback will automatically activate).

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <your-github-repo-url>
cd member-4-database-authentication
npm install
```

### 3. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Default `.env` values:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/saas_collab_db
JWT_SECRET=super-secret-jwt-key-for-database-auth-member4
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
ALLOW_MEMORY_DB=true
LOGIN_RATE_LIMIT_MAX=10
REGISTER_RATE_LIMIT_MAX=30
```

### 4. Run the Server
```bash
# Start server
npm start

# Or during development
npm run dev
```
The server will start at `http://localhost:5000`.

---

## 🧪 Running Automated Tests

Run the test suite using Node.js built-in native test runner:
```bash
npm test
```
The tests execute against the isolated in-memory store without requiring a MongoDB instance.

Test coverage includes:
- ✅ Service Health Check (`/api/health`)
- ✅ New User & Organization Registration
- ✅ Duplicate Email & Validation Handling
- ✅ Login & Password Verification
- ✅ Protected Route Token Verification (`/api/auth/me`)
- ✅ Organization Member Directory (`/api/auth/users`)
- ✅ Role-Based Access Control (`authorizeRoles`)
- ✅ Multi-Tenant Isolation (`scopeToOrganization`)

---

## 📡 API Endpoints

### Base URL: `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public (Rate-limited) | Creates a new user, organization, workspace, and issues JWT |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Authenticates credentials and returns JWT token |
| `GET` | `/api/auth/me` | Bearer Token Required | Retrieves the current user's profile and organization |
| `GET` | `/api/auth/users` | Bearer Token Required | Lists all users belonging to the caller's organization |
| `GET` | `/api/health` | Public | System status and active database engine indicator |

---

### Request & Response Examples

#### 1. Register a New Organization & Owner
**Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Alex Vance",
  "email": "alex@example.com",
  "password": "Password123!",
  "organizationName": "Apex Corp"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6639b7f0...",
    "name": "Alex Vance",
    "email": "alex@example.com",
    "role": "owner",
    "organization": {
      "id": "6639b7f1...",
      "name": "Apex Corp"
    },
    "defaultWorkspaceId": "6639b7f2..."
  }
}
```

#### 2. Login
**Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "alex@example.com",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6639b7f0...",
    "name": "Alex Vance",
    "email": "alex@example.com",
    "role": "owner",
    "organization": {
      "id": "6639b7f1...",
      "name": "Apex Corp"
    },
    "defaultWorkspaceId": "6639b7f2..."
  }
}
```

#### 3. Health Check
**Request:**
```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "member-4-database-authentication",
  "timestamp": "2026-11-06T13:20:00.000Z",
  "database": "mongodb"
}
```

---

## 👥 Pre-seeded Demo Accounts (In-Memory Mode)

When running in zero-setup in-memory fallback mode, the following test accounts are pre-configured:

| Role | Email | Password |
|---|---|---|
| **Owner** | `owner@apex.com` | `Password123!` |
| **Manager** | `manager@apex.com` | `Password123!` |
| **Employee** | `dev@apex.com` | `Password123!` |

---

## 🔗 Integration Guide for Other Team Members

Other team members (e.g. Member 1, 2, 3 building Projects, Tasks, or UI) can import models and middleware directly from this module:

```javascript
// Import Database Models
const { User, Organization, Workspace, Membership } = require('./models');

// Protect custom routes with JWT authentication
const { protect } = require('./middlewares/authMiddleware');

// Enforce Role permissions
const { authorizeRoles, scopeToOrganization } = require('./middlewares/roleMiddleware');

router.post('/admin-only', protect, authorizeRoles('owner', 'manager'), scopeToOrganization, handler);
```

---

## 📦 How to Push this Repository to GitHub

Follow these steps to publish this standalone repository to GitHub:

```bash
# 1. Navigate to this repository directory
cd member-4-database-authentication

# 2. Initialize a local git repository
git init

# 3. Add all files to staging
git add .

# 4. Create initial commit
git commit -m "feat: complete member-4 database and authentication service"

# 5. Create a new repository on GitHub (e.g. named 'member-4-database-authentication')

# 6. Link remote repository and set main branch
git branch -M main
git remote add origin https://github.com/<your-username>/member-4-database-authentication.git

# 7. Push to GitHub
git push -u origin main
```

---

## 📄 License
ISC © Member 4 - SaaS Collaboration Team
