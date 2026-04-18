/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workaround for Next.js 16.2.x _global-error prerender bug
  // See: https://github.com/vercel/next.js/issues/XXX
  experimental: {
    // Disable prerendering of error pages to avoid InvariantError
    disablePrerender: false,
  },
  output: "standalone",
};

export default nextConfig;
