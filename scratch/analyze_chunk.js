const fs = require('fs');
const path = require('path');

const chunkPath = '/Users/castromurugan/Documents/dinasuvadu-payload/.next/static/chunks/8283-4babba17b6f5962e.js';

if (!fs.existsSync(chunkPath)) {
  console.error('Chunk file does not exist at:', chunkPath);
  process.exit(1);
}

const content = fs.readFileSync(chunkPath, 'utf8');

console.log('Total content length:', content.length);

// Let's search for typical license comments, module paths, or keywords.
const keywords = [
  'axios', 'aws-sdk', 'node-fetch', 'sanitize-html', 'antd', 'lexical', 'lucide', 
  'react-hook-form', 'xml2js', 'lodash', 'babel', 'polyfill', 'core-js'
];

console.log('\n--- Keyword Search ---');
keywords.forEach(kw => {
  const matches = [...content.matchAll(new RegExp(kw, 'gi'))];
  if (matches.length > 0) {
    console.log(`Found "${kw}": ${matches.length} occurrences`);
  }
});

// Let's extract some readable string patterns (e.g. copyright notices or URLs)
const strings = content.match(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g) || [];
console.log(`\nTotal strings found: ${strings.length}`);

console.log('\n--- Sample Strings containing license or copyright or package info ---');
const licenseOrCopyright = strings.filter(s => 
  s.includes('license') || 
  s.includes('Copyright') || 
  s.includes('@') || 
  s.includes('version') ||
  s.includes('node_modules')
);

// Unique licenses/copyrights
const uniqueNotices = Array.from(new Set(licenseOrCopyright)).slice(0, 50);
console.log(`Found ${licenseOrCopyright.length} matches, showing first 50 unique ones:`);
uniqueNotices.forEach(n => console.log(n));
