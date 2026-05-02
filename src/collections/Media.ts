import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

import { STORAGE_PREFIX } from '../lib/storage-prefix'

const filename = fileURLToPath(import.meta.url)

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'prefix',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    disableLocalStorage: true,
    adminThumbnail: ({ doc }: { doc: { sizes?: { thumbnail?: { url?: string } } } }) =>
      doc.sizes?.thumbnail?.url ?? null,
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create') {
          data.prefix = STORAGE_PREFIX
        }
        return data
      },
    ],
    afterRead: [
      async ({ doc }) => {
        if (doc.filename) {
          const baseUrl = `https://media.dinasuvadu.com`
          
          // Use stored prefix if available, otherwise fallback to createdAt logic
          let folderPath = doc.prefix
          if (!folderPath) {
            const date = new Date(doc.createdAt || Date.now())
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            folderPath = `uploads/${year}/${month}`
          }

          // Set the main file URL
          doc.url = `${baseUrl}/${folderPath}/${doc.filename}`

          // Set URLs for image sizes with custom suffix
          if (doc.sizes) {
            Object.keys(doc.sizes).forEach((size) => {
              if (doc.sizes[size].filename) {
                const originalWithoutExt = doc.filename.split('.').slice(0, -1).join('.')
                const ext = doc.filename.split('.').pop()
                const width = doc.sizes[size].width
                const height = doc.sizes[size].height
                const customFilename = `${originalWithoutExt}-${width}x${height}.${ext}`
                doc.sizes[size].url = `${baseUrl}/${folderPath}/${customFilename}`
              }
            })
          }
        }
        return doc
      },
    ],
  },
}
