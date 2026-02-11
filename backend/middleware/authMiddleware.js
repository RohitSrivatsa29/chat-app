const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/firebase');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get database reference
    const db = getDatabase();
    
    // Find user in Firebase
    const userSnapshot = await db.ref(`users/${decoded.userId}`).once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(401).json({ error: 'User not found, authorization denied' });
    }

    // Attach user to request
    req.user = {
      id: decoded.userId,
      ...user
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error during authentication' });
  }
};

module.exports = authMiddleware;
