const fs = require('fs');
const path = require('path');

const chunkPath = '/Users/castromurugan/Documents/dinasuvadu-payload/.next/static/chunks/8283-4babba17b6f5962e.js';

if (!fs.existsSync(chunkPath)) {
  console.error('Chunk file does not exist at:', chunkPath);
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
  
  console.log('Successfully evaluated chunk. Total modules:', Object.keys(modules).length);
  
  // Let's analyze each module code for keywords/identifiers
  const moduleInfo = [];
  
  const searchKeywords = [
    'react', 'react-dom', 'next', 'lucide', 'antd', 'axios', 'aws-sdk', 'lexical',
    'lodash', 'ramda', 'date-fns', 'moment', 'dayjs', 'classnames', 'clsx', 'tailwind',
    'radix', 'canvas', 'draft-js', 'slate', 'tinymce', 'ckeditor', 'jquery', 'firebase',
    'google', 'analytics', 'gtm', 'facebook', 'twitter', 'payload', 'node-fetch',
    'sanitize-html', 'prism', 'xml2js'
  ];
  
  for (const [key, fn] of Object.entries(modules)) {
    const fnStr = fn.toString();
    const matches = [];
    searchKeywords.forEach(kw => {
      if (fnStr.toLowerCase().includes(kw)) {
        matches.push(kw);
      }
    });
    
    // Find strings inside the function
    const strings = fnStr.match(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'/g) || [];
    const uniqueStrings = Array.from(new Set(strings)).filter(s => s.length > 3 && s.length < 150);
    
    moduleInfo.push({
      key,
      size: fnStr.length,
      matches,
      sampleStrings: uniqueStrings.slice(0, 10)
    });
  }
  
  // Sort modules by size descending
  moduleInfo.sort((a, b) => b.size - a.size);
  
  console.log('\n--- Top 20 Largest Modules inside Chunk ---');
  moduleInfo.slice(0, 20).forEach(m => {
    console.log(`\nModule ID: ${m.key} (Size: ${m.size} chars)`);
    console.log(`Matched keywords: ${m.matches.join(', ')}`);
    console.log(`Sample strings:`, m.sampleStrings);
  });
  
  // Let's summarize matched keywords across all modules
  const keywordCounts = {};
  moduleInfo.forEach(m => {
    m.matches.forEach(kw => {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    });
  });
  
  console.log('\n--- Keyword Counts across all modules ---');
  console.log(keywordCounts);
  
} catch (err) {
  console.error('Failed to parse modules:', err);
}
