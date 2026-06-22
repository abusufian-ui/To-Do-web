
function escapeRegex(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return input.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

module.exports = { escapeRegex };
