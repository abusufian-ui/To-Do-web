/**
 * Normalizes and parses UCP portal dates into ISO strings.
 * Supports ISO-like formats (e.g. "2026-05-05 14:36"), old format with hyphens (e.g. "25-May-2026 10:00 AM"),
 * and standard numeric formats (e.g., "25-05-2026").
 * @param {string} str - The date string from the portal.
 * @returns {string} ISO-8601 string representation or the original string if parsing fails.
 */
const parseUCPDate = (str) => {
    if (!str) return "";
    const trimmed = str.replace(/\s+/g, ' ').trim();
    if (!trimmed) return "";

    // 1. ISO-like format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DD HH:mm:ss"
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})(?::\d{2})?)?$/);
    if (isoMatch) {
        const timePart = isoMatch[2] ? `${isoMatch[2]}:00` : "00:00:00";
        const d = new Date(`${isoMatch[1]}T${timePart}+05:00`);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }

    // 2. DD-MM-YYYY format: "DD-MM-YYYY" or "DD-MM-YYYY HH:mm"
    const ddMmYyyyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}:\d{2})(?::\d{2})?)?$/);
    if (ddMmYyyyMatch) {
        const day = ddMmYyyyMatch[1].padStart(2, '0');
        const month = ddMmYyyyMatch[2].padStart(2, '0');
        const year = ddMmYyyyMatch[3];
        const timePart = ddMmYyyyMatch[4] ? `${ddMmYyyyMatch[4]}:00` : "00:00:00";
        const d = new Date(`${year}-${month}-${day}T${timePart}+05:00`);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }

    // 3. DD-MMM-YYYY format: "DD-MMM-YYYY" or "DD-MMM-YYYY HH:mm AM/PM"
    const ddMmmYyyyMatch = trimmed.match(/^(\d{1,2})[-/]([a-zA-Z]{3})[-/](\d{4})(?:\s+(\d{1,2}:\d{2})(?:\s*([aApP][mM]))?)?$/);
    if (ddMmmYyyyMatch) {
        const spacesInsteadOfHyphens = trimmed.replace(/-/g, ' ');
        const d = new Date(spacesInsteadOfHyphens + ' GMT+0500');
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }

    // 4. If it's already an ISO string: "YYYY-MM-DDTHH:mm:ss.sssZ"
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }

    // Otherwise, do not parse to avoid junk dates like "invalid date text" resolving to year 0499
    console.warn(`[dateParser] Failed to parse date string: "${str}"`);
    return str; // return original if failed
};

module.exports = { parseUCPDate };
