const http = require('http');
const https = require('https');
const { normalizeAIServiceUrl } = require('../utils/aiServiceUrl');
const { parseAIRetryDelays, isRetryableAIError } = require('../utils/aiRetry');

const AI_SERVICE_URL = normalizeAIServiceUrl({
  serviceUrl: process.env.AI_SERVICE_URL,
  serviceHost: process.env.AI_SERVICE_HOST,
  production: process.env.NODE_ENV === 'production'
});
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 120000);
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || '';
const AI_RETRY_DELAYS_MS = parseAIRetryDelays(process.env.AI_RETRY_DELAYS_MS);

function requestAIOnce(endpoint, { method = 'GET', body, timeout = AI_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    let url;
    try {
      url = new URL(AI_SERVICE_URL + endpoint);
    } catch (_error) {
      const error = new Error('Cấu hình địa chỉ dịch vụ AI không hợp lệ.');
      error.code = 'AI_CONFIG_ERROR';
      reject(error);
      return;
    }
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;
    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method,
      headers: {
        Accept: 'application/json'
      },
      timeout
    };
    if (payload !== null) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (AI_SERVICE_TOKEN) {
      options.headers['X-JobLink-AI-Token'] = AI_SERVICE_TOKEN;
    }

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (_error) {
          // Render co the tra HTML 502/503 trong luc danh thuc Free service.
        }

        if (res.statusCode >= 400) {
          const error = new Error(
            parsed?.message || parsed?.error || `Dịch vụ AI tạm thời trả về lỗi ${res.statusCode}.`
          );
          error.aiStatus = res.statusCode;
          error.aiPayload = parsed || {};
          if ([408, 425, 429, 502, 503, 504].includes(res.statusCode)) {
            error.code = 'AI_UPSTREAM_UNAVAILABLE';
          }
          reject(error);
          return;
        }

        if (parsed === null) {
          const error = new Error('Phản hồi AI không hợp lệ.');
          error.code = 'AI_INVALID_RESPONSE';
          reject(error);
          return;
        }
        resolve(parsed);
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const error = new Error('Dịch vụ AI hết thời gian chờ. Service miễn phí có thể đang khởi động lại.');
      error.code = 'AI_TIMEOUT';
      reject(error);
    });
    req.on('error', (err) => {
      const error = new Error(`Không kết nối được dịch vụ AI: ${err.message}`);
      error.code = 'AI_CONNECTION_ERROR';
      reject(error);
    });

    if (payload !== null) req.write(payload);
    req.end();
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestAI(endpoint, options = {}) {
  let lastError;
  for (let attempt = 0; attempt <= AI_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await requestAIOnce(endpoint, options);
    } catch (error) {
      lastError = error;
      const retryDelay = AI_RETRY_DELAYS_MS[attempt];
      if (retryDelay === undefined || !isRetryableAIError(error)) throw error;
      console.warn(
        `AI request ${endpoint} chua san sang; thu lai sau ${retryDelay}ms `
        + `(${attempt + 1}/${AI_RETRY_DELAYS_MS.length}).`
      );
      await wait(retryDelay);
    }
  }
  throw lastError;
}

function callAI(endpoint, body) {
  return requestAI(endpoint, { method: 'POST', body });
}

function getAIHealth() {
  return requestAI('/health', { method: 'GET' });
}

module.exports = { AI_SERVICE_URL, AI_RETRY_DELAYS_MS, callAI, getAIHealth };
