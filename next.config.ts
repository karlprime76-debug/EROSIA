import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, '')
  : '*.supabase.co'

const cspScriptSrc = process.env.NODE_ENV === 'development'
  ? `'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live`
  : `'self' 'unsafe-inline' https://vercel.live`

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    deviceSizes: [640, 768, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: `default-src 'self'; script-src ${cspScriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://${supabaseUrl} wss://${supabaseUrl} https://raw.githubusercontent.com https://vercel.live wss://*.vercel.live; frame-src 'self' https://vercel.live https://verification.didit.me https://*.didit.me; object-src 'none'; base-uri 'self'; form-action 'self'` },
        ],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: '/:all+(svg|png|jpg|jpeg|gif|webp|avif|ico)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }],
      },
    ]
  },
  reactStrictMode: true,
};

export default nextConfig;
