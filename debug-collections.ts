import { getPayload } from 'payload'
import config from './src/payload.config'

async function checkCollections() {
  const payload = await getPayload({ config })
  console.log('Registered Collections:', payload.collections.map(c => c.config.slug))
  process.exit(0)
}

checkCollections()
