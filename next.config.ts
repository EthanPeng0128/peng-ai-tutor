import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "xjhicezzrxgwfxwbvilp.supabase.co" }
    ],
  },
}

export default nextConfig
