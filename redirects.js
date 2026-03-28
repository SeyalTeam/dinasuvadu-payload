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
      source: '/posts-sitemap.xml',
      destination: '/sitemap-post?page=1',
      permanent: false,
    },
    {
      source: '/pages-sitemap.xml',
      destination: '/sitemap-0.xml',
      permanent: false,
    },
  ]

  return redirects
}

export default redirects
