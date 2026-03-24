import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');
  const categories = db.collection('categories');

  const techCat = await categories.findOne({ slug: 'technology' });
  if (!techCat) {
      console.log('Technology category not found.');
      await client.close();
      return;
  }

  console.log(`\n🔍 Checking for duplicates in Category: Technology (${techCat._id})\n`);

  const techPosts = await posts.find({
      categories: techCat._id
  }, {
      projection: { title: 1, slug: 1, publishedAt: 1 }
  }).sort({ publishedAt: -1 }).toArray();

  console.log(`Found ${techPosts.length} posts in Technology category.\n`);

  const titleCounts = {};
  techPosts.forEach(post => {
      titleCounts[post.title] = (titleCounts[post.title] || 0) + 1;
  });

  const duplicates = Object.keys(titleCounts).filter(title => titleCounts[title] > 1);

  if (duplicates.length === 0) {
      console.log('✅ No duplicate titles found in Technology category.');
  } else {
      duplicates.forEach(title => {
          console.log(`❌ Duplicate Title: "${title}"`);
          techPosts.filter(p => p.title === title).forEach(p => {
              console.log(`  - Slug: ${p.slug} | Date: ${p.publishedAt}`);
          });
      });
  }

  await client.close();
}

main().catch(console.error);
