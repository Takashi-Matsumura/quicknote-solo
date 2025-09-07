# Node.js 22のAlpine Linuxベースイメージを使用（軽量）
FROM node:22-alpine AS base

# 依存関係のインストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./
RUN npm ci --only=production

# ビルダーステージ
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# Next.jsアプリをビルド
# 環境変数は実行時に設定されるため、ビルド時は設定不要
RUN npm run build

# 実行用ステージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Next.jsのテレメトリーを無効化
ENV NEXT_TELEMETRY_DISABLED=1

# 実行用ユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Next.jsの静的ファイルをコピー
COPY --from=builder /app/public ./public

# Next.jsのビルド成果物をコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 本番用依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules

# .env.localファイルをコピー（存在する場合）
COPY --from=builder /app/.env.local ./.env.local* ./

# nextjsユーザーに切り替え
USER nextjs

# ポート8080を公開
EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Next.jsアプリを起動
CMD ["node", "server.js"]