import type { CheckboxField, TextField } from 'payload'
import { formatSlug } from './formatSlug'

type Overrides = {
  slugOverrides?: Partial<TextField>
  checkboxOverrides?: Partial<CheckboxField>
}

type Slug = (fieldToUse?: string, overrides?: Overrides) => [TextField, CheckboxField]

export const slugField: Slug = (fieldToUse = 'title', overrides = {}) => {
  const { slugOverrides, checkboxOverrides } = overrides

  const checkBoxField: CheckboxField = {
    name: 'slugLock',
    type: 'checkbox',
    defaultValue: true,
    admin: {
      hidden: true,
      position: 'sidebar',
    },
    ...checkboxOverrides,
  }

  // @ts-expect-error - ts mismatch Partial<TextField> with TextField
  const slugField: TextField = {
    name: 'slug',
    type: 'text',
    index: true,
    label: 'Slug',
    ...(slugOverrides || {}),
    hooks: {
      beforeChange: [
        ({ data, value, operation }) => {
          const isUnlocked = !data?.slugLock
          const customId = data?.customId ? `-${data.customId}` : ''
          if (isUnlocked && data?.[fieldToUse] && typeof data[fieldToUse] === 'string') {
            // Handle manual slug input when unlocked
            if (value && typeof value === 'string' && value.trim() !== '') {
              // If user enters a custom slug, append customId only if not already present
              if (!value.includes(customId)) {
                return `${value}${customId}`
              }
              return value
            }
            // If no manual input, generate slug from title and append customId on create
            const defaultSlug = formatSlug(data[fieldToUse])
            if (operation === 'create' || !value?.includes(customId)) {
              return `${defaultSlug}${customId}`
            }
            return value
          }
          // If locked, return the existing value or let it be handled by default
          return value
        },
      ],
    },
    admin: {
      position: 'sidebar',
      ...(slugOverrides?.admin || {}),
      components: {
        Field: {
          path: '@/fields/slug/SlugComponent#SlugComponent',
          clientProps: {
            fieldToUse,
            checkboxFieldPath: checkBoxField.name,
          },
        },
      },
    },
  }

  return [slugField, checkBoxField]
}
