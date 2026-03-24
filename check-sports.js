import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const categories = db.collection('categories');

  const sports = await categories.findOne({ slug: 'sports' });
  if (sports) {
      console.log('Sports category:', JSON.stringify(sports, null, 2));
  } else {
      console.log('Sports category not found');
  }

  await client.close();
}

main().catch(console.error);
