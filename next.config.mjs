/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for a minimal production container (ECS Fargate).
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  // Keep the AWS SDK + Prisma OUT of the webpack bundle. Webpack mis-bundles the
  // AWS SDK's @smithy chunks (build fails collecting page data); externalizing
  // lets Next's output-file-tracing copy them into the standalone server intact.
  serverExternalPackages: [
    "@aws-sdk/client-cognito-identity-provider",
    "@prisma/client",
    ".prisma/client",
  ],
  eslint: {
    // Lint is run separately in CI; don't fail the production build on lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
