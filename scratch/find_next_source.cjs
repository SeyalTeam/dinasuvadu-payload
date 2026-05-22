const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules') {
        searchDir(fullPath, query);
      }
    } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.mjs')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(query)) {
          console.log(`Found "${query}" in: ${fullPath}`);
        }
      } catch (err) {
        // ignore
      }
    }
  }
}

const nextDir = '/Users/castromurugan/Documents/dinasuvadu-payload/node_modules/next';
console.log('Searching for String.prototype.trimStart in next...');
searchDir(nextDir, 'String.prototype.trimStart');
console.log('Searching for Array.prototype.at in next...');
searchDir(nextDir, 'Array.prototype.at');
