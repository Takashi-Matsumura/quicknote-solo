"use client";

import { useState, useEffect } from "react";
import { FiDownload, FiTrash2, FiArrowLeft, FiSmartphone, FiEye, FiEyeOff, FiCopy } from "react-icons/fi";
import Link from "next/link";

import { getAllNotes, clearAllNotes } from "@/lib/db/database";
import { downloadCsvFile } from "@/lib/export/csv";
import { getSpeechAutoSubmit, setSpeechAutoSubmit, getSpeechLanguage, setSpeechLanguage, SUPPORTED_LANGUAGES } from "@/lib/settings/speechSettings";
import { getFirebaseSettings, setFirebaseSettings, getStorageType, setStorageType, isFirebaseConfigInEnv, type StorageType } from "@/lib/settings/firebaseSettings";
import { initializeFirebase, resetFirebase, type FirebaseConfig } from "@/lib/firebase/config";
import { initializeAuth } from "@/lib/firebase/auth";
import { getSpeechRecognitionService } from "@/lib/speech/speechRecognition";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { GoogleAuthService } from '@/lib/auth/googleAuth';
import EnhancedSecureStorage from '@/lib/utils/enhancedSecureStorage';
import { getTOTPUserId } from '@/lib/auth/session';

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

interface TOTPSecretDisplayProps {
  secret: string;
  onCopy: () => void;
}

