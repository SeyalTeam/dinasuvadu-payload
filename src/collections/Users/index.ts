import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { slugField } from '@/fields/slug'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: () => true,
    delete: authenticated,
    read: () => true, // Allow public read access
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'mobile',
      type: 'text',
    },
  ],
  timestamps: true,
}
