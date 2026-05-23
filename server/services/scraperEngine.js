const axios = require('axios');
const cheerio = require('cheerio');

// A helper for concurrent processing
const runWithConcurrency = async (items, limit, worker) => {
    const results = [];
    if (!items || items.length === 0) return results;
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            try {
                const value = await worker(items[currentIndex], currentIndex);
                if (value !== null && value !== undefined) results.push(value);
            } catch (err) {
                console.error("Worker error:", err.message);
            }
        }
    });
    await Promise.all(workers);
    return results;
};

// Main Scrape Function
const scrapeServerSide = async (cookieString, mode = 'HIGH', portalIdFallback = null) => {
    try {
        console.log(`[SERVER_SCRAPER] Starting ${mode} scrape with cookies`);

        const axiosInstance = axios.create({
            baseURL: 'https://horizon.ucp.edu.pk',
            headers: {
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            },
            timeout: 10000,
        });

        let portalId = portalIdFallback;
        const courseLinks = [];
        const courseMap = new Map();
        let exactInProgressCr = 0;
        const COURSE_CONCURRENCY = 4; // Lower concurrency on server to be safe

        // 1. Identity Verification (Dashboard)
        const dashRes = await axiosInstance.get('/student/dashboard', { maxRedirects: 0 });
        if (dashRes.request.res.responseUrl && dashRes.request.res.responseUrl.includes('login')) {
            throw new Error("Session Expired");
        }
        const $dash = cheerio.load(dashRes.data);
        const cleanPageText = $dash('body').text();
        const idRegex = /[a-zA-Z]\d[a-zA-Z]\d{2}[a-zA-Z]+\d{3,4}/i;
        const match = cleanPageText.match(idRegex);
        if (match) {
            portalId = match[0].toUpperCase();
        }

        // 2. Fetch Enrolled Courses
        const enrolledRes = await axiosInstance.get('/student/enrolled/courses');
        const $enrolled = cheerio.load(enrolledRes.data);

        $enrolled('a[href*="/student/course/"]').each((i, el) => {
            let href = $enrolled(el).attr('href');
            if (!href) return;
            if (!href.startsWith('http')) href = 'https://horizon.ucp.edu.pk' + href;
            if (!courseLinks.includes(href)) courseLinks.push(href);

            const nameSpan = $enrolled(el).find('span.md-list-heading');
            if (nameSpan.length) {
                let fullText = nameSpan.text().trim();
                let courseCode = "";
                let courseName = fullText;

                const bracketMatch = fullText.match(/\(([^)]+)\)/);
                if (bracketMatch) {
                    courseCode = bracketMatch[1].trim();
                    courseName = fullText.replace(/\s*\([^)]+\)\s*/, '').trim();
                }

                let credits = 3.0;
                $enrolled(el).find('span.sub-heading').each((_, sh) => {
                    const text = $enrolled(sh).text();
                    if (text.includes('Credits:')) {
                        credits = parseFloat(text.replace('Credits:', '').trim()) || 0;
                    }
                });

                exactInProgressCr += credits;
                courseMap.set(href, { name: courseName, code: courseCode, credits: credits });
            }
        });

        // LIVE DATA SCRAPERS (HIGH PRIORITY)
        const scrapeAttendance = async () => {
            const raw = await runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const courseId = url.split('/').pop();
                const targetUrl = `/student/course/attendance/${courseId}`;
                const res = await axiosInstance.get(targetUrl);
                const $ = cheerio.load(res.data);
                const realName = courseMap.has(url) ? courseMap.get(url).name : "Unknown Course";

                const records = [];
                $('table tbody tr').each((_, row) => {
                    const tds = $(row).find('td');
                    if (tds.length >= 3) {
                        const date = $(tds[1]).text().trim();
                        let statusRaw = $(tds[2]).text().trim().toLowerCase();
                        let status = 'Present';
                        if (statusRaw.includes('absent') || statusRaw.includes('leave')) status = 'Absent';

                        if (date && date.toLowerCase() !== 'date' && !date.includes('Weight')) {
                            records.push({ date, status });
                        }
                    }
                });

                const conducted = records.length;
                const attended = records.filter(r => r.status === 'Present').length;
                if (records.length > 0) {
                    return { courseUrl: url, courseName: realName, summary: { conducted, attended }, records };
                }
                return null;
            });
            return raw.filter(Boolean);
        };

        const scrapeSubmissions = async () => {
            const raw = await runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const courseId = url.split('/').pop();
                const targetUrl = `/student/course/submission/${courseId}`;
                const res = await axiosInstance.get(targetUrl);
                const $ = cheerio.load(res.data);
                const realName = courseMap.has(url) ? courseMap.get(url).name : "Unknown Course";

                const tasks = [];
                $('table.uk-table tbody tr.table-child-row').each((_, row) => {
                    const tds = $(row).find('td');
                    if (tds.length >= 7) {
                        const name = $(tds[1]).text().trim() || $(row).find('.rec_submission_title').text().trim();
                        let desc = $(tds[2]).text().trim() || $(row).find('.rec_submission_description').text().trim();
                        desc = desc.replace(/\s+/g, ' ').trim();
                        const startDate = $(tds[3]).text().trim();
                        const dueDate = $(tds[4]).text().trim();

                        let attachmentLink = $(tds[5]).find('a').attr('href') || null;
                        if (attachmentLink && attachmentLink.startsWith('/')) attachmentLink = 'https://horizon.ucp.edu.pk' + attachmentLink;

                        const actionText = $(tds[6]).text().toLowerCase();
                        let currentStatus = "Pending";
                        if (actionText.includes('submitted') || $(row).text().toLowerCase().includes('submitted successfully')) {
                            currentStatus = "Submitted";
                        }

                        if (name) {
                            tasks.push({ title: name, description: desc, startDate, dueDate, status: currentStatus, attachmentUrl: attachmentLink, submissionUrl: 'https://horizon.ucp.edu.pk' + targetUrl });
                        }
                    }
                });
                if (tasks.length > 0) return { courseUrl: url, courseName: realName, tasks };
                return null;
            });
            return raw.filter(Boolean);
        };

        const scrapeAnnouncements = async () => {
            const raw = await runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const courseId = url.split('/').pop();
                const targetUrl = `/student/course/info/${courseId}`;
                const res = await axiosInstance.get(targetUrl);
                const $ = cheerio.load(res.data);
                const realName = courseMap.has(url) ? courseMap.get(url).name : "Unknown Course";

                const news = [];
                $('table tbody tr').each((_, row) => {
                    const tds = $(row).find('td');
                    if (tds.length >= 4) {
                        const subject = $(tds[1]).text().trim();
                        const date = $(tds[2]).text().trim();
                        const desc = $(tds[3]).text().replace(/\s+/g, ' ').trim();
                        if (subject && subject.toLowerCase() !== 'subject') {
                            news.push({ subject, date, description: desc });
                        }
                    }
                });
                if (news.length > 0) return { courseUrl: url, courseName: realName, news };
                return null;
            });
            return raw.filter(Boolean);
        };

        const scrapeGrades = async () => {
            return runWithConcurrency(courseLinks, COURSE_CONCURRENCY, async (url) => {
                const res = await axiosInstance.get(url);
                const $ = cheerio.load(res.data);
                const realName = courseMap.has(url) ? courseMap.get(url).name : "Unknown Course";
                const results = [];

                $('tr.table-parent-row').each((_, row) => {
                    const nameAnchor = $(row).find('a.toggle-childrens');
                    let summaryName = "Unknown";
                    let weightValue = "";

                    if (nameAnchor.length) {
                        let rawText = "";
                        nameAnchor[0].childNodes.forEach(node => { if (node.nodeType === 3) rawText += node.nodeValue; });
                        summaryName = rawText.replace(/\s+/g, ' ').trim() || "Unknown";
                        const badge = nameAnchor.find('.uk-badge');
                        if (badge.length) weightValue = badge.text().replace(/\s+/g, '').trim();
                    }

                    const tds = $(row).find('td');
                    let summaryPercentage = tds.length >= 2 ? $(tds[1]).text().trim() : "0";

                    let childDetails = [];
                    let nextSibling = $(row).next();
                    while (nextSibling.length && !nextSibling.hasClass('table-parent-row')) {
                        const childTds = nextSibling.find('td');
                        if (childTds.length >= 5) {
                            childDetails.push({
                                name: $(childTds[0]).text().trim(),
                                maxMarks: $(childTds[1]).text().trim(),
                                obtainedMarks: $(childTds[2]).text().trim(),
                                classAverage: $(childTds[3]).text().trim(),
                                percentage: $(childTds[4]).text().trim()
                            });
                        }
                        nextSibling = nextSibling.next();
                    }
                    results.push({ name: summaryName, weight: weightValue, percentage: summaryPercentage, details: childDetails });
                });

                let totalPercentage = "0";
                $('span.uk-badge').each((_, badge) => {
                    if ($(badge).text().includes('/ 100')) {
                        totalPercentage = $(badge).text().split('/')[0].trim();
                        return false; // break loop
                    }
                });

                return { courseUrl: url, courseName: realName, assessments: results, totalPercentage };
            });
        };

        // STATIC DATA SCRAPERS (FULL PRIORITY)
        const scrapeHistory = async () => {
            const historyData = [];
            let statsData = { cgpa: "0.00", credits: "0", inprogressCr: exactInProgressCr.toString() };
            try {
                const res = await axiosInstance.get('/student/results');
                const $ = cheerio.load(res.data);
                let currentSemester = null;

                $('table tbody tr').each((_, row) => {
                    if ($(row).hasClass('table-parent-row')) {
                        const tds = $(row).find('td');
                        if (tds.length >= 8) {
                            currentSemester = {
                                term: $(tds[0]).text().trim(),
                                earnedCH: $(tds[4]).text().trim(),
                                sgpa: $(tds[6]).text().trim(),
                                cgpa: $(tds[7]).text().trim(),
                                courses: []
                            };
                            historyData.push(currentSemester);
                        }
                    } else if ($(row).hasClass('table-child-row') && currentSemester) {
                        const tds = $(row).find('td');
                        if (tds.length >= 4) {
                            currentSemester.courses.push({
                                name: $(tds[0]).text().trim(),
                                creditHours: $(tds[1]).text().trim(),
                                gradePoints: $(tds[2]).text().trim(),
                                finalGrade: $(tds[3]).text().trim()
                            });
                        }
                    }
                });

                if (historyData.length > 0) {
                    const latestSem = historyData[historyData.length - 1];
                    const totalCredits = historyData.reduce((acc, sem) => acc + (parseFloat(sem.earnedCH) || 0), 0);
                    statsData.cgpa = latestSem.cgpa;
                    statsData.credits = totalCredits.toString();
                }
            } catch (historyError) { }
            return { historyData, statsData };
        };

        const scrapeTimetable = async () => {
            let timetableData = [];
            const colorPalette = ['bg-teal-500/80', 'bg-emerald-600/80', 'bg-orange-400/90', 'bg-slate-500/90', 'bg-blue-500/80', 'bg-indigo-500/80', 'bg-pink-500/80'];
            try {
                const res = await axiosInstance.get('/student/class/schedule');
                const $ = cheerio.load(res.data);
                let classIdCounter = 1;

                $('a[data-start][data-end]').each((_, el) => {
                    const startTime = $(el).attr('data-start');
                    const endTime = $(el).attr('data-end');
                    const instructor = $(el).find('em').text().trim() || 'Unknown Instructor';
                    const spans = $(el).find('span');

                    let scrapedName = spans.length > 0 ? $(spans[0]).text().trim() : 'Unknown Course';
                    let room = spans.length > 2 ? $(spans[2]).text().trim() : 'Unknown Room';
                    room = room.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();

                    let cleanScrapedName = scrapedName.replace(/\.{2,}/g, '').trim().toLowerCase();
                    let resolvedName = scrapedName.replace(/\.{2,}/g, '').trim();
                    let matchedCode = "";
                    const isLabSession = room.toLowerCase().includes('(lab)');

                    let bestMatch = resolvedName;
                    let foundPartialMatch = false;

                    for (const [url, data] of courseMap.entries()) {
                        const exactFullNameLower = data.name.toLowerCase();
                        if (exactFullNameLower.startsWith(cleanScrapedName) || cleanScrapedName.startsWith(exactFullNameLower)) {
                            const isLabCourse = exactFullNameLower.includes('lab') || exactFullNameLower.includes('laboratory');
                            if (isLabSession === isLabCourse) {
                                bestMatch = data.name; matchedCode = data.code; break;
                            } else if (!foundPartialMatch) {
                                bestMatch = data.name; matchedCode = data.code; foundPartialMatch = true;
                            }
                        }
                    }

                    let day = 'Unknown';
                    const parentGroup = $(el).closest('.cd-schedule__group');
                    if (parentGroup.length) {
                        const dayHeader = parentGroup.find('.top-info span, .cd-schedule__top-info span').first();
                        day = dayHeader.length ? dayHeader.text().trim() : (parentGroup.attr('data-date') || parentGroup.attr('id') || 'Unknown');
                    }

                    timetableData.push({ id: classIdCounter++, day, startTime, endTime, courseName: bestMatch, courseCode: matchedCode, instructor, room, color: colorPalette[bestMatch.length % colorPalette.length] });
                });
            } catch (ttError) { }
            return timetableData;
        };

        // Execution
        let attendanceData = [], submissionsData = [], announcementsData = [], gradesData = [];
        let historyData = [], statsData = { cgpa: "0.00", credits: "0", inprogressCr: exactInProgressCr.toString() }, timetableData = [];

        // In HIGH mode, just scrape live updates and grades. In FULL, scrape history/timetable too.
        [attendanceData, submissionsData, announcementsData, gradesData] = await Promise.all([
            scrapeAttendance(),
            scrapeSubmissions(),
            scrapeAnnouncements(),
            scrapeGrades()
        ]);

        if (mode === 'FULL') {
            const hRes = await scrapeHistory();
            historyData = hRes.historyData;
            statsData = hRes.statsData;
            timetableData = await scrapeTimetable();
        }

        const courseMapObj = Object.fromEntries(courseMap);

        return {
            portalId,
            gradesData,
            historyData,
            statsData,
            timetableData,
            attendanceData,
            submissionsData,
            announcementsData,
            courseLinks,
            courseMap: courseMapObj
        };
    } catch (error) {
        console.error("[SERVER_SCRAPER] Error:", error.message);
        throw error;
    }
};

module.exports = { scrapeServerSide };
