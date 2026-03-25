import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  const post = await posts.findOne({
      heroImage: { $exists: false }
  });

  if (post) {
      console.log(`Found post without hero image: ${post.slug}`);
      console.log(`Title: ${post.title}`);
  } else {
      console.log('No posts found without hero image.');
  }

  await client.close();
}

main().catch(console.error);
