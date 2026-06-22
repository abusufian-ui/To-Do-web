
const cron = require('node-cron');
const User = require('../models/User');
const { runBackgroundScrapeForUser } = require('./backgroundScraper');
const { decrypt } = require('../utils/encryption');


const STAGGER_MS = 3000;


function startBackgroundCron(opts = {}) {
  
  cron.schedule('0 */4 * * *', async () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    console.log('[BGCron] 🕐 Starting 4-hour background scrape cycle...');

    try {
      
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
        
        await new Promise(r => setTimeout(r, STAGGER_MS));
        const result = await runBackgroundScrapeForUser(user._id.toString(), opts);
        console.log(`[BGCron] User ${user._id} (${user.email}): ${result.status}`);
      }

      console.log('[BGCron] ✅ Background scrape cycle complete.');
    } catch (err) {
      console.error('[BGCron] ❌ Cron cycle error:', err.message);
    }
  });

  
  cron.schedule('*/10 * * * *', async () => {
    console.log('[BGCron] 💓 Starting session keep-alive ping cycle (10m)...');
    try {
      const users = await User.find({
        ucpCookieEncrypted: { $ne: null },
        isPortalConnected: true,
        isBlocked: { $ne: true }
      }).select('+ucpCookieEncrypted email').lean();

      console.log(`[BGCron] Found ${users.length} users to ping keep-alive.`);

      for (const u of users) {
        await new Promise(r => setTimeout(r, STAGGER_MS));
        try {
          const cookie = decrypt(u.ucpCookieEncrypted);
          if (!cookie) continue;

          const response = await fetch('https://horizon.ucp.edu.pk/student/dashboard', {
            method: 'GET',
            headers: {
              'Cookie': cookie,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
          });

          if (response.url && response.url.toLowerCase().includes('login')) {
            console.log(`[BGCron] Session expired for user ${u.email} during keep-alive`);
            await User.findByIdAndUpdate(u._id, {
              ucpCookieEncrypted: null,
              isPortalConnected: false
            });
            if (opts.sendPushFn) {
              await opts.sendPushFn(u, '🔑 Portal Session Expired', 'Your Horizon session has expired. Please refresh it from the dashboard.');
            }
          } else {
            console.log(`[BGCron] Session kept alive successfully for user ${u.email}`);
          }
        } catch (err) {
          console.error(`[BGCron] Keep-alive failed for user ${u.email}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[BGCron] ❌ Keep-alive cron error:', err.message);
    }
  });

  console.log('[BGCron] Background scrape cron registered (every 4 hours).');
  console.log('[BGCron] Session keep-alive cron registered (every 10 minutes).');
}

module.exports = { startBackgroundCron };
