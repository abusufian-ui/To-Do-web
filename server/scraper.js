const puppeteer = require('puppeteer');
const Grade = require('./models/Grade');
const ResultHistory = require('./models/ResultHistory');
const StudentStats = require('./models/StudentStats');
const User = require('./models/User');
const { decrypt } = require('./utils/encryption');
const path = require('path');
const fs = require('fs');

// --- GLOBAL LOCK ---
let isRobotBusy = false;

const runScraper = async (userId) => {
  if (isRobotBusy) {
      console.log("⚠️ Robot is already working! Please wait.");
      throw new Error("ROBOT_BUSY");
  }

  isRobotBusy = true;
  console.log(`🤖 Robot: Starting Automated Sync for User: ${userId}...`);

  let browser = null;

  try {
      // 1. FETCH USER CREDENTIALS WITH DETAILED CHECKS
      const user = await User.findById(userId);
      
      if (!user) {
          throw new Error(`USER_NOT_FOUND_IN_DB (ID: ${userId}) - Try logging out and back in.`);
      }
      if (!user.isPortalConnected) {
          throw new Error(`PORTAL_NOT_LINKED - Please go to Settings > Link Portal Account.`);
      }
      if (!user.portalId || !user.portalPassword) {
          throw new Error("MISSING_PORTAL_DATA - ID or Password missing in database.");
      }

      // 2. SESSION ISOLATION
      // Sanitize ID to create a valid folder name
      const safePortalId = user.portalId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      // Use __dirname/session_data (Ensure nodemon ignores this folder!)
      const sessionPath = path.join(__dirname, 'session_data', safePortalId); 
      
      if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

      const launchBrowser = async () => {
          return await puppeteer.launch({ 
            headless: true, // Set to false if you need to debug visually
            defaultViewport: null,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
            userDataDir: sessionPath 
          });
      };

      browser = await launchBrowser(); 
      let page = await browser.newPage();

      // 3. NAVIGATE TO DASHBOARD
      console.log(`🌍 Navigating to Dashboard for ${user.portalId}...`);
      try {
        await page.goto('https://horizon.ucp.edu.pk/student/dashboard', { waitUntil: 'networkidle2', timeout: 60000 });
      } catch (e) { console.log("⚠️ Initial load timeout, checking URL..."); }

      // 4. AUTOMATED MICROSOFT LOGIN
      if (page.url().includes('login') || page.url().includes('signin') || page.url().includes('microsoft')) {
          console.log("🔐 Session expired. Initiating Microsoft Login...");
          
          const portalId = user.portalId;
          const portalPass = decrypt(user.portalPassword);

          try {
            // STEP A: Click "Login With Microsoft"
            const msBtnSelector = 'a.btn-outline-primary';
            const msBtn = await page.waitForSelector(msBtnSelector, { timeout: 5000 }).catch(() => null);
            
            if (msBtn) {
                console.log("   👉 Clicking UCP 'Login With Microsoft'...");
                await Promise.all([
                    msBtn.click(),
                    page.waitForNavigation({ waitUntil: 'networkidle2' }) 
                ]);
            }

            // --- HANDLE "PICK AN ACCOUNT" (SESSION RESUME) ---
            try {
                // Check if "Pick an account" text is present
                const pickAccountHeader = await page.waitForSelector('::-p-text("Pick an account")', { timeout: 5000 }).catch(() => null);

                if (pickAccountHeader) {
                    console.log("   👀 'Pick an account' screen detected.");

                    const tileSelector = `div[data-test-id="${portalId}"], div.table[role="button"]`;
                    
                    // 1. Click the Account Tile (First Attempt)
                    const accountTile = await page.waitForSelector(tileSelector, { timeout: 5000 });
                    if (accountTile) {
                        console.log("   👉 Clicking Account Tile (Attempt 1)...");
                        await accountTile.click();
                        await new Promise(r => setTimeout(r, 3000)); // Wait for Glitch screen
                    }

                    // 2. Check for "Glitch" Screen
                    const glitchText = await page.waitForSelector('::-p-text("Use a different account")', { timeout: 3000 }).catch(() => null);
                    
                    if (glitchText) {
                        console.log("   ⚠️ Glitch Screen Detected: Resetting session...");
                        await glitchText.click();
                        await page.waitForNavigation({ waitUntil: 'networkidle0' });
                        console.log("   🔄 Returning to 'Pick an account'...");
                        
                        // 3. Click the Account Tile AGAIN
                        const accountTileRetry = await page.waitForSelector(tileSelector, { timeout: 5000 });
                        if (accountTileRetry) {
                            console.log("   👉 Clicking Account Tile (Attempt 2)...");
                            await accountTileRetry.click();
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    } else {
                        console.log("   ✅ No glitch detected, proceeding...");
                    }
                }
            } catch (e) {
                console.log("   ℹ️ 'Pick an account' flow skipped or failed:", e.message);
            }
            // -----------------------------------------------------

            // STEP B: Enter Email
            const emailInputSelector = 'input[name="loginfmt"]';
            const emailInput = await page.waitForSelector(emailInputSelector, { visible: true, timeout: 5000 }).catch(() => null);
            
            if (emailInput) {
                console.log("   📧 Entering Email...");
                await page.type(emailInputSelector, portalId, { delay: 30 });
                await page.click('#idSIButton9'); 
                await new Promise(r => setTimeout(r, 2000));
            }

            // STEP C: Enter Password
            const passInputSelector = 'input[name="passwd"]';
            const passInput = await page.waitForSelector(passInputSelector, { visible: true, timeout: 5000 }).catch(() => null);
            
            if (passInput) {
                console.log("   🔑 Entering Password...");
                await page.type(passInputSelector, portalPass, { delay: 30 });
                await Promise.all([
                    page.click('#idSIButton9'),
                    page.waitForNavigation({ waitUntil: 'networkidle2' })
                ]);
            }

            // STEP D: Stay Signed In
            try {
                const staySignedInBtn = await page.waitForSelector('#idSIButton9, input[type="submit"][value="Yes"]', { timeout: 5000 }).catch(() => null);
                if (staySignedInBtn) {
                    console.log("   👉 Clicking 'Yes' to stay signed in...");
                    await Promise.all([
                        staySignedInBtn.click(),
                        page.waitForNavigation({ waitUntil: 'networkidle2' })
                    ]);
                }
            } catch (e) {
                console.log("   ℹ️ 'Stay signed in' screen skipped.");
            }

          } catch(e) {
             console.error("❌ Auto-Login Error:", e.message);
          }
      }

      // Verify Dashboard access
      if (!page.url().includes('dashboard')) {
          try {
            await page.waitForFunction(() => window.location.href.includes('dashboard'), { timeout: 10000 });
          } catch(e) {
            console.log("❌ Failed to reach dashboard.");
            throw new Error("LOGIN_FAILED - Check credentials or internet.");
          }
      }
      console.log("✅ Logged in successfully!");

      // --- STEP 5: SCRAPE ACTIVE COURSES ---
      console.log("🔎 Scanning for active courses...");
      const courseLinks = await page.evaluate(() => {
        const cards = document.querySelectorAll('a[href*="/student/course/info/"]');
        return Array.from(cards).map(card => card.href);
      });

      console.log(`   Found ${courseLinks.length} active courses.`);

      // CLEANUP: Remove old grades for this user
      await Grade.deleteMany({ userId: userId });

      if (courseLinks.length > 0) {
          for (const url of courseLinks) {
              try {
                  await page.goto(url, { waitUntil: 'networkidle2' });
                  const gradeTab = await page.waitForSelector('::-p-text("Grade Book")', { timeout: 5000 });
                  
                  if (gradeTab) {
                      await gradeTab.click();
                      await page.waitForSelector('tr.table-parent-row', { timeout: 8000 });

                      const realName = await page.evaluate(() => {
                          const breadcrumb = document.querySelector('.breadcrumb li:nth-child(2)');
                          return breadcrumb ? breadcrumb.innerText.trim() : "Unknown Course";
                      });

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
                                  if (childTds.length >= 3) {
                                      childDetails.push({
                                          name: childTds[0]?.innerText.trim(),
                                          maxMarks: childTds[1]?.innerText.trim(),
                                          obtainedMarks: childTds[2]?.innerText.trim(),
                                          classAverage: childTds[3]?.innerText.trim(),
                                          percentage: childTds[4]?.innerText.trim()
                                      });
                                  }
                                  nextSibling = nextSibling.nextElementSibling;
                              }
                              results.push({ name: summaryName, weight: badge?.innerText, percentage: summaryPercentage, details: childDetails });
                              if (nameAnchor) nameAnchor.click();
                          }
                          const totalBadge = Array.from(document.querySelectorAll('.uk-badge')).find(b => b.innerText.includes('/ 100'));
                          return { assessments: results, total: totalBadge ? totalBadge.innerText.split('/')[0].trim() : "0" };
                      });

                      await Grade.findOneAndUpdate(
                          { courseUrl: url, userId: userId }, 
                          { userId: userId, courseUrl: url, courseName: realName, assessments: courseData.assessments, totalPercentage: courseData.total, lastUpdated: new Date() },
                          { upsert: true, new: true }
                      );
                      console.log(`   ✅ Synced: ${realName}`);
                  }
              } catch (e) { 
                  console.log(`   ⚠️ Skipped course: ${e.message}`); 
              }
          }
      }

      // --- STEP 6: SCRAPE RESULT HISTORY ---
      console.log("📜 Robot: Fetching Result History...");
      try {
          await page.goto('https://horizon.ucp.edu.pk/student/results', { waitUntil: 'networkidle2', timeout: 60000 });
          
          const previousTab = await page.waitForSelector('::-p-text("Previous Courses")', { timeout: 10000 });
          if (previousTab) {
             await previousTab.click();
             await new Promise(r => setTimeout(r, 2000)); 
          }

          await page.waitForSelector('tr.table-parent-row', { timeout: 20000 });

          const historyData = await page.evaluate(() => {
              const rows = Array.from(document.querySelectorAll('table tbody tr'));
              const results = [];
              let currentSemester = null;

              rows.forEach(row => {
                  if (row.classList.contains('table-parent-row')) {
                      const tds = row.querySelectorAll('td');
                      if (tds.length >= 8) {
                          currentSemester = {
                              term: tds[0].innerText.trim(),
                              earnedCH: tds[4].innerText.trim(),
                              sgpa: tds[6].innerText.trim(),
                              cgpa: tds[7].innerText.trim(),
                              courses: []
                          };
                          results.push(currentSemester);
                      }
                  } else if (row.classList.contains('table-child-row') && currentSemester) {
                      const tds = row.querySelectorAll('td');
                      if (tds.length >= 4) {
                          currentSemester.courses.push({
                              name: tds[0].innerText.trim(),
                              creditHours: tds[1].innerText.trim(),
                              gradePoints: tds[2].innerText.trim(),
                              finalGrade: tds[3].innerText.trim()
                          });
                      }
                  }
              });
              return results;
          });

          if (historyData && historyData.length > 0) {
              await ResultHistory.deleteMany({ userId: userId });

              for (const sem of historyData) {
                  await ResultHistory.findOneAndUpdate(
                      { term: sem.term, userId: userId }, 
                      { ...sem, userId: userId, lastUpdated: new Date() },
                      { upsert: true }
                  );
              }

              const latestSem = historyData[historyData.length - 1]; 
              const totalCredits = historyData.reduce((acc, sem) => acc + (parseFloat(sem.earnedCH) || 0), 0);
              
              await StudentStats.findOneAndUpdate(
                  { userId: userId },
                  { 
                      userId: userId, 
                      cgpa: latestSem.cgpa, 
                      credits: totalCredits.toString(), 
                      inprogressCr: courseLinks.length * 3, 
                      lastUpdated: new Date() 
                  },
                  { upsert: true }
              );
              console.log(`✅ Synced ${historyData.length} semesters.`);
          }

      } catch (historyError) {
          console.error(`❌ History Error: ${historyError.message}`);
      }

      console.log("🏁 SYNC COMPLETE!");

  } catch (error) {
      // Log the specific error to help you debug
      console.error("❌ SCRAPER ERROR:", error.message);
      throw error; 
  } finally {
      if (browser) await browser.close();
      isRobotBusy = false;
  }
};

module.exports = runScraper;