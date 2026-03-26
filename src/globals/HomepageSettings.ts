import { GlobalConfig } from 'payload'

export const HomepageSettings: GlobalConfig = {
  slug: 'homepage-settings',
  label: 'Homepage Categories',
  admin: {
    description: 'Control which categories appear on the homepage and their exact order.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      maxRows: 20,
      admin: {
        description: 'Select and drag to order the categories you want to display on the homepage.',
      },
    },
  ],
}
