import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erosia.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/onboarding', '/admin', '/chat/', '/settings/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
