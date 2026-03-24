import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  const slug = "virat-overtakes-rohit-to-become-number-one-in-icc-rankings-977230";
  const post = await posts.findOne({ slug });

  console.log('Post Layout:', JSON.stringify(post.layout, null, 2));
  console.log('Post Meta:', JSON.stringify(post.meta, null, 2));

  await client.close();
}

main().catch(console.error);
