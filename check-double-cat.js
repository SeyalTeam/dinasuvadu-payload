import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const categories = db.collection('categories');
  const posts = db.collection('posts');

  const tech = await categories.findOne({ slug: 'technology' });
  const mobiles = await categories.findOne({ slug: 'mobiles' });

  if (!tech || !mobiles) {
      console.log('Categories not found.');
      return;
  }

  const duplicates = await posts.find({
      $and: [
          { categories: tech._id },
          { categories: mobiles._id }
      ]
  }).toArray();

  if (duplicates.length > 0) {
      console.log(`❌ Found ${duplicates.length} posts assigned to BOTH Technology and Mobiles:`);
      duplicates.forEach(p => console.log(`- ${p.title} (${p.slug})`));
  } else {
      console.log('✅ No posts assigned to both categories.');
  }

  await client.close();
}

main().catch(console.error);
