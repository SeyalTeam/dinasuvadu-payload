'use client'

import { useEffect } from 'react'

export function EmbedHydrator() {
  useEffect(() => {
    // Process Twitter
    if ((window as any).twttr?.widgets) {
      ;(window as any).twttr.widgets.load()
    }
    // Process Instagram
    if ((window as any).instgrm?.Embeds) {
      ;(window as any).instgrm.Embeds.process()
    }
  }, [])

  return null
}
