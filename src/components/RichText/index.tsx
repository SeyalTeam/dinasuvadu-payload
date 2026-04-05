import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import { CodeBlock, CodeBlockProps } from '@/blocks/Code/Component'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/utilities/ui'
import { EmbedHydrator } from './EmbedHydrator'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<
      CTABlockProps | MediaBlockProps | BannerBlockProps | CodeBlockProps | { url: string }
    >

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object') {
    throw new Error('Expected value to be an object')
  }
  const slug = value.slug
  return relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  blocks: {
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
    mediaBlock: ({ node }) => (
      <MediaBlock
        className="col-start-1 col-span-3"
        imgClassName="m-0"
        {...node.fields}
        captionClassName="mx-auto max-w-[48rem]"
        enableGutter={false}
        disableInnerContainer={true}
      />
    ),
    code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
    cta: ({ node }: { node: SerializedBlockNode<any> }) => <CallToActionBlock {...node.fields} />,
    embed: ({ node }: { node: SerializedBlockNode<{ url: string }> }) => (
      <div
        className="col-start-2 my-8 w-full flex justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: node.fields.url }}
      />
    ),
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

const hasValueMatch = (value: unknown, pattern: RegExp): boolean => {
  if (typeof value === 'string') return pattern.test(value)
  if (Array.isArray(value)) return value.some((item) => hasValueMatch(item, pattern))
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) =>
      hasValueMatch(item, pattern),
    )
  }
  return false
}

export default function RichText(props: Props) {
  const { className, data, enableProse = true, enableGutter = true, ...rest } = props
  const hasTwitterEmbed = hasValueMatch(
    data,
    /(twitter\.com|x\.com|platform\.twitter\.com)/i,
  )
  const hasInstagramEmbed = hasValueMatch(data, /instagram\.com/i)

  return (
    <div className="relative">
      {(hasTwitterEmbed || hasInstagramEmbed) && (
        <EmbedHydrator
          enableTwitter={hasTwitterEmbed}
          enableInstagram={hasInstagramEmbed}
        />
      )}
      <ConvertRichText
        data={data}
        converters={jsxConverters}
        className={cn(
          'payload-richtext prose md:prose-md dark:prose-invert max-w-none',
          className,
        )}
        {...rest}
      />
    </div>
  )
}
