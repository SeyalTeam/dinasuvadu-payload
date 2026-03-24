import fs from 'fs';
import { parseStringPromise } from 'xml2js';

async function countPosts() {
  const xml = fs.readFileSync('./post.xml', 'utf8');
  const res = await parseStringPromise(xml);
  const items = res.rss.channel[0].item || [];
  let num = 0;
  for(const i of items){
    if(i['wp:post_type']?.[0] === 'post') {
      const date = i['wp:post_date']?.[0] || '';
      const pubDate = i['pubDate']?.[0] || '';
      // March 21, 2026 string checks
      if (date.startsWith('2026-03-21') || pubDate.includes('21 Mar 2026')) {
        num++;
      }
    }
  }
  console.log('---TRIAL_COUNT_IS: ' + num + '---');
}
countPosts().catch(console.error);
