function normalizeAIServiceUrl({
  serviceUrl = '',
  serviceHost = '',
  production = false
} = {}) {
  const configured = String(serviceUrl || serviceHost || '').trim();
  if (!configured) return 'http://127.0.0.1:5000';

  const value = configured.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(value)) return value;

  const protocol = serviceHost || production ? 'https' : 'http';
  return `${protocol}://${value}`;
}

module.exports = { normalizeAIServiceUrl };
