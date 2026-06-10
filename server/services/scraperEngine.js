const cheerio = require('cheerio');
const { parseUCPDate } = require('../utils/dateParser');

const isValidCourseCode = (code) => {
    if (!code) return false;
    const c = code.trim();
    if (c.toLowerCase().includes('credit') || c.toLowerCase().includes('hour')) return false;
    if (c.length < 2 || c.length > 30) return false;
    return /^[a-zA-Z0-9\s-]+$/.test(c);
};

const parseSemesterFromCourseCode = (courseCode) => {
    if (!courseCode) return null;
    const parts = courseCode.trim().split('-');
    for (const part of parts) {
        const cleanPart = part.trim();
        const match = cleanPart.match(/^([sSfFuU])(\d{2})$/);
        if (match) {
            const seasonChar = match[1].toLowerCase();
            const year = match[2];
            let season = '';
            if (seasonChar === 's') season = 'spring';
            else if (seasonChar === 'f') season = 'fall';
            else if (seasonChar === 'u') season = 'summer';
            if (season) return `${season} ${year}`;
        }
    }
    return null;
};


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

/**
 * Predicts the current semester code based on date.
 * Spring: Feb end (Feb 20) to Jul start (Jul 10)
 * Summer: Jul End (Jul 11) to Sep start (Sep 20)
 * Fall: Sep End (Sep 21) to Feb start (Feb 19)
 */
