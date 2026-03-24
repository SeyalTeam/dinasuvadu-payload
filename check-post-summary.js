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
  console.log(`\n🔍 Checking Post: ${slug}\n`);

  const post = await posts.findOne({ slug });

  if (!post) {
    console.log('Post not found in the database.');
  } else {
    console.log('--- META DATA ---');
    console.log('Meta Title:', post.meta?.title);
    console.log('Meta Description (Summary):', post.meta?.description);
    
    console.log('\n--- CONTENT ---');
    if (post.content && post.content.root && post.content.root.children) {
        const firstChildren = post.content.root.children[0];
        if (firstChildren && firstChildren.children) {
            console.log('First Content Paragraph:', firstChildren.children[0]?.text);
        } else {
            console.log('Content structure is empty or different.');
        }
    } else {
        console.log('No lexical content found.');
    }
    
    if (post.meta?.description && post.content?.root?.children?.[0]?.children?.[0]?.text?.includes(post.meta.description.substring(0, 50))) {
        console.log('\n⚠️ WARNING: Summary is identical or highly similar to the first paragraph.');
    } else {
        console.log('\n✅ Summary is unique from the content.');
    }
  }

  await client.close();
}

main().catch(console.error);
