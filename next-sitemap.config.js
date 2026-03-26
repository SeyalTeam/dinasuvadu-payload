/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dinasuvadu.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
  exclude: ['/admin', '/admin/*', '/server-sitemap.xml'], // Exclude Payload admin routes
  // Optional: generate index sitemap (useful if you have > 50k URLs)
  generateIndexSitemap: true,
  // Add server-side sitemap if doing dynamic extensive routing in the future
  robotsTxtOptions: {
    additionalSitemaps: [
      // 'https://www.dinasuvadu.com/server-sitemap.xml', // Example
    ],
  },
}
