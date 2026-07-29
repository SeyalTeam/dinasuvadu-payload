const redirects = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header',
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  const redirects = [
    internetExplorerRedirect,
    {
      source: '/:path+/amp',
      destination: '/amp/:path+',
      permanent: true,
    },
    {
      source: '/:path+/amp/',
      destination: '/amp/:path+',
      permanent: true,
    },
    {
      source: '/sitemap-news',
      destination: '/sitemap-news.xml',
      permanent: true,
    },
    {
      source: '/sitemap-post',
      destination: '/sitemap-post-1.xml',
      permanent: true,
    },
    {
      source: '/posts-sitemap.xml',
      destination: '/sitemap-post-1.xml',
      permanent: true,
    },
    {
      source: '/pages-sitemap.xml',
      destination: '/sitemap-0.xml',
      permanent: true,
    },
  ]

  return redirects
}

export default redirects
