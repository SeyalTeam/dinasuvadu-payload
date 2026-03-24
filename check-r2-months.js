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

async function listMonths() {
  console.log('📂 Search inside "uploads/2026/":');
  const monthParams = { Bucket: process.env.S3_BUCKET, Prefix: 'uploads/2026/', Delimiter: '/' };
  const monthData = await s3.listObjectsV2(monthParams).promise();
  monthData.CommonPrefixes.forEach((p) => console.log(`  - ${p.Prefix}`));
  
  if (monthData.CommonPrefixes.length > 0) {
    const marchParams = { Bucket: process.env.S3_BUCKET, Prefix: monthData.CommonPrefixes[monthData.CommonPrefixes.length - 1].Prefix, MaxKeys: 5 };
    const marchData = await s3.listObjectsV2(marchParams).promise();
    console.log(`\n📄 Sample images in latest month (${monthData.CommonPrefixes[monthData.CommonPrefixes.length - 1].Prefix}):`);
    marchData.Contents.forEach((file) => console.log(`  - ${file.Key} (${(file.Size / 1024).toFixed(2)} KB)`));
  }
}
listMonths();
