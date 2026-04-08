import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'
import { CommentDrawerProvider } from './CommentDrawer'
import { LoginModalProvider } from './LoginModal'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <HeaderThemeProvider>
        <CommentDrawerProvider>
          <LoginModalProvider>
            {children}
          </LoginModalProvider>
        </CommentDrawerProvider>
      </HeaderThemeProvider>
    </ThemeProvider>
  )
}
