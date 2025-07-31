import type { CollectionConfig } from 'payload'

import { defaultLexical } from '../../fields/defaultLexical'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from '@/fields/slug'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'posts',
          req,
        })
        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'posts',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'content',
              type: 'richText',
              editor: defaultLexical,
              label: false,
              required: true,
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            {
              name: 'relatedPosts',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              filterOptions: ({ id }) => ({
                id: { not_in: [id] },
              }),
              hasMany: true,
              relationTo: 'posts',
            },
            {
              name: 'categories',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              hasMany: true,
              relationTo: 'categories',
            },
          ],
          label: 'Meta',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: true }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      admin: { position: 'sidebar' },
      hasMany: true,
      relationTo: 'tags',
    },
    {
      name: 'authors',
      type: 'relationship',
      admin: { position: 'sidebar' },
      hasMany: true,
      relationTo: 'users',
    },
    {
      name: 'populatedAuthors',
      type: 'array',
      access: { update: () => false },
      admin: { disabled: true, readOnly: true },
      fields: [
        { name: 'id', type: 'text' },
        { name: 'name', type: 'text' },
        { name: 'slug', type: 'text' },
      ],
    },
    // Add customId field
    {
      name: 'customId',
      type: 'number',
      required: true,
      defaultValue: 0, // Will be overridden by hook
      admin: {
        hidden: true, // Hide from UI as it's managed automatically
      },
      hooks: {
        beforeChange: [
          async ({ operation, data, req }) => {
            if (operation === 'create') {
              const posts = await req.payload.find({
                collection: 'posts',
                sort: '-customId',
                limit: 1,
              })
              const lastCustomId =
                posts.docs.length > 0 && typeof posts.docs[0]?.customId === 'number'
                  ? posts.docs[0].customId
                  : 966803
              return Math.max(lastCustomId + 1, 966804)
            }
            return data?.customId || 0
          },
        ],
      },
    },
    ...slugField('title', {
      slugOverrides: {
        admin: {
          components: {
            Field: {
              path: '@/fields/slug/SlugComponent#SlugComponent',
              clientProps: { fieldToUse: 'title', checkboxFieldPath: 'slugLock' },
            },
          },
        },
      },
    }),
  ],
  hooks: {
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: { autosave: { interval: 100 }, schedulePublish: true },
    maxPerDoc: 50,
  },
}
