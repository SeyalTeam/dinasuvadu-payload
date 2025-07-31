import type { Block } from 'payload'
import { Banner } from '../blocks/Banner/config'
import { Code } from '../blocks/Code/config'
import { Embed } from '../blocks/Embed/config'
import { MediaBlock } from '../blocks/MediaBlock/config'
import {
  BoldFeature,
  ItalicFeature,
  UnderlineFeature,
  StrikethroughFeature,
  ParagraphFeature,
  HeadingFeature,
  AlignFeature,
  LinkFeature,
  type LinkFields,
  UploadFeature,
  BlockquoteFeature,
  BlocksFeature,
  OrderedListFeature,
  UnorderedListFeature,
  SubscriptFeature,
  SuperscriptFeature,
  InlineCodeFeature,
  InlineToolbarFeature,
  HorizontalRuleFeature,
  FixedToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

// Define VideoBlock
const VideoBlock: Block = {
  slug: 'video',
  labels: {
    singular: 'Video',
    plural: 'Videos',
  },
  fields: [
    {
      name: 'url',
      label: 'Video URL',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'Enter the URL of the video (e.g., YouTube, Vimeo).',
      },
    },
  ],
}

export const defaultLexical = lexicalEditor({
  features: [
    ParagraphFeature(),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    StrikethroughFeature(),
    InlineToolbarFeature(),
    SubscriptFeature(),
    SuperscriptFeature(),
    InlineCodeFeature(),
    BlockquoteFeature(),
    OrderedListFeature(),
    UnorderedListFeature(),
    HorizontalRuleFeature(),
    FixedToolbarFeature(),
    AlignFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
    BlocksFeature({ blocks: [Banner, Code, MediaBlock, Embed, VideoBlock] }),
    LinkFeature({
      fields: ({ defaultFields }) => [
        ...defaultFields,
        {
          name: 'rel',
          label: 'Rel Attribute',
          type: 'select',
          hasMany: true,
          options: ['noopener', 'noreferrer', 'nofollow'],
          admin: {
            description:
              'The rel attribute defines the relationship between a linked resource and the current document. This is a custom link field.',
          },
        },
      ],
    }),
    UploadFeature({
      collections: {
        media: {
          fields: [
            {
              name: 'caption',
              type: 'text',
              label: 'Caption',
            },
            {
              name: 'alt',
              type: 'text',
              label: 'Alt Text',
            },
          ],
        },
      },
    }),
  ],
})