function TOTPSecretDisplay({ secret, onCopy }: TOTPSecretDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const formatSecret = (secret: string) => {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  };
  
  const maskSecret = (secret: string) => {
    return secret.replace(/./g, '●');
  };
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      onCopy();
    } catch (error) {
      console.error('Failed to copy secret:', error);
    }
  };
  
  return (
    <div className="bg-white border border-amber-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">TOTPシークレットキー</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
            title={isVisible ? "シークレットを非表示" : "シークレットを表示"}
          >
            {isVisible ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
          <button
            onClick={handleCopy}
            className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
            title="シークレットをコピー"
          >
            <FiCopy className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="bg-gray-50 rounded p-3 font-mono text-sm break-all">
        {isVisible ? formatSecret(secret) : maskSecret(formatSecret(secret))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        ⚠️ このキーは他のデバイスでの認証に必要です。安全に保管してください。
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'speech' | 'cloud' | 'auth' | 'danger'>('speech');
  const [speechAutoSubmit, setSpeechAutoSubmitState] = useState(false);
  const [speechLanguage, setSpeechLanguageState] = useState("ja-JP");
  const [speechService] = useState(() => getSpeechRecognitionService());
  const [isClient, setIsClient] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [storageType, setStorageTypeState] = useState<StorageType>("firebase");
  const [firebaseConfig, setFirebaseConfigState] = useState<FirebaseConfig>({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  });
  const [firebaseConfigJson, setFirebaseConfigJson] = useState("");
  const [firebaseEnabled, setFirebaseEnabledState] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [configInputMode, setConfigInputMode] = useState<"json" | "manual">("json");
  const [isEnvConfigAvailable, setIsEnvConfigAvailable] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    onConfirm: () => {},
  });
  const [_userId, setUserId] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    
    // TOTPシークレットとユーザーIDを取得（強化版）
    const googleProfile = GoogleAuthService.getCurrentProfile() || GoogleAuthService.restoreProfile();
    if (googleProfile) {
      const secret = EnhancedSecureStorage.getTOTPSecret(googleProfile);
      if (secret) {
        setTotpSecret(secret);
      } else {
        // 復号化できない古いデータがある場合はクリア
        const hasOldData = localStorage.getItem('totp_secret_google_encrypted') || 
                          localStorage.getItem('totp_secret_encrypted') ||
                          localStorage.getItem('totp_secret');
        if (hasOldData) {
          console.log('Clearing corrupted TOTP data due to encryption key changes');
          EnhancedSecureStorage.clearCorruptedData();
        }
      }
    } else {
      // Google認証がない場合のレガシーアクセス（非推奨）
      const legacySecret = localStorage.getItem('totp_secret');
      if (legacySecret) {
        setTotpSecret(legacySecret);
      }
    }
    
    const userIdFromStorage = getTOTPUserId();
    if (userIdFromStorage) {
      setUserId(userIdFromStorage);
    }
    
    setSpeechAutoSubmitState(getSpeechAutoSubmit());
    setSpeechLanguageState(getSpeechLanguage());
    
    // 環境変数の設定確認
    setIsEnvConfigAvailable(isFirebaseConfigInEnv());
    
    // Firebase設定を読み込み
    const fbSettings = getFirebaseSettings();
    setFirebaseEnabledState(fbSettings.enabled);
    if (fbSettings.config) {
      setFirebaseConfigState(fbSettings.config);
      // configからJSONを生成
      setFirebaseConfigJson(JSON.stringify(fbSettings.config, null, 2));
    }
    setStorageTypeState(getStorageType());
  }, []);

  const showToast = (message: string, type: ToastState["type"] = "info") => {
    setToast({ message, type });
  };


  const handleSpeechAutoSubmitToggle = (enabled: boolean) => {
    setSpeechAutoSubmitState(enabled);
    setSpeechAutoSubmit(enabled);
    showToast(
      enabled ? "音声認識後の自動送信を有効にしました" : "音声認識後の自動送信を無効にしました",
      "success"
    );
  };

  const handleLanguageChange = (language: string) => {
    setSpeechLanguageState(language);
    setSpeechLanguage(language);
    const langName = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || language;
    showToast(`音声認識言語を${langName}に設定しました`, "success");
  };



  const handleStorageTypeChange = (type: StorageType) => {
    setStorageTypeState(type);
    setStorageType(type);
    showToast(
      type === "firebase" ? "Firebaseストレージに切り替えました" : "ローカルストレージに切り替えました",
      "success"
    );
  };

  const handleFirebaseConnect = async () => {
    console.log('Firebase config before connect:', firebaseConfig);
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      const errorMsg = `必須項目が不足しています: ${
        !firebaseConfig.apiKey ? 'APIキー' : ''
      }${!firebaseConfig.apiKey && !firebaseConfig.projectId ? ', ' : ''}${
        !firebaseConfig.projectId ? 'プロジェクトID' : ''
      }`;
      console.error('Firebase connection failed:', errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    setIsConnecting(true);
    
    try {
      const success = initializeFirebase(firebaseConfig);
      
      if (success) {
        // Firebase認証を初期化
        const authUser = await initializeAuth();
        
        if (authUser) {
          setFirebaseEnabledState(true);
          setFirebaseSettings({
            enabled: true,
            config: firebaseConfig
          });
          showToast("Firebaseに接続しました", "success");
        } else {
          showToast("Firebase認証に失敗しました", "error");
        }
      } else {
        showToast("Firebase接続に失敗しました", "error");
      }
    } catch (error) {
      console.error("Firebase connection failed:", error);
      showToast("Firebase接続エラー", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFirebaseDisconnect = () => {
    resetFirebase();
    setFirebaseEnabledState(false);
    setFirebaseSettings({ enabled: false, config: null });
    setStorageTypeState("local");
    setStorageType("local");
    showToast("Firebaseから切断しました", "success");
  };

  const handleConfigChange = (field: keyof FirebaseConfig, value: string) => {
    setFirebaseConfigState(prev => {
      const newConfig = {
        ...prev,
        [field]: value
      };
      // 手動入力モードでもJSONを同期更新
      setFirebaseConfigJson(JSON.stringify(newConfig, null, 2));
      return newConfig;
    });
  };

  const handleJsonConfigChange = (value: string) => {
    setFirebaseConfigJson(value);
    
    // JSONからFirebaseConfigに変換を試行
    try {
      if (value.trim()) {
        console.log('Parsing JSON:', value);
        
        let jsonValue = value.trim();
        
        // JavaScript コード形式の場合、オブジェクト部分のみを抽出
        if (jsonValue.includes('const') || jsonValue.includes('=')) {
          const match = jsonValue.match(/=\s*({[\s\S]*?});?\s*$/);
          if (match) {
            jsonValue = match[1];
            console.log('Extracted JSON from JS code:', jsonValue);
          }
        }
        
        let parsed;
        try {
          // 通常のJSONとして解析を試行
          parsed = JSON.parse(jsonValue);
        } catch {
          console.log('Standard JSON parse failed, trying JavaScript object evaluation');
          
          // JavaScript形式のオブジェクトを安全に評価（基本的な検証を実行）
          if (!jsonValue.includes('function') && !jsonValue.includes('eval') && !jsonValue.includes('require') && 
              !jsonValue.includes('import') && !jsonValue.includes('window') && !jsonValue.includes('document')) {
            try {
              // Functionコンストラクターを使用してより安全に評価
              const fn = new Function(`return ${jsonValue}`);
              parsed = fn();
              console.log('JavaScript object evaluated successfully:', parsed);
            } catch (evalError) {
              console.error('Both JSON parse and Function evaluation failed:', evalError);
              throw evalError;
            }
          } else {
            console.error('Unsafe JavaScript code detected');
            throw new Error('Unsafe JavaScript code detected');
          }
        }
        
        console.log('Parsed JSON:', parsed);
        
        // より柔軟な設定対応
        let config = parsed;
        
        // Firebase Console からのコピーで "const firebaseConfig = " が含まれている場合への対応
        if (typeof parsed === 'object' && parsed.firebaseConfig) {
          config = parsed.firebaseConfig;
        }
        
        // JavaScript コードとしてペーストされた場合のフィールド名変換は不要
        
        console.log('Config object:', config);
        
        // 必須フィールドのチェック（空文字列もチェック）
        const hasApiKey = config.apiKey && config.apiKey.trim() !== '';
        const hasProjectId = config.projectId && config.projectId.trim() !== '';
        
        if (hasApiKey && hasProjectId) {
          console.log('Setting Firebase config from JSON');
          const newConfig = {
            apiKey: (config.apiKey || "").trim(),
            authDomain: (config.authDomain || "").trim(),
            projectId: (config.projectId || "").trim(),
            storageBucket: (config.storageBucket || "").trim(),
            messagingSenderId: (config.messagingSenderId || "").trim(),
            appId: (config.appId || "").trim()
          };
          console.log('New config to be set:', newConfig);
          
          // React state の更新を確認するためのログ
          setTimeout(() => {
            console.log('State should be updated now. Current firebaseConfig state:', {
              apiKey: newConfig.apiKey,
              projectId: newConfig.projectId
            });
          }, 100);
          
          setFirebaseConfigState(newConfig);
          
          // 値が正しく設定されたことを確認するためのトースト表示
          if (newConfig.apiKey && newConfig.projectId) {
            showToast(`設定を読み込みました: ${newConfig.projectId}`, "success");
          }
        } else {
          console.warn('Missing required fields:', { 
            apiKey: config.apiKey, 
            projectId: config.projectId,
            hasApiKey,
            hasProjectId
          });
        }
      }
    } catch (error) {
      console.error('JSON parse error:', error);
      // JSONパースエラーは無視（入力中の場合があるため）
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const notes = await getAllNotes();
      
      if (notes.length === 0) {
        showToast("エクスポートするメモがありません", "info");
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      downloadCsvFile(notes, `quicknote-solo-${timestamp}.csv`);
      
      showToast("CSV形式でエクスポートしました", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("エクスポートに失敗しました", "error");
    } finally {
      setIsExporting(false);
    }
  };


  const handleClearAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: "全データを削除",
      message: "すべてのメモを削除します。この操作は元に戻せません。続行しますか？",
      confirmText: "削除",
      onConfirm: async () => {
        try {
          await clearAllNotes();
          showToast("すべてのメモを削除しました", "success");
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error) {
          console.error("Failed to clear data:", error);
          showToast("データの削除に失敗しました", "error");
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center">
          <Link
            href="/"
            className="p-2 -ml-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="ml-2 text-lg font-semibold text-gray-900">設定</h1>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'speech', name: '音声入力', icon: 'FiMic' },
                { id: 'cloud', name: 'クラウド', icon: 'FiSettings' },
                { id: 'auth', name: '認証設定', icon: 'FiSmartphone' },
                { id: 'danger', name: '危険な操作', icon: 'FiTrash2' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'speech' | 'cloud' | 'auth' | 'danger')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>



        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Speech Recognition Tab */}
          {activeTab === 'speech' && (
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Auto Submit Toggle */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">音声認識後に自動送信</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        音声入力完了後、自動でメモを保存します
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={speechAutoSubmit}
                        onChange={(e) => handleSpeechAutoSubmitToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Language Selection */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">音声認識言語</h4>
                  <select
                    value={speechLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Browser Support Info */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    {isClient 
                      ? (speechService.isSupported() 
                          ? "音声認識が利用可能です。マイクへのアクセス許可が必要です。"
                          : "お使いのブラウザは音声認識をサポートしていません。Chrome、Safari、Edgeをお試しください。"
                        )
                      : "ブラウザの対応状況を確認中..."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cloud Storage Tab */}
          {activeTab === 'cloud' && (
            <div className="p-6 space-y-6">
              {/* Storage Type Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">ストレージタイプ</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="storageType"
                      value="local"
                      checked={storageType === "local"}
                      onChange={(e) => handleStorageTypeChange(e.target.value as StorageType)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">ローカルストレージ</span>
                      <p className="text-xs text-gray-500">ブラウザ内のみに保存</p>
                    </div>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="storageType"
                      value="firebase"
                      checked={storageType === "firebase"}
                      onChange={(e) => handleStorageTypeChange(e.target.value as StorageType)}
                      disabled={!firebaseEnabled}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">Firebaseクラウド</span>
                      <p className="text-xs text-gray-500">デバイス間同期とクラウドバックアップ（デフォルト）</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Firebase Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Firebase設定</h3>
                  {!firebaseEnabled && (
                    <div className="flex text-xs">
                      <button
                        onClick={() => setConfigInputMode("json")}
                        className={`px-2 py-1 rounded-l-md border ${
                          configInputMode === "json"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-gray-100 text-gray-600 border-gray-300"
                        }`}
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => setConfigInputMode("manual")}
                        className={`px-2 py-1 rounded-r-md border-l-0 border ${
                          configInputMode === "manual"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-gray-100 text-gray-600 border-gray-300"
                        }`}
                      >
                        手動
                      </button>
                    </div>
                  )}
                </div>
                
                {!firebaseEnabled ? (
                  <div className="space-y-3">
                    {configInputMode === "json" ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Firebase Config (JSON) *
                        </label>
                        <textarea
                          value={firebaseConfigJson}
                          onChange={(e) => handleJsonConfigChange(e.target.value)}
                          placeholder={`{
  "apiKey": "AIzaSyC...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abcdef..."
}

または JavaScript形式:
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  ...
};`}
                          rows={8}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Firebase Console → プロジェクト設定 → Config から JSON または JavaScript コードをコピー&ペースト
                        </p>
                        
                        {/* デバッグ情報 */}
                        {isClient && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs space-y-1">
                            <div><strong>現在の設定値:</strong></div>
                            <div>API Key: {firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '未設定'}</div>
                            <div>Project ID: {firebaseConfig.projectId || '未設定'}</div>
                            <div>Auth Domain: {firebaseConfig.authDomain || '未設定'}</div>
                            <div className="pt-1 space-x-2">
                              <button 
                                type="button"
                                onClick={() => {
                                  console.log('Current firebaseConfig state:', firebaseConfig);
                                  console.log('Current JSON input:', firebaseConfigJson);
                                }}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                              >
                                コンソールにログ出力
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  const testJson = `{
  "apiKey": "test-api-key",
  "authDomain": "test-project.firebaseapp.com",
                                                     "projectId": "test-project",
  "storageBucket": "test-project.appspot.com",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abc123"
}`;
                                  handleJsonConfigChange(testJson);
                                }}
                                className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs"
                              >
                                テスト用JSON投入
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            API Key *
                          </label>
                          <input
                            type="text"
                            value={firebaseConfig.apiKey}
                            onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                            placeholder="AIzaSyC..."
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Auth Domain
                          </label>
                          <input
                            type="text"
                            value={firebaseConfig.authDomain}
                            onChange={(e) => handleConfigChange('authDomain', e.target.value)}
                            placeholder="your-project.firebaseapp.com"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Project ID *
                          </label>
                          <input
                            type="text"
                            value={firebaseConfig.projectId}
                            onChange={(e) => handleConfigChange('projectId', e.target.value)}
                            placeholder="your-project-id"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Storage Bucket
                          </label>
                          <input
                            type="text"
                            value={firebaseConfig.storageBucket}
                            onChange={(e) => handleConfigChange('storageBucket', e.target.value)}
                            placeholder="your-project.appspot.com"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Messaging Sender ID
                          </label>
                          <input
                            type="text"
                            value={firebaseConfig.messagingSenderId}
                            onChange={(e) => handleConfigChange('messagingSenderId', e.target.value)}
                            placeholder="123456789012"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            App ID
                          </label>
                          <input
                            type="text"
                            value={firebaseConfig.appId}
                            onChange={(e) => handleConfigChange('appId', e.target.value)}
                            placeholder="1:123456789012:web:abc123def456"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={handleFirebaseConnect}
                      disabled={isConnecting}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isConnecting ? "接続中..." : "Firebaseに接続"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-green-900">Firebase接続中</p>
                        <p className="text-xs text-green-700">プロジェクト: {firebaseConfig.projectId}</p>
                      </div>
                      <button
                        onClick={handleFirebaseDisconnect}
                        className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded hover:bg-red-50"
                      >
                        切断
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 環境変数設定の表示 */}
                {isEnvConfigAvailable && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-2">
                        <p className="text-xs text-green-700">
                          <strong>✅ 環境変数でFirebase設定済み</strong><br />
                          .env.local ファイルに設定されたFirebase設定が自動的に適用されています
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>Firebase設定方法:</strong><br />
                    <strong>【推奨】環境変数での設定:</strong><br />
                    1. プロジェクトルートの .env.example を .env.local にコピー<br />
                    2. Firebase Console → プロジェクト設定 → Config情報を取得<br />
                    3. .env.local ファイルに実際の値を設定<br />
                    4. アプリを再起動<br />
                    <br />
                    <strong>画面での設定:</strong><br />
                    1. Firebase Consoleでプロジェクト作成<br />
                    2. Firestoreを有効化<br />
                    3. ウェブアプリを追加してConfig情報を取得<br />
                    4. <strong>JSON</strong>: Config全体をコピー&ペースト<br />
                    5. <strong>手動</strong>: 各フィールドに個別入力
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* Authentication Tab */}
          {activeTab === 'auth' && (
            <div className="p-6">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <FiSmartphone className="h-5 w-5 text-amber-600 mt-0.5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">他のデバイス用TOTPシークレット</h3>
                    <p className="text-xs text-gray-600 mb-3">
                      スマートフォンなど他のデバイスからアクセスする際、認証フローでこのシークレットキーが必要になります
                    </p>
                    {isClient && totpSecret ? (
                      <TOTPSecretDisplay secret={totpSecret} onCopy={() => showToast('シークレットキーをコピーしました', 'success')} />
                    ) : (
                      <div className="bg-white border border-amber-300 rounded p-3">
                        <p className="text-sm text-gray-500 mb-2">
                          {isClient ? 'TOTPシークレットが見つかりません' : '読み込み中...'}
                        </p>
                        {isClient && (
                          <div className="text-xs text-gray-400">
                            <p className="mb-1">• 暗号化システムが更新されました</p>
                            <p className="mb-1">• 一度ログアウトして再度TOTP認証を実行してください</p>
                            <p>• シークレットが新しい暗号化方式で保存されます</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export in Danger Zone */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">エクスポート</h3>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors w-full"
                  >
                    <FiDownload className="h-4 w-4 mr-2" />
                    CSV
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    メモを外部ファイルに出力します
                  </p>
                </div>

                {/* Delete All Data */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">データ削除</h3>
                  <button
                    onClick={handleClearAllData}
                    className="flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors w-full"
                  >
                    <FiTrash2 className="h-4 w-4 mr-2" />
                    すべてのメモを削除
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    この操作は元に戻せません。実行前にエクスポートを推奨します。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

    </div>
  );
}