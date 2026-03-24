import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import fetch from 'node-fetch';

dotenv.config();
const { MONGODB_URI } = process.env;

async function fixSummaries() {
  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('test');
  const posts = db.collection('posts');

  // Find posts from March 2026
  const allPosts = await posts.find({
    publishedAt: { 
      $gte: new Date('2026-03-01'),
      $lt: new Date('2026-04-01')
    }
  }).toArray();

  console.log(`🔍 Found ${allPosts.length} posts to check.`);
  const auth = 'Basic ' + Buffer.from('blogvault:5120d378').toString('base64');

  for (const post of allPosts) {
    // We scrape the page directly because REST API is missing information
    const wpUrl = `https://dinasuvadu17107.e.wpstage.net/?p=${post.customId}`;
    
    try {
      console.log(`📡 Scraping summary for: ${post.title}`);
      const res = await fetch(wpUrl, { headers: { Authorization: auth } });
      const html = await res.text();
      
      // Look for <meta name="description" content="...">
      // or <h2 class="post-summary-box">...</h2>
      let summary = '';
      
      const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      if (metaMatch && metaMatch[1]) {
        summary = metaMatch[1];
      } else {
        const boxMatch = html.match(/class=["']post-summary-box["'][^>]*>([^<]+)</i);
        if (boxMatch && boxMatch[1]) {
          summary = boxMatch[1];
        }
      }
      
      if (summary) {
        // Decode common HTML entities
        summary = summary.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
                         .replace(/&hellip;/g, '...')
                         .replace(/&quot;/g, '"')
                         .replace(/&amp;/g, '&')
                         .trim();
        
        console.log(`✅ Found: ${summary.substring(0, 50)}...`);
        
        await posts.updateOne(
          { _id: post._id },
          { $set: { 'meta.description': summary } }
        );
      } else {
        console.log(`⚠️ No summary found for ${post.title}`);
      }
    } catch (err) {
      console.error(`❌ Error scraping ${post.title}:`, err.message);
    }
    // Small delay to avoid hammering the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('🎉 Done!');
  await client.close();
}

fixSummaries().catch(console.error);
