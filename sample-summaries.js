import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  const samplePosts = await posts.find({}, {
      projection: { title: 1, slug: 1, meta: 1 }
  }).sort({ publishedAt: -1 }).limit(10).toArray();

  samplePosts.forEach(p => {
      const summary = p.meta?.description || '';
      console.log(`- Slug: ${p.slug}`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Summary length: ${summary.length}`);
      console.log(`  Summary start: ${summary.substring(0, 50)}...`);
      console.log('---');
  });

  await client.close();
}

main().catch(console.error);
