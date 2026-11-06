// Unit & Integration Tests for Member 4: Database & Authentication Service
// Run with: npm test

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-database-auth-member4';
global.useMemoryDb = true;

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');

const { initMemoryStore, memoryStore } = require('../config/memoryDb');
const { User, Organization, Workspace, Membership } = require('../models');
const { generateToken, verifyToken } = require('../utils/token');
const { register, login, getMe, getOrganizationUsers } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { authorizeRoles, scopeToOrganization } = require('../middlewares/roleMiddleware');

// Helper to simulate Express req & res objects
const mockReqRes = (overrides = {}) => {
  const req = {
    body: {},
    headers: {},
    params: {},
    query: {},
    user: null,
    ip: '127.0.0.1',
    ...overrides,
  };

  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    set(header, value) {
      this.headers[header] = value;
      return this;
    },
  };

  return { req, res };
};

before(async () => {
  await initMemoryStore();
});

describe('1. Models & Database Persistence', () => {
  test('User model hashes password and verifies correctly', async () => {
    const rawPassword = 'StrongPassword99!';
    const user = await User.create({
      name: 'Test Hash User',
      email: `test_hash_${Date.now()}@example.com`,
      password: rawPassword,
      role: 'employee',
    });

    assert.ok(user._id, 'User should have an ID');
    assert.notEqual(user.password, rawPassword, 'Password must be hashed');
    const isMatch = await user.matchPassword(rawPassword);
    assert.equal(isMatch, true, 'matchPassword should return true for valid password');
    const isWrongMatch = await user.matchPassword('WrongPass123!');
    assert.equal(isWrongMatch, false, 'matchPassword should return false for invalid password');
  });

  test('Organization and Workspace models can be created and queried', async () => {
    const org = await Organization.create({
      name: 'Acme Test Corp',
      slug: `acme-${Date.now()}`,
    });
    assert.ok(org._id);
    assert.equal(org.name, 'Acme Test Corp');

    const ws = await Workspace.create({
      name: 'Engineering Workspace',
      organization: org._id,
      description: 'Dev tasks workspace',
    });
    assert.ok(ws._id);
    assert.equal(ws.organization.toString(), org._id.toString());
  });

  test('Membership model creates active membership for organization', async () => {
    const membership = await Membership.create({
      user: 'user123',
      organization: 'org123',
      role: 'owner',
      status: 'active',
    });
    assert.ok(membership._id);
    assert.equal(membership.role, 'owner');
  });
});

describe('2. JWT Token Utilities (utils/token.js)', () => {
  test('generates valid token and decodes payload', () => {
    const payload = { id: 'user_xyz_123', role: 'owner', organization: 'org_abc_456' };
    const token = generateToken(payload);

    assert.ok(typeof token === 'string' && token.length > 20);
    const decoded = verifyToken(token);
    assert.equal(decoded.id, payload.id);
    assert.equal(decoded.role, payload.role);
    assert.equal(decoded.organization, payload.organization);
  });
});

