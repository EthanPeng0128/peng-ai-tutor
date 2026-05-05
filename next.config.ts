import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    domains: ["xjhicezzrxgwfxwbvilp.supabase.co"],
  },
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
    responseLimit: "10mb",
  },
}

export default nextConfig
