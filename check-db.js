import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://vseyalteam_dinasuvadu:dRGE6hKXsaYP0sGv@dinasuvadu.cjvn5gz.mongodb.net/oscardb1";
const client = new MongoClient(uri);

async function checkTamilSlugs() {
  try {
    await client.connect();
    const database = client.db('oscardb1');
    const posts = database.collection('posts');

    console.log('Searching for post with 23508 in slug...');
    const post = await posts.findOne({ slug: /23508/ });
    
    if (post) {
      console.log(`Found post: ID=${post._id}, Slug=${post.slug}`);
      // Check if it's encoded
      if (post.slug && post.slug.includes('%')) {
          console.log('   (Encoded slug detected: ' + post.slug + ')');
          console.log('   (Decoded slug: ' + decodeURIComponent(post.slug) + ')');
      } else {
          console.log('   (Slug is already decoded/Tamil: ' + post.slug + ')');
      }
    } else {
      console.log('No post found with 23508 in slug.');
    }
    
    // Check some latest posts to see their slug format
    console.log('\nLatest 5 posts slugs:');
    const latest = await posts.find().sort({ publishedAt: -1 }).limit(5).toArray();
    latest.forEach(p => {
        console.log(`Slug: ${p.slug}`);
    });

  } finally {
    await client.close();
  }
}

checkTamilSlugs();
