import type { Block } from 'payload'

export const Embed: Block = {
  slug: 'embed',
  labels: {
    singular: 'Embed',
    plural: 'Embeds',
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'Paste embed URL here (YouTube, Instagram, etc.)',
      },
    },
  ],
}
