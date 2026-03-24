import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  console.log('\n📊 Checking Posts with MISSING Summaries (meta.description):\n');

  const cursor = await posts.find({
      $or: [
          { "meta.description": { $exists: false } },
          { "meta.description": "" },
          { "meta.description": null }
      ]
  }, {
      projection: { title: 1, slug: 1, publishedAt: 1 }
  });

  const results = await cursor.toArray();

  if (results.length === 0) {
      console.log('✅ No posts missing a summary found.');
  } else {
      results.forEach(res => {
          const date = res.publishedAt ? new Date(res.publishedAt).toISOString().split('T')[0] : 'No Date';
          console.log(`- [${date}] ${res.title} (${res.slug})`);
      });
      console.log(`\n❌ Found ${results.length} posts missing a summary.`);
  }

  await client.close();
}

main().catch(console.error);
