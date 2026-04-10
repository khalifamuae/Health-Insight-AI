const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app.json');
const content = fs.readFileSync(file, 'utf8');
const appJson = JSON.parse(content);

const parts = appJson.expo.version.split('.');
const lastIdx = parts.length - 1;
parts[lastIdx] = parseInt(parts[lastIdx], 10) + 1;
const newVersion = parts.join('.');

appJson.expo.version = newVersion;

fs.writeFileSync(file, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log('\n======================================');
console.log('🚀 App version automatically bumped to ' + newVersion);
console.log('======================================\n');