function getCurrentSemesterCode() {
    const now = new Date();
    const month = now.getMonth(); // 0 = Jan, 11 = Dec
    const date = now.getDate();
    const year = now.getFullYear();
    const shortYear = year.toString().slice(-2); // e.g. "26"

    let season = '';
    let semesterYear = shortYear;

    // Spring: Feb 20 (month 1, day 20) to Jul 10 (month 6, day 10)
    if ((month === 1 && date >= 20) || (month > 1 && month < 6) || (month === 6 && date <= 10)) {
        season = 'spring';
    } 
    // Summer: Jul 11 (month 6, day 11) to Sep 20 (month 8, day 20)
    else if ((month === 6 && date >= 11) || (month === 7) || (month === 8 && date <= 20)) {
        season = 'summer';
    } 
    // Fall: Sep 21 (month 8, day 21) to Feb 19 (month 1, day 19)
    else {
        season = 'fall';
        // If it is Jan (month 0) or early Feb (month 1, date < 20), it belongs to the previous year's Fall semester
        if (month === 0 || (month === 1 && date < 20)) {
            semesterYear = (year - 1).toString().slice(-2);
        }
    }

    return `${season} ${semesterYear}`;
}

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
        const COURSE_CONCURRENCY = 3;

        const patchCourseMap = (rawHtml, url) => {
            const codeRegex = /([A-Z]{2,6}\d{3,4}(?:-[A-Z0-9]+)+)/i;
            const match = rawHtml.match(codeRegex);
            if (match && courseMap.has(url)) {
                let currentData = courseMap.get(url);
                const oldCode = currentData.code;
                const newCode = match[1].trim().toUpperCase();
                if (!oldCode || !oldCode.includes('-')) {
                    currentData.code = newCode;
                    courseMap.set(url, currentData);
                    console.log(`[SERVER_SCRAPER] [patchCourseMap] Patched course code for ${url}: "${oldCode || ''}" -> "${newCode}"`);
                } else if (oldCode !== newCode) {
                    console.warn(`[SERVER_SCRAPER] [patchCourseMap] Warning: Collision detected for ${url}. Current: "${oldCode}", Scraped: "${newCode}". Keeping current.`);
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
                        let candidateCode = subHeading.length ? subHeading.text().trim() : "";
                        if (candidateCode && isValidCourseCode(candidateCode)) {
                            courseCode = candidateCode;
                        } else {
                            const allSubheadings = $enrolled(el).find('span.sub-heading');
                            if (allSubheadings.length > 0) {
                                candidateCode = $enrolled(allSubheadings[0]).text().trim();
                                if (isValidCourseCode(candidateCode)) {
                                    courseCode = candidateCode;
                                }
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
                        if (!name || name.toLowerCase() === 'name' || name.toLowerCase() === 'sr no.' || name.toLowerCase().includes('sr no.')) return;

                        let desc = $doc(tds[2]).text().trim() || $doc(row).find('.rec_submission_description').text().trim() || "";
                        let attachmentLink = $doc(tds[5]).find('a').attr('href') || null;
                        if (attachmentLink && attachmentLink.startsWith('/')) attachmentLink = 'https://horizon.ucp.edu.pk' + attachmentLink;

                        const actionText = $doc(tds[6]).text().toLowerCase();
                        const isSubbed = actionText.includes('submitted') 
                            || actionText.includes('view submission')
                            || actionText.includes('submitted successfully')
                            || ($doc(row).text().toLowerCase()).includes('submitted successfully');

                        tasks.push({ 
                            title: name, 
                            description: desc.replace(/\s+/g, ' ').trim(), 
                            startDate: parseUCPDate($doc(tds[3]).text()), 
                            dueDate: parseUCPDate($doc(tds[4]).text()), 
                            status: isSubbed ? "Submitted" : "Pending", 
                            attachmentUrl: attachmentLink, 
                            submissionUrl: targetUrl 
                        });
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
                        if (tds.length >= 6) {
                            const earnedCH = tds.length >= 5 ? $hDoc(tds[4]).text().trim() : "0";
                            const sgpa = tds.length >= 7 ? $hDoc(tds[6]).text().trim() : "0.00";
                            const cgpa = tds.length >= 8 ? $hDoc(tds[7]).text().trim() : "0.00";
                            currentSemester = { term: $hDoc(tds[0]).text().trim(), earnedCH, sgpa, cgpa, courses: [] };
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

        const scrapeMaterialLinks = async () => {
            return runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const courseId = url.split('/').pop();
                try {
                    const res = await fetchWithTimeout(`https://horizon.ucp.edu.pk/student/course/material/${courseId}`, defaultOptions);
                    const html = await res.text();
                    const $doc = cheerio.load(html);
                    const courseData = courseMap.get(url) || {};

                    // Skip 0 credit hour courses
                    if (courseData.creditHours === 0) {
                        console.log(`[SERVER_SCRAPER] Skipping 0 credit hour course materials: ${courseData.code || courseData.name}`);
                        return null;
                    }

                    const links = [];
                    $doc('table tbody tr').each((_, row) => {
                        const tds = $doc(row).find('td');
                        if (tds.length >= 4) {
                            const fileName = $doc(tds[1]).text().replace(/\s+/g, ' ').trim();
                            const description = $doc(tds[2]).text().replace(/\s+/g, ' ').trim();
                            const href = $doc(tds[3]).find('a').attr('href') || '';
                            if (href && href.includes('/student/class/material/download/')) {
                                const fullUrl = href.startsWith('http')
                                    ? href
                                    : `https://horizon.ucp.edu.pk${href}`;
                                const token = href.split('/').pop() || '';
                                if (fileName) {
                                    links.push({ fileName, description, downloadUrl: fullUrl, token });
                                }
                            }
                        }
                    });

                    return {
                        courseUrl: url,
                        courseName: courseData.name || '',
                        courseCode: courseData.code || '',
                        links
                    };
                } catch (e) {
                    return null;
                }
            });
        };

        // 3. Execute all scrapers
        console.log("[SERVER_SCRAPER] Running all sub-scrapers concurrently...");
        const isFull = (mode === 'FULL');
        const promises = [
            scrapeGrades(), scrapeHistory(), scrapeTimetable(), scrapeAttendance(), scrapeSubmissions(), scrapeAnnouncements(), scrapeDatesheet()
        ];
        if (isFull) {
            promises.push(scrapeMaterialLinks());
        }

        const results = await Promise.allSettled(promises);

        const gradesResult = results[0];
        const historyResult = results[1];
        const timetableResult = results[2];
        const attendanceResult = results[3];
        const submissionsResult = results[4];
        const announcementsResult = results[5];
        const datesheetResult = results[6];
        const materialLinksResult = isFull ? results[7] : { status: 'rejected' };

        let detectedSemester = null;
        for (const info of courseMap.values()) {
            if (info.code) {
                const parsed = parseSemesterFromCourseCode(info.code);
                if (parsed) {
                    detectedSemester = parsed;
                    break;
                }
            }
        }

        const finalPayload = {
            portalId: portalId,
            syncMode: mode === 'FULL' ? 'LOGIN_SYNC' : (mode === 'HIGH' ? 'FORCE_SYNC' : 'AUTO_SYNC'),
            gradesData: gradesResult.status === 'fulfilled' ? gradesResult.value : [],
            historyData: historyResult.status === 'fulfilled' ? historyResult.value.historyData : [],
            statsData: historyResult.status === 'fulfilled' ? historyResult.value.statsData : { cgpa: "0.00", credits: "0", inprogressCr: exactInProgressCr.toString() },
            timetableData: timetableResult.status === 'fulfilled' ? timetableResult.value : [],
            attendanceData: attendanceResult.status === 'fulfilled' ? attendanceResult.value : [],
            submissionsData: submissionsResult.status === 'fulfilled' ? submissionsResult.value : [],
            announcementsData: announcementsResult.status === 'fulfilled' ? announcementsResult.value : [],
            datesheetData: datesheetResult.status === 'fulfilled' ? datesheetResult.value : [],
            materialLinksData: materialLinksResult.status === 'fulfilled' ? (materialLinksResult.value || []).filter(Boolean) : [],
            courseLinks: courseLinks,
            courseMap: Object.fromEntries(courseMap),
            semester: detectedSemester || getCurrentSemesterCode()
        };

        console.log("[SERVER_SCRAPER] Scrape finished successfully.");
        return finalPayload;
    } catch (error) {
        console.error("[SERVER_SCRAPER] Error:", error.message);
        throw error;
    }
};

module.exports = { scrapeServerSide, getCurrentSemesterCode, parseSemesterFromCourseCode };

