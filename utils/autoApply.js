const AUTO_APPLY_MIN_SCORE = 30;
const AUTO_APPLY_MAX_SCORE = 95;
const AUTO_APPLY_DEFAULT_SCORE = 70;

function parseBoolean(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function normalizeAutoApplyScore(value, fallback = AUTO_APPLY_DEFAULT_SCORE) {
  if (value === undefined || value === null || value === '') return Number(fallback);
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.round(score * 100) / 100;
}

function isValidAutoApplyScore(score) {
  return Number.isFinite(score)
    && score >= AUTO_APPLY_MIN_SCORE
    && score <= AUTO_APPLY_MAX_SCORE;
}

function qualifiesForAutoApply(score, minimumScore) {
  const normalizedScore = Number(score);
  const normalizedMinimum = Number(minimumScore);
  return Number.isFinite(normalizedScore)
    && Number.isFinite(normalizedMinimum)
    && normalizedScore >= normalizedMinimum;
}

module.exports = {
  AUTO_APPLY_DEFAULT_SCORE,
  AUTO_APPLY_MAX_SCORE,
  AUTO_APPLY_MIN_SCORE,
  isValidAutoApplyScore,
  normalizeAutoApplyScore,
  parseBoolean,
  qualifiesForAutoApply
};
