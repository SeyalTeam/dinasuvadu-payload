const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    console.log(`📊 Database Storage Stats for: ${db.databaseName}`);
    
    const stats = await db.command({ dbStats: 1 });
    console.log(`- Total Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Index Size: ${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    
    const collections = await db.listCollections().toArray();
    console.log('\n📦 All Collections Breakdown (Counts):');
    for (const colInfo of collections) {
      const colName = colInfo.name;
      try {
        const count = await db.collection(colName).countDocuments();
        console.log(`${colName.padEnd(25)}: ${count} documents`);
      } catch (e) {
        console.log(`${colName.padEnd(25)}: Error counting documents: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('❌ Error connecting or fetching stats:', err.message);
  } finally {
    await client.close();
  }
}

main();
