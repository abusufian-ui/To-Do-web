const puppeteer = require('puppeteer');
const Grade = require('./models/Grade');
const StudentStats = require('./models/StudentStats');
const ResultHistory = require('./models/ResultHistory');
const path = require('path');
const fs = require('fs');

let isRobotBusy = false;

const runScraper = async () => {
  if (isRobotBusy) { 
    console.log("⚠️ Robot busy."); 
    throw new Error("ROBOT_BUSY"); 
  }
  isRobotBusy = true;
  console.log("🤖 Robot: Starting Secure Sync...");

  let browser = null;

  try {
      const sessionPath = path.join(__dirname, 'session_data'); 
      if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath);

      const launchBrowser = async (visible) => {
          return await puppeteer.launch({ 
            headless: visible ? false : "new", 
            defaultViewport: null,
            args: ['--start-maximized'],
            userDataDir: sessionPath 
          });
      };

      browser = await launchBrowser(false); 
      let page = await browser.newPage();

      // --- 1. DASHBOARD & LOGIN CHECK ---
      console.log("... Connecting to Portal...");
      const response = await page.goto('https://horizon.ucp.edu.pk/student/dashboard', { waitUntil: 'networkidle2', timeout: 60000 });

      if (response && response.status() >= 400 && response.status() !== 401) {
          throw new Error("PORTAL_DOWN");
      }

      const isLoginPage = page.url().includes('login') || page.url().includes('signin');

      if (isLoginPage) {
          console.log("⚠️ Login required. Switching to VISIBLE mode.");
          await browser.close();
          browser = await launchBrowser(true);
          page = await browser.newPage();
          await page.goto('https://horizon.ucp.edu.pk/web/login', { waitUntil: 'networkidle2' });
          
          try {
            await page.waitForFunction(
                "document.body.innerText.includes('Academics') || document.querySelector('.user_heading_content')",
                { timeout: 120000 }
            );
          } catch(e) { throw new Error("Login timeout"); }
      }

      // --- 2. ACTIVE COURSES CHECK ---
      console.log("🔍 Verifying Dashboard...");
      
      const hasProfile = await page.evaluate(() => document.querySelectorAll('.user_heading_content').length > 0);
      const courseLinks = await page.evaluate(() => {
        const cards = document.querySelectorAll('a[href*="/student/course/info/"]');
        return Array.from(cards).map(card => card.href);
      });

      if (hasProfile && courseLinks.length === 0) {
          console.log("✅ Verified: Semester is over. Clearing active courses...");
          await Grade.deleteMany({});
      } 
      else if (courseLinks.length > 0) {
          console.log(`✅ Found ${courseLinks.length} active courses. Syncing...`);
          const newGrades = [];

          for (const url of courseLinks) {
              await page.goto(url, { waitUntil: 'networkidle2' });
              try {
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
                              results.push({ name: summaryName, percentage: summaryPercentage, details: childDetails });
                              if (nameAnchor) nameAnchor.click();
                          }
                          const totalBadge = Array.from(document.querySelectorAll('.uk-badge')).find(b => b.innerText.includes('/ 100'));
                          return { assessments: results, total: totalBadge ? totalBadge.innerText.split('/')[0].trim() : "0" };
                      });

                      newGrades.push({
                          courseUrl: url,
                          courseName: realName,
                          assessments: courseData.assessments,
                          totalPercentage: courseData.total,
                          lastUpdated: new Date()
                      });
                  }
              } catch(e) { console.log(`Skipped active course: ${url}`); }
          }

          if (newGrades.length > 0) {
              await Grade.deleteMany({});
              await Grade.insertMany(newGrades);
              console.log("✅ Active Courses Updated.");
          }
      }

      // --- 3. SCRAPE RESULT HISTORY ---
      console.log("📜 Navigating to Results & Exams...");
      await page.goto('https://horizon.ucp.edu.pk/student/results', { waitUntil: 'networkidle2' });

      // Case-insensitive Tab Finder
      const tabClicked = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const prevTab = links.find(el => el.innerText.toLowerCase().includes('previous courses'));
          if (prevTab) { prevTab.click(); return true; }
          return false;
      });

      if (tabClicked) {
          try {
              await page.waitForSelector('tr.table-parent-row', { timeout: 8000 });
              const historyData = await page.evaluate(async () => {
                  const results = [];
                  const parents = document.querySelectorAll('tr.table-parent-row');
                  for (const row of parents) {
                      const tds = row.querySelectorAll('td');
                      const linkElement = row.querySelector('a.toggle-childrens');
                      const termName = linkElement ? linkElement.innerText.trim() : "Unknown";
                      const termData = {
                          term: termName,
                          gradePoints: tds[1]?.innerText.trim() || "0",
                          cumulativeGP: tds[2]?.innerText.trim() || "0",
                          attemptedCH: tds[3]?.innerText.trim() || "0",
                          earnedCH: tds[4]?.innerText.trim() || "0",
                          cumulativeCH: tds[5]?.innerText.trim() || "0",
                          sgpa: tds[6]?.innerText.trim() || "0.00",
                          cgpa: tds[7]?.innerText.trim() || "0.00",
                          courses: []
                      };
                      if (linkElement) linkElement.click();
                      let next = row.nextElementSibling;
                      while (next && next.classList.contains('table-child-row')) {
                          const cTds = next.querySelectorAll('td');
                          if (cTds.length >= 4) {
                              termData.courses.push({
                                  name: cTds[0]?.innerText.trim(),
                                  creditHours: cTds[1]?.innerText.trim(),
                                  gradePoints: cTds[2]?.innerText.trim(),
                                  finalGrade: cTds[3]?.innerText.trim()
                              });
                          }
                          next = next.nextElementSibling;
                      }
                      if (linkElement) linkElement.click();
                      results.push(termData);
                  }
                  return results;
              });

              for (const sem of historyData) {
                  if (sem.term) {
                      await ResultHistory.findOneAndUpdate({ term: sem.term }, sem, { upsert: true, new: true });
                  }
              }
          } catch (e) { console.log("⚠️ History table empty/missing."); }
      }

      // --- 5. SCRAPE STATS (Updated for Inprogress Cr) ---
      console.log("📊 Scraping Student Stats...");
      try {
        // Go back to dashboard to see the stats
        await page.goto('https://horizon.ucp.edu.pk/student/dashboard', { waitUntil: 'networkidle2' });
        
        const stats = await page.evaluate(() => {
            const text = document.body.innerText;
            // 1. CGPA
            const cgpaMatch = text.match(/CGPA\s*[:\n]\s*([\d\.]+)/i);
            // 2. Earned Credits
            const creditMatch = text.match(/Earned\s*Cr\s*[:\n]\s*([\d\.]+)/i);
            // 3. Inprogress Credits [NEW]
            const inprogressMatch = text.match(/Inprogress\s*Cr\s*[:\n]\s*([\d\.]+)/i);

            return { 
                cgpa: cgpaMatch ? cgpaMatch[1] : "0.00", 
                credits: creditMatch ? creditMatch[1] : "0",
                inprogressCr: inprogressMatch ? inprogressMatch[1] : "0" // Capture Inprogress
            };
        });
        
        if (stats.cgpa !== "0.00") {
            await StudentStats.findOneAndUpdate({}, { ...stats, lastUpdated: new Date() }, { upsert: true });
            console.log("✅ Stats Updated: Inprogress Cr =", stats.inprogressCr);
        }
      } catch(e) {
          console.log("⚠️ Stats scrape error:", e.message);
      }

      console.log("🏁 FULL SYNC COMPLETE!");

  } catch (error) {
      console.error("❌ ERROR:", error.message);
      throw error; 
  } finally {
      if (browser) await browser.close();
      isRobotBusy = false;
  }
};

module.exports = runScraper;