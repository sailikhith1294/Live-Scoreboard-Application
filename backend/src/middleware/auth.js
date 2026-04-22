const { User } = require('../models');
const { verifyToken } = require('../utils/jwt');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing' });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid user session' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient role privileges' });
  }

  next();
};

module.exports = { authenticate, authorize };
