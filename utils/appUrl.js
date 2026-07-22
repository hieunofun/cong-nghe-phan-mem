function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getConfiguredBaseUrl() {
  return normalizeBaseUrl(process.env.BASE_URL || process.env.RENDER_EXTERNAL_HOSTNAME);
}

function getAppBaseUrl(fallback = 'http://localhost:3000') {
  return getConfiguredBaseUrl() || normalizeBaseUrl(fallback);
}

module.exports = { getAppBaseUrl, getConfiguredBaseUrl, normalizeBaseUrl };
