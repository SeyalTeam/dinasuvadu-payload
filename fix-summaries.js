import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');

  console.log('\n🔄 Starting Automatic Summary Repair...\n');

  const problematicPosts = await posts.find({
    $or: [
        { "meta.description": { $exists: false } },
        { "meta.description": "" },
        { "meta.description": null }
    ]
  }).toArray();

  console.log(`Found ${problematicPosts.length} posts missing summaries.`);

  let fixCount = 0;
  for (const post of problematicPosts) {
      if (!post.content || !post.content.root || !post.content.root.children) continue;

      // Extract first substantial paragraph
      let firstPara = "";
      for (const child of post.content.root.children) {
          if (child.type === 'paragraph' && child.children) {
              const text = child.children.map(c => c.text).join('').trim();
              if (text.length > 20) {
                  firstPara = text;
                  break;
              }
          }
      }

      if (firstPara) {
          // Truncate to ~160 chars for SEO
          const cleanSummary = firstPara.substring(0, 160) + (firstPara.length > 160 ? '...' : '');
          
          await posts.updateOne(
              { _id: post._id },
              { $set: { "meta.description": cleanSummary } }
          );
          console.log(`✅ Fixed: ${post.slug}`);
          fixCount++;
      }
  }

  console.log(`\nSuccessfully fixed ${fixCount} posts.`);
  await client.close();
}

main().catch(console.error);
