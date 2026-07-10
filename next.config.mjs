/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the Node-only mongodb driver out of webpack bundling; it is only
  // ever loaded at runtime on the server (lib/readout.ts).
  experimental: { serverComponentsExternalPackages: ["mongodb"] },
};
export default nextConfig;
