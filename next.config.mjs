/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so Timeweb can run
  // `node server.js` and bind $PORT/$HOSTNAME directly — deterministic SSR deploy.
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
