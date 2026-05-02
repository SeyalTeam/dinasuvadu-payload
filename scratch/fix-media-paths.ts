import { getPayload } from 'payload'
import config from './src/payload.config'

async function fixMediaPaths() {
  const payload = await getPayload({ config })
  
  // Find media created in May 2026
  const startOfMay = new Date('2026-05-01T00:00:00Z')
  const endOfMay = new Date('2026-05-31T23:59:59Z')

  console.log('Searching for media created in May 2026...')

  const { docs } = await payload.find({
    collection: 'media',
    where: {
      createdAt: {
        greater_than_equal: startOfMay.toISOString(),
        less_than_equal: endOfMay.toISOString(),
      },
    },
    limit: 1000,
  })

  console.log(`Found ${docs.length} documents to fix.`)

  for (const doc of docs) {
    console.log(`Fixing ${doc.filename}...`)
    await payload.update({
      collection: 'media',
      id: doc.id,
      data: {
        prefix: 'uploads/2026/04',
      },
    })
  }

  console.log('Done!')
  process.exit(0)
}

fixMediaPaths()
