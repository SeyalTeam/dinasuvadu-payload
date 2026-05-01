import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'

export const Comments: CollectionConfig = {
  slug: 'comments',
  access: {
    read: () => true,
    create: () => true, 
    update: authenticated,
    delete: authenticated,
    admin: authenticated,
  },
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['user', 'post', 'status', 'createdAt'],
    group: 'User Engagement',
    description: 'Manage user comments on posts.',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Approved',
          value: 'approved',
        },
        {
          label: 'Rejected',
          value: 'rejected',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
