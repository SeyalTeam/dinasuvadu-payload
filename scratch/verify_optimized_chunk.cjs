const fs = require('fs');

const chunkPath = '/Users/castromurugan/Documents/dinasuvadu-payload/.next/static/chunks/8283-ac2875fc058926ad.js';

if (!fs.existsSync(chunkPath)) {
  console.error('New chunk file does not exist at:', chunkPath);
  process.exit(1);
}

const content = fs.readFileSync(chunkPath, 'utf8');

const targets = [
  'Array.prototype.at',
  'Array.prototype.flat',
  'Array.prototype.flatMap',
  'Object.fromEntries',
  'Object.hasOwn',
  'String.prototype.trimEnd',
  'String.prototype.trimStart'
];

console.log('--- Verifying presence of polyfills in optimized chunk ---');
let foundAny = false;
targets.forEach(target => {
  if (content.includes(target)) {
    console.log(`❌ Found: "${target}"`);
    foundAny = true;
  } else {
    console.log(`✅ NOT found: "${target}"`);
  }
});

if (!foundAny) {
  console.log('\n🎉 Success! All legacy polyfills have been successfully removed from chunk 8283.');
} else {
  console.log('\n⚠️ Some polyfills are still present.');
}
