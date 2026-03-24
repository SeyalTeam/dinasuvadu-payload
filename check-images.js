import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  const allPosts = await posts.find({
      slug: { $in: [
          'wow-5-quality-phones-launching-this-year-from-samsung-to-iphone-976946',
          'new-rule-has-arrived-shock-for-whatsapp-web-users-978655'
      ]}
  }, {
      projection: { slug: 1, heroImage: 1 }
  }).toArray();

  allPosts.forEach(p => {
      console.log(`- Slug: ${p.slug} | Image ID: ${p.heroImage}`);
  });

  await client.close();
}

main().catch(console.error);
