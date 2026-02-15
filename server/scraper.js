const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
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
      // 1. FETCH USER CREDENTIALS
      const user = await User.findById(userId);
      if (!user || !user.isPortalConnected || !user.portalId) {
          throw new Error("NO_CREDENTIALS"); 
      }

      // 2. SMART BROWSER TOGGLE
      if (process.env.RENDER || process.env.NODE_ENV === 'production') {
          console.log("🌐 Cloud Mode: Connecting to Browserless.io...");
          browser = await puppeteer.connect({
              browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}&stealth=true&replay=true`,
          });
      } else {
          console.log("🖥️ Local Testing Mode: Launching visible Chrome browser...");
          const sessionPath = path.join(__dirname, 'session_data', userId.toString()); 
          if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

          browser = await puppeteer.launch({ 
              headless: false, 
              defaultViewport: null,
              args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
              userDataDir: sessionPath 
          });
      }

      let page = await browser.newPage();

      // 3. NAVIGATE TO DASHBOARD
      console.log("🌍 Navigating to Dashboard...");
      try {
        await page.goto('https://horizon.ucp.edu.pk/student/dashboard', { waitUntil: 'networkidle2', timeout: 60000 });
      } catch (e) { console.log("⚠️ Initial load timeout, checking URL..."); }

      // 4. AUTOMATED MICROSOFT LOGIN
      if (page.url().includes('login') || page.url().includes('signin') || page.url().includes('microsoft')) {
          console.log("🔐 Session expired. Initiating Microsoft Login Automation...");
          
          const portalId = user.portalId;
          const portalPass = decrypt(user.portalPassword);

          try {
            // STEP A: Click "Login With Microsoft"
            const msBtnSelector = 'a.btn-outline-primary';
            const msBtn = await page.waitForSelector(msBtnSelector, { timeout: 10000 }).catch(() => null);
            
            if (msBtn) {
                console.log("   👉 Clicking UCP 'Login With Microsoft'...");
                await Promise.all([
                    msBtn.click(),
                    page.waitForNavigation({ waitUntil: 'networkidle2' }) 
                ]);
            }

            // --- GLITCH BYPASS LOGIC ---
            const handleGlitch = async () => {
                try {
                    const useDiffAccount = await page.waitForSelector('#cancelLink', { timeout: 5000 }).catch(() => null);
                    if (useDiffAccount) {
                        console.log("   ⚠️ Glitch Screen Detected: Clicking 'Use a different account'...");
                        await useDiffAccount.click();
                        await new Promise(r => setTimeout(r, 2000)); 
                        
                        const tileSelector = `div.table[data-test-id="${portalId}"]`;
                        const accountTile = await page.waitForSelector(tileSelector, { timeout: 5000 });
                        if (accountTile) {
                            console.log("   👉 Selecting Account Tile...");
                            await accountTile.click();
                            await page.waitForNavigation({ waitUntil: 'networkidle2' });
                            return true; 
                        }
                    }
                } catch (e) {}
                return false;
            };

            if (await handleGlitch()) console.log("   ✅ Glitch bypassed.");

            // STEP B: Standard Email Entry
            const emailInputSelector = 'input[name="loginfmt"]';
            const emailInput = await page.waitForSelector(emailInputSelector, { visible: true, timeout: 10000 }).catch(() => null);
            
            if (emailInput) {
                console.log("   📧 Entering Email...");
                await page.type(emailInputSelector, portalId, { delay: 30 });
                await page.click('#idSIButton9'); 
                await new Promise(r => setTimeout(r, 2000));
            }

            // STEP C: Enter Password
            const passInputSelector = 'input[name="passwd"]';
            const passInput = await page.waitForSelector(passInputSelector, { visible: true, timeout: 10000 }).catch(() => null);
            
            if (passInput) {
                console.log("   🔑 Entering Password...");
                await page.type(passInputSelector, portalPass, { delay: 30 });
                
                await Promise.all([
                    page.click('#idSIButton9'),
                    page.waitForNavigation({ waitUntil: 'networkidle2' })
                ]);
            }

            if (await handleGlitch()) console.log("   ✅ Glitch bypassed after password.");

            // STEP D: "Stay Signed In?"
            try {
                const glitchCheck = await page.$('#cancelLink');
                if (!glitchCheck) {
                    const staySignedInBtn = await page.waitForSelector('#idSIButton9', { visible: true, timeout: 8000 }).catch(() => null);
                    if (staySignedInBtn) {
                        console.log("   👉 Clicking 'Yes' to stay signed in...");
                        await page.evaluate(() => {
                            const btn = document.querySelector('#idSIButton9');
                            if(btn) btn.click();
                        });
                        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => console.log("   ℹ️ Navigation wait resolved."));
                    }
                }
            } catch (e) {
                console.log("   ℹ️ 'Stay signed in' screen skipped:", e.message);
            }

          } catch(e) {
             console.error("❌ Auto-Login Error:", e.message);
          }
      } // <--- Syntax issue is fixed here

      // Verify Dashboard access
      if (!page.url().includes('dashboard')) {
          try {
            await page.waitForFunction(() => window.location.href.includes('dashboard'), { timeout: 15000 });
          } catch(e) {
            throw new Error("LOGIN_FAILED");
          }
      }
      console.log("✅ Logged in successfully!");

      // --- 🛠️ THE ULTIMATE FRAME STABILIZER ---
      console.log("   🔄 Forcing a clean reload to kill Microsoft's background redirects...");
      // By manually navigating here, we destroy Microsoft's dying frame and create a permanent, stable one.
      await page.goto('https://horizon.ucp.edu.pk/student/dashboard', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null);
      
      // Brief 2-second pause to let the HTML structure settle
      await new Promise(r => setTimeout(r, 2000)); 

      // --- STEP 5: HTML SNAPSHOT FOR DASHBOARD (CHEERIO) ---
      console.log("🔎 Scanning for active courses using HTML Snapshot...");
      
      // We wrap the wait in a try/catch so if a straggling detach happens, it safely ignores it instead of crashing the app
      try {
          await page.waitForSelector('a[href*="/student/course/info/"]', { timeout: 10000 });
      } catch (e) {
          console.log("   ⚠️ Course cards didn't load in time, or frame shifted. Taking snapshot anyway...");
      }
      
      const dashboardHtml = await page.content();
      const $ = cheerio.load(dashboardHtml);

      const courseLinks = [];
      $('a[href*="/student/course/info/"]').each((i, el) => {
          let href = $(el).attr('href');
          if (!href.startsWith('http')) href = 'https://horizon.ucp.edu.pk' + href;
          courseLinks.push(href);
      });

      console.log(`   Found ${courseLinks.length} active courses.`);
      await Grade.deleteMany({ userId: userId });

      if (courseLinks.length > 0) {
          for (const url of courseLinks) {
              try {
                  await page.goto(url, { waitUntil: 'networkidle2' });
                  const gradeTab = await page.waitForSelector('::-p-text("Grade Book")', { timeout: 5000 });
                  
                  if (gradeTab) {
                      await gradeTab.click();
                      await page.waitForSelector('tr.table-parent-row', { timeout: 8000 });

                      // SNAPSHOT THE COURSE PAGE
                      const courseHtml = await page.content();
                      const $c = cheerio.load(courseHtml);

                      const realName = $c('.breadcrumb li:nth-child(2)').text().trim() || "Unknown Course";
                      const results = [];

                      $c('tr.table-parent-row').each((i, row) => {
                          const nameAnchor = $c(row).find('a.toggle-childrens');
                          let summaryName = nameAnchor.text().split('\n')[0].trim() || "Unknown";
                          const badge = $c(row).find('.uk-badge').first();
                          if (badge.length) {
                              summaryName = summaryName.replace(badge.text(), '').trim();
                          }
                          
                          const tds = $c(row).find('td');
                          let summaryPercentage = tds.length >= 2 ? $c(tds[1]).text().trim() : "0";

                          let childDetails = [];
                          let nextSibling = $c(row).next();
                          
                          while (nextSibling.length && !nextSibling.hasClass('table-parent-row')) {
                              const childTds = nextSibling.find('td');
                              if (childTds.length >= 3) {
                                  childDetails.push({
                                      name: $c(childTds[0]).text().trim(),
                                      maxMarks: $c(childTds[1]).text().trim(),
                                      obtainedMarks: $c(childTds[2]).text().trim(),
                                      classAverage: $c(childTds[3]).text().trim(),
                                      percentage: $c(childTds[4]).text().trim()
                                  });
                              }
                              nextSibling = nextSibling.next();
                          }
                          results.push({ name: summaryName, weight: badge.text().trim(), percentage: summaryPercentage, details: childDetails });
                      });

                      const totalBadge = $c('.uk-badge:contains("/ 100")').first().text();
                      const totalPercentage = totalBadge ? totalBadge.split('/')[0].trim() : "0";

                      await Grade.findOneAndUpdate(
                          { courseUrl: url, userId: userId }, 
                          { userId: userId, courseUrl: url, courseName: realName, assessments: results, totalPercentage: totalPercentage, lastUpdated: new Date() },
                          { upsert: true, new: true }
                      );
                  }
              } catch (e) { 
                  console.log(`   ⚠️ Skipped active course details: ${e.message}`); 
              }
          }
      }

      // --- STEP 6: HTML SNAPSHOT FOR RESULT HISTORY ---
      console.log("📜 Robot: Fetching Result History...");
      try {
          await page.goto('https://horizon.ucp.edu.pk/student/results', { waitUntil: 'networkidle2', timeout: 60000 });
          
          const previousTab = await page.waitForSelector('::-p-text("Previous Courses")', { timeout: 10000 });
          if (previousTab) {
             await previousTab.click();
             await new Promise(r => setTimeout(r, 2000)); 
          }

          await page.waitForSelector('tr.table-parent-row', { timeout: 20000 });

          // SNAPSHOT THE HISTORY PAGE
          const historyHtml = await page.content();
          const $h = cheerio.load(historyHtml);

          const historyData = [];
          let currentSemester = null;

          $h('table tbody tr').each((i, row) => {
              const $row = $h(row);
              if ($row.hasClass('table-parent-row')) {
                  const tds = $row.find('td');
                  if (tds.length >= 8) {
                      currentSemester = {
                          term: $h(tds[0]).text().trim(),
                          earnedCH: $h(tds[4]).text().trim(),
                          sgpa: $h(tds[6]).text().trim(),
                          cgpa: $h(tds[7]).text().trim(),
                          courses: []
                      };
                      historyData.push(currentSemester);
                  }
              } else if ($row.hasClass('table-child-row') && currentSemester) {
                  const tds = $row.find('td');
                  if (tds.length >= 4) {
                      currentSemester.courses.push({
                          name: $h(tds[0]).text().trim(),
                          creditHours: $h(tds[1]).text().trim(),
                          gradePoints: $h(tds[2]).text().trim(),
                          finalGrade: $h(tds[3]).text().trim()
                      });
                  }
              }
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
              console.log(`✅ Synced ${historyData.length} semesters of history.`);
          } else {
              console.log("ℹ️ No history rows found.");
          }

      } catch (historyError) {
          console.error(`❌ Error scraping history: ${historyError.message}`);
      }

      console.log("🏁 SYNC COMPLETE!");

  } catch (error) {
      console.error("❌ SCRAPER CRITICAL ERROR:", error.message);
      throw error; 
  } finally {
      if (browser) await browser.close();
      isRobotBusy = false;
      console.log("🔓 Robot is free.");
  }
};

module.exports = runScraper;