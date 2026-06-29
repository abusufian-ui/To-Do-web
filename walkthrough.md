# Walkthrough of Web Portal Onboarding Flow, Course Material, Session Security, Unified Grading, and Notes Editor UX

We have successfully implemented and verified the **Premium Web Portal Onboarding Flow**, alongside previous fixes for Course Material Sync, Session Security, Course Metadata, the **Unified Grading System**, and the **Notes Editor UX Overhaul**.

---

## 📝 Notes Editor UX Overhaul & Math rendering (New)

We have upgraded the Notes Editor (`NoteEditor.js`) in the web portal and the Note Viewer (`NoteViewerModal.tsx`) in the mobile app to provide a premium, modern writing and reading experience.

### 1. Interactive Privacy Toggle Switch
* **File Modified**: [NoteEditor.js](file:///C:/Users/ranas/Documents/To-Do-web/src/NoteEditor.js)
* **What changed**:
  * Replaced the old "Shared Group / Private" button with a custom-designed sliding toggle switch.
  * **Public Mode (Unselected)**: Displays a soft gray border/background with a `Globe` icon and "Public" label.
  * **Private Mode (Active)**: Slides the toggle knob to the right and shifts to a premium Indigo background with a `Lock` icon and "Private" label.

### 2. Click-to-Remove Highlight
* **File Modified**: [NoteEditor.js](file:///C:/Users/ranas/Documents/To-Do-web/src/NoteEditor.js)
* **What changed**:
  * Integrated TipTap's `extendMarkRange('highlight')` into the highlight toggle handler.
  * When the user clicks anywhere inside a highlighted text span, the editor automatically extends the selection to cover the entire highlighted range.
  * Clicking "Remove" in the bubble menu now instantly clears the entire highlight span without requiring manual pre-selection.

### 3. Smart Paste Interceptor & Auto-Processor
* **File Modified**: [NoteEditor.js](file:///C:/Users/ranas/Documents/To-Do-web/src/NoteEditor.js)
* **What changed**:
  * Intercepted the paste event (`handlePaste`) to parse incoming text with a regex-based token processor (`processSmartPaste`).
  * Automatically detects and extracts:
    * **Display Math**: `$$...$$` or `\[...\]` blocks are instantly converted into centered KaTeX `equationBlock` nodes.
    * **Code Blocks**: ` ```lang ... ``` ` code fences are converted into syntax-highlighted `codeBlock` nodes.
    * **Inline Math & Markdown**: `$math$` or `\(math\)` equations are rendered inline using KaTeX. Bold (`**`), Italic (`*`), code ticks (`` ` ``), headings (`#`), and list items (`-`, `1.`) are converted to rich text.
  * Pasting math-heavy or code-heavy content copied from AI chats (Claude, ChatGPT, etc.) now formats and renders instantly.

### 4. Code Snippet Style Overhaul
* **File Modified**: [NoteEditor.js](file:///C:/Users/ranas/Documents/To-Do-web/src/NoteEditor.js)
* **What changed**:
  * Cleaned up HTML structure and CSS rules to eliminate margin/padding bleeding that caused weird border lines at the first and last lines of the code block.
  * Added complete syntax highlighting color themes for both **Light Mode** (slate/teal theme) and **Dark Mode** (ocean dark theme).
  * Redesigned the header with a modern border-accent matching the theme.

### 5. Mobile Note Viewer Equation Rendering
* **File Modified**: [NoteViewerModal.tsx](file:///C:/Users/ranas/Documents/to-do-app/portal-mobile/components/notes/NoteViewerModal.tsx)
* **What changed**:
  * Included the KaTeX `auto-render.min.js` extension in the WebView HTML generator.
  * Configured `renderMathInElement(document.body)` to automatically find and render all math delimiters (`$`, `$$`, `\(`, `\[`) inline or block-level.
  * Notes containing equations now render beautifully on mobile devices.

---

## 🎓 Unified Grading & CGPA Projection System

We have consolidated the grading and CGPA prediction logic across all three clients (Web, Chrome Extension, and Mobile App) by making the server the single source of truth.

### 1. Canonical Grading Service
* **New File**: [grading.js](file:///c:/Users/ranas/Documents/To-Do-web/server/services/grading.js)
* **What was implemented**:
  * `getAbsoluteGrade(pct)`: Returns the absolute grade and points based on standard percentage bands.
  * `getSmartCurveGrade(myScore, classAverage)`: Evaluates a student's score relative to the class average using the smart curve formula.
  * `calculateTrueScore(assessments, bestOfConfigs)`: Calculates the overall weighted score for a course, dynamically applying "Best-N" caps per category (Quizzes, Assignments, etc.).
  * `computeProjection({ grades, courses, stats, mode, bestOfConfigs })`: Canonical CGPA projection calculation.

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

### 4. Chrome Extension Integration
* **Files Modified**: 
  * [Dashboard.tsx](file:///c:/Users/ranas/Documents/myPortal%20Extension/src/features/Dashboard.tsx)
  * [CourseView.tsx](file:///c:/Users/ranas/Documents/myPortal%20Extension/src/features/CourseView.tsx)
* **What was implemented**:
  * **Dashboard**: Added a `useEffect` to fetch the CGPA projection from the server.
  * **CourseView**: Updated the client-side local merge (`combinedLeaderboard`) to compute grades using the class-average curve (`getSmartCurveGrade`) instead of the old percentile bands.

### 5. Mobile App Integration
* **Files Modified**:
  * [GradeBookSection.tsx](file:///c:/Users/ranas/Documents/to-do-app/portal-mobile/components/classes/GradeBookSection.tsx)
  * [classes.tsx](file:///c:/Users/ranas/Documents/to-do-app/portal-mobile/app/(tabs)/classes.tsx)
* **What was implemented**:
  * **classes.tsx**: Added states for `projection` and `fetchingProjection`. Implemented `fetchProjection()` which queries the server's new `/projection` endpoint and caches the result locally using `AsyncStorage` (`off_acad_projection`).
  * **GradeBookSection.tsx**: Ported the exact canonical constants and formulas to the local offline fallback.

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
