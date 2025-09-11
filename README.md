# QuickNote Solo

個人用メモアプリ - オフラインでも使える簡単メモアプリ

## 🚀 特徴

- **📱 PWA対応**: スマホにアプリとしてインストール可能
- **⚡ オフライン動作**: インターネット接続なしでも利用可能
- **🎤 音声入力**: スマホは大型ボタンでワンタップ操作、PCは切り替え式（Web Speech API使用）
- **🔍 高速検索**: アイコンクリックで検索フィールド展開、リアルタイム検索
- **🏷️ タグ機能**: メモの分類とフィルタリング
- **📍 位置情報**: オプションで現在地を記録
- **📊 期間フィルタ**: 今日/7日間/30日間/全期間でメモを絞り込み
- **📤 エクスポート**: CSV形式でデータ管理
- **🎯 ピン機能**: 重要なメモを上部に固定
- **🛡️ 安全削除**: スワイプ操作でのみ削除可能（誤削除防止）
- **📝 複数行対応**: Enterで改行、Shift+Enterで送信
- **🖱️ PC対応**: ダブルクリックで削除メニュー表示
- **☁️ クラウド同期**: Firebase連携でデバイス間同期（オプション）
- **🔐 3層セキュリティ**: Google OAuth + TOTP認証 + デバイス認証による最高レベル保護
- **📱 クロスデバイス対応**: PC・スマートフォン間でTOTPシークレット共有、同一認証システム
- **🖥️ デバイス認証**: ハードウェアフィンガープリント（WebGL・Canvas・システム情報）による端末識別
- **🔒 強化暗号化**: Google UID + AES暗号化でシークレットキーを安全保存
- **🛡️ セキュリティヘッダー**: XSS、CSRF、クリックジャッキング対策完備
- **🔐 プライベート**: 個人のFirebaseプロジェクトで完全プライベート
- **📋 ワンクリック設定**: Firebase ConsoleからJSON一括コピー&ペースト
- **🔄 形式自動認識**: JavaScript/JSON形式を自動判別・変換
- **📲 レスポンシブデザイン**: デバイス自動判定とUI最適化、モバイルファースト設計

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15 + TypeScript + Turbopack
- **UI**: Tailwind CSS + react-icons
- **データベース**: IndexedDB (ローカル) / Firestore (クラウド)
- **認証**: 3層セキュリティ (Google OAuth + TOTP + デバイス認証) + Firebase Authentication
- **セキュリティ**: AES暗号化 (crypto-js) + セキュリティヘッダー
- **音声認識**: Web Speech API
- **PWA**: Service Worker + Web App Manifest
- **デプロイ**: Vercel + セキュリティ最適化

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

# 本番ビルド（Turbopack対応）
npm run build

# リンター実行
npm run lint

# 型チェック
npm run typecheck

# フォーマット
npm run format
```

開発サーバー起動後、[http://localhost:3000](http://localhost:3000) でアクセス可能

### 🔒 本番デプロイ時のセキュリティ

本番環境へのデプロイ前に、**必ず** `DEPLOYMENT_SECURITY.md` のチェックリストを実行してください：

```bash
# セキュリティガイドを確認
cat DEPLOYMENT_SECURITY.md

# 機密情報の確認
git log --all --grep="API" --grep="key" --grep="secret" -i

# 依存関係の脆弱性チェック
npm audit --audit-level=moderate
```

## 🐳 Docker対応

Dockerコンテナでアプリを実行できます。

### Docker Compose での起動

```bash
# 環境変数ファイルを準備（Firebase設定）
cp .env.example .env.local
# .env.localを編集してFirebase設定を入力

# Docker Composeでビルド・起動
docker-compose up --build

# またはデタッチドモードで起動
docker-compose up --build -d
```

**アクセス:** http://localhost:8080

### Dockerfileのみでの起動

```bash
# Docker イメージをビルド
docker build -t quicknote-solo .

