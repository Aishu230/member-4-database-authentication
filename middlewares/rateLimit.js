// Very small in-memory rate limiter, enough to slow down password guessing.
// It resets when the server restarts. For a real deployment use a shared store.

const createLimiter = ({ windowMs, max, keyFn }) => {
  const hits = new Map();

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please wait a few minutes and try again.',
      });
    }
    next();
  };
};

const fifteenMinutes = 15 * 60 * 1000;

const loginLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  keyFn: (req) => `${req.ip}:${String((req.body && req.body.email) || '').toLowerCase()}`,
});

const registerLimiter = createLimiter({
  windowMs: fifteenMinutes,
  max: Number(process.env.REGISTER_RATE_LIMIT_MAX) || 30,
  keyFn: (req) => req.ip,
});

module.exports = { createLimiter, loginLimiter, registerLimiter };
