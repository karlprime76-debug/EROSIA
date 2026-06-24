import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'vxycbjwmovfzywyvrjql.supabase.co' },
    ],
  },
};

export default nextConfig;
