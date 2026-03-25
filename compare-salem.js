import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  const post = await posts.findOne({ slug: 'terrible-accident-near-salem-as-government-bus-collides-with-car-7-people-killed-979338' });

  if (post) {
      console.log(`\nTitle: ${post.title}`);
      console.log(`\n🔹 Summary (meta.description): \n"${post.meta?.description}"`);
      
      const content = post.content?.root?.children?.[0]?.children?.[0]?.text || "";
      console.log(`\n🔹 First Paragraph of Content: \n"${content}..."`);
  }

  await client.close();
}

main().catch(console.error);
