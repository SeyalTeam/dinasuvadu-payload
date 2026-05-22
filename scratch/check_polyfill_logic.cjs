const fs = require('fs');

const chunkPath = '/Users/castromurugan/Documents/dinasuvadu-payload/.next/static/chunks/8283-ac2875fc058926ad.js';

if (!fs.existsSync(chunkPath)) {
  console.error('New chunk file does not exist.');
  process.exit(1);
}

const content = fs.readFileSync(chunkPath, 'utf8');

console.log('Is "Object.fromEntries||" in chunk?', content.includes('Object.fromEntries||'));
console.log('Is "Array.prototype.at||" in chunk?', content.includes('Array.prototype.at||'));
console.log('Is "Object.hasOwn||" in chunk?', content.includes('Object.hasOwn||'));
