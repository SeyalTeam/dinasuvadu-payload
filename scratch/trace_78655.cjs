const fs = require('fs');

const chunkPath = '/Users/castromurugan/Documents/dinasuvadu-payload/.next/static/chunks/8283-4babba17b6f5962e.js';

if (!fs.existsSync(chunkPath)) {
  console.error('Chunk file does not exist.');
  process.exit(1);
}

const content = fs.readFileSync(chunkPath, 'utf8');

try {
  let modules = {};
  const self = {
    webpackChunk_N_E: {
      push: function(args) {
        modules = args[1] || {};
      }
    }
  };
  
  const evalFn = new Function('self', content);
  evalFn(self);
  
  const targetId = '78655';
  console.log(`\n--- Finding importers of Module ID: ${targetId} ---`);
  const searchStr1 = `r(${targetId})`;
  const searchStr2 = `(${targetId})`;
  const importers = [];
  
  for (const [key, fn] of Object.entries(modules)) {
    const fnStr = fn.toString();
    if (fnStr.includes(searchStr1) || fnStr.includes(searchStr2)) {
      importers.push(key);
    }
  }
  
  console.log(`Found ${importers.length} importers:`, importers);
  
  importers.forEach(impKey => {
    const fnStr = modules[impKey].toString();
    const strings = fnStr.match(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g) || [];
    const uniqueStrings = Array.from(new Set(strings)).filter(s => s.length > 3 && s.length < 150);
    console.log(`  Importer ${impKey} (Size: ${fnStr.length}):`);
    console.log(`    Strings:`, uniqueStrings.slice(0, 10));
  });
  
} catch (err) {
  console.error(err);
}
