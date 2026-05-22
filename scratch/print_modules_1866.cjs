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
  
  console.log('\n--- Module 1866 ---');
  console.log(modules['1866'] ? modules['1866'].toString() : 'Not Found');
  
  console.log('\n--- Module 92861 ---');
  console.log(modules['92861'] ? modules['92861'].toString() : 'Not Found');
  
  console.log('\n--- Module 74489 ---');
  console.log(modules['74489'] ? modules['74489'].toString() : 'Not Found');
} catch (err) {
  console.error(err);
}
