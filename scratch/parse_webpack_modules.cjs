const fs = require('fs');
const path = require('path');

const chunkPath = '/Users/castromurugan/Documents/dinasuvadu-payload/.next/static/chunks/8283-4babba17b6f5962e.js';

if (!fs.existsSync(chunkPath)) {
  console.error('Chunk file does not exist at:', chunkPath);
  process.exit(1);
}

const content = fs.readFileSync(chunkPath, 'utf8');

// A webpack chunk usually starts with: (self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[chunkId], { modules }])
// Let's try to find module boundaries or patterns.
// In Webpack 5, the modules are an object where keys are numbers or paths.
// Example: { 1234: (function(...) { ... }), "path/to/file.js": (function(...) { ... }) }
// Let's find matches like:
// ,1234:function(e,t,r){
// or ,1234:function(
// or ,"path/to/file.js":function(

// Let's write a simple regex to find module keys
const moduleKeyRegex = /(?:^|,)(?:"([^"]+)"|'([^']+)'|(\d+)):function\(/g;
let match;
const keys = [];
while ((match = moduleKeyRegex.exec(content)) !== null) {
  keys.push(match[1] || match[2] || match[3]);
}

console.log('Found module keys using regex 1:', keys.length);
if (keys.length > 0) {
  console.log('First 50 module keys:', keys.slice(0, 50));
}

// Let's also look for Webpack 5 standard chunk structure:
// push([[8283], { ... }])
// Let's extract the keys of the object passed inside push.
// We can do this by executing a mock self.webpackChunk_N_E in Node!
try {
  let moduleKeys = [];
  const self = {
    webpackChunk_N_E: {
      push: function(args) {
        const modules = args[1];
        if (modules) {
          moduleKeys = Object.keys(modules);
        }
      }
    }
  };
  
  // Evaluate the chunk in a sandbox context
  // To avoid evaluating other globals/dependencies, let's wrap it
  const evalFn = new Function('self', content);
  evalFn(self);
  
  console.log('\nSuccessfully executed chunk in mock sandbox!');
  console.log('Total modules found:', moduleKeys.length);
  console.log('First 100 module keys:');
  console.log(moduleKeys.slice(0, 100));
} catch (err) {
  console.log('\nMock execution failed:', err.message);
}
