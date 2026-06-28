import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.dinasuvadu.com'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/_next/',
        '/login',
        '/*?utm=',
      ],
    },
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap-news`,
    ],
  }
}
