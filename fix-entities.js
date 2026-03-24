import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&#8230;/g, '...')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&hellip;/g, '...')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function fixTitlesAndSummaries() {
  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('test');
  const posts = db.collection('posts');

  const allPosts = await posts.find({}).toArray();
  console.log(`🔍 Checking ${allPosts.length} posts for HTML entities...`);

  let count = 0;
  for (const post of allPosts) {
    const originalTitle = post.title || '';
    const originalDesc = post.meta?.description || '';
    
    const decodedTitle = decodeHtml(originalTitle);
    const decodedDesc = decodeHtml(originalDesc);

    if (decodedTitle !== originalTitle || decodedDesc !== originalDesc) {
      console.log(`✅ Fixing: ${decodedTitle.substring(0, 50)}...`);
      await posts.updateOne(
        { _id: post._id },
        { 
          $set: { 
            title: decodedTitle,
            'meta.title': decodedTitle,
            'meta.description': decodedDesc 
          } 
        }
      );
      count++;
    }
  }

  console.log(`🎉 Finished! Updated ${count} posts.`);
  await client.close();
}

fixTitlesAndSummaries().catch(console.error);
