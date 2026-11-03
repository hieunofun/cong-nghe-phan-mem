// Change a harmless public file to demonstrate push -> webhook -> Docker deploy.
const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '../public/demo-release.json');
const current = JSON.parse(fs.readFileSync(file, 'utf8'));
const next = { revision: current.revision + 1,
  message: process.argv.slice(2).join(' ') || 'JobLink - Midterm CI/CD demo',
  updatedAt: new Date().toISOString() };
fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Updated public/demo-release.json to revision ${next.revision}. Commit and push this file to run the webhook demo.`);