# コンテナを起動（環境変数ファイル込み）
docker run -p 8080:8080 --env-file .env.local quicknote-solo
```

### Docker環境での注意事項

- **環境変数ファイル**: `.env.local`が自動的にコンテナ内にコピーされます
- **ポート**: デフォルトで8080ポートを使用（docker-compose.ymlで変更可能）
- **Firebase設定**: 環境変数で設定されていれば自動的に認識されます

## ☁️ Firebase設定（クラウド同期・オプション）

デバイス間でメモを同期したい場合は、個人のFirebaseプロジェクトを設定できます。

**設定方法は3つから選択可能：**
1. **🔧 環境変数設定（推奨）** - 永続化、開発・本番環境対応
2. **📋 画面からJSON一括設定** - ワンクリック設定
3. **✏️ 画面から手動入力** - 個別フィールド入力

### 1. Firebase プロジェクトの作成

1. **Firebase Console**にアクセス: https://console.firebase.google.com/
2. **新しいプロジェクト**を作成
   - プロジェクト名を入力（例：quicknote-solo）
   - Googleアナリティクスの設定（任意）
3. プロジェクト作成完了後、プロジェクトダッシュボードに移動

### 2. Cloud Firestore API の有効化

1. **Google Cloud Console**にアクセス: https://console.cloud.google.com/
2. プロジェクトを選択（作成したFirebaseプロジェクトと同じ）
3. **APIとサービス** → **ライブラリ**
4. 「Cloud Firestore API」を検索して**有効にする**

### 3. Firestore Database の作成

1. Firebase Consoleに戻り、**Firestore Database**を選択
2. **データベースを作成**をクリック
3. セキュリティルールの選択:
   - **テストモードで開始**を選択（後で本番ルールに変更）
4. ロケーションを選択:
   - **asia-northeast1 (東京)** を推奨
5. データベース作成完了

### 4. ウェブアプリの追加

1. Firebase プロジェクトの**プロジェクトの概要**
2. **ウェブアプリを追加**（`</>`アイコン）
3. アプリ名を入力（例：QuickNote Solo）
4. **Firebase SDK の追加**で表示される**Config**情報をコピー:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

### 5. アプリでFirebase設定

#### 🔧 **方法1: 環境変数設定（推奨）**

**永続化設定でFirebase設定を毎回入力する手間を省きます。**

1. プロジェクトルートの `.env.example` を `.env.local` にコピー
   ```bash
   cp .env.example .env.local
   ```

2. `.env.local` を編集してFirebase設定値を入力：
   ```bash
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789
   ```

3. アプリを再起動
   ```bash
   npm run dev
   ```

4. 設定画面で環境変数設定が認識されていることを確認（緑色の✅マーク表示）
5. ストレージタイプを「Firebaseクラウド」に変更

**メリット：**
- ✅ 永続化されるため毎回設定不要
- ✅ 開発・本番環境で設定を分離可能
- ✅ Docker環境でも対応

---

#### 📋 **方法2: 画面からJSON一括設定**

1. QuickNote Solo を開き、**設定 → クラウドストレージ設定**
2. Firebase設定の入力方法を選択：

**JSON形式（ワンクリック設定）**
- **JSON/手動切り替え**で「JSON」を選択
- Firebase Console の Config を**そのままコピー&ペースト**

**対応形式:**
```javascript
// JavaScript形式（Firebase Console からコピー）
{
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef..."
}

// JSON形式
{
  "apiKey": "AIzaSyC...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abcdef..."
}
```

---

#### ✏️ **方法3: 画面から手動入力**

- **JSON/手動切り替え**で「手動」を選択
- 各フィールドに個別入力：
   - **API Key**: `apiKey`の値
   - **Auth Domain**: `authDomain`の値
   - **Project ID**: `projectId`の値
   - **Storage Bucket**: `storageBucket`の値
   - **Messaging Sender ID**: `messagingSenderId`の値
   - **App ID**: `appId`の値

**設定完了後：**
1. **Firebaseに接続**をクリック
2. **ストレージタイプ**を「Firebaseクラウド」に変更

### 6. セキュリティルールの設定

Firebase Console → **Firestore Database** → **ルール**で以下に変更：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{document} {
      // 匿名認証ユーザーの読み取りと書き込みを許可
      allow read, write, create, update, delete: if request.auth != null;
      
      // より厳格なルール（オプション）:
      // allow read, write: if request.auth != null && 
      //   (request.auth.uid == resource.data.userId || resource == null);
      // allow create: if request.auth != null && 
      //   request.auth.uid == request.resource.data.userId;
    }
  }
}
```

