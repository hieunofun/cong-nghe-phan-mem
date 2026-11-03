// One entry point for the local midterm demo. Requires Node >=22 and Docker Desktop.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const secretFile = path.join(root, '.devops', 'credentials.env');
const project = path.basename(root).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
const jenkins = 'http://127.0.0.1:8080';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function credentials(create = false) {
  if (!fs.existsSync(secretFile)) {
    if (!create) throw new Error('Run node scripts/devops-demo.js up first.');
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, [
      `JENKINS_ADMIN_PASSWORD=${crypto.randomBytes(18).toString('hex')}`,
      `GRAFANA_ADMIN_PASSWORD=${crypto.randomBytes(18).toString('hex')}`, ''
    ].join('\n'), { mode: 0o600, flag: 'wx' });
    console.log('Created local credentials in .devops/credentials.env (excluded from Git/images).');
  }
  return Object.fromEntries(fs.readFileSync(secretFile, 'utf8').split(/\r?\n/)
    .filter(line => /^[A-Z_]+=/.test(line)).map(line => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }));
}

function compose(args, capture = false) {
  return execFileSync('docker', ['compose', '--project-name', project, '--env-file', secretFile,
    '-f', 'docker-compose.yml', '-f', 'docker-compose.devops.yml', ...args], {
    cwd: root, env: { ...process.env, COMPOSE_PROJECT_NAME: project }, encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
}

async function jenkinsRequest(endpoint, options = {}) {
  const config = credentials();
  const response = await fetch(`${jenkins}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`admin:${config.JENKINS_ADMIN_PASSWORD}`).toString('base64')}`,
      ...options.headers
    }, signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Jenkins ${endpoint}: HTTP ${response.status}`);
  return response;
}

async function triggerBuild() {
  const job = process.argv.includes('--local') ? 'joblink-local' : 'joblink-scm';
  const crumbResponse = await jenkinsRequest('/crumbIssuer/api/json');
  const cookie = crumbResponse.headers.getSetCookie().map(item => item.split(';')[0]).join('; ');
  const crumb = await crumbResponse.json();
  const trigger = await jenkinsRequest(`/job/${job}/buildWithParameters`, {
    method: 'POST',
    headers: { [crumb.crumbRequestField]: crumb.crumb, Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ SOURCE_MODE: job === 'joblink-scm' ? 'SCM' : 'LOCAL', DEPLOY: 'true',
      GIT_URL: 'https://github.com/hieunofun/cong-nghe-phan-mem.git', GIT_BRANCH: 'main' })
  });
  const location = trigger.headers.get('location');
  if (!location) throw new Error('Jenkins did not return a queue location.');
  const queuePath = `${new URL(location, jenkins).pathname}api/json`;
  console.log(`Queued ${job}. Waiting for Jenkins executor...`);
  let build;
  const deadline = Date.now() + 26 * 60 * 1000;
  while (!build && Date.now() < deadline) {
    const queue = await (await jenkinsRequest(queuePath)).json();
    if (queue.cancelled) throw new Error('Jenkins queue item was cancelled.');
    build = queue.executable;
    if (!build) await sleep(2000);
  }
  if (!build) throw new Error('Timed out waiting for the Jenkins executor.');
  console.log(`Build #${build.number}: http://localhost:8080/job/${job}/${build.number}/`);
  const buildPath = `/job/${job}/${build.number}`;
  let lastOutput = '';
  while (Date.now() < deadline) {
    const result = await (await jenkinsRequest(`${buildPath}/api/json`)).json();
    const log = await (await jenkinsRequest(`${buildPath}/consoleText`)).text();
    if (log.length > lastOutput.length) {
      process.stdout.write(log.slice(lastOutput.length));
      lastOutput = log;
    }
    if (!result.building && result.result) {
      await captureBuild(job, build.number);
      console.log(`Jenkins build #${result.number}: ${result.result}`);
      if (result.result !== 'SUCCESS') throw new Error('Jenkins pipeline failed. See artifacts/midterm-demo/jenkins-console.log.');
      return;
    }
    await sleep(3000);
  }
  throw new Error('Timed out waiting for Jenkins. The build may still be running; check its URL.');
}

async function captureBuild(job = 'joblink-scm', number = 'lastBuild') {
  const buildPath = `/job/${job}/${number}`;
  const result = await (await jenkinsRequest(`${buildPath}/api/json`)).json();
  if (result.building) throw new Error('Build is still running. Wait for SUCCESS before capturing evidence.');
  const log = await (await jenkinsRequest(`${buildPath}/consoleText`)).text();
  const output = path.join(root, 'artifacts', 'midterm-demo');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'jenkins-console.log'), log);
  fs.writeFileSync(path.join(output, 'jenkins-build.json'), `${JSON.stringify({
    job, number: result.number, result: result.result, duration: result.duration,
    timestamp: result.timestamp, url: `http://localhost:8080/job/${job}/${result.number}/`
  }, null, 2)}\n`);
  console.log(`Captured ${job} #${result.number}: ${result.result}`);
}

async function main() {
  const action = process.argv[2] || 'help';
  if (action === 'up') {
    credentials(true);
    try {
      execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], { stdio: 'pipe', timeout: 20000 });
    } catch {
      throw new Error('Docker Engine is not ready. Open Docker Desktop; for the known E: disk permission issue, run it as administrator.');
    }
    compose(['up', '-d', '--build', '--wait', '--wait-timeout', '360']);
    console.log('Web: http://localhost:3000 | Jenkins: http://localhost:8080');
    console.log('Grafana: http://localhost:3001/d/joblink-overview | Prometheus: http://localhost:9090');
    console.log('Passwords: node scripts/devops-demo.js credentials');
  } else if (action === 'status') {
    credentials();
    compose(['ps']);
  } else if (action === 'stop') {
    credentials();
    if (fs.existsSync(path.join(root, '.devops/webhook-state.json'))) {
      execFileSync(process.execPath, ['scripts/webhook-demo.js', 'stop'], { cwd: root, stdio: 'inherit' });
    }
    compose(['stop']); // Keep containers and every named volume.
  } else if (action === 'credentials') {
    const config = credentials();
    console.log(`Jenkins: admin / ${config.JENKINS_ADMIN_PASSWORD}`);
    console.log(`Grafana: admin / ${config.GRAFANA_ADMIN_PASSWORD}`);
  } else if (action === 'build') {
    await triggerBuild();
  } else if (action === 'capture') {
    await captureBuild(process.argv.includes('--local') ? 'joblink-local' : 'joblink-scm');
  } else if (action === 'check') {
    execFileSync(process.execPath, ['scripts/docker-check.js'], { cwd: root, stdio: 'inherit' });
    execFileSync(process.execPath, ['scripts/monitoring-check.js'], { cwd: root, stdio: 'inherit' });
    const job = process.argv.includes('--local') ? 'joblink-local' : 'joblink-scm';
    const result = await (await jenkinsRequest(`/job/${job}/lastBuild/api/json`)).json();
    if (result.building || result.result !== 'SUCCESS') throw new Error('The latest Jenkins pipeline has not completed successfully.');
    console.log(`PASS Jenkins ${job} latest build #${result.number}: SUCCESS`);
  } else {
    console.log('Usage: node scripts/devops-demo.js up|status|build|capture|check|credentials|stop [--local]');
  }
}

main().catch(error => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
