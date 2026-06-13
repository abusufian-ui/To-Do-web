/**
 * Background Cron Scheduler
 * Runs a 4-hour cron that triggers server-side scraping for users
 * who haven't synced recently and have a valid stored cookie.
 * 
 * NOTE: Silent push scraping has been removed. This cron is the only
 * background scraping trigger. Clients scrape on login + manual sync.
 */
const cron = require('node-cron');
const User = require('../models/User');
const { runBackgroundScrapeForUser } = require('./backgroundScraper');

// Stagger delay between users (ms) — prevents hammering UCP portal from one IP
const STAGGER_MS = 3000;

/**
 * Start the background scrape cron.
 * @param {Object} opts - { sendPushFn, syncHandlerFn } from index.js
 */
function startBackgroundCron(opts = {}) {
  // Run every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    console.log('[BGCron] 🕐 Starting 4-hour background scrape cycle...');

    try {
      // Find all active users with a stored cookie who haven't synced in 4+ hours
      const users = await User.find({
        ucpCookieEncrypted: { $ne: null },
        isBlocked: { $ne: true },
        $or: [
          { lastSyncAt: { $lt: fourHoursAgo } },
          { lastSyncAt: null }
        ]
      }).select('_id email').lean();

      console.log(`[BGCron] Found ${users.length} users needing background sync.`);

      for (const user of users) {
        // Stagger to avoid all users hitting UCP portal simultaneously
        await new Promise(r => setTimeout(r, STAGGER_MS));
        const result = await runBackgroundScrapeForUser(user._id.toString(), opts);
        console.log(`[BGCron] User ${user._id} (${user.email}): ${result.status}`);
      }

      console.log('[BGCron] ✅ Background scrape cycle complete.');
    } catch (err) {
      console.error('[BGCron] ❌ Cron cycle error:', err.message);
    }
  });

  console.log('[BGCron] Background scrape cron registered (every 4 hours).');
}

module.exports = { startBackgroundCron };
