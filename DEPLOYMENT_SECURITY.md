# 🔒 QuickNote Solo - Vercelデプロイメントセキュリティガイド

## 🚨 **デプロイ前必須チェック項目**

### 1. 環境変数設定（Vercel Dashboard）

#### Firebase設定
```bash
# Vercel環境変数設定コマンド
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production  
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
```

#### 本番環境設定
```bash
vercel env add NODE_ENV production
```

### 2. ローカルファイルの安全確認

#### ✅ 必須確認項目
- [ ] `.env.local`ファイルが存在しないこと
- [ ] `.gitignore`に`.env*`が含まれていること
- [ ] Gitコミット履歴に機密情報が含まれていないこと

#### 確認コマンド
```bash
# 機密情報の確認
git log --all --grep="API" --grep="key" --grep="secret" -i
git log --all -S "AIza" --source --all
```

### 3. Firebase セキュリティ設定

#### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{noteId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
  }
}
```

#### Firebase Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /notes/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
  }
}
```

### 4. デプロイ後検証項目

#### セキュリティヘッダー確認
```bash
# セキュリティヘッダーの確認
curl -I https://your-app.vercel.app | grep -E "(X-|Content-Security|Strict-Transport)"
```

#### 期待される出力:
```
Content-Security-Policy: default-src 'self'; script-src...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

#### Firebase設定の非露出確認
```bash
# DevToolsでネットワークタブを確認し、以下が**表示されないこと**を確認:
# - 実際のFirebase APIキー
# - プロジェクトの内部設定
# - TOTPシークレットキー
```

### 5. 暗号化機能の動作確認

#### TOTPシークレットキーの暗号化確認
```javascript
// ブラウザDevToolsで実行して暗号化を確認
console.log('Plain TOTP Secret:', localStorage.getItem('totp_secret')); // null であること
console.log('Encrypted Secret:', localStorage.getItem('totp_secret_encrypted')); // 暗号化された文字列
```

### 6. パフォーマンス・セキュリティ監査

#### Lighthouseスコア確認
```bash
npx lighthouse https://your-app.vercel.app --only-categories=security,performance
```

#### 期待されるスコア:
- Security: 95+
- Performance: 90+

### 7. 脆弱性チェック

#### 依存関係の脆弱性確認
```bash
npm audit --audit-level=moderate
npm outdated
```

### 8. ログ・デバッグ情報の確認

#### 本番環境でのコンソール出力確認
- [ ] ブラウザDevToolsのConsoleタブに機密情報が表示されないこと
- [ ] NetworkタブでAPI通信に機密情報が含まれていないこと
- [ ] ApplicationタブのLocalStorageに平文のシークレットが保存されていないこと

## ⚡ **緊急時対応**

### 機密情報漏洩が発覚した場合
1. **即座にVercelデプロイを停止**
   ```bash
   vercel --prod --yes
   ```
2. **Firebase APIキーをローテーション**
3. **影響を受けたユーザーに通知**
4. **セキュリティパッチの適用**

### 監視・アラート設定
- Firebase Usage Monitoring
- Vercel Analytics
- 異常なトラフィックパターンの検知

## 📋 **継続的セキュリティ**

### 月次チェック項目
- [ ] 依存関係の脆弱性スキャン
- [ ] Firebase使用量とアクセスログの確認
- [ ] セキュリティヘッダーの動作確認
- [ ] HTTPS証明書の有効期限確認

### 四半期チェック項目
- [ ] Firebase Securityルールの見直し
- [ ] 暗号化アルゴリズムの更新検討
- [ ] アクセスパターンの分析
- [ ] セキュリティ監査の実施

---

**⚠️ 重要:** このチェックリストは全項目を実行してからデプロイしてください。
**📞 緊急連絡先:** セキュリティインシデント発生時は即座にプロジェクト管理者に連絡してください。