// Lightweight, zero-dependency Prometheus / OpenMetrics instrumentation
// and Alertmanager webhook sink for JobLink Web.
const { monitorEventLoopDelay } = require('node:perf_hooks');

const startedAtMs = Date.now();
const BUCKETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

let loopHistogram = null;
try {
  loopHistogram = monitorEventLoopDelay({ resolution: 20 });
  loopHistogram.enable();
} catch (_err) {
  loopHistogram = null;
}

const requestCounts = new Map();
const errorCounts = new Map();
const durationBuckets = new Map();
let durationSum = 0;
let durationCount = 0;
let inFlight = 0;

const alertCounts = { firing: 0, resolved: 0 };
const recentAlerts = [];

for (const bound of BUCKETS) {
  durationBuckets.set(bound, 0);
}

function normalizeRoute(req) {
  const rawPath = String((req.originalUrl || req.url || '/').split('?')[0] || '/');
  if (rawPath === '/metrics' || rawPath === '/health' || rawPath === '/ready') return rawPath;
  if (rawPath.startsWith('/uploads/')) return '/uploads/:file';
  if (!rawPath.startsWith('/api/') && !rawPath.startsWith('/internal/')) return '/*static';
  return rawPath
    .replace(/\/[0-9]+(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-fA-F-]{24,}(?=\/|$)/g, '/:token');
}

function escapeLabel(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
}

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const start = process.hrtime.bigint();
  inFlight += 1;
  let recorded = false;

  const finalize = () => {
    if (recorded) return;
    recorded = true;
    inFlight = Math.max(0, inFlight - 1);

    const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const method = String(req.method || 'GET').toUpperCase();
    const route = normalizeRoute(req);
    const status = String(res.statusCode || 200);
    const key = `${method}|${route}|${status}`;
    requestCounts.set(key, (requestCounts.get(key) || 0) + 1);

    if (res.statusCode >= 400) {
      const statusClass = res.statusCode >= 500 ? '5xx' : '4xx';
      const errKey = `${method}|${route}|${statusClass}`;
      errorCounts.set(errKey, (errorCounts.get(errKey) || 0) + 1);
    }

    durationSum += elapsedSeconds;
    durationCount += 1;
    for (const bound of BUCKETS) {
      if (elapsedSeconds <= bound) {
        durationBuckets.set(bound, (durationBuckets.get(bound) || 0) + 1);
      }
    }
  };

  res.on('finish', finalize);
  res.on('close', finalize);
  next();
}

