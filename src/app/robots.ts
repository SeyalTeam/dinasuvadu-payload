import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = (
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'https://www.dinasuvadu.com'
  ).replace(/\/$/, '')
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/login',
        '/*?utm=',
      ],
    },
    sitemap: [
      `${baseUrl}/sitemap.xml`,
    ],
  }
}
