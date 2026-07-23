
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DeviceSession = require('../models/DeviceSession');
const { JWT_SECRET, JWT_ALG } = require('../config/secrets');
const { parseUserAgent, getIpLocation, getClientIp, registerDeviceSession } = require('../utils/sessionHelper');

const auth = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALG] });
    req.user = decoded; 

    const userId = decoded.id; 
    if (!userId) return res.status(401).json({ message: 'Token is not valid' });

    // Validate active login session
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ logout: true, message: 'Account does not exist. Access denied.' });
    }

    // Enforce Admin Single Session Signature Check
    if (user.isAdmin) {
      if (!user.adminSessionToken || user.adminSessionToken !== tokenSignature) {
        return res.status(401).json({ logout: true, message: 'Admin session terminated. Logged in on another device.' });
      }
    }

    let session = await DeviceSession.findOne({ userId, tokenSignature });
    if (!session) {
      // Auto-register session for existing valid tokens (non-admin users)
      session = await registerDeviceSession(userId, token, req);
      if (!session) return res.status(401).json({ message: 'Token is not valid' });
    } else {
      // Update last active time and IP if changed
      session.lastActiveAt = new Date();
      const ip = getClientIp(req);
      if (ip && ip !== session.ipAddress) {
        session.ipAddress = ip;
        session.location = await getIpLocation(ip);
      }
      await session.save();
    }

    if (!session.isActive) {
      return res.status(401).json({ logout: true, message: 'Session has been revoked.' });
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