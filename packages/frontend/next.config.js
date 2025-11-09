/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Disabled for Windows development (symlink permission issues)
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // Disable ESLint during builds (already run separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Experimental features to help with SSR issues
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'AI Service Platform',
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/:path*`,
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Disable problematic polyfills
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      // Explicitly disable localStorage polyfills on server
      ...(isServer && {
        localStorage: false,
        sessionStorage: false,
      }),
    };
    
    // Prevent localStorage from being polyfilled
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'node-localstorage': false,
      };
      
      // Fix Node.js 22 webstorage issue with Next.js DevOverlay
      config.externals = config.externals || [];
      config.externals.push({
        'node:internal/webstorage': 'commonjs node:internal/webstorage',
      });
    }
    
    return config;
  },
};

module.exports = nextConfig;
