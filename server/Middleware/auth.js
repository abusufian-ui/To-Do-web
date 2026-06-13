// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.REACT_APP_JWT_SECRET || 'secret_key_123'); // Fallback matches index.js
    req.user = decoded; // Adds user ID to the request

    const userId = decoded.id; // All tokens use { id: user._id } — legacy dual-decode removed
    if (!userId) return res.status(401).json({ message: 'Token is not valid' });

    // 🛡️ Security Patch: Validate user existence and block status in database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ logout: true, message: 'Account does not exist. Access denied.' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ logout: true, isBlocked: true, message: 'Your account has been blocked by an administrator.' });
    }

    next();
  } catch (e) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;