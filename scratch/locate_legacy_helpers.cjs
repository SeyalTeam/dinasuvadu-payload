const fs = require('fs');

const chunkPath = '/Users/castromurugan/Documents/dinasuvadu-payload/.next/static/chunks/8283-4babba17b6f5962e.js';

if (!fs.existsSync(chunkPath)) {
  console.error('Chunk file does not exist.');
  process.exit(1);
}

const content = fs.readFileSync(chunkPath, 'utf8');

function printContext(label, index, radius = 200) {
  console.log(`\n--- Context for ${label} at index ${index} ---`);
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + radius);
  console.log(content.slice(start, end));
}

// Print context for classes (83242) and spread (108310)
// Note: line 1 matches because the production chunk is minified into a single line or a few lines.
printContext('Classes', 83242);
printContext('Spread', 108310);
