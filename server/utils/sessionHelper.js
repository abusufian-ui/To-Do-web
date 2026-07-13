const DeviceSession = require('../models/DeviceSession');
const axios = require('axios');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Configure Nodemailer transporter for Brevo SMTP
let transporter = null;
if (process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY) {
  transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT, 10) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY
    }
  });
}

function normalizeIp(ip) {
  if (!ip) return '';
  let cleanIp = ip.trim();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }
  if (cleanIp === '::1') {
    cleanIp = '127.0.0.1';
  }
  return cleanIp;
}

function getClientIp(req) {
  let ip = req.headers['cf-connecting-ip'] || 
           req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.ip || 
           req.socket.remoteAddress || 
           '';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  return normalizeIp(ip);
}

function parseUserAgent(uaString) {
  const rawUa = uaString || '';
  const ua = rawUa.toLowerCase();
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let deviceType = 'Desktop';

  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('android')) { os = 'Android'; deviceType = 'Mobile'; }
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) { os = 'iOS'; deviceType = 'Mobile'; }

  if (rawUa.includes('Edg/')) browser = 'Edge';
  else if (rawUa.includes('Chrome/') || rawUa.includes('CriOS/')) browser = 'Chrome';
  else if (rawUa.includes('Safari/') && !rawUa.includes('Chrome/') && !rawUa.includes('CriOS/')) browser = 'Safari';
  else if (rawUa.includes('Firefox/') || rawUa.includes('FxiOS/')) browser = 'Firefox';
  else if (rawUa.includes('MSIE') || rawUa.includes('Trident/')) browser = 'Internet Explorer';
  
  if (rawUa.includes('okhttp') || rawUa.includes('Expo') || rawUa.includes('React-Native')) {
    deviceType = 'Mobile App';
    browser = 'Native App';
  } else if (rawUa.includes('chrome-extension://')) {
    deviceType = 'Chrome Extension';
    browser = 'Extension';
  }

  return { os, browser, deviceType };
}

async function getIpLocation(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return 'Localhost';
  }
  try {
    let cleanIp = ip;
    if (ip.startsWith('::ffff:')) {
      cleanIp = ip.substring(7);
    }
    const res = await axios.get(`http://ip-api.com/json/${cleanIp}`, { timeout: 2000 });
    if (res.data && res.data.status === 'success') {
      const city = res.data.city || '';
      const country = res.data.country || '';
      return city && country ? `${city}, ${country}` : country || city || 'Unknown Location';
    }
  } catch (err) {
    // Fail silently
  }
  return 'Lahore, Pakistan';
}

async function registerDeviceSession(userId, token, req, resendInstance) {
  try {
    const tokenSignature = token.split('.')[2] || '';
    if (!tokenSignature) return null;

    const ua = req.headers['user-agent'] || '';
    const { os, browser, deviceType } = parseUserAgent(ua);
    const ip = getClientIp(req);
    
    // Check if user has logged in from this device/IP combination before
    const isLocal = ip === '127.0.0.1' || ip === '::1' || !ip;
    const deviceExists = isLocal ? true : await DeviceSession.exists({ userId, ipAddress: ip, os, browser, isActive: true });

    const location = await getIpLocation(ip);

    // Dedup: a re-login from the same device/browser/IP replaces its existing
    // active session (new token, refreshed activity) instead of stacking a
    // duplicate entry in the "Active Devices" list.
    let session = await DeviceSession.findOne({
      userId,
      ipAddress: ip,
      os,
      browser,
      isActive: true
    });

    if (session) {
      session.tokenSignature = tokenSignature;
      session.location = location;
      session.lastActiveAt = new Date();
      await session.save();
      console.log(`🔐 Refreshed existing session for user ${userId} on ${os} (${browser})`);
      return session;
    }

    session = new DeviceSession({
      userId,
      tokenSignature,
      deviceType,
      browser,
      os,
      ipAddress: ip,
      location,
      userAgent: ua,
      lastActiveAt: new Date(),
      isActive: true
    });

    await session.save();
    console.log(`🔐 Registered session for user ${userId} on ${os} (${browser})`);

    // Smart email login alert trigger if it's a new device/IP combination
    const activeResend = resendInstance || resend;
    if (!deviceExists) {
      if (transporter || activeResend) {
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (user && user.email && (user.email.endsWith('@ucp.edu.pk') || user.email.endsWith('@gmail.com'))) {
          await sendLoginAlertEmail(user, session, activeResend);
        }
      }
    }
    
    return session;
  } catch (err) {
    console.error('Failed to register device session:', err.message);
    return null;
  }
}

async function sendLoginAlertEmail(user, session, resend) {
  try {
    const dateStr = new Date(session.createdAt).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeStr = new Date(session.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });

    const settingsUrl = 'https://web.myportalucp.online/settings';

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #eff6ff; color: #2563eb; padding: 12px; border-radius: 50%; margin-bottom: 16px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 style="color: #111827; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">Security Alert: New Login</h2>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
            Hi <strong>${user.name}</strong>, <br/><br/>
            We detected a new login to your MyPortal UCP account from an IP address that we haven't seen you use before.
          </p>
          
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
            <h3 style="font-size: 14px; text-transform: uppercase; color: #6b7280; margin-top: 0; margin-bottom: 16px; letter-spacing: 0.05em; font-weight: 700;">Login Details</h3>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; width: 35%;">Device/Platform</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600;">${session.os} (${session.browser})</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280;">Approx Location</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600;">${session.location}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280;">IP Address</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600; font-family: monospace;">${session.ipAddress}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280;">Time & Date</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600;">${timeStr} on ${dateStr}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 28px;">
            <strong>If this was you</strong>, you can safely ignore this alert. This location/IP has now been added as a trusted login point and you won't be alerted for it again.<br/><br/>
            <strong>If this wasn't you</strong>, please click below to review your active devices and terminate this login immediately to protect your account.
          </p>
          
          <div style="text-align: center; margin-bottom: 28px;">
            <a href="${settingsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); text-align: center;">
              Review Active Devices
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 11px; text-align: center; line-height: 1.5; margin: 0;">
            This is an automated security notification for your MyPortal UCP Account. You cannot reply to this email.
          </p>
        </div>
      </div>
    `;

    const fromEmail = process.env.BREVO_SMTP_HOST || 'security@myportalucp.online';

    if (transporter) {
      // Send using Brevo SMTP via Nodemailer
      await transporter.sendMail({
        from: `"MyPortal Security" <${fromEmail}>`,
        to: user.email,
        subject: 'New Login Detected - MyPortal',
        html: emailHtml
      });
      console.log(`✉️ [Brevo SMTP] Login alert email sent successfully to ${user.email} for IP ${session.ipAddress}.`);
    } else if (resend) {
      // Fallback to Resend
      const response = await resend.emails.send({
        from: `MyPortal Security <${fromEmail}>`,
        to: user.email,
        subject: 'New Login Detected - MyPortal',
        html: emailHtml
      });
      
      if (response && response.error) {
        console.error(`❌ [Resend] API Error for ${user.email}:`, response.error);
      } else {
        const id = response && response.data ? response.data.id : 'unknown';
        console.log(`✉️ [Resend] Login alert email sent successfully to ${user.email} for IP ${session.ipAddress}. Resend ID: ${id}`);
      }
    } else {
      console.warn(`⚠️ Neither Brevo SMTP nor Resend is configured. Skipping login alert email for ${user.email}`);
    }
  } catch (err) {
    console.error('Failed to send login alert email:', err.message);
  }
}

module.exports = {
  parseUserAgent,
  getIpLocation,
  registerDeviceSession,
  getClientIp
};
