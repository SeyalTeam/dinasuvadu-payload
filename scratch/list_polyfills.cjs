const fs = require('fs');
const path = require('path');

const polyfillDir = '/Users/castromurugan/Documents/dinasuvadu-payload/node_modules/next/dist/build/polyfills';
if (fs.existsSync(polyfillDir)) {
  console.log('Files in polyfill dir:', fs.readdirSync(polyfillDir));
} else {
  console.log('Polyfill directory does not exist.');
}
