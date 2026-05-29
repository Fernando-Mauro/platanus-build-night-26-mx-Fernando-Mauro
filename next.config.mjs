/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for containerized deploy (App Runner) per plan.md.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
