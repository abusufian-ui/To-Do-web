
const parseUCPDate = (str) => {
    if (!str) return "";
    const trimmed = str.replace(/\s+/g, ' ').trim();
    if (!trimmed) return "";

    
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})(?::\d{2})?)?$/);
    if (isoMatch) {
        const timePart = isoMatch[2] ? `${isoMatch[2]}:00` : "00:00:00";
        const d = new Date(`${isoMatch[1]}T${timePart}+05:00`);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }

    
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

    
    const ddMmmYyyyMatch = trimmed.match(/^(\d{1,2})[-/]([a-zA-Z]{3})[-/](\d{4})(?:\s+(\d{1,2}:\d{2})(?:\s*([aApP][mM]))?)?$/);
    if (ddMmmYyyyMatch) {
        const spacesInsteadOfHyphens = trimmed.replace(/-/g, ' ');
        const d = new Date(spacesInsteadOfHyphens + ' GMT+0500');
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }

    
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }

    
    console.warn(`[dateParser] Failed to parse date string: "${str}". Returning empty string to preserve stable fingerprints.`);
    return ""; 

};

module.exports = { parseUCPDate };
