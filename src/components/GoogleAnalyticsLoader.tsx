'use client'

import { useEffect, useState } from 'react'

export function GoogleAnalyticsLoader() {
  const [hasInteracted, setHasInteracted] = useState(false)

  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true)
      cleanup()
    }

    const cleanup = () => {
      window.removeEventListener('mousedown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('scroll', handleInteraction)
      window.removeEventListener('mousemove', handleInteraction)
    }

    // Bind listeners to detect first user interaction
    window.addEventListener('mousedown', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    window.addEventListener('scroll', handleInteraction)
    window.addEventListener('mousemove', handleInteraction)

    // Fallback: load after 4 seconds to capture passive readers who don't interact
    const timeout = setTimeout(() => {
      setHasInteracted(true)
      cleanup()
    }, 4000)

    return () => {
      cleanup()
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!hasInteracted) return

    // Avoid double injection
    if (document.getElementById('google-analytics-gtag')) return

    // Inject gtag.js
    const script = document.createElement('script')
    script.id = 'google-analytics-gtag'
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-YJ4CSJH2VC'
    script.async = true
    document.head.appendChild(script)

    // Inject config script
    const inlineScript = document.createElement('script')
    inlineScript.id = 'google-analytics'
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-YJ4CSJH2VC');
    `
    document.head.appendChild(inlineScript)
  }, [hasInteracted])

  return null
}
