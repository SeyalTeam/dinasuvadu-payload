import { getPayload } from 'payload';
import config from './src/payload.config.js';

async function checkSlugs() {
  const payload = await getPayload({ config });
  const posts = await payload.find({
    collection: 'posts',
    limit: 10,
  });

  posts.docs.forEach(post => {
    console.log(`ID: ${post.id}, Slug: ${post.slug}`);
    if (post.slug && post.slug.includes('%')) {
        console.log(`   (Encoded slug detected: ${post.slug})`);
    }
  });
  
  // Specifically look for a post with a Tamil-like slug or one the user mentioned
  const tamilPost = await payload.find({
    collection: 'posts',
    where: {
        slug: {
            contains: '23508'
        }
    }
  });
  
  console.log('\nSearch result for 23508:');
  tamilPost.docs.forEach(post => {
      console.log(`ID: ${post.id}, Slug: ${post.slug}`);
  });

  process.exit(0);
}

checkSlugs();
