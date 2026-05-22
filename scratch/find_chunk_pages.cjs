const fs = require('fs');
const path = require('path');

const dotNext = '/Users/castromurugan/Documents/dinasuvadu-payload/.next';
const manifestPath = path.join(dotNext, 'app-build-manifest.json');

if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('--- App Build Manifest Pages using 8283 ---');
  for (const [page, chunks] of Object.entries(manifest.pages)) {
    const matchingChunks = chunks.filter(c => c.includes('8283'));
    if (matchingChunks.length > 0) {
      console.log(`Page: ${page}`);
      console.log(`Chunks:`, chunks);
    }
  }
}

const buildManifestPath = path.join(dotNext, 'build-manifest.json');
if (fs.existsSync(buildManifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
  console.log('\n--- Pages in Build Manifest ---');
  for (const [page, chunks] of Object.entries(manifest.pages)) {
    const matchingChunks = chunks.filter(c => c.includes('8283'));
    if (matchingChunks.length > 0) {
      console.log(`Page: ${page}`);
      console.log(`Chunks:`, chunks);
    }
  }
}
