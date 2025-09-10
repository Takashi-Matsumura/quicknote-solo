import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    optimizeCss: false, // CSS最適化を無効にしてHMRを改善
  },
  // ETagを無効化
  generateEtags: false,
  turbopack: {
    resolveAlias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
    },
  },
  webpack: (config, { dev, isServer }) => {
    // 開発環境でのWebpack設定
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
    };

    // 本番環境でconsole.logを削除（クライアントサイドのみ）
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
    }

    return config;
  },
  // セキュリティヘッダーの設定
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    const headers = [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://accounts.google.com",
          "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://accounts.google.com wss://*.firebaseio.com",
          "img-src 'self' data: blob: https:",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
          "font-src 'self' https://fonts.gstatic.com",
          "frame-src 'self' https://accounts.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; ')
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'Access-Control-Allow-Origin',
        value: '*'
      },
      {
        key: 'Access-Control-Allow-Methods',
        value: 'GET, POST, PUT, DELETE, OPTIONS'
      },
      {
        key: 'Access-Control-Allow-Headers',
        value: 'Content-Type, Authorization'
      }
    ];

    // 開発環境での強力なキャッシュ無効化
    if (isDev) {
      headers.push(
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0'
        },
        {
          key: 'Pragma',
          value: 'no-cache'
        },
        {
          key: 'Expires',
          value: '0'
        },
        {
          key: 'Surrogate-Control',
          value: 'no-store'
        },
        {
          key: 'ETag',
          value: `"${Date.now()}"`
        }
      );
    } else {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      });
    }

    return [
      {
        source: '/(.*)',
        headers
      }
    ];
  },
  // 環境変数の公開設定
  publicRuntimeConfig: {
    NODE_ENV: process.env.NODE_ENV || 'development',
  }
};

export default nextConfig;
