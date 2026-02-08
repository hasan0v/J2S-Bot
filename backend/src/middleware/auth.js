const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

/**
 * Middleware to verify JWT token from Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

/**
 * Generate JWT access token (7 days)
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.full_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Generate JWT refresh token (30 days)
 */
function generateRefreshToken(user) {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
  return jwt.sign(
    { id: user.id, email: user.email },
    refreshSecret,
    { expiresIn: '30d' }
  );
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
  return jwt.verify(token, refreshSecret);
}

module.exports = { authenticateToken, generateAccessToken, generateRefreshToken, verifyRefreshToken };
