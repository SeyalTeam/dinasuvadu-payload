import fs from 'fs';
import { parseStringPromise } from 'xml2js';

async function peek() {
  const xml = fs.readFileSync('./post.xml', 'utf8');
  const res = await parseStringPromise(xml);
  const items = res.rss.channel[0].item || [];
  
  let dates = [];
  for(const i of items){
    if(i['wp:post_type']?.[0] === 'post') {
      dates.push(i['wp:post_date']?.[0] || '');
    }
  }
  dates.sort().reverse();
  console.log('Most recent dates:', dates.slice(0, 5));
}
peek().catch(console.error);
