const puppeteer = require('puppeteer');
const Grade = require('./models/Grade');
const path = require('path');
const fs = require('fs');

// --- GLOBAL LOCK ---
// This variable prevents two robots from running at the same time
let isRobotBusy = false;

const runScraper = async () => {
  // 1. CHECK LOCK
  if (isRobotBusy) {
      console.log("⚠️ Robot is already working! Please wait.");
      return;
  }

  isRobotBusy = true; // Lock the door
  console.log("🤖 Robot: Starting Smart Sync...");

  let browser = null;

  try {
      const sessionPath = path.join(__dirname, 'session_data'); 
      if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath);

      // --- HELPER: LAUNCH BROWSER ---
      const launchBrowser = async (visible) => {
          return await puppeteer.launch({ 
            headless: visible ? false : "new", 
            defaultViewport: null,
            args: ['--start-maximized'],
            userDataDir: sessionPath 
          });
      };

      // 2. TRY INVISIBLE MODE FIRST
      browser = await launchBrowser(false); 
      let page = await browser.newPage();
      let needsLogin = false;

      console.log("🕵️ Checking session in background...");
      
      try {
        await page.goto('https://horizon.ucp.edu.pk/student/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
      } catch (e) {
        console.log("⚠️ Initial load timeout. Might need login.");
      }

      // 3. CHECK IF KICKED TO LOGIN PAGE
      if (page.url().includes('login') || page.url().includes('signin')) {
          console.log("⚠️ Session expired. Switching to VISIBLE mode...");
          needsLogin = true;
          await browser.close(); // Close invisible browser
          
          // 4. RE-LAUNCH VISIBLE
          browser = await launchBrowser(true);
          page = await browser.newPage();
          await page.goto('https://horizon.ucp.edu.pk/web/login', { waitUntil: 'networkidle2' });
          
          console.log("👉 Please login manually.");

          // Auto-helpers (Same as before)
          try {
              const msBtn = await page.waitForSelector('::-p-text("Microsoft")', { timeout: 3000 });
              if (msBtn) await msBtn.click();
          } catch (e) {}

          try {
              const emailInput = await page.$('input[name="loginfmt"]');
              if (emailInput) {
                  await emailInput.type(process.env.UCP_ID, { delay: 10 });
                  await page.keyboard.press('Enter');
              }
          } catch (e) {}

          try {
              await new Promise(r => setTimeout(r, 2000));
              const passwordInput = await page.$('input[name="passwd"]');
              if (passwordInput) {
                  await passwordInput.type(process.env.UCP_PASSWORD, { delay: 10 });
                  await page.keyboard.press('Enter');
              }
          } catch (e) {}

          try {
              const staySignedIn = await page.waitForSelector('#idSIButton9', { timeout: 5000 });
              if (staySignedIn) await staySignedIn.click();
          } catch (e) {}
      } else {
          console.log("✅ Session valid! Syncing silently...");
      }

      // 5. WAIT FOR DASHBOARD
      const timeout = needsLogin ? 120000 : 60000; 
      try {
          await page.waitForFunction(
              "document.body.innerText.includes('Academics') || document.querySelector('a[href*=\"/student/course/info/\"]')",
              { timeout: timeout }
          );
          if (needsLogin) console.log("✅ Login Successful!");
      } catch (e) {
          console.log("❌ Dashboard timeout.");
          throw new Error("Could not reach dashboard.");
      }

      // 6. START SCRAPING
      const courseLinks = await page.evaluate(() => {
        const cards = document.querySelectorAll('a[href*="/student/course/info/"]');
        return Array.from(cards).map(card => card.href);
      });

      console.log(`🔎 Found ${courseLinks.length} courses.`);

      if (courseLinks.length > 0) {
          // Safe wipe
          try { await Grade.deleteMany({}); } catch (e) {}

          for (const url of courseLinks) {
              await page.goto(url, { waitUntil: 'networkidle2' });

              try {
                  const gradeTab = await page.waitForSelector('::-p-text("Grade Book")', { timeout: 5000 });
                  if (gradeTab) {
                      await gradeTab.click();
                      await page.waitForSelector('tr.table-parent-row', { timeout: 8000 });

                      const realName = await page.evaluate(() => {
                          const breadcrumb = document.querySelector('.breadcrumb li:nth-child(2)');
                          if (breadcrumb && breadcrumb.innerText.trim().length > 3) return breadcrumb.innerText.trim();
                          
                          const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, a, div.h3'));
                          const target = headers.find(el => el.innerText.includes('(') && el.innerText.includes(')'));
                          if (target) return target.innerText.split('(')[0].trim();

                          return "Unknown Course";
                      });

                      console.log(`👉 Synced: ${realName}`);

                      const courseData = await page.evaluate(async () => {
                          const results = [];
                          const rows = document.querySelectorAll('tr.table-parent-row');
                          for (const row of rows) {
                              const nameAnchor = row.querySelector('a.toggle-childrens');
                              let summaryName = nameAnchor ? nameAnchor.innerText.split('\n')[0].trim() : "Unknown";
                              const badge = row.querySelector('.uk-badge');
                              if (badge) summaryName = summaryName.replace(badge.innerText, '').trim();
                              
                              const tds = row.querySelectorAll('td');
                              let summaryPercentage = tds.length >= 2 ? tds[1].innerText.trim() : "0";

                              if (nameAnchor) nameAnchor.click(); 
                              let childDetails = [];
                              let nextSibling = row.nextElementSibling;
                              while (nextSibling && !nextSibling.classList.contains('table-parent-row')) {
                                  const childTds = nextSibling.querySelectorAll('td');
                                  if (childTds.length >= 3 && childTds[0].innerText.trim() !== "") {
                                      childDetails.push({
                                          name: childTds[0]?.innerText.trim(),
                                          maxMarks: childTds[1]?.innerText.trim(),
                                          obtainedMarks: childTds[2]?.innerText.trim(),
                                          classAverage: childTds[3]?.innerText.trim() || "-",
                                          percentage: childTds[4]?.innerText.trim() || "-"
                                      });
                                  }
                                  nextSibling = nextSibling.nextElementSibling;
                              }
                              results.push({ name: summaryName, weight: badge?.innerText||"", percentage: summaryPercentage, details: childDetails });
                              if (nameAnchor) nameAnchor.click();
                          }
                          const totalBadge = Array.from(document.querySelectorAll('.uk-badge')).find(b => b.innerText.includes('/ 100'));
                          return { assessments: results, total: totalBadge ? totalBadge.innerText.split('/')[0].trim() : "0" };
                      });

                      await Grade.findOneAndUpdate(
                          { courseUrl: url }, 
                          { courseUrl: url, courseName: realName, assessments: courseData.assessments, totalPercentage: courseData.total, lastUpdated: new Date() },
                          { upsert: true, new: true }
                      );
                  }
              } catch (e) {
                  console.log(`   ⚠️ Skipped: ${e.message}`);
              }
          }
      }

      console.log("🏁 SYNC COMPLETE!");

  } catch (error) {
      console.error("❌ ERROR:", error.message);
  } finally {
      // --- ALWAYS RUNS ---
      // This part ensures the browser closes and the lock opens
      // even if the code crashes halfway through.
      if (browser) {
          await browser.close();
      }
      isRobotBusy = false; // Unlock the door
      console.log("🔓 Robot is free.");
  }
};

module.exports = runScraper;