function renderPrometheusMetrics() {
  const lines = [];
  const mem = process.memoryUsage();
  const uptimeSeconds = (Date.now() - startedAtMs) / 1000;
  const envName = escapeLabel(process.env.NODE_ENV || 'development');

  lines.push('# HELP joblink_build_info Static runtime metadata for JobLink Web.');
  lines.push('# TYPE joblink_build_info gauge');
  lines.push(`joblink_build_info{service="joblink-web",node_env="${envName}",node_version="${escapeLabel(process.version)}"} 1`);

  lines.push('# HELP nodejs_process_uptime_seconds Process uptime in seconds.');
  lines.push('# TYPE nodejs_process_uptime_seconds gauge');
  lines.push(`nodejs_process_uptime_seconds ${uptimeSeconds.toFixed(3)}`);

  lines.push('# HELP nodejs_resident_memory_bytes Resident set size memory in bytes.');
  lines.push('# TYPE nodejs_resident_memory_bytes gauge');
  lines.push(`nodejs_resident_memory_bytes ${mem.rss}`);

  lines.push('# HELP nodejs_heap_used_bytes V8 heap used memory in bytes.');
  lines.push('# TYPE nodejs_heap_used_bytes gauge');
  lines.push(`nodejs_heap_used_bytes ${mem.heapUsed}`);

  lines.push('# HELP nodejs_heap_total_bytes V8 heap total memory in bytes.');
  lines.push('# TYPE nodejs_heap_total_bytes gauge');
  lines.push(`nodejs_heap_total_bytes ${mem.heapTotal}`);

  if (loopHistogram) {
    const meanLagSeconds = Number.isFinite(loopHistogram.mean) ? loopHistogram.mean / 1e9 : 0;
    lines.push('# HELP nodejs_eventloop_lag_seconds Mean event loop delay in seconds.');
    lines.push('# TYPE nodejs_eventloop_lag_seconds gauge');
    lines.push(`nodejs_eventloop_lag_seconds ${meanLagSeconds.toFixed(6)}`);
  }

  lines.push('# HELP joblink_http_requests_in_flight Current number of in-flight HTTP requests.');
  lines.push('# TYPE joblink_http_requests_in_flight gauge');
  lines.push(`joblink_http_requests_in_flight ${inFlight}`);

  lines.push('# HELP joblink_http_requests_total Total HTTP requests handled by JobLink Web.');
  lines.push('# TYPE joblink_http_requests_total counter');
  if (requestCounts.size === 0) {
    lines.push('joblink_http_requests_total{method="GET",route="/health",status="200"} 0');
  } else {
    for (const [key, count] of requestCounts.entries()) {
      const [method, route, status] = key.split('|');
      lines.push(
        `joblink_http_requests_total{method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${escapeLabel(status)}"} ${count}`
      );
    }
  }

  lines.push('# HELP joblink_http_errors_total Total HTTP 4xx and 5xx responses.');
  lines.push('# TYPE joblink_http_errors_total counter');
  for (const [key, count] of errorCounts.entries()) {
    const [method, route, statusClass] = key.split('|');
    lines.push(
      `joblink_http_errors_total{method="${escapeLabel(method)}",route="${escapeLabel(route)}",status_class="${escapeLabel(statusClass)}"} ${count}`
    );
  }

  lines.push('# HELP joblink_http_request_duration_seconds HTTP request latency distribution in seconds.');
  lines.push('# TYPE joblink_http_request_duration_seconds histogram');
  for (const bound of BUCKETS) {
    lines.push(`joblink_http_request_duration_seconds_bucket{le="${bound}"} ${durationBuckets.get(bound) || 0}`);
  }
  lines.push(`joblink_http_request_duration_seconds_bucket{le="+Inf"} ${durationCount}`);
  lines.push(`joblink_http_request_duration_seconds_sum ${durationSum.toFixed(6)}`);
  lines.push(`joblink_http_request_duration_seconds_count ${durationCount}`);

  lines.push('# HELP joblink_alert_notifications_total Alertmanager webhook notifications received.');
  lines.push('# TYPE joblink_alert_notifications_total counter');
  lines.push(`joblink_alert_notifications_total{status="firing"} ${alertCounts.firing}`);
  lines.push(`joblink_alert_notifications_total{status="resolved"} ${alertCounts.resolved}`);

  return `${lines.join('\n')}\n`;
}

async function forwardExternalAlert(entry) {
  const webhookUrl = String(process.env.ALERT_EXTERNAL_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || '').trim();
  if (!webhookUrl) return;
  try {
    const prefix = entry.status === 'resolved' ? '✅ [RESOLVED]' : '🚨 [FIRING]';
    const content = `${prefix} **${entry.alertname}** (${entry.service || 'system'}) — ${entry.summary || entry.description || ''}`.trim();
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, text: content }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (err) {
    console.warn('Khong gui duoc canh bao ra webhook ngoai:', err.message);
  }
}

async function recordAlertNotification(payload = {}) {
  const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
  const recorded = [];
  for (const item of alerts) {
    const status = item?.status === 'resolved' ? 'resolved' : 'firing';
    alertCounts[status] += 1;
    const entry = {
      receivedAt: new Date().toISOString(),
      status,
      alertname: item?.labels?.alertname || payload?.commonLabels?.alertname || 'unknown',
      service: item?.labels?.service || payload?.commonLabels?.service || 'unknown',
      severity: item?.labels?.severity || 'info',
      summary: item?.annotations?.summary || '',
      description: item?.annotations?.description || '',
      startsAt: item?.startsAt || null,
      endsAt: item?.endsAt || null
    };
    recentAlerts.push(entry);
    if (recentAlerts.length > 50) recentAlerts.shift();
    recorded.push(entry);
    await forwardExternalAlert(entry);
  }
  return recorded;
}

function getAlertLedger() {
  return {
    counts: { ...alertCounts },
    recent: [...recentAlerts]
  };
}

module.exports = {
  getAlertLedger,
  metricsMiddleware,
  normalizeRoute,
  recordAlertNotification,
  renderPrometheusMetrics
};
