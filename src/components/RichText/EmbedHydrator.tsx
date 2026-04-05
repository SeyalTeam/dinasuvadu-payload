'use client'

import { useEffect } from 'react'

type EmbedHydratorProps = {
  enableTwitter?: boolean
  enableInstagram?: boolean
}

const loadScript = (id: string, src: string): Promise<void> => {
  return new Promise((resolve) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.body.appendChild(script)
  })
}

export function EmbedHydrator({ enableTwitter, enableInstagram }: EmbedHydratorProps) {
  useEffect(() => {
    let isCancelled = false

    const hydrateEmbeds = async () => {
      if (enableTwitter) {
        await loadScript('twitter-widgets-js', 'https://platform.twitter.com/widgets.js')
        if (!isCancelled && (window as any).twttr?.widgets) {
          ;(window as any).twttr.widgets.load()
        }
      }

      if (enableInstagram) {
        await loadScript('instagram-embed-js', 'https://www.instagram.com/embed.js')
        if (!isCancelled && (window as any).instgrm?.Embeds) {
          ;(window as any).instgrm.Embeds.process()
        }
      }
    }

    void hydrateEmbeds()

    return () => {
      isCancelled = true
    }
  }, [enableInstagram, enableTwitter])

  return null
}
