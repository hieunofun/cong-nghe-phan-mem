const fs = require('fs');
const path = require('path');

const apiBaseUrl = (process.env.FRONTEND_API_BASE_URL || '').trim().replace(/\/$/, '');
const outputPath = path.join(__dirname, '..', 'public', 'js', 'env.js');
const content = `window.JOBLINK_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n`;

fs.writeFileSync(outputPath, content);
console.log(`Wrote ${outputPath}`);
