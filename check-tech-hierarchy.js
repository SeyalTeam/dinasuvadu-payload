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

  const techCat = await categories.findOne({ slug: 'technology' });
  if (!techCat) {
      console.log('Technology category not found.');
      await client.close();
      return;
  }

  const subCats = await categories.find({ parent: techCat._id }).toArray();
  console.log(`\nSub-categories of Technology:\n`);
  subCats.forEach(c => console.log(`- ${c.title} (${c.slug}) [${c._id}]`));

  const allCatIds = [techCat._id, ...subCats.map(c => c._id)];

  const allPosts = await posts.find({
      categories: { $in: allCatIds }
  }, {
      projection: { title: 1, slug: 1, categories: 1 }
  }).toArray();

  console.log(`\nTotal posts in Technology + Sub-categories: ${allPosts.length}\n`);

  const titleCounts = {};
  allPosts.forEach(post => {
      titleCounts[post.title] = (titleCounts[post.title] || 0) + 1;
  });

  const duplicates = Object.keys(titleCounts).filter(title => titleCounts[title] > 1);

  if (duplicates.length === 0) {
      console.log('✅ No duplicate titles found across hierarchy.');
  } else {
      duplicates.forEach(title => {
          console.log(`❌ Duplicate Title: "${title}"`);
          allPosts.filter(p => p.title === title).forEach(p => {
              console.log(`  - Slug: ${p.slug} | Cats: ${JSON.stringify(p.categories)}`);
          });
      });
  }

  await client.close();
}

main().catch(console.error);
