import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');
  const media = db.collection('media');

  console.log('\n🔍 Starting Comprehensive Audit for Jan-Mar 2026 Migrated Posts...\n');

  const allPosts = await posts.find({}, {
    projection: { title: 1, slug: 1, heroImage: 1, "meta.description": 1, publishedAt: 1 }
  }).toArray();

  const brokenImages = [];
  const missingSummaries = [];
  const duplicatesDetected = [];

  for (const post of allPosts) {
      // 1. Check Media
      if (!post.heroImage) {
          brokenImages.push({ slug: post.slug, title: post.title, reason: 'No Image Found' });
      } else {
          const imgId = post.heroImage.toString();
          const mediaItem = await media.findOne({ $or: [{ _id: imgId }, { _id: new ObjectId(imgId) }] });
          if (!mediaItem || !mediaItem.url) {
              brokenImages.push({ slug: post.slug, title: post.title, reason: 'Broken Media Link' });
          }
      }

      // 2. Check Summary
      const summary = post.meta?.description?.trim() || "";
      if (!summary || summary.length < 20) {
          missingSummaries.push({ slug: post.slug, title: post.title });
      }

      // 3. (Optional) Check for known duplication if possible without full lexical scan here
  }

  console.log(`📊 AUDIT RESULTS (Total Posts checked: ${allPosts.length})`);
  console.log('--------------------------------------------------');
  
  if (brokenImages.length > 0) {
      console.log(`\n❌ Broken/Missing Hero Images (${brokenImages.length}):`);
      brokenImages.slice(0, 10).forEach(i => console.log(`  - ${i.title} (${i.slug}) [${i.reason}]`));
      if (brokenImages.length > 10) console.log(`  ... and ${brokenImages.length-10} more`);
  } else {
      console.log('\n✅ All posts have valid Hero Images.');
  }

  if (missingSummaries.length > 0) {
      console.log(`\n❌ Missing or Short Summaries (${missingSummaries.length}):`);
      missingSummaries.slice(0, 10).forEach(s => console.log(`  - ${s.title} (${s.slug})`));
      if (missingSummaries.length > 10) console.log(`  ... and ${missingSummaries.length-10} more`);
  } else {
      console.log('\n✅ All posts have valid summaries.');
  }

  await client.close();
}

main().catch(console.error);
