import Script from 'next/script'
import React from 'react'

import { defaultTheme, themeLocalStorageKey } from '../ThemeSelector/types'

export const InitTheme: React.FC = () => {
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script
      dangerouslySetInnerHTML={{
        __html: `
  (function () {
    function themeIsValid(theme) {
      return theme === 'light' || theme === 'dark'
    }

    // Migrate old 'theme' key → 'payload-theme' for users who had the previous toggle
    var oldKey = window.localStorage.getItem('theme')
    if (themeIsValid(oldKey) && !window.localStorage.getItem('${themeLocalStorageKey}')) {
      window.localStorage.setItem('${themeLocalStorageKey}', oldKey)
      window.localStorage.removeItem('theme')
    }

    // Only restore a theme the user explicitly saved — default is always light
    var themeToSet = '${defaultTheme}'
    var preference = window.localStorage.getItem('${themeLocalStorageKey}')

    if (themeIsValid(preference)) {
      themeToSet = preference
    }

    document.documentElement.setAttribute('data-theme', themeToSet)
  })();
  `,
      }}
      id="theme-script"
      strategy="beforeInteractive"
    />
  )
}
