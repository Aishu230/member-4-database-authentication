const { User, Organization, Workspace, Membership } = require('../models');
const { generateToken } = require('../utils/token');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const passwordProblem = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
};

const makeSlug = (name) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'org';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
};

const userResponse = (user, organization, workspaceId) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization: organization ? { id: organization._id, name: organization.name } : null,
  defaultWorkspaceId: workspaceId || null,
});

// POST /api/auth/register
// Creates a new organization and makes the person its owner. The role is never
// taken from the request, and nobody can join an existing organization this way.
const register = async (req, res, next) => {
  let user = null;
  let organization = null;
  let workspace = null;

  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const organizationName = String(req.body.organizationName || '').trim();
    const { password } = req.body;

    const errors = [];
    if (name.length < 2 || name.length > 60) errors.push('Name must be between 2 and 60 characters');
    if (!EMAIL_PATTERN.test(email)) errors.push('Please enter a valid email address');
    const weak = passwordProblem(password);
    if (weak) errors.push(weak);
    if (organizationName.length < 2 || organizationName.length > 80) {
      errors.push('Organization name must be between 2 and 80 characters');
    }
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    user = await User.create({ name, email, password, role: 'owner' });
    organization = await Organization.create({
      name: organizationName,
      slug: makeSlug(organizationName),
      owner: user._id,
    });
    workspace = await Workspace.create({
      name: 'General Workspace',
      organization: organization._id,
      description: 'Default workspace',
    });

    user.organization = organization._id;
    await user.save();

    await Membership.create({
      user: user._id,
      organization: organization._id,
      role: 'owner',
      status: 'active',
    });

    const token = generateToken({ id: user._id, role: user.role, organization: organization._id });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: userResponse(user, organization, workspace._id),
    });
  } catch (error) {
    // Undo whatever was created so a failed sign-up leaves nothing behind.
    try {
      if (workspace) await Workspace.deleteOne({ _id: workspace._id });
      if (organization) await Organization.deleteOne({ _id: organization._id });
      if (user) await User.deleteOne({ _id: user._id });
    } catch (cleanupError) {
      console.error('[auth] cleanup after failed registration also failed:', cleanupError.message);
    }
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password').populate('organization');
    const passwordOk = user ? await user.matchPassword(password) : false;

    // Same message for unknown email and wrong password
    if (!user || !passwordOk) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const organizationId = user.organization ? user.organization._id : undefined;
    const workspace = organizationId ? await Workspace.findOne({ organization: organizationId }) : null;

    const token = generateToken({ id: user._id, role: user.role, organization: organizationId });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse(user, user.organization, workspace && workspace._id),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('organization');
    const organizationId = user.organization ? user.organization._id : undefined;
    const workspace = organizationId ? await Workspace.findOne({ organization: organizationId }) : null;

    res.status(200).json({
      success: true,
      user: userResponse(user, user.organization, workspace && workspace._id),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/users - people in the same organization (for assigning tasks)
const getOrganizationUsers = async (req, res, next) => {
  try {
    const organizationId = req.user.organization._id || req.user.organization;
    const found = await User.find({ organization: organizationId });

    // Pick the fields explicitly so a password hash can never leak.
    const users = found.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
    }));

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, getOrganizationUsers };
