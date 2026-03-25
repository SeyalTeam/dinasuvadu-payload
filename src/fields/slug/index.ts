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
          const isLocked = data?.slugLock !== false
          const customId = data?.customId ? `-${data.customId}` : ''
          const targetValue = data?.[fieldToUse]

          // Use the provided value or fallback to the target field's value
          let result = value

          if (isLocked && typeof targetValue === 'string') {
            // When locked, always sync with the target field (title)
            result = formatSlug(targetValue)
          } else if (typeof result === 'string' && result !== '') {
            // When unlocked, format the current value to ensure it's a valid slug
            result = formatSlug(result)
          } else if (typeof targetValue === 'string') {
            // Fallback for unlocked but empty slug
            result = formatSlug(targetValue)
          }

          if (typeof result !== 'string') return value

          // On create or if customId is missing, append it
          if (customId && !result.includes(customId)) {
            return `${result}${customId}`
          }

          return result
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
