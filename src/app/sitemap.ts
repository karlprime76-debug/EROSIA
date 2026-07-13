import type { MetadataRoute } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://erosia.app').replace(/\/+$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1.0 },
    { url: `${siteUrl}/welcome`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${siteUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${siteUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${siteUrl}/cgu`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${siteUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${siteUrl}/safety`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.5 },
  ]
  return staticRoutes
}
