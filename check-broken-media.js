import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();
const { MONGODB_URI } = process.env;

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const posts = db.collection('posts');
  const media = db.collection('media');

  const allPosts = await posts.find({}, {
      projection: { title: 1, slug: 1, heroImage: 1 }
  }).toArray();

  console.log(`\n📊 Checking ${allPosts.length} posts for broken/missing Hero Images:\n`);

  let countMissing = 0;
  for (const post of allPosts) {
      if (!post.heroImage) {
          console.log(`❌ Missing Image: ${post.slug}`);
          countMissing++;
          continue;
      }

      // Check if media exists
      const imgId = typeof post.heroImage === 'string' ? post.heroImage : post.heroImage.toString();
      const mediaItem = await media.findOne({ _id: imgId });
      if (!mediaItem) {
          const mediaItem2 = await media.findOne({ _id: new ObjectId(imgId) });
          if (!mediaItem2) {
            console.log(`❌ Broken Link: ${post.slug} (Image ID ${imgId} not found)`);
            countMissing++;
          }
      }
  }

  console.log(`\nDone. Found ${countMissing} issues.`);

  await client.close();
}

main().catch(console.error);