**重要**: 最初は上記のシンプルなルール（`allow read, write, create, update, delete: if request.auth != null;`）を使用してください。WebChannel接続が安定してから、より厳格なルールに変更することを推奨します。

### 7. 動作確認

1. QuickNote Solo でメモを作成
2. Firebase Console → **Firestore Database** → **データ**
3. `notes`コレクションが自動作成され、メモが保存されていることを確認

### 💡 **設定のコツ**
- **📱 スマホ**: JSON形式でコピペが圧倒的に簡単
- **🖥️ PC**: 手動入力でも問題なし
- **🔍 デバッグ**: 設定画面下部の「現在の設定値」で確認
- **⚡ 高速**: JavaScript形式も自動で正しく読み込まれます

🎉 **設定完了！** これでデバイス間でメモが自動同期されます！

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
│   ├── auth/             # 認証システム
│   │   ├── session.ts    # セッション管理
│   │   ├── deviceAuth.ts # デバイス認証
│   │   ├── enhancedSession.ts # 拡張セッション
│   │   └── googleAuth.ts # Google認証
│   ├── db/               # データベース操作
│   │   ├── database.ts   # 統合データベースインターフェース
│   │   ├── indexedDb.ts  # IndexedDB操作（ローカル）
│   │   └── firestore.ts  # Firestore操作（クラウド）
│   ├── firebase/         # Firebase設定
│   │   ├── config.ts     # Firebase初期化
│   │   └── auth.ts       # Firebase認証
│   ├── utils/            # ユーティリティ関数
│   │   ├── device.ts     # デバイス判定機能
│   │   ├── secureStorage.ts # セキュアストレージ
│   │   ├── enhancedSecureStorage.ts # 拡張セキュアストレージ
│   │   ├── errorHandler.ts # エラーハンドリング
│   │   └── logger.ts     # ログシステム
│   ├── export/           # エクスポート機能
│   ├── import/           # インポート機能
│   ├── geo/              # 位置情報取得
│   ├── speech/           # 音声認識機能
│   ├── settings/         # 設定管理
│   └── models/           # TypeScript型定義
├── public/               # 静的ファイル
│   ├── manifest.json     # PWAマニフェスト
│   ├── sw.js            # Service Worker
│   └── icon-*.png       # PWAアイコン
├── .env.example          # 環境変数テンプレート
├── DEPLOYMENT_SECURITY.md # デプロイセキュリティガイド
├── Dockerfile            # Docker設定
├── docker-compose.yml    # Docker Compose設定
├── .dockerignore         # Docker除外ファイル
└── vercel.json          # Vercel設定（セキュリティヘッダー含む）
```

## 🎮 使い方

### 📱 スマホでの基本操作
- **音声メモ作成**: 大きなマイクボタンをタップ → 音声入力 → 再度タップで自動保存
- **検索**: 🔍アイコンをタップして検索フィールドを展開
- **タグフィルタ**: タグをタップしてフィルタリング
- **期間フィルタ**: 今日/7日間/30日間/全期間で絞り込み（検索時は自動非表示）

### 🖥️ PCでの基本操作  
- **テキストメモ**: 下部入力欄にタイピング、送信ボタンまたはShift+Enterで保存
- **音声入力**: 右端のマイクボタン🎤をクリック → 音声モードで入力 → 自動でテキストモードに復帰
- **改行**: Enterキーで改行、Shift+Enterで送信
- **検索**: 🔍アイコンをクリックして検索フィールドを展開

### 高度な機能  
- **ピン留め**: 📌ボタンで重要なメモを上部に固定
- **安全削除**: メモを左スワイプ（PCではダブルクリック）して削除ボタンを表示→タップで削除
- **タグ編集**: 🏷️ボタンでタグの追加・編集
- **位置情報**: メモ入力左横の位置アイコンクリックでON/OFF切り替え
- **データ管理**: 設定「危険な操作」タブからCSVエクスポート

### 🔐 クロスデバイス認証の使い方
1. **最初のデバイス設定**：
   - Google認証 → 「新しいTOTP設定を作成」→ QRコードをAuthenticatorアプリでスキャン
   - 6桁コード入力でデバイス登録完了

2. **2台目のデバイス追加**：
   - Google認証 → 「既存のシークレットキーを入力」
   - 設定画面「認証設定」タブからシークレットキーをコピー → 新デバイスに貼り付け
   - 同じAuthenticatorアプリの6桁コードで認証 → デバイス登録完了

3. **以降の利用**：
   - 登録済みデバイスは自動ログイン
   - メモデータが全デバイスで同期

### 設定画面の使い方（タブ化UI）
- **🎤 音声入力**: 自動送信設定・言語選択・ブラウザ対応状況
- **☁️ クラウド**: Firebase設定・ストレージタイプ選択・環境変数設定
- **🔐 認証設定**: TOTPシークレット表示・他デバイス用キー管理・クロスデバイス設定
- **⚠️ 危険な操作**: エクスポート機能・全データ削除

### メインヘッダー機能
- **☰ ランチャー**: スライドメニューで機能へアクセス
  - **🔤 文字サイズ**: 3段階（小・中・大）でメモの文字サイズを変更
  - **🔄 同期**: 手動でデータ同期を実行
  - **⚙️ 設定**: 設定画面を開く
  - **ℹ️ 情報**: アプリ情報をモーダル表示
- **🚪 ログアウト**: 確認ダイアログ付きでログアウト

## 🌟 PWA機能

- **オフライン動作**: Service Workerによりネット接続なしでも利用可能
- **アプリライク**: ホーム画面から直接起動、ネイティブアプリ風UI
- **インストール可能**: ブラウザからワンクリックでインストール
- **自動更新**: 新バージョンの自動インストール
- **高速起動**: PWA最適化により瞬時に起動

## 🚀 デプロイ

このプロジェクトはVercelでホスティングされています。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Takashi-Matsumura/quicknote-solo)

## ✨ 最新アップデート

### v6.4.0 - UI改善と文字サイズ変更機能 📱✨
- **☰ ランチャーメニュー**: ヘッダーアイコンをスライドランチャーに統合、スマホ最適化
- **🔤 文字サイズ変更**: 3段階（小・中・大）でメモテキストサイズをリアルタイム変更
- **🎨 アニメーション強化**: 右から左へスライド展開、外側クリックで自動閉じ
- **📱 レスポンシブ強化**: モバイル・デスクトップ両対応、Context APIで状態管理
- **⚡ パフォーマンス向上**: TypeScript型安全性とReact最適化
- **🎯 UX向上**: ヘッダーすっきり、アクセス性向上、現在設定の視覚的フィードバック

### v6.3.0 - クロスデバイスTOTPシークレット共有機能 📱🔄
- 🔐 **デバイス選択画面**: 新規TOTP設定作成 vs 既存シークレット入力の選択UI
- 📋 **シークレット共有**: 他デバイスからBase32形式シークレットキーを入力して同一認証
- 🔄 **自動フォーマット**: 大文字変換・無効文字除去で入力ミス防止
- 🛡️ **セキュア認証フロー**: Google OAuth → デバイス選択 → TOTP認証 → デバイス登録
- 📱 **クロスプラットフォーム**: PC・スマートフォン間で同じメモデータアクセス
- ⚡ **自動セッション復元**: 既存デバイスでの即座ログイン、新デバイス検出時の安全な登録
- 🎯 **バリデーション強化**: シークレットキー長さチェック・エラーハンドリング
- 🔄 **シームレス体験**: 一度設定すれば全デバイスで同じ認証体験

### v6.2.0 - UI/UX大幅改善とセキュリティ安定化 🎨🛡️
- 🎨 **設定画面タブ化**: 音声入力・クラウド・認証設定・危険な操作の4タブでスマホ最適化
- 📱 **ヘッダー統合**: ログアウト・アプリ情報をメインヘッダーに統合、アクセス性向上
- 📋 **情報モーダル化**: アプリ情報を美しいモーダル表示、主要機能一覧付き
- 🔧 **暗号化システム安定化**: 時間依存要素除去で安定したTOTPシークレット保存
- 💾 **データ自動修復**: 古い暗号化データの自動クリア・案内メッセージ表示
- 🎯 **レイアウト最適化**: エクスポート・データ削除の横並び表示
- 📋 **タブナビゲーション**: 直感的なタブ切り替えでスクロール削減
- 🔄 **レスポンシブ強化**: モバイル・デスクトップ両対応のグリッドレイアウト

### v6.1.0 - エンタープライズレベル3層セキュリティシステム完成 🛡️
- 🔐 **3層防御システム**: Google OAuth + TOTP認証 + デバイス認証による最高レベルのセキュリティ
- 🖥️ **デバイスフィンガープリント**: ハードウェア情報・WebGL・Canvas指紋による一意デバイス識別
- 🔑 **強化暗号化**: Google UID + AES暗号化によるシークレットキー保護
- 🌐 **クロスデバイス管理**: 登録済みデバイス管理とセキュアな新端末登録フロー
- 🛡️ **攻撃耐性**: パスワード漏洩・TOTP漏洩・デバイス盗難への多層防御
- 📱 **シームレスUX**: 登録済みデバイスでの自動認証と未登録端末の安全な登録
- 🔄 **セッション永続化**: ログアウト後もシークレットキー保持で再ログイン簡素化
- 💎 **個人利用最適化**: GitHubパブリック対応・学習目的でのセキュリティ実装

### v6.0.0 - セキュリティ基盤強化とVercelデプロイ対応 🔒
- 🔐 **暗号化機能強化**: TOTPシークレットキーのAES暗号化保存でセキュリティ大幅向上
- 🌐 **Vercel最適化**: セキュリティヘッダー設定とパフォーマンス最適化でプロダクション対応
- 🛡️ **Google認証統合**: Google One Tap、OAuth、Apps Scriptによる包括的な認証システム
- 📋 **セキュリティガイド**: DEPLOYMENT_SECURITY.mdによるデプロイ時のセキュリティチェックリスト
- ⚡ **ビルド最適化**: Turbopack対応でビルド速度向上とNext.js 15完全対応
- 🎯 **エラーハンドリング**: 統一されたエラー管理とログシステム
- 💾 **セキュアストレージ**: 暗号化されたローカルストレージ管理

### v5.0.0 - TOTP認証システム導入
- 🔐 **TOTP認証**: Time-based One-Time Password認証システムでセキュアなクロスデバイス同期
- 📱 **QRコード設定**: AuthenticatorアプリでのQRコードスキャン対応
- 🔑 **シークレットキー入力**: 手動でのシークレットキー入力も対応
- 🔄 **自動認証**: 6桁入力完了時の自動認証実行
- 🎨 **モダンUI**: React-iconsを使用した統一されたアイコンデザイン
- ⚡ **スムーズUX**: シークレットキー保存済みユーザーは即座にログイン画面表示
- 🛡️ **セキュア設計**: LocalStorageでのシークレットキー永続化、ログアウト時も保持
- 🔁 **柔軟な設定**: 新規作成・既存キー入力・保存済み認証の3つの設定フロー

### v4.2.0 - Firebase環境変数対応とDocker対応
- 🔧 **環境変数対応**: Firebase設定を .env.local で永続化、毎回設定不要
- 🐳 **Docker対応**: Dockerfile と docker-compose.yml でコンテナ化対応
- ⚙️ **自動設定切り替え**: 環境変数 → 画面設定の優先順位で自動判定
- 📋 **設定方法拡張**: 環境変数・JSON・手動の3つの設定方法に対応
- 🔄 **開発・本番分離**: 環境別のFirebase設定管理が可能
- 📱 **設定画面改良**: 環境変数設定時は緑色の✅ステータス表示

### v4.1.0 - UIテーマ統一とエクスポート簡素化
- 🎨 **ネイビーテーマ**: アプリ全体でネイビー色に統一（位置リンク、アイコン、ボタン類）
- 📱 **アプリアイコン**: メインページヘッダーにアプリアイコン追加
- 📤 **エクスポート簡素化**: CSV形式のみに簡素化、インポート機能削除
- ✨ **視覚的一貫性**: 説明画面の機能アイコンをネイビーで統一
- 🎯 **シンプル設計**: 必要最小限の機能に絞り込んで使いやすさ向上

### v4.0.0 - 画像アップロード機能追加
- 🖼️ **画像対応**: JPEG, PNG, GIF, WebP画像のアップロード対応
- 🎨 **自動最適化**: アップロード時に自動リサイズ（最大1200px）・圧縮（JPEG 80%品質）
- 🔍 **サムネイル生成**: 一覧表示用300pxサムネイル自動生成
- 🖱️ **ドラッグ&ドロップ**: 直感的な画像アップロード操作
- 💾 **効率的保存**: Firebase使用時はStorage保存、ローカル時はBase64保存
- 🔄 **自動フォールバック**: Firebase Storage未設定時も正常動作
- 📱 **スワイプ切り替え**: スマホでマイクボタンとファイル選択のスワイプ切り替え
- ⚡ **遅延読み込み**: 大量画像でもパフォーマンス維持
- 🔒 **セキュア**: ユーザー別フォルダで画像を安全に保存
- 📏 **サイズ制限**: 3MB制限でFirestore Document制限に対応

### v3.2.0 - 音声入力インタフェース大幅改良
- 🎤 **スマホ音声特化**: 100px大型マイクボタン、ワンタップで録音開始→停止→自動保存
- 🖥️ **PC柔軟操作**: テキスト入力デフォルト + マイクアイコンで音声モード切り替え
- 📱 **デバイス最適化**: スマホは音声オンリー、PCはテキスト・音声両対応
- 🔍 **検索UI改善**: レスポンシブ幅調整、フィルター自動非表示で画面を有効活用
- 🎯 **ボタン配置最適化**: 送信ボタンをテキスト近く、マイクボタンを右端に配置
- 🚀 **自動復帰機能**: PC音声入力完了後、自動でテキストモードに復帰
- ⚡ **レスポンシブ強化**: 画面サイズ自動判定とリアルタイム対応

### v3.1.0 - Firebase 設定UI大幅改善
- 📋 **JSON一括設定**: Firebase Console からのワンクリック設定
- 🔄 **JavaScript形式対応**: クォートなしプロパティも自動認識
- 📱 **スマホ最適化**: 6項目個別入力→1回コピペに簡素化
- 🎯 **デバッグ機能**: リアルタイム設定値表示とログ出力
- ✨ **UI切り替え**: JSON/手動入力の直感的モード切り替え

### v3.0.0 - Firebase クラウド同期対応
- ☁️ **Firebase連携**: 個人のFirebaseプロジェクトでクラウド同期
- 🔐 **プライベートストレージ**: ユーザー個人のデータベースで完全プライベート
- 🌍 **デバイス間同期**: PWA、ブラウザ、スマホ間でメモを共有
- 🔄 **ストレージ切り替え**: ローカル/クラウドの選択可能
- 🛡️ **匿名認証**: 個人情報不要の安全な認証システム
- ⚡ **高速クエリ**: インデックス不要のクライアントサイドフィルタリング
- 🔄 **フォールバック機能**: SDK失敗時のREST API自動切り替え
- 🌐 **WebChannel対応**: Long Polling方式でFirestore接続の安定化

### v2.1.0 - 複数行入力対応
- 📝 **複数行入力**: Enterで改行、Shift+Enterで送信
- 📋 **複数行表示**: メモ欄で改行を正しく表示
- 🖱️ **PC操作対応**: ダブルクリックで削除メニュー表示

### v2.0.0 - 音声入力対応
- 🎤 **音声入力機能**: Web Speech APIを使用した音声認識機能を追加
- 🛡️ **安全削除機能**: スワイプ操作でのみ削除可能な誤削除防止機能
- 🔍 **検索UI改善**: アイコンクリック式の検索バーでスペース効率向上
- 📱 **レスポンシブ強化**: スクロール機能とZ-index最適化
- 🎨 **UI改善**: 半透明モーダル、削除ボタン最適化

### v1.0.0 - 初回リリース
- 📝 基本的なメモ管理機能
- 🏷️ タグ機能とフィルタリング
- 📍 位置情報記録
- 📤 データエクスポート/インポート
- 📱 PWA対応

## 🔧 ブラウザ対応

### 音声認識対応ブラウザ
- ✅ **Chrome** (推奨)
- ✅ **Safari** (iOS/macOS)
- ✅ **Edge**
- ❌ Firefox (未対応)

### PWA対応ブラウザ
- ✅ Chrome/Chromium系
- ✅ Safari (iOS 11.3+)
- ✅ Edge
- ✅ Firefox

## 📄 ライセンス

MIT License
