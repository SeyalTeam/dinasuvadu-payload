import dotenv from 'dotenv';
import pkg from 'aws-sdk';
const { S3 } = pkg;
dotenv.config();

const s3 = new S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  endpoint: process.env.S3_ENDPOINT,
  region: 'auto',
  signatureVersion: 'v4',
});

async function getFolderSize(prefix) {
  let totalSize = 0;
  let fileCount = 0;
  let continuationToken = null;

  do {
    const params = {
      Bucket: process.env.S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    };
    
    const data = await s3.listObjectsV2(params).promise();
    for (const file of data.Contents) {
      totalSize += file.Size;
      fileCount++;
    }
    continuationToken = data.NextContinuationToken;
  } while (continuationToken);

  return { size: totalSize, count: fileCount };
}

async function listStorageMonthWise() {
  console.log('Calculating storage sizes... (This may take a minute for large buckets)\n');
  
  try {
    const yearParams = { Bucket: process.env.S3_BUCKET, Prefix: 'uploads/', Delimiter: '/' };
    const yearData = await s3.listObjectsV2(yearParams).promise();
    
    for (const yearPrefix of yearData.CommonPrefixes) {
      const yearStr = yearPrefix.Prefix;
      // Filter out non-year folders like 'uploads/DinasuvaduCDN/'
      if (!yearStr.match(/uploads\/\d{4}\//)) continue;
      
      const monthParams = { Bucket: process.env.S3_BUCKET, Prefix: yearStr, Delimiter: '/' };
      const monthData = await s3.listObjectsV2(monthParams).promise();
      
      for (const monthPrefix of monthData.CommonPrefixes) {
        const stats = await getFolderSize(monthPrefix.Prefix);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📅 ${monthPrefix.Prefix.padEnd(20)} -> 🗂️ ${stats.count.toString().padStart(6)} files  |  💾 ${sizeMb.padStart(8)} MB`);
      }
    }
    console.log('\n✅ Calculation Complete!');
  } catch (error) {
    console.error('❌ Error analyzing R2 storage:', error.message);
  }
}

listStorageMonthWise();
