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

  if (!post) {
      console.log('Post not found');
      return;
  }

  console.log('Meta Summary:', post.meta?.description);
  console.log('\nLexical Content Children:');
  post.content?.root?.children?.forEach((node, i) => {
      const text = node.children?.[0]?.text;
      console.log(`[Para ${i}]: ${text?.substring(0, 100)}...`);
  });

  await client.close();
}

main().catch(console.error);
