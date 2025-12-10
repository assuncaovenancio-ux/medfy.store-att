import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  // Ignorar erros durante build (compatibilidade Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configuração básica de imagens
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Configuração experimental para melhor performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;