import dotenv from 'dotenv';
import pkg from 'aws-sdk';
const { S3 } = pkg;

dotenv.config();

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_ENDPOINT } = process.env;

const s3 = new S3({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  endpoint: S3_ENDPOINT,
  region: 'auto',
  signatureVersion: 'v4',
});

async function listR2Folders() {
  console.log(`🔍 Checking Cloudflare R2 structure for bucket: ${S3_BUCKET}`);
  
  const params = {
    Bucket: S3_BUCKET,
    Delimiter: '/', // Fetch top level folders
    MaxKeys: 50,
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    console.log('📂 Top-level folders (Prefixes):', data.CommonPrefixes.length);
    data.CommonPrefixes.forEach((prefix) => {
      console.log(`  - ${prefix.Prefix}`);
    });
    
    console.log('\n📄 Top-level files:');
    data.Contents.slice(0, 10).forEach((file) => {
      console.log(`  - ${file.Key} (${(file.Size / 1024).toFixed(2)} KB)`);
    });

    // Sub-folder exploration: /uploads/ 
    const uploadsParams = { Bucket: S3_BUCKET, Prefix: 'uploads/', Delimiter: '/' };
    const uploadsData = await s3.listObjectsV2(uploadsParams).promise();
    if (uploadsData.CommonPrefixes.length > 0) {
      console.log('\n📂 Search inside "uploads/":');
      uploadsData.CommonPrefixes.slice(0, 10).forEach((p) => console.log(`  - ${p.Prefix}`));
    }
    
    // Sub-folder exploration: /wp-content/uploads/
    const wpParams = { Bucket: S3_BUCKET, Prefix: 'wp-content/uploads/', Delimiter: '/' };
    const wpData = await s3.listObjectsV2(wpParams).promise();
    if (wpData.CommonPrefixes.length > 0) {
      console.log('\n📂 Search inside "wp-content/uploads/":');
      wpData.CommonPrefixes.slice(0, 10).forEach((p) => console.log(`  - ${p.Prefix}`));
    }
  } catch (error) {
    console.error('❌ Error connecting to R2:', error.message);
  }
}

listR2Folders();
