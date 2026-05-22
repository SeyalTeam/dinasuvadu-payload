const fs = require('fs');

const chunkPath = '/Users/castromurugan/Documents/dinasuvadu-payload/.next/static/chunks/8283-4babba17b6f5962e.js';

if (!fs.existsSync(chunkPath)) {
  console.error('Chunk file does not exist.');
  process.exit(1);
}

const content = fs.readFileSync(chunkPath, 'utf8');
const lines = content.split('\n');
console.log('Total lines in chunk:', lines.length);

const targets = [
  'Array.prototype.at',
  'Array.prototype.flat',
  'Array.prototype.flatMap',
  'Object.fromEntries',
  'Object.hasOwn',
  'String.prototype.trimEnd',
  'String.prototype.trimStart'
];

targets.forEach(target => {
  console.log(`\nSearching for matches of "${target}"...`);
  lines.forEach((line, index) => {
    if (line.includes(target)) {
      console.log(`Found on Line ${index + 1}`);
      const charIndex = line.indexOf(target);
      console.log('Context:', line.slice(Math.max(0, charIndex - 100), Math.min(line.length, charIndex + 100)));
    }
  });
  
  // Search case insensitively or by parts if exact match doesn't exist
  const lowerTarget = target.toLowerCase();
  const simpleName = target.split('.').pop();
  const occurrences = [...content.matchAll(new RegExp(simpleName, 'gi'))];
  console.log(`Simple name "${simpleName}" occurs ${occurrences.length} times`);
});
