const cheerio = require('cheerio');

// --- Bulletproof Helper: Prevents infinite hanging on dead university servers ---
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 15000 } = options; // 15 second strict timeout
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// Concurrency helper
const runWithConcurrency = async (items, limit, worker) => {
    const results = [];
    if (!items || items.length === 0) return results;
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            try {
                const value = await worker(items[currentIndex]);
                if (value !== null && value !== undefined) results.push(value);
            } catch (err) {
                console.warn(`⚠️ Concurrency worker failed for item at index ${currentIndex}`, err);
            }
        }
    });
    await Promise.all(workers);
    return results;
};

// Main Scrape Function
const scrapeServerSide = async (cookieString, mode = 'HIGH', portalIdFallback = null) => {
    try {
        console.log(`[SERVER_SCRAPER] Starting ${mode} scrape with cookies for portalId: ${portalIdFallback || 'UNKNOWN'}`);

        const defaultOptions = {
            headers: {
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            timeout: 15000
        };

        const courseMap = new Map();
        let exactInProgressCr = 0;
        const COURSE_CONCURRENCY = 6;

        const patchCourseMap = (rawHtml, url) => {
            const codeRegex = /([A-Z]{2,6}\d{3,4}(?:-[A-Z0-9]+)+)/i;
            const match = rawHtml.match(codeRegex);
            if (match && courseMap.has(url)) {
                let currentData = courseMap.get(url);
                if (!currentData.code || !currentData.code.includes('-')) {
                    currentData.code = match[1].trim().toUpperCase();
                    courseMap.set(url, currentData);
                }
            }
        };

        let portalId = portalIdFallback;
        const courseLinks = [];

        console.log("[SERVER_SCRAPER] Fetching dashboard...");
        const dashRes = await fetchWithTimeout('https://horizon.ucp.edu.pk/student/dashboard', defaultOptions);
        console.log("[SERVER_SCRAPER] Dashboard fetched, status:", dashRes.status);
        
        if (dashRes.url && dashRes.url.toLowerCase().includes('login')) {
            throw new Error("Session Expired");
        }

        const dashHtml = await dashRes.text();
        const $dash = cheerio.load(dashHtml);
        const idRegex = /[a-zA-Z]\d[a-zA-Z]\d{2}[a-zA-Z]+\d{3,4}/i;
        const match = $dash('body').text().match(idRegex);
        if (match) {
            portalId = match[0].toUpperCase();
        }

        console.log("[SERVER_SCRAPER] Fetching enrolled courses...");
        // 1. Fetch Clean Enrolled Courses & Calculate Accurate Credits
        const enrolledRes = await fetchWithTimeout('https://horizon.ucp.edu.pk/student/enrolled/courses', defaultOptions);
        console.log("[SERVER_SCRAPER] Enrolled courses fetched, status:", enrolledRes.status);
        const enrolledHtml = await enrolledRes.text();
        const $enrolled = cheerio.load(enrolledHtml);

        $enrolled('a[href*="/student/course/"]').each((i, el) => {
            let href = $enrolled(el).attr('href');
            if (!href) return;
            if (!href.startsWith('http')) href = 'https://horizon.ucp.edu.pk' + href;
            if (!courseLinks.includes(href)) courseLinks.push(href);

            const nameSpan = $enrolled(el).find('span.md-list-heading');
            if (nameSpan.length) {
                let fullText = nameSpan.text().trim();
                fullText = fullText.replace(/\s+/g, ' ');
                let courseCode = "", courseName = fullText;

                const bracketMatch = fullText.match(/\(([^)]+)\)/);
                if (bracketMatch) {
                    courseCode = bracketMatch[1].trim();
                    courseName = fullText.replace(/\s*\([^)]+\)\s*/, '').trim();
                } else {
                    const codeRegex = /^([a-zA-Z]{2,5}[-\s]?\d{3,4})\s*[-:]?\s*(.*)$/;
                    const codeMatch = fullText.match(codeRegex);
                    if (codeMatch) {
                        courseCode = codeMatch[1].trim().toUpperCase();
                        courseName = codeMatch[2].trim();
                    } else {
                        const subHeading = $enrolled(el).find('span.sub-heading[style*="inline-block"]');
                        if (subHeading.length) {
                            courseCode = subHeading.text().trim();
                        } else {
                            const allSubheadings = $enrolled(el).find('span.sub-heading');
                            if (allSubheadings.length > 0 && !$enrolled(allSubheadings[0]).text().toLowerCase().includes('credit')) {
                                courseCode = $enrolled(allSubheadings[0]).text().trim();
                            }
                        }
                    }
                }

                let credits = 3.0;
                
                const subHeadings = $enrolled(el).find('span.sub-heading');
                subHeadings.each((_, sh) => {
                    const bTag = $enrolled(sh).find('b');
                    if (bTag.length && bTag.text().toLowerCase().includes('credit')) {
                        const rawNumText = $enrolled(sh).text().replace(bTag.text(), '').trim();
                        const parsed = parseFloat(rawNumText);
                        if (!isNaN(parsed)) {
                            credits = parsed;
                            return false; // break the loop
                        }
                    }
                });

                exactInProgressCr += credits;
                courseMap.set(href, { name: courseName, code: courseCode, creditHours: credits });
            }
        });

        console.log("[SERVER_SCRAPER] Starting high priority scrapers...");

        // 2. Define Granular Scrapers
        const scrapeGrades = async () => {
            return runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const courseId = url.split('/').pop();
                const response = await fetchWithTimeout(`https://horizon.ucp.edu.pk/student/course/gradebook/${courseId}`, defaultOptions);
                const htmlText = await response.text();
                patchCourseMap(htmlText, url);

                const $doc = cheerio.load(htmlText);
                const realName = courseMap.has(url) ? courseMap.get(url).name : "Unknown Course";
                const results = [];

                $doc('tr.table-parent-row').each((i, row) => {
                    try {
                        const nameAnchor = $doc(row).find('a.toggle-childrens');
                        let summaryName = "Unknown", weightValue = "";

                        if (nameAnchor.length) {
                            let rawText = "";
                            nameAnchor.contents().each((_, node) => {
                                if (node.type === 'text') rawText += node.data;
                            });
                            summaryName = rawText.replace(/\s+/g, ' ').trim() || "Unknown";
                            const badge = nameAnchor.find('.uk-badge');
                            if (badge.length) weightValue = badge.text().replace(/\s+/g, '').trim();
                        }

                        const tds = $doc(row).find('td');
                        let summaryPercentage = tds.length >= 2 ? $doc(tds[1]).text().trim() : "0";

                        let childDetails = [];
                        let nextSibling = $doc(row).next();
                        while (nextSibling.length && !nextSibling.hasClass('table-parent-row')) {
                            const childTds = nextSibling.find('td');
                            if (childTds.length >= 5) {
                                childDetails.push({ 
                                    name: $doc(childTds[0]).text().trim(), 
                                    maxMarks: $doc(childTds[1]).text().trim() || "0", 
                                    obtainedMarks: $doc(childTds[2]).text().trim() || "0", 
                                    classAverage: $doc(childTds[3]).text().trim() || "0", 
                                    percentage: $doc(childTds[4]).text().trim() || "0" 
                                });
                            }
                            nextSibling = nextSibling.next();
                        }
                        results.push({ name: summaryName, weight: weightValue, percentage: summaryPercentage, details: childDetails });
                    } catch (e) { } 
                });

                const badges = $doc('span.uk-badge');
                let totalPercentage = "0";
                badges.each((i, el) => {
                    if ($doc(el).text().includes('/ 100')) {
                        totalPercentage = $doc(el).text().split('/')[0].trim();
                        return false;
                    }
                });
                return { courseUrl: url, courseName: realName, assessments: results, totalPercentage: totalPercentage };
            });
        };

        const scrapeAttendance = async () => {
            return runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const courseId = url.split('/').pop();
                const response = await fetchWithTimeout(`https://horizon.ucp.edu.pk/student/course/attendance/${courseId}`, defaultOptions);
                const html = await response.text();
                patchCourseMap(html, url);

                const $doc = cheerio.load(html);
                const realName = courseMap.has(url) ? courseMap.get(url).name : "Unknown Course";
                const records = [];

                $doc('table tbody tr').each((i, row) => {
                    const tds = $doc(row).find('td');
                    if (tds.length >= 3) {
                        const date = $doc(tds[1]).text().trim();
                        let statusRaw = $doc(tds[2]).text().trim().toLowerCase();
                        let status = 'Present';
                        if (statusRaw.includes('absent') || statusRaw.includes('leave')) status = 'Absent';

                        if (date && date.toLowerCase() !== 'date' && !date.includes('Weight')) {
                            records.push({ date, status });
                        }
                    }
                });

                return { courseUrl: url, courseName: realName, summary: { conducted: records.length, attended: records.filter(r => r.status === 'Present').length }, records };
            });
        };

        const scrapeAnnouncements = async () => {
            return runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const courseId = url.split('/').pop();
                const response = await fetchWithTimeout(`https://horizon.ucp.edu.pk/student/course/info/${courseId}`, defaultOptions);
                const html = await response.text();
                patchCourseMap(html, url);

                const $doc = cheerio.load(html);
                const realName = courseMap.has(url) ? courseMap.get(url).name : "Unknown Course";
                const news = [];

                $doc('table tbody tr').each((i, row) => {
                    const tds = $doc(row).find('td');
                    if (tds.length >= 4) {
                        const subject = $doc(tds[1]).text().trim();
                        if (subject && subject.toLowerCase() !== 'subject') {
                            news.push({ subject, date: $doc(tds[2]).text().trim(), description: $doc(tds[3]).text().replace(/\s+/g, ' ').trim() });
                        }
                    }
                });
                return news.length > 0 ? { courseUrl: url, courseName: realName, news } : null;
            });
        };

        const scrapeSubmissions = async () => {
            return runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const courseId = url.split('/').pop();
                const targetUrl = `https://horizon.ucp.edu.pk/student/course/submission/${courseId}`;
                const response = await fetchWithTimeout(targetUrl, defaultOptions);
                const html = await response.text();
                patchCourseMap(html, url);

                const $doc = cheerio.load(html);
                const realName = courseMap.has(url) ? courseMap.get(url).name : "Unknown Course";
                const tasks = [];

                $doc('table.uk-table tbody tr.table-child-row').each((i, row) => {
                    const tds = $doc(row).find('td');
                    if (tds.length >= 7) {
                        const name = $doc(tds[1]).text().trim() || $doc(row).find('.rec_submission_title').text().trim();
                        if (name) {
                            let desc = $doc(tds[2]).text().trim() || $doc(row).find('.rec_submission_description').text().trim() || "";
                            let attachmentLink = $doc(tds[5]).find('a').attr('href') || null;
                            if (attachmentLink && attachmentLink.startsWith('/')) attachmentLink = 'https://horizon.ucp.edu.pk' + attachmentLink;

                            const actionText = $doc(tds[6]).text().toLowerCase();
                            const isSubbed = actionText.includes('submitted') || ($doc(row).text().toLowerCase()).includes('submitted successfully');

                            tasks.push({ title: name, description: desc.replace(/\s+/g, ' ').trim(), startDate: $doc(tds[3]).text().trim(), dueDate: $doc(tds[4]).text().trim(), status: isSubbed ? "Submitted" : "Pending", attachmentUrl: attachmentLink, submissionUrl: targetUrl });
                        }
                    }
                });
                return tasks.length > 0 ? { courseUrl: url, courseName: realName, tasks } : null;
            });
        };

        const scrapeHistory = async () => {
            const historyData = [];
            let statsData = { cgpa: "0.00", credits: "0", inprogressCr: exactInProgressCr.toString() };
            try {
                const historyResponse = await fetchWithTimeout('https://horizon.ucp.edu.pk/student/results', defaultOptions);
                const historyHtml = await historyResponse.text();
                const $hDoc = cheerio.load(historyHtml);
                let currentSemester = null;

                $hDoc('table tbody tr').each((i, row) => {
                    if ($hDoc(row).hasClass('table-parent-row')) {
                        const tds = $hDoc(row).find('td');
                        if (tds.length >= 8) {
                            currentSemester = { term: $hDoc(tds[0]).text().trim(), earnedCH: $hDoc(tds[4]).text().trim(), sgpa: $hDoc(tds[6]).text().trim(), cgpa: $hDoc(tds[7]).text().trim(), courses: [] };
                            historyData.push(currentSemester);
                        }
                    } else if ($hDoc(row).hasClass('table-child-row') && currentSemester) {
                        const tds = $hDoc(row).find('td');
                        if (tds.length >= 4 && $hDoc(tds[0]).text().trim() !== "Course") {
                            currentSemester.courses.push({ name: $hDoc(tds[0]).text().trim(), creditHours: $hDoc(tds[1]).text().trim(), gradePoints: $hDoc(tds[2]).text().trim(), finalGrade: $hDoc(tds[3]).text().trim() });
                        }
                    }
                });
                if (historyData.length > 0) {
                    const latestSem = historyData[historyData.length - 1];
                    statsData.cgpa = latestSem.cgpa || "0.00";
                    statsData.credits = historyData.reduce((acc, sem) => acc + (parseFloat(sem.earnedCH) || 0), 0).toString();
                }
            } catch (e) { }
            return { historyData, statsData };
        };

        const scrapeTimetable = async () => {
            let timetableData = [];
            const colorPalette = ['bg-teal-500/80', 'bg-emerald-600/80', 'bg-orange-400/90', 'bg-slate-500/90', 'bg-blue-500/80', 'bg-indigo-500/80', 'bg-pink-500/80'];
            
            try {
                const ttResponse = await fetchWithTimeout('https://horizon.ucp.edu.pk/student/class/schedule', defaultOptions);
                const ttHtml = await ttResponse.text();
                const $ttDoc = cheerio.load(ttHtml);
                let classIdCounter = 1;

                const allClassBlocks = $ttDoc('a[data-start][data-end]').toArray();
                const instructorMap = new Map();

                // PASS 1: Find actual instructors from regular classes
                for (const el of allClassBlocks) {
                    const rawText = ($ttDoc(el).text() || "").replace(/\s+/g, ' ').trim();
                    const rawTextLower = rawText.toLowerCase();

                    if (!rawTextLower.includes('makeup')) {
                        const em = $ttDoc(el).find('em');
                        const instructor = em.length ? em.text().trim() : null;

                        if (instructor && !instructor.toLowerCase().includes('unknown')) {
                            for (const [url, data] of courseMap.entries()) {
                                const cleanMapName = data.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
                                const cleanMapCode = data.code.toLowerCase();
                                if (rawTextLower.includes(cleanMapName) || rawTextLower.includes(cleanMapCode)) {
                                    instructorMap.set(data.code, instructor);
                                    break;
                                }
                            }
                        }
                    }
                }

                // PASS 2: Parse Timetable blocks & use mapped instructors for Makeup classes
                allClassBlocks.forEach((el) => {
                    const rawText = ($ttDoc(el).text() || "").replace(/\s+/g, ' ').trim();
                    const rawTextLower = rawText.toLowerCase();
                    
                    let matchedCourseData = null;
                    const isMakeup = rawTextLower.includes('makeup');
                    const isLabSession = rawTextLower.includes('(lab)') || rawTextLower.includes('lab ');

                    for (const [url, data] of courseMap.entries()) {
                        const cleanMapName = data.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
                        const cleanMapCode = data.code.toLowerCase();
                        
                        if (rawTextLower.includes(cleanMapName) || rawTextLower.includes(cleanMapCode)) {
                            const isLabCourse = cleanMapName.includes('lab') || cleanMapName.includes('laboratory');
                            if (isLabSession === isLabCourse) {
                                matchedCourseData = data;
                                break;
                            } else if (!matchedCourseData) {
                                matchedCourseData = data; 
                            }
                        }
                    }

                    if (!matchedCourseData) return; 

                    let instructor = "Unknown Instructor";
                    if (isMakeup) {
                        instructor = instructorMap.get(matchedCourseData.code) || "Unknown Instructor";
                    } else {
                        const em = $ttDoc(el).find('em');
                        instructor = em.length ? em.text().replace(/\s+/g, ' ').trim() : "Unknown Instructor";
                    }

                    let room = 'TBA';
                    const roomMatch = rawText.match(/(?:Room[:\s]*|)(\b[A-Z]-[A-Za-z0-9]+\b|\bLab[\s-]?\d+\b)/i);
                    if (roomMatch) {
                        room = roomMatch[1].toUpperCase();
                    } else {
                        const spans = $ttDoc(el).find('span');
                        if (spans.length > 0) {
                            room = $ttDoc(spans[spans.length - 1]).text()
                                .replace(/room\s*:/i, '')
                                .replace(/\s+/g, ' ')
                                .replace(/\(\s+/g, '(')
                                .replace(/\s+\)/g, ')')
                                .trim() || 'TBA';
                        }
                    }

                    const parentGroup = $ttDoc(el).closest('.cd-schedule__group');
                    const dayHeader = parentGroup.find('.top-info span, .cd-schedule__top-info span');
                    const day = dayHeader.length ? dayHeader.text().replace(/\s+/g, ' ').trim() : (parentGroup.attr('data-date') || parentGroup.attr('id') || 'Unknown');

                    timetableData.push({ 
                        id: classIdCounter++, 
                        day: day, 
                        startTime: $ttDoc(el).attr('data-start') || "", 
                        endTime: $ttDoc(el).attr('data-end') || "", 
                        courseName: matchedCourseData.name,
                        courseCode: matchedCourseData.code, 
                        instructor: instructor,
                        room: room, 
                        color: colorPalette[matchedCourseData.name.length % colorPalette.length],
                        isMakeup: isMakeup
                    });
                });
            } catch (e) { 
                console.error("🔥 Timetable scrape failed:", e);
            }
            return timetableData;
        };

        const scrapeDatesheet = async () => {
            const datesheetData = [];
            try {
                const dsRes = await fetchWithTimeout('https://horizon.ucp.edu.pk/student/exam/datesheet', defaultOptions);
                const dsHtml = await dsRes.text();
                const $dsDoc = cheerio.load(dsHtml);
                const pageText = $dsDoc('body').text().toLowerCase();

                if (!pageText.includes("no exam") && !pageText.includes("no exams scheduled")) {
                    $dsDoc('table tbody tr').each((i, row) => {
                        const tds = $dsDoc(row).find('td');
                        if (tds.length >= 6 && !$dsDoc(tds[0]).attr('colspan')) {
                            const courseName = $dsDoc(tds[1]).text().trim();
                            const date = $dsDoc(tds[3]).text().trim();
                            if (courseName && date) {
                                datesheetData.push({ courseName, instructor: $dsDoc(tds[2]).text().trim() || "", date, time: $dsDoc(tds[4]).text().trim() || "", venue: $dsDoc(tds[5]).text().trim() || "TBA" });
                            }
                        }
                    });
                }
            } catch (e) { }
            return datesheetData;
        };

        // 3. Execute all scrapers
        console.log("[SERVER_SCRAPER] Running all sub-scrapers concurrently...");
        const [gradesResult, historyResult, timetableResult, attendanceResult, submissionsResult, announcementsResult, datesheetResult] = await Promise.allSettled([
            scrapeGrades(), scrapeHistory(), scrapeTimetable(), scrapeAttendance(), scrapeSubmissions(), scrapeAnnouncements(), scrapeDatesheet()
        ]);

        const finalPayload = {
            portalId: portalId,
            syncMode: 'AUTO_SYNC',
            gradesData: gradesResult.status === 'fulfilled' ? gradesResult.value : [],
            historyData: historyResult.status === 'fulfilled' ? historyResult.value.historyData : [],
            statsData: historyResult.status === 'fulfilled' ? historyResult.value.statsData : { cgpa: "0.00", credits: "0", inprogressCr: exactInProgressCr.toString() },
            timetableData: timetableResult.status === 'fulfilled' ? timetableResult.value : [],
            attendanceData: attendanceResult.status === 'fulfilled' ? attendanceResult.value : [],
            submissionsData: submissionsResult.status === 'fulfilled' ? submissionsResult.value : [],
            announcementsData: announcementsResult.status === 'fulfilled' ? announcementsResult.value : [],
            datesheetData: datesheetResult.status === 'fulfilled' ? datesheetResult.value : [],
            courseLinks: courseLinks,
            courseMap: Object.fromEntries(courseMap)
        };

        console.log("[SERVER_SCRAPER] Scrape finished successfully.");
        return finalPayload;
    } catch (error) {
        console.error("[SERVER_SCRAPER] Error:", error.message);
        throw error;
    }
};

module.exports = { scrapeServerSide };