describe('3. Auth Controller: Registration (POST /api/auth/register)', () => {
  test('registers owner, organization, and default workspace', async () => {
    const uniqueEmail = `owner_reg_${Date.now()}@company.com`;
    const { req, res } = mockReqRes({
      body: {
        name: 'John Doe',
        email: uniqueEmail,
        password: 'Password123!',
        organizationName: 'Doe Enterprises',
      },
    });

    await register(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.data.success, true);
    assert.ok(res.data.token, 'Should return JWT token');
    assert.equal(res.data.user.name, 'John Doe');
    assert.equal(res.data.user.email, uniqueEmail);
    assert.equal(res.data.user.role, 'owner');
    assert.equal(res.data.user.organization.name, 'Doe Enterprises');
    assert.ok(res.data.user.defaultWorkspaceId);
    assert.equal(res.data.user.password, undefined, 'Password must not be exposed');
  });

  test('rejects duplicate email with 409 Conflict', async () => {
    const duplicateEmail = `dup_${Date.now()}@test.com`;
    const { req: req1, res: res1 } = mockReqRes({
      body: {
        name: 'First User',
        email: duplicateEmail,
        password: 'Password123!',
        organizationName: 'Org One',
      },
    });
    await register(req1, res1, () => {});
    assert.equal(res1.statusCode, 201);

    const { req: req2, res: res2 } = mockReqRes({
      body: {
        name: 'Second User',
        email: duplicateEmail,
        password: 'Password123!',
        organizationName: 'Org Two',
      },
    });
    await register(req2, res2, () => {});
    assert.equal(res2.statusCode, 409);
    assert.equal(res2.data.success, false);
    assert.match(res2.data.message, /already exists/i);
  });

  test('validates minimum password length and email format', async () => {
    const { req, res } = mockReqRes({
      body: {
        name: 'Bad Input User',
        email: 'invalid-email',
        password: 'short',
        organizationName: 'O',
      },
    });

    await register(req, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.ok(res.data.errors.length > 0);
  });
});

describe('4. Auth Controller: Login (POST /api/auth/login)', () => {
  test('logs in successfully with valid credentials', async () => {
    const { req, res } = mockReqRes({
      body: {
        email: 'owner@apex.com',
        password: 'Password123!',
      },
    });

    await login(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.token);
    assert.equal(res.data.user.email, 'owner@apex.com');
    assert.equal(res.data.user.role, 'owner');
  });

  test('rejects incorrect password with 401', async () => {
    const { req, res } = mockReqRes({
      body: {
        email: 'owner@apex.com',
        password: 'WrongPassword999!',
      },
    });

    await login(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.data.success, false);
    assert.match(res.data.message, /invalid email or password/i);
  });

  test('rejects non-existent email with 401', async () => {
    const { req, res } = mockReqRes({
      body: {
        email: 'nobody@nowhere.com',
        password: 'Password123!',
      },
    });

    await login(req, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.data.success, false);
  });
});

describe('5. Auth Controller: Current Profile & Members Directory', () => {
  test('getMe returns caller profile and organization', async () => {
    const ownerUser = await User.findOne({ email: 'owner@apex.com' });
    const { req, res } = mockReqRes({
      user: ownerUser,
    });

    await getMe(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.user.email, 'owner@apex.com');
    assert.equal(res.data.user.role, 'owner');
  });

  test('getOrganizationUsers returns users scoped to the caller organization', async () => {
    const ownerUser = await User.findOne({ email: 'owner@apex.com' });
    const { req, res } = mockReqRes({
      user: ownerUser,
    });

    await getOrganizationUsers(req, res, () => {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.users));
    assert.ok(res.data.users.length >= 1);
  });
});

describe('6. Security & Authorization Middlewares', () => {
  test('protect middleware verifies Bearer token and attaches req.user', async () => {
    const ownerUser = await User.findOne({ email: 'owner@apex.com' });
    const token = generateToken({ id: ownerUser._id, role: ownerUser.role });

    const { req, res } = mockReqRes({
      headers: { authorization: `Bearer ${token}` },
    });

    let nextCalled = false;
    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(req.user);
    assert.equal(req.user.email, 'owner@apex.com');
  });

  test('protect middleware rejects missing token with 401', async () => {
    const { req, res } = mockReqRes({
      headers: {},
    });

    let nextCalled = false;
    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.data.success, false);
  });

  test('authorizeRoles allows authorized roles and blocks forbidden roles', () => {
    const allowedReq = { user: { role: 'owner' } };
    let passed = false;
    authorizeRoles('owner', 'manager')(allowedReq, {}, () => {
      passed = true;
    });
    assert.equal(passed, true);

    const forbiddenReq = { user: { role: 'employee' } };
    const { res } = mockReqRes();
    authorizeRoles('owner', 'manager')(forbiddenReq, res, () => {});
    assert.equal(res.statusCode, 403);
  });

  test('scopeToOrganization sets req.organizationId', () => {
    const req = { user: { organization: { _id: 'org_test_99' } } };
    let called = false;
    scopeToOrganization(req, {}, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal(req.organizationId, 'org_test_99');
  });
});
