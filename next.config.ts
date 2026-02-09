import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use static export for WPF + Blazor architecture
  // This generates static HTML/CSS/JS that Blazor can serve
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Keep external packages configuration
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
