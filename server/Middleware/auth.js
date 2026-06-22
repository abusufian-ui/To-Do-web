
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.REACT_APP_JWT_SECRET || 'secret_key_123'); 
    req.user = decoded; 

    const userId = decoded.id; 
    if (!userId) return res.status(401).json({ message: 'Token is not valid' });

    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ logout: true, message: 'Account does not exist. Access denied.' });
    }
    if (user.isBlocked) {
      return res.status(503).json({ logout: true, isBlocked: true, error: 'Network Error: Timeout communicating with identity provider.', message: 'Network Error: Timeout communicating with identity provider.' });
    }

    
    let changed = false;
    const origin = req.headers.origin || req.headers.referer || '';
    const ua = req.headers['user-agent'] || '';

    
    if (!user.accessedExtension) {
      if (origin.includes('chrome-extension://') || req.path.includes('extension-sync') || (req.headers['x-client-type'] && req.headers['x-client-type'].includes('extension'))) {
        user.accessedExtension = true;
        changed = true;
      }
    }

    
    if (!user.accessedMobile) {
      const isMobileUA = ua.includes('okhttp') || ua.includes('Expo') || ua.includes('React-Native') || ua.includes('Darwin') || ua.includes('Android');
      const hasPushTokens = user.pushTokens && user.pushTokens.length > 0;
      if (isMobileUA || hasPushTokens || req.path.includes('mobile-sync') || (req.headers['x-client-type'] && req.headers['x-client-type'].includes('mobile'))) {
        user.accessedMobile = true;
        changed = true;
      }
    }

    
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