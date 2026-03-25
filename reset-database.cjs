const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('\n🧹 Resetting Database to Fresh State...\n');

  const collections = ['posts', 'media', 'categories', 'tags'];

  for (const coll of collections) {
      const result = await db.collection(coll).deleteMany({});
      console.log(`🗑️  Cleared ${result.deletedCount} items from '${coll}'`);
  }

  console.log('\n✅ Database is now fresh. Ready for re-migration.');

  await client.close();
}

main().catch(console.error);
