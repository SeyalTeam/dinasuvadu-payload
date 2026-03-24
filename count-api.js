import fetch from 'node-fetch';

async function countApi() {
  const url = 'https://dinasuvadu17107.e.wpstage.net/wp-json/wp/v2/posts?after=2026-03-20T18:30:00Z&before=2026-03-21T18:30:00Z&per_page=100';
  const auth = Buffer.from('blogvault:5120d378').toString('base64');
  
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  
  if (!res.ok) {
    console.error('Failed to fetch:', res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log(`TOTAL_API_POSTS_MARCH_21: ${data.length}`);
}
countApi().catch(console.error);
