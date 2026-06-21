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
      return res.status(503).json({ logout: true, isBlocked: true, error: 'Network Error: Timeout communicating with identity provider.', message: 'Network Error: Timeout communicating with identity provider.' });
    }

    // 📡 Platform Connection Tracking (Web, Mobile, Chrome Extension)
    let changed = false;
    const origin = req.headers.origin || req.headers.referer || '';
    const ua = req.headers['user-agent'] || '';

    // 1. Chrome Extension
    if (!user.accessedExtension) {
      if (origin.includes('chrome-extension://') || req.path.includes('extension-sync') || (req.headers['x-client-type'] && req.headers['x-client-type'].includes('extension'))) {
        user.accessedExtension = true;
        changed = true;
      }
    }

    // 2. Mobile App
    if (!user.accessedMobile) {
      const isMobileUA = ua.includes('okhttp') || ua.includes('Expo') || ua.includes('React-Native') || ua.includes('Darwin') || ua.includes('Android');
      const hasPushTokens = user.pushTokens && user.pushTokens.length > 0;
      if (isMobileUA || hasPushTokens || req.path.includes('mobile-sync') || (req.headers['x-client-type'] && req.headers['x-client-type'].includes('mobile'))) {
        user.accessedMobile = true;
        changed = true;
      }
    }

    // 3. Web Portal
    if (!user.accessedWeb) {
      if (origin.includes('web.myportalucp.online') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        user.accessedWeb = true;
        changed = true;
      }
    }

    if (changed) {
      await user.save();
    }

    next();
  } catch (e) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;