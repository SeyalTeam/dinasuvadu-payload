import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  console.log('\n📊 Migrated Posts Count (Year-Month):\n');

  const aggregation = [
    {
      $project: {
        yearMonth: {
          $dateToString: { format: "%Y-%m", date: "$publishedAt" }
        }
      }
    },
    {
      $group: {
        _id: "$yearMonth",
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: -1 } // Sort by Year-Month descending
    }
  ];

  const results = await posts.aggregate(aggregation).toArray();

  if (results.length === 0) {
    console.log('No posts found in the database.');
  } else {
    results.forEach(res => {
      console.log(`- ${res._id || 'Unknown Date'}: ${res.count} posts`);
    });
    
    const total = results.reduce((acc, curr) => acc + curr.count, 0);
    console.log(`\n✨ Total Migrated: ${total} posts`);
  }

  await client.close();
}

main().catch(console.error);
