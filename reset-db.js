import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function resetDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");

  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB...");
    const db = client.db();

    const collectionsToClear = [
      'posts', 
      'categories', 
      'tags', 
      'media', 
      '_posts_v2', 
      '_posts_versions',
      '_media_v2',
      '_categories_v2',
      '_tags_v2',
      'redirects'
    ];

    for (const name of collectionsToClear) {
      const result = await db.collection(name).deleteMany({});
      console.log(`✅ Cleared ${result.deletedCount} documents from collection: ${name}`);
    }

    // We intentionally SKIP clearing the "users" collection to avoid accidentally deleting your Payload Admin login!

    console.log("\n🎉 Database perfectly reset and ready for clean migration!");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
  } finally {
    await client.close();
  }
}

resetDb();
