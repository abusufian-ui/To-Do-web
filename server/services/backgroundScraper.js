/**
 * Background Scraper Service
 * Runs server-side scraping for a single user using their stored encrypted cookie.
 * Called by backgroundCron.js (4-hour schedule) or manual admin triggers.
 * NOT triggered by silent push (removed).
 */
const { decrypt } = require('../utils/encryption');
const User = require('../models/User');

// 20 hours — if cookie is older than this, it is likely expired
const COOKIE_EXPIRY_MS = 20 * 60 * 60 * 1000;

// Per-user lock — prevents concurrent background scrapes for the same user
const activeScrapes = new Set();

/**
 * Run a full background scrape for one user using their stored encrypted cookie.
 * @param {string} userId - MongoDB ObjectId string
 * @param {Object} opts - { sendPushFn, syncHandlerFn } injected from index.js to avoid circular deps
 */
async function runBackgroundScrapeForUser(userId, opts = {}) {
  const { sendPushFn, syncHandlerFn } = opts;

  if (activeScrapes.has(userId)) {
    console.log(`[BGScraper] Already running for user ${userId} — skip.`);
    return { status: 'ALREADY_RUNNING' };
  }
  activeScrapes.add(userId);

  try {
    // Load user with encrypted cookie (select: false field must be explicit)
    const user = await User.findById(userId)
      .select('+ucpCookieEncrypted +ucpCookieUpdatedAt');

    if (!user) return { status: 'USER_NOT_FOUND' };
    if (!user.ucpCookieEncrypted) return { status: 'NO_COOKIE' };
    if (!user.portalId) return { status: 'NO_PORTAL_ID' };

    // Check cookie age
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

    // Decrypt cookie
    const cookie = decrypt(user.ucpCookieEncrypted);
    if (!cookie) return { status: 'DECRYPT_FAILED' };

    // Run the scrape
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

    // Pass the scraped data through the main sync handler (same processing as client syncs)
    // This ensures full change detection, push notifications, and DB writes
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
