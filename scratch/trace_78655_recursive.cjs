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
  
  function getImporters(targetId) {
    const searchStr1 = `r(${targetId})`;
    const searchStr2 = `(${targetId})`;
    const importers = [];
    for (const [key, fn] of Object.entries(modules)) {
      const fnStr = fn.toString();
      if (fnStr.includes(searchStr1) || fnStr.includes(searchStr2)) {
        importers.push(key);
      }
    }
    return importers;
  }
  
  function traceUp(id, visited = new Set(), depth = 0) {
    const indent = '  '.repeat(depth);
    if (visited.has(id)) {
      console.log(`${indent}-> [Circular] ${id}`);
      return;
    }
    visited.add(id);
    
    const fnStr = modules[id] ? modules[id].toString() : '';
    const strings = fnStr.match(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g) || [];
    const uniqueStrings = Array.from(new Set(strings)).filter(s => s.length > 3 && s.length < 150);
    
    console.log(`${indent}- Module ${id} (Size: ${fnStr.length}) Strings: ${JSON.stringify(uniqueStrings.slice(0, 4))}`);
    
    const importers = getImporters(id);
    importers.forEach(imp => {
      traceUp(imp, new Set(visited), depth + 1);
    });
  }
  
  console.log('--- Recursive Trace for Polyfill Module 78655 ---');
  traceUp('78655');
  
} catch (err) {
  console.error(err);
}
