# QuickNote Solo

個人用1行メモPWA - オフラインでも使える簡単メモアプリ

## 🚀 特徴

- **📱 PWA対応**: スマホにアプリとしてインストール可能
- **⚡ オフライン動作**: インターネット接続なしでも利用可能
- **🔍 高速検索**: リアルタイムでメモを検索
- **🏷️ タグ機能**: メモの分類とフィルタリング
- **📍 位置情報**: オプションで現在地を記録
- **📊 期間フィルタ**: 今日/7日間/30日間/全期間でメモを絞り込み
- **📤 エクスポート/インポート**: JSON/CSV/Markdown形式でデータ管理
- **🎯 ピン機能**: 重要なメモを上部に固定
- **📲 レスポンシブデザイン**: モバイルファースト設計

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15 + TypeScript
- **UI**: Tailwind CSS + react-icons
- **データベース**: IndexedDB (idb)
- **PWA**: Service Worker + Web App Manifest
- **デプロイ**: Vercel

## 📱 インストール方法

### スマホ（推奨）
1. ブラウザでアプリにアクセス
2. 「ホーム画面に追加」を選択
3. PWAアプリとしてインストール完了

### デスクトップ
1. Chrome/Edgeでアプリにアクセス  
2. アドレスバーの「インストール」アイコンをクリック

## 🏃‍♂️ 開発環境セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# リンター実行
npm run lint

# 型チェック
npm run typecheck

# フォーマット
npm run format
```

開発サーバー起動後、[http://localhost:3000](http://localhost:3000) でアクセス可能

## 📁 プロジェクト構成

```
quicknote-solo/
├── app/                    # Next.js App Router
│   ├── (about)/           # About ページ
│   ├── (settings)/        # 設定ページ
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # メインページ
├── components/            # React コンポーネント
│   ├── NoteInputBar.tsx   # メモ入力バー
│   ├── NoteList.tsx       # メモリスト
│   ├── SearchBar.tsx      # 検索バー
│   └── ...
├── lib/                   # ユーティリティ
│   ├── db/               # IndexedDB操作
│   ├── export/           # エクスポート機能
│   ├── import/           # インポート機能
│   ├── geo/              # 位置情報取得
│   └── models/           # TypeScript型定義
├── public/               # 静的ファイル
│   ├── manifest.json     # PWAマニフェスト
│   ├── sw.js            # Service Worker
│   └── icon-*.png       # PWAアイコン
└── vercel.json          # Vercel設定
```

## 🎮 使い方

### 基本操作
- **メモ追加**: 下部入力欄に入力してShift+Enterで送信
- **検索**: 上部検索バーで部分一致検索
- **タグフィルタ**: タグをタップしてフィルタリング
- **期間フィルタ**: 今日/7日/30日/全期間で絞り込み

### 高度な機能  
- **ピン留め**: メモをスワイプして重要マークを付ける
- **削除**: メモをスワイプして削除
- **位置情報**: 設定で有効化すると現在地を自動記録
- **データ管理**: 設定からエクスポート/インポート

## 🌟 PWA機能

- **オフライン動作**: Service Workerによりネット接続なしでも利用可能
- **アプリライク**: ホーム画面から直接起動
- **プッシュ通知**: 将来の機能拡張に対応
- **自動更新**: 新バージョンの自動インストール

## 🚀 デプロイ

このプロジェクトはVercelでホスティングされています。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Takashi-Matsumura/quicknote-solo)

## 📄 ライセンス

MIT License
