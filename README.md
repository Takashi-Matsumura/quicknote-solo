# QuickNote Solo

個人用メモPWA - オフラインでも使える簡単メモアプリ

## 🚀 特徴

- **📱 PWA対応**: スマホにアプリとしてインストール可能
- **⚡ オフライン動作**: インターネット接続なしでも利用可能
- **🎤 音声入力**: スマホは大型ボタンでワンタップ操作、PCは切り替え式（Web Speech API使用）
- **🔍 高速検索**: アイコンクリックで検索フィールド展開、リアルタイム検索
- **🏷️ タグ機能**: メモの分類とフィルタリング
- **📍 位置情報**: オプションで現在地を記録
- **📊 期間フィルタ**: 今日/7日間/30日間/全期間でメモを絞り込み
- **📤 エクスポート/インポート**: JSON/CSV/Markdown形式でデータ管理
- **🎯 ピン機能**: 重要なメモを上部に固定
- **🛡️ 安全削除**: スワイプ操作でのみ削除可能（誤削除防止）
- **📝 複数行対応**: Enterで改行、Shift+Enterで送信
- **🖱️ PC対応**: ダブルクリックで削除メニュー表示
- **☁️ クラウド同期**: Firebase連携でデバイス間同期（オプション）
- **🔐 プライベート**: 個人のFirebaseプロジェクトで完全プライベート
- **📋 ワンクリック設定**: Firebase ConsoleからJSON一括コピー&ペースト
- **🔄 形式自動認識**: JavaScript/JSON形式を自動判別・変換
- **📲 レスポンシブデザイン**: デバイス自動判定とUI最適化、モバイルファースト設計

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15 + TypeScript
- **UI**: Tailwind CSS + react-icons
- **データベース**: IndexedDB (ローカル) / Firestore (クラウド)
- **認証**: Firebase Authentication (匿名認証)
- **音声認識**: Web Speech API
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

## ☁️ Firebase設定（クラウド同期・オプション）

デバイス間でメモを同期したい場合は、個人のFirebaseプロジェクトを設定できます。

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

1. QuickNote Solo を開き、**設定 → クラウドストレージ設定**
2. Firebase設定の入力方法を選択：

#### 📋 **JSON形式（推奨・ワンクリック設定）**
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

#### ✏️ **手動入力形式**
- **JSON/手動切り替え**で「手動」を選択
- 各フィールドに個別入力：
   - **API Key**: `apiKey`の値
   - **Auth Domain**: `authDomain`の値
   - **Project ID**: `projectId`の値
   - **Storage Bucket**: `storageBucket`の値
   - **Messaging Sender ID**: `messagingSenderId`の値
   - **App ID**: `appId`の値

3. **Firebaseに接続**をクリック
4. **ストレージタイプ**を「Firebaseクラウド」に変更

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
│   ├── db/               # データベース操作
│   │   ├── database.ts   # 統合データベースインターフェース
│   │   ├── indexedDb.ts  # IndexedDB操作（ローカル）
│   │   └── firestore.ts  # Firestore操作（クラウド）
│   ├── firebase/         # Firebase設定
│   │   ├── config.ts     # Firebase初期化
│   │   └── auth.ts       # 匿名認証
│   ├── hooks/            # カスタムReactフック
│   │   └── useDevice.ts  # デバイス検出フック
│   ├── utils/            # ユーティリティ関数
│   │   └── device.ts     # デバイス判定機能
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
└── vercel.json          # Vercel設定
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
- **位置情報**: 設定で有効化すると現在地を自動記録
- **データ管理**: 設定からエクスポート/インポート

### 音声入力設定
- **有効/無効**: 設定画面で音声入力機能の切り替え
- **自動送信**: 音声認識完了後に自動でメモ保存
- **言語選択**: 日本語・英語・韓国語・中国語から選択

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
