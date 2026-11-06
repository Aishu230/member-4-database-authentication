const jwt = require('jsonwebtoken');

const DEV_ONLY_SECRET = 'dev-only-secret-do-not-use-in-production';

const getSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  }
  return DEV_ONLY_SECRET;
};

const usingDevSecret = () => !process.env.JWT_SECRET;

const generateToken = (payload) =>
  jwt.sign(payload, getSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const verifyToken = (token) => jwt.verify(token, getSecret());

module.exports = { generateToken, verifyToken, usingDevSecret };
