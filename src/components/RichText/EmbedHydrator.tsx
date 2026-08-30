'use client'

import { useEffect } from 'react'

type EmbedHydratorProps = {
  enableTwitter?: boolean
  enableInstagram?: boolean
}

const loadScript = (id: string, src: string): Promise<void> => {
  return new Promise((resolve) => {
    const existing = document.getElementById(id)
    if (existing) {
      const globalObjName = id.includes('twitter') ? 'twttr' : 'instgrm'
      if ((window as any)[globalObjName]) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => resolve())
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
        if (!isCancelled) {
          const runLoad = () => {
            if ((window as any).twttr?.widgets) {
              ;(window as any).twttr.widgets.load()
              return true
            }
            return false
          }
          if (!runLoad()) {
            // Try again with small timeouts if not fully initialized yet
            const interval = setInterval(() => {
              if (isCancelled || runLoad()) {
                clearInterval(interval)
              }
            }, 50)
            setTimeout(() => clearInterval(interval), 1000)
          }
        }
      }

      if (enableInstagram) {
        await loadScript('instagram-embed-js', 'https://www.instagram.com/embed.js')
        if (!isCancelled) {
          const runProcess = () => {
            if ((window as any).instgrm?.Embeds) {
              ;(window as any).instgrm.Embeds.process()
              return true
            }
            return false
          }
          if (!runProcess()) {
            const interval = setInterval(() => {
              if (isCancelled || runProcess()) {
                clearInterval(interval)
              }
            }, 50)
            setTimeout(() => clearInterval(interval), 1000)
          }
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
