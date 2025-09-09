import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    resolveAlias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
    },
  },
  webpack: (config, { dev }) => {
    // Turbopackでない場合のみWebpackの設定を適用
    if (dev && process.env.NODE_ENV === 'development') {
      return config; // Turbopack使用時はwebpack設定をスキップ
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
    };
    return config;
  },
};

export default nextConfig;
