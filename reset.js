import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
import pkg from 'aws-sdk'

const { S3 } = pkg

dotenv.config()

const { MONGODB_URI, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION, S3_ENDPOINT } =
  process.env

const s3 = new S3({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  signatureVersion: 'v4',
})

async function main() {
  console.log('⚠️  STARTING FULL RESET ⚠️')

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  // 1. Delete ALL files in 'uploads/' from S3
  console.log('🗑️  Scanning S3 for files in "uploads/"...')

  let continuationToken = null
  let totalDeleted = 0

  do {
    const listParams = {
      Bucket: S3_BUCKET,
      Prefix: 'uploads/',
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }

    const listedObjects = await s3.listObjectsV2(listParams).promise()

    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
      const deleteParams = {
        Bucket: S3_BUCKET,
        Delete: { Objects: [] },
      }

      listedObjects.Contents.forEach(({ Key }) => {
        deleteParams.Delete.Objects.push({ Key })
      })

      await s3.deleteObjects(deleteParams).promise()
      totalDeleted += listedObjects.Contents.length
      console.log(
        `   - Deleted batch of ${listedObjects.Contents.length} files (Total: ${totalDeleted})`,
      )
    }

    if (listedObjects.IsTruncated) {
      continuationToken = listedObjects.NextContinuationToken
    } else {
      continuationToken = null
    }
  } while (continuationToken)

  if (totalDeleted === 0) {
    console.log('   - No files found in S3 "uploads/" folder.')
  }

  // 3. Delete from MongoDB
  console.log('🧨 Cleaning Database Collections...')
  const collections = ['posts', 'media', 'tags', 'categories', '_posts_versions']

  for (const colName of collections) {
    const result = await db.collection(colName).deleteMany({})
    console.log(`   - Deleted ${result.deletedCount} documents from '${colName}'`)
  }

  console.log('✅ RESET COMPLETE')
  await client.close()
}

main().catch((err) => {
  console.error('❌ Reset failed:', err)
  process.exit(1)
})
