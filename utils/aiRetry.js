const DEFAULT_AI_RETRY_DELAYS_MS = [2000, 5000, 10000, 15000, 30000];

function parseAIRetryDelays(value) {
  if (!value) return DEFAULT_AI_RETRY_DELAYS_MS;

  const delays = String(value)
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item >= 0);

  return delays.length ? delays : DEFAULT_AI_RETRY_DELAYS_MS;
}

function isRetryableAIError(error) {
  if (
    ['AI_CONNECTION_ERROR', 'AI_INVALID_RESPONSE', 'AI_UPSTREAM_UNAVAILABLE']
      .includes(error?.code)
  ) {
    return true;
  }
  return [408, 425, 429, 502, 503, 504].includes(Number(error?.aiStatus));
}

module.exports = {
  DEFAULT_AI_RETRY_DELAYS_MS,
  parseAIRetryDelays,
  isRetryableAIError
};
