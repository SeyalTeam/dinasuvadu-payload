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
  const subCats = await categories.find({ parent: techCat._id }).toArray();
  const allCatIds = [techCat._id, ...subCats.map(c => c._id)];

  const allPosts = await posts.find({
      categories: { $in: allCatIds }
  }).toArray();

  allPosts.forEach(p => {
      console.log(`- ID: ${p._id} | Slug: ${p.slug} | Title: ${p.title}`);
  });

  await client.close();
}

main().catch(console.error);
