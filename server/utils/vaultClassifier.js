'use strict';

/**
 * Vault File Classifier
 * Checks filename string against keywords for past papers vs lecture notes
 * and categorizes past papers by type (mid_term, final_term, quiz, assignment, graded_lab, class_participation, other).
 */

const PAST_PAPER_REGEX = /mid.?term|final.?term|quiz(zes)?|\bass(ignment|n|gn)?s?\b|graded.?lab|\bgl\b|class.?participation|\bcp\b/i;

function isPastPaper(fileName) {
  if (!fileName || typeof fileName !== 'string') return false;
  return PAST_PAPER_REGEX.test(fileName);
}

function classifyFile(fileName) {
  return isPastPaper(fileName) ? 'past_paper' : 'lecture_note';
}

function detectPaperType(fileName) {
  if (!fileName || typeof fileName !== 'string') return 'other';

  const name = fileName.toLowerCase();

  if (/mid.?term/.test(name)) return 'mid_term';
  if (/final.?term/.test(name)) return 'final_term';
  if (/quiz(zes)?/.test(name)) return 'quiz';
  if (/graded.?lab|\bgl\b/.test(name)) return 'graded_lab';
  if (/class.?participation|\bcp\b/.test(name)) return 'class_participation';
  if (/\bass(ignment|n|gn)?s?\b/.test(name)) return 'assignment';

  return 'other';
}

module.exports = {
  isPastPaper,
  classifyFile,
  detectPaperType
};
