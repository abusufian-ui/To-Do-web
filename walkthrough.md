# Walkthrough of Web Portal Onboarding Flow, Course Material, Session Security, and Unified Grading

We have successfully implemented and verified the **Premium Web Portal Onboarding Flow**, alongside previous fixes for Course Material Sync, Session Security, Course Metadata, and the **Unified Grading and CGPA Projection System**.

---

## 🎓 Unified Grading & CGPA Projection System (New)

We have consolidated the grading and CGPA prediction logic across all three clients (Web, Chrome Extension, and Mobile App) by making the server the single source of truth. This prevents CGPA prediction drift and ensures consistent grading logic.

### 1. Canonical Grading Service
* **New File**: [grading.js](file:///c:/Users/ranas/Documents/To-Do-web/server/services/grading.js)
* **What was implemented**:
  * `getAbsoluteGrade(pct)`: Returns the absolute grade and points based on standard percentage bands.
  * `getSmartCurveGrade(myScore, classAverage)`: Evaluates a student's score relative to the class average using the smart curve formula.
  * `calculateTrueScore(assessments, bestOfConfigs)`: Calculates the overall weighted score for a course, dynamically applying "Best-N" caps per category (Quizzes, Assignments, etc.) by sorting by performance (`obtained/max`) and selecting the top N.
  * `calculateClassAverageScore(assessments, bestOfConfigs)`: Calculates the class average for a course, dynamically applying the same "Best-N" selection criteria to the class average marks of the selected assessments.
  * `getProjectedGradeForCourse(grade, mode, bestOfConfigs)`: Direct projection mapping. Relative grading now strictly uses the class-average curve (percentile-based grade assignment has been dropped).
  * `computeProjection({ grades, courses, stats, mode, bestOfConfigs })`: Canonical CGPA projection calculation:
    * `creditHours`: From `Course.creditHours` (defaults to **3** if missing or 0).
    * `completedCr`: From `StudentStats.credits`.
    * `inProgressCr`: From `StudentStats.inprogressCr`, falling back to the sum of in-progress course credit hours if 0 or absent.
    * `currentCGPA`: From `StudentStats.cgpa`.
    * Outputs the predicted CGPA (rounded to 2 decimal places as a string, plus raw number).

### 2. Consolidated Leaderboard & New Projection Endpoint
* **File Modified**: [index.js](file:///c:/Users/ranas/Documents/To-Do-web/server/index.js)
* **What was implemented**:
  * Imported the new grading service.
  * Replaced the local `calculateStudentScore` function to call the canonical `calculateTrueScore`.
  * Factored out a shared `buildCourseLeaderboard` helper. Both the extension leaderboard `/api/extension/leaderboard/:courseCode` and the web leaderboard `/api/course-leaderboard/:courseId` now route through this helper.
  * Changed the relative leaderboard grades from percentile bands to the class-average curve (`getSmartCurveGrade`).
  * Implemented `GET /api/projection?mode=relative|absolute&bestOf=...` to calculate and return the canonical term projection.

### 3. Web Client Integration
* **File Modified**: [GradeBook.js](file:///c:/Users/ranas/Documents/To-Do-web/src/GradeBook.js)
* **What was implemented**:
  * Added states for `projection` and `projectionLoading`.
  * Added a `useEffect` hook to fetch the unified CGPA projection from `/api/projection` whenever the grading mode, best-N configurations, or grades are updated.
  * Replaced the local `projectedCgpa` and `projectedGrade` calculations with the values returned by the server.
  * Simplified the local `getProjectedGradeForCourse` function to serve as a clean, lightweight fallback while loading.

### 4. Chrome Extension Integration
* **Files Modified**: 
  * [Dashboard.tsx](file:///c:/Users/ranas/Documents/myPortal%20Extension/src/features/Dashboard.tsx)
  * [CourseView.tsx](file:///c:/Users/ranas/Documents/myPortal%20Extension/src/features/CourseView.tsx)
* **What was implemented**:
  * **Dashboard**: Added a `useEffect` to fetch the CGPA projection from the server. The local calculation now serves strictly as a temporary placeholder/fallback during sync using the exact canonical default credit hours (`|| 3`) and `inProgressCr` fallback.
  * **CourseView**: Updated the client-side local merge (`combinedLeaderboard`) to compute grades using the class-average curve (`getSmartCurveGrade`) instead of the old percentile bands, ensuring parity with the backend.

### 5. Mobile App Integration
* **Files Modified**:
  * [GradeBookSection.tsx](file:///c:/Users/ranas/Documents/to-do-app/portal-mobile/components/classes/GradeBookSection.tsx)
  * [classes.tsx](file:///c:/Users/ranas/Documents/to-do-app/portal-mobile/app/(tabs)/classes.tsx)
* **What was implemented**:
  * **classes.tsx**: Added states for `projection` and `fetchingProjection`. Implemented `fetchProjection()` which queries the server's new `/projection` endpoint and caches the result locally using `AsyncStorage` (`off_acad_projection`). Passed these props to `GradeBookSection`.
  * **GradeBookSection.tsx**: Ported the exact canonical constants and formulas to the local offline fallback. The UI renders the server-projected CGPA and course grades when online, and falls back to the identical local math when offline.
  * **TypeScript Verification**: All mobile app changes compile successfully with zero errors.

---

## 🎨 Premium Web Portal Onboarding Flow

We rebuilt the Web Portal login flow into an interactive, premium onboarding experience to match modern web aesthetics and support automated account setups.

### 1. Secure Extension-Driven Sync & Password Setup (Case C)
* **What changed**:
  * Added `tempSyncId` to the `User` schema mapping client sessions securely.
  * Added `/api/web/check-sync-status` which polls the backend and issues a short-lived `tempToken` JWT (valid for 10 minutes) upon successful Chrome Extension sync.
  * Created `/api/web/set-password-via-sync` to write passwords using `tempToken` authorization, avoiding standard OTP requirements for unauthenticated users.
  * Modified the Chrome Extension (`ScraperService.ts`) to extract `myportal_sync_id` from the URL parameters/hash and include it in `/api/auth/microsoft-login` sync payloads.
  * Refactored `Login.js` to poll sync status and automatically transition to password setup as soon as the extension completes sync.
* **Security**: Session hijacking is prevented by ensuring only the browser that initiated the onboarding with the unique `tempSyncId` can set the password.

### 2. Chrome Extension Configuration (Admin Panel)
* **What changed**:
  * Implemented `POST /api/admin/settings/chrome-extension-link` to let administrators dynamically configure the Chrome Web Store link.
  * Added a configuration form inside `AdminDashboard.js` (Website Configuration sub-app) to allow editing and saving this link with instant updates.

### 3. High-Fidelity 4-Step Onboarding Preferences Wizard (Case B)
* **What changed**:
  * Developed a beautiful preference wizard inside `Login.js` that triggers for first-time logins or users with incomplete profiles (`showProfilePicToCommunity === null`):
    * **Step 1: Grading Preference**: Selection between Relative and Absolute grading modes (saved to `localStorage` as `gradingPolicyPref`).
    * **Step 2: App Theme**: Configures Light, Dark, or System themes with instant visual updates (saved to `localStorage` and HTML classes).
    * **Step 3: Profile & Privacy**: Toggle community public visibility of profile avatar and upload custom images (makes PUT `/api/user/privacy` and POST `/api/user/profile-pic`).
    * **Step 4: Join Community**: WhatsApp Group community CTA.
  * Updated `GradeBook.js` to initialize the grading mode state directly from `localStorage.getItem('gradingPolicyPref')`.

---

## 🚀 Mobile Scraper Fix & Submission Attachment Backblaze Sync

We fixed the column layout indexing bug in the Mobile App's material scraper, implemented background syncing of submission attachments to Backblaze B2, and added "Teacher File" download buttons to both the Web Portal and Mobile App UIs.

### 1. Mobile App Material Scraper Correction & Chrome Extension Materials Sync
* **Files Modified**: 
  * Mobile App: [scraperEngine.ts](file:///c:/Users/ranas/Documents/to-do-app/portal-mobile/services/scraperEngine.ts)
  * Chrome Extension: [ScraperService.ts](file:///c:/Users/ranas/Documents/myPortal%20Extension/src/services/ScraperService.ts#L868-L921)
* **What changed**: 
  * **Mobile App**: Updated `scrapeMaterialLinks` to inspect table column lengths (4-col vs 5-col layouts). It dynamically resolves the **Description** and **Action** cell indices, ensuring slides, documents, and ZIP files are not skipped when the portal includes an "Upload Date" column.
  * **Chrome Extension**: Added `scrapeMaterialLinks` to `ScraperService.ts` to parse 4-col and 5-col table layouts, resolving absolute and relative material download URLs. The parsed `materialLinksData` is included in the `/api/extension-sync` request body.
* **Result**: Background syncing of course materials now runs symmetrically from both the Chrome Extension and Mobile App, populating Backblaze B2 automatically.

### 2. Submission Model B2 Storage Update
* **File Modified**: [Submission.js](file:///c:/Users/ranas/Documents/To-Do-web/server/models/Submission.js)
* **What changed**: Expanded the Mongoose `tasks` schema elements to store Backblaze B2 metadata (`b2Key`, `fileType`, and `fileSize`).

### 3. Submission Attachment Processor Service
* **New File**: [submissionProcessor.js](file:///c:/Users/ranas/Documents/To-Do-web/server/services/submissionProcessor.js)
* **Behavior**: Defines `processUserSubmissions` which downloads task attachments using portal session cookies, extracts clean filenames from the HTTP `Content-Disposition` header, and uploads the files to B2 under path `submissions/${userId}/${taskId}_${filename}` before saving the metadata to the database.

### 4. Background Sync & Redirect Download API
* **File Modified**: [index.js](file:///c:/Users/ranas/Documents/To-Do-web/server/index.js)
* **Trigger**: Integrated `processUserSubmissions` to run asynchronously whenever a student syncs data via the Chrome Extension or Mobile App.
* **Route**: Implemented `GET /api/submission/download/:submissionId/:taskId` which verifies JWT auth, resolves the task B2 key, and redirects to a temporary pre-signed B2 download URL.

### 5. Web Portal UI Attachment Downloads
* **Files Modified**: [CoursePortalView.js](file:///c:/Users/ranas/Documents/To-Do-web/src/CoursePortalView.js), [CourseSubmissions.js](file:///c:/Users/ranas/Documents/To-Do-web/src/CourseSubmissions.js)
* **What changed**: Maps the parent `submissionId` onto each task and renders a **Teacher File** download button next to the "Submit on Portal" action, routing downloads securely through the backend B2 download redirect API.

### 6. Mobile App UI Attachment Downloads
* **File Modified**: [AccordionSection.tsx](file:///c:/Users/ranas/Documents/to-do-app/portal-mobile/components/classes/AccordionSection.tsx)
* **What changed**: Renders a **Teacher File** download button under task descriptions, triggering React Native's `Linking.openURL` pointing to the B2 redirect API if `b2Key` is populated.

---

## 📚 Course Material Reference Link Mapping & UI Enhancements

When course materials had both an uploaded file and a reference link in the description, the extension's scraper was previously overwriting the file download link with the description's reference link. We resolved this scraper bug and updated the UI to display both items as separate actions.

### 1. Robust Table Layout Scraper
* **File Modified**: [CourseView.tsx](file:///c:/Users/ranas/Documents/myPortal%20Extension/src/features/CourseView.tsx#L1013-L1031)
* **What changed**: The parser now dynamically checks the number of columns in the portal's course materials table (4 columns vs 5 columns) and isolates:
  * The file download URL `link` (scraped directly from the **Action** column cell).
  * The external reference URL `refLink` (scraped directly from the **Description** column cell).
* **Result**: Clicking the "Download" button now strictly downloads the actual uploaded file.

### 2. Premium Horizontal Action Row UI
* **File Modified**: [CourseView.tsx](file:///c:/Users/ranas/Documents/myPortal%20Extension/src/features/CourseView.tsx#L1742-L1762)
* **What changed**: Updated the UI rendering inside `renderMaterial` to arrange the actions side-by-side:
  * If a reference link is present (`item.refLink`), a premium Teal **Reference** button with the `ExternalLink` icon is rendered.
  * The Blue **Download** button is rendered next to it.
* **Aesthetics**: Styled using the modern Teal palette (`text-teal-600 bg-teal-50 hover:bg-teal-600 hover:text-white`), keeping it consistent with the modern look of the extension.

---

## 🏷️ Course Section & Semester Extraction Fixes

Some courses (specifically labs or those imported via timetable data that do not have direct portal URLs) were failing to populate their `section` and `semester` fields, leaving them empty in the database. Consequently, downloaded material files could not be shown to those students.

### 1. Created `parseSemesterAndSectionFromCode` Utility
* **File Modified**: [index.js](file:///c:/Users/ranas/Documents/To-Do-web/server/index.js) (Line 314)
* **What was added**: A helper function that splits the long course code (e.g. `CCE201-S26-BS-SC-F25-CB2`) by dashes (`-`) and:
  * Resolves the **Semester** (e.g., `S26` -> `spring 26`) via `parseSemesterFromCourseCode`.
  * Resolves the **Section** (e.g., `CB2` from the last segment of the code).

### 2. Integrated into Sync Loops
* **File Modified**: [index.js](file:///c:/Users/ranas/Documents/To-Do-web/server/index.js) (Lines 1502 and 1770)
* **What was added**: Integrated the parser helper in both the `clientCourseMap` loop and the `timetableData` loop. Any course created or updated during sync will now always extract and set the correct `section` and `semester` fields from the long course code.

### 3. Immediate Database Migration Executed
* **Migration Script**: `scratch/migrate_courses.js`
* **Result**: We successfully connected to the database and executed an inline migration that parsed codes and fixed **46 existing university courses** that were missing `section` and/or `semester` fields.

---

## 🛠️ Network Connectivity & Rate Limiting Fixes

To resolve the connection lockouts, institutional NAT sharing limits, and server bottlenecks, we made the following changes:

### 1. Enabled Express `trust proxy`
* **File Modified**: [index.js](file:///c:/Users/ranas/Documents/To-Do-web/server/index.js) (Line 319)
* **What changed**: Added `app.set('trust proxy', 1);` immediately after initializing Express.
* **Why**: This instructs Express to read the real client's IP from the `X-Forwarded-For` header populated by Nginx, rather than treating all incoming requests as coming from local loopback (`127.0.0.1`). This fixes the bug where the entire student body globally shared a single rate limit.

### 2. Elevated Auth Rate Limit Threshold
* **File Modified**: [index.js](file:///c:/Users/ranas/Documents/To-Do-web/server/index.js) (Line 390)
* **What changed**: Increased `max` from `30` to `300` in the `authLimiter`.
* **Why**: On a campus network, multiple students connect via a shared public IP using NAT. Elevating this threshold to `300` attempts per 15 minutes allows campus users to authenticate concurrently without triggering false-positive `429 Too Many Requests` blocks.

---

## 🛡️ Active Device & Login Session Security Management

We have implemented a comprehensive security system that allows users to manage active logins and devices, allows admins to monitor sessions, and triggers email login alerts on untrusted IP login attempts.

### 1. MongoDB Device Session Model
* **New File**: [DeviceSession.js](file:///c:/Users/ranas/Documents/To-Do-web/server/models/DeviceSession.js)
* **What was implemented**: A schema tracking active sessions per user using `userId`, `tokenSignature` (the cryptographic signature of the JWT token to uniquely identify the browser/device session), `deviceType`, `browser`, `os`, `ipAddress`, `location`, `userAgent`, `lastActiveAt`, and `isActive`.

### 2. Session Parsing, Geolocation Lookup & Trusted IP Alerting
* **New File**: [sessionHelper.js](file:///c:/Users/ranas/Documents/To-Do-web/server/utils/sessionHelper.js)
* **What was implemented**:
  * **User-Agent Parser**: Standardizes detecting the OS, Browser, and client type (e.g. Chrome Extension, Mobile App, Native App).
  * **IP Geocoder**: Queries `ip-api.com` asynchronously to determine the city and country of the logging IP address (resolving to Lahore, Pakistan if lookups fail or time out, and Localhost for loopback IPs).
  * **Smart Email Alerting**: Triggers Resend-driven HTML security alerts strictly for email addresses ending in `@ucp.edu.pk` when a login from an IP address not previously logged in by that user is detected. Once sent, that IP becomes "trusted" for subsequent logins, avoiding repeated alerts.

### 3. Middleware Integration & Auto-Registration
* **File Modified**: [auth.js](file:///c:/Users/ranas/Documents/To-Do-web/server/Middleware/auth.js)
* **What was implemented**: Validates the JWT token signature on every API request against the `DeviceSession` database. If a session is marked inactive (`isActive: false`), the server immediately rejects the request with a `{ logout: true }` instruction. Includes backwards compatibility stagers that auto-register sessions for users logging in with existing valid tokens.

### 4. Remote Revocation WebSocket Integration
* **Files Modified**: [index.js](file:///c:/Users/ranas/Documents/To-Do-web/server/index.js), [useLiveSync.js](file:///c:/Users/ranas/Documents/To-Do-web/src/hooks/useLiveSync.js)
* **What was implemented**:
  * Socket connection maps users to rooms based on their unique `tokenSignature` during a `join_session` event.
  * When a session is revoked, the server emits a `session_revoked` event to that specific room.
  * The frontend client hook [useLiveSync.js](file:///c:/Users/ranas/Documents/To-Do-web/src/hooks/useLiveSync.js) listens to `session_revoked` and immediately triggers a local logout event by dispatching a custom `security_logout` window event, clearing tokens/storage instantly.

### 5. Client Security Settings UI Redesign
* **File Modified**: [Settings.js](file:///c:/Users/ranas/Documents/To-Do-web/src/Settings.js)
* **What was implemented**:
  * Added an **Active Logins & Devices** section inside the Settings panel.
  * Lists all active login sessions with detailed OS/browser icons, location, IP address, registration time, and "This Device" badges for the active browser.
  * Provides a logout/revoke button that makes a `DELETE` request to `/api/security/sessions/:sessionId` to revoke that session immediately.

### 6. Admin Active Session Directory
* **File Modified**: [AdminDashboard.js](file:///c:/Users/ranas/Documents/To-Do-web/src/AdminDashboard.js)
* **What was implemented**:
  * Added a dedicated **Active Devices Manager** (`portalSessions`) sub-application inside the Admin Dashboard.
  * Allows administrators to view all active user sessions across the entire portal, search/filter by student name, email, IP, OS, or location, and terminate any student's active login remotely.
