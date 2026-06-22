
const { decrypt } = require('../utils/encryption');
const User = require('../models/User');


const COOKIE_EXPIRY_MS = 3 * 60 * 60 * 1000;


const activeScrapes = new Set();


async function runBackgroundScrapeForUser(userId, opts = {}) {
  const { sendPushFn, syncHandlerFn } = opts;

  if (activeScrapes.has(userId)) {
    console.log(`[BGScraper] Already running for user ${userId} — skip.`);
    return { status: 'ALREADY_RUNNING' };
  }
  activeScrapes.add(userId);

  try {
    
    const user = await User.findById(userId)
      .select('+ucpCookieEncrypted +ucpCookieUpdatedAt');

    if (!user) return { status: 'USER_NOT_FOUND' };
    if (!user.ucpCookieEncrypted) return { status: 'NO_COOKIE' };
    if (!user.portalId) return { status: 'NO_PORTAL_ID' };

    
    const updatedAt = user.ucpCookieUpdatedAt ? new Date(user.ucpCookieUpdatedAt).getTime() : 0;
    const cookieAge = Date.now() - updatedAt;
    if (cookieAge > COOKIE_EXPIRY_MS) {
      console.log(`[BGScraper] Cookie expired for user ${userId} (age: ${Math.round(cookieAge / 3600000)}h)`);
      await User.findByIdAndUpdate(userId, {
        ucpCookieEncrypted: null,
        isPortalConnected: false
      });
      if (sendPushFn) {
        await sendPushFn(user, '🔑 Portal Session Expired', 'Your Horizon session has expired. Open the app and re-sync to continue receiving updates.');
      }
      return { status: 'COOKIE_EXPIRED' };
    }

    
    const cookie = decrypt(user.ucpCookieEncrypted);
    if (!cookie) return { status: 'DECRYPT_FAILED' };

    
    const { scrapeServerSide } = require('./scraperEngine');
    console.log(`[BGScraper] Starting scrape for user ${userId} (${user.email})`);
    const scrapedPayload = await scrapeServerSide(cookie, 'BACKGROUND', user.portalId);

    if (!scrapedPayload || scrapedPayload.sessionExpired) {
      console.log(`[BGScraper] Session expired during scrape for user ${userId}`);
      await User.findByIdAndUpdate(userId, {
        ucpCookieEncrypted: null,
        isPortalConnected: false
      });
      if (sendPushFn) {
        await sendPushFn(user, '🔑 Portal Session Expired', 'Your Horizon session has expired. Please re-sync from the app.');
      }
      return { status: 'SESSION_EXPIRED' };
    }

    
    
    if (syncHandlerFn) {
      scrapedPayload.syncMode = 'BACKGROUND_SYNC';
      await syncHandlerFn(userId.toString(), scrapedPayload, cookie);
    }

    console.log(`[BGScraper] ✅ Done for user ${userId}`);
    return { status: 'SUCCESS' };

  } catch (err) {
    console.error(`[BGScraper] ❌ Error for user ${userId}:`, err.message);
    return { status: 'ERROR', error: err.message };
  } finally {
    activeScrapes.delete(userId);
  }
}

module.exports = { runBackgroundScrapeForUser };
