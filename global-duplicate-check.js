import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  console.log('\n📊 Checking for GLOBAL Duplicates (Title or Slug):\n');

  // Find duplicate slugs
  const slugAgg = await posts.aggregate([
      { $group: { _id: "$slug", count: { $sum: 1 }, titles: { $push: "$title" } } },
      { $match: { count: { $gt: 1 } } }
  ]).toArray();

  if (slugAgg.length > 0) {
      console.log('❌ Duplicate Slugs Found:');
      slugAgg.forEach(s => console.log(`- Slug: ${s._id} | Count: ${s.count}`));
  } else {
      console.log('✅ No duplicate slugs found.');
  }

  // Find duplicate titles
  const titleAgg = await posts.aggregate([
      { $group: { _id: "$title", count: { $sum: 1 }, slugs: { $push: "$slug" } } },
      { $match: { count: { $gt: 1 } } }
  ]).toArray();

  if (titleAgg.length > 0) {
      console.log('\n❌ Duplicate Titles Found:');
      titleAgg.forEach(t => {
          console.log(`- Title: "${t._id}" | Count: ${t.count}`);
          t.slugs.forEach(s => console.log(`  - ${s}`));
      });
  } else {
      console.log('\n✅ No duplicate titles found.');
  }

  await client.close();
}

main().catch(console.error);
