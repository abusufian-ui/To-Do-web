/**
 * Escapes regular expression meta-characters to prevent Regex Injection and ReDoS.
 * Specifically escapes: - / \ ^ $ * + ? . ( ) | [ ] { }
 * 
 * @param {string} input - The input string to escape.
 * @returns {string} - The escaped string.
 */
function escapeRegex(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return input.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

module.exports = { escapeRegex };
