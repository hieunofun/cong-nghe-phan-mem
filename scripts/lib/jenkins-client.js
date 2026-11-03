const fs = require('node:fs');
const path = require('node:path');

function localCredentials() {
  return Object.fromEntries(fs.readFileSync(path.resolve(__dirname, '../../.devops/credentials.env'), 'utf8')
    .split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }));
}

function client({ base = 'http://127.0.0.1:8080', password = localCredentials().JENKINS_ADMIN_PASSWORD } = {}) {
  async function request(endpoint, options = {}) {
    const response = await fetch(`${base}${endpoint}`, {
      ...options, headers: {
        Authorization: `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`, ...options.headers
      }, signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`Jenkins ${endpoint}: HTTP ${response.status}`);
    return response;
  }

  async function enqueue(job, parameters) {
    const response = await request('/crumbIssuer/api/json');
    const cookie = response.headers.getSetCookie().map(item => item.split(';')[0]).join('; ');
    const crumb = await response.json();
    const queued = await request(`/job/${encodeURIComponent(job)}/buildWithParameters`, {
      method: 'POST', headers: {
        [crumb.crumbRequestField]: crumb.crumb, Cookie: cookie,
        'Content-Type': 'application/x-www-form-urlencoded'
      }, body: new URLSearchParams(parameters)
    });
    const location = queued.headers.get('location');
    if (!location) throw new Error('Jenkins did not return a queue location.');
    return new URL(location, base).pathname;
  }
  return { request, enqueue };
}

module.exports = { client, localCredentials };
