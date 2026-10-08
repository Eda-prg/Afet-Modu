/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost/api',
    NEXT_PUBLIC_SSE_URL: process.env.NEXT_PUBLIC_SSE_URL || 'http://localhost/api/agent/stream',
  },
}

module.exports = nextConfig
