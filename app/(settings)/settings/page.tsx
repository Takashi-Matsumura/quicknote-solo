"use client";

import { useState, useEffect } from "react";
import { FiDownload, FiUpload, FiTrash2, FiArrowLeft, FiMapPin, FiMic } from "react-icons/fi";
import Link from "next/link";

import { getAllNotes, clearAllNotes } from "@/lib/db/database";
import { downloadJsonFile } from "@/lib/export/json";
import { downloadCsvFile } from "@/lib/export/csv";
import { downloadMarkdownFile } from "@/lib/export/md";
import { importFromJson, readFileAsText } from "@/lib/import/json";
import { getLocationSetting, setLocationSetting } from "@/lib/settings/locationSettings";
import { getSpeechEnabled, setSpeechEnabled, getSpeechAutoSubmit, setSpeechAutoSubmit, getSpeechLanguage, setSpeechLanguage, SUPPORTED_LANGUAGES } from "@/lib/settings/speechSettings";
import { getFirebaseSettings, setFirebaseSettings, getStorageType, setStorageType, type StorageType } from "@/lib/settings/firebaseSettings";
import { initializeFirebase, resetFirebase, type FirebaseConfig } from "@/lib/firebase/config";
import { initializeAuth } from "@/lib/firebase/auth";
import { getSpeechRecognitionService } from "@/lib/speech/speechRecognition";
import Toast from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabledState] = useState(true);
  const [speechAutoSubmit, setSpeechAutoSubmitState] = useState(false);
  const [speechLanguage, setSpeechLanguageState] = useState("ja-JP");
  const [speechService] = useState(() => getSpeechRecognitionService());
  const [isClient, setIsClient] = useState(false);
  const [storageType, setStorageTypeState] = useState<StorageType>("local");
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
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    setIsClient(true);
    setLocationEnabled(getLocationSetting());
    setSpeechEnabledState(getSpeechEnabled());
    setSpeechAutoSubmitState(getSpeechAutoSubmit());
    setSpeechLanguageState(getSpeechLanguage());
    
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

  const handleLocationToggle = (enabled: boolean) => {
    setLocationEnabled(enabled);
    setLocationSetting(enabled);
    showToast(
      enabled ? "位置情報の記録を有効にしました" : "位置情報の記録を無効にしました",
      "success"
    );
  };

  const handleSpeechToggle = (enabled: boolean) => {
    setSpeechEnabledState(enabled);
    setSpeechEnabled(enabled);
    showToast(
      enabled ? "音声入力を有効にしました" : "音声入力を無効にしました",
      "success"
    );
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

  const handleExport = async (format: "json" | "csv" | "md") => {
    setIsExporting(true);
    
    try {
      const notes = await getAllNotes();
      
      if (notes.length === 0) {
        showToast("エクスポートするメモがありません", "info");
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      
      switch (format) {
        case "json":
          downloadJsonFile(notes, `quicknote-solo-${timestamp}.json`);
          break;
        case "csv":
          downloadCsvFile(notes, `quicknote-solo-${timestamp}.csv`);
          break;
        case "md":
          downloadMarkdownFile(notes, `quicknote-solo-${timestamp}.md`);
          break;
      }
      
      showToast(`${format.toUpperCase()}形式でエクスポートしました`, "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("エクスポートに失敗しました", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      showToast("JSONファイルを選択してください", "error");
      return;
    }

    setIsImporting(true);
    
    try {
      const content = await readFileAsText(file);
      const result = await importFromJson(content);
      
      if (result.errors.length > 0) {
        console.warn("Import errors:", result.errors);
      }
      
      const message = `${result.imported}件のメモをインポート、${result.skipped}件をスキップしました`;
      showToast(message, result.imported > 0 ? "success" : "info");
      
      if (result.errors.length > 0) {
        showToast(`${result.errors.length}件のエラーがありました`, "error");
      }
    } catch (error) {
      console.error("Import failed:", error);
      showToast("インポートに失敗しました", "error");
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleClearAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: "全データを削除",
      message: "すべてのメモを削除します。この操作は元に戻せません。続行しますか？",
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

      <div className="px-4 py-6 space-y-6">
        {/* Location Settings Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">位置情報設定</h2>
            <p className="mt-1 text-sm text-gray-600">メモ作成時の位置情報記録を設定します</p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiMapPin className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">位置情報を記録</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    有効にすると、メモ作成時に自動で位置情報を取得します
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationEnabled}
                  onChange={(e) => handleLocationToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {locationEnabled && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  位置情報の取得には端末の許可が必要です。初回アクセス時に許可を求められます。
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Speech Recognition Settings Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">音声入力設定</h2>
            <p className="mt-1 text-sm text-gray-600">音声によるメモ入力を設定します</p>
          </div>
          <div className="p-6 space-y-6">
            {/* Speech Recognition Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FiMic className="h-5 w-5 text-gray-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">音声入力を有効化</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    マイクボタンで音声による文字入力ができます
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={speechEnabled}
                  onChange={(e) => handleSpeechToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {speechEnabled && (
              <div className="space-y-4">
                {/* Auto Submit Toggle */}
                <div className="pl-8">
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
                <div className="pl-8">
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
            )}
          </div>
        </section>

        {/* Firebase Settings Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">クラウドストレージ設定</h2>
            <p className="mt-1 text-sm text-gray-600">Firebaseでデバイス間同期とクラウドバックアップを利用します</p>
          </div>
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
                    <p className="text-xs text-gray-500">ブラウザ内のみに保存（デフォルト）</p>
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
                    <p className="text-xs text-gray-500">デバイス間同期とクラウドバックアップ</p>
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
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Firebase設定方法:</strong><br />
                  1. Firebase Consoleでプロジェクト作成<br />
                  2. Firestoreを有効化<br />
                  3. ウェブアプリを追加してConfig情報を取得<br />
                  4. <strong>JSON</strong>: Config全体をコピー&ペースト（推奨）<br />
                  5. <strong>手動</strong>: 各フィールドに個別入力
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Export Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">エクスポート</h2>
            <p className="mt-1 text-sm text-gray-600">メモを外部ファイルに出力します</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={() => handleExport("json")}
                disabled={isExporting}
                className="flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <FiDownload className="h-4 w-4 mr-2" />
                JSON
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={isExporting}
                className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <FiDownload className="h-4 w-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => handleExport("md")}
                disabled={isExporting}
                className="flex items-center justify-center px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <FiDownload className="h-4 w-4 mr-2" />
                Markdown
              </button>
            </div>
            <p className="text-xs text-gray-500">
              JSON形式のファイルは再インポートが可能です
            </p>
          </div>
        </section>

        {/* Import Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">インポート</h2>
            <p className="mt-1 text-sm text-gray-600">JSONファイルからメモを読み込みます</p>
          </div>
          <div className="p-6">
            <label className="block">
              <div className="flex items-center justify-center px-6 py-8 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="text-center">
                  <FiUpload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {isImporting ? "インポート中..." : "JSONファイルを選択"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    重複するIDのメモはスキップされます
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="sr-only"
              />
            </label>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-lg shadow-sm border border-red-200">
          <div className="px-6 py-4 border-b border-red-200">
            <h2 className="text-lg font-medium text-red-900">危険な操作</h2>
            <p className="mt-1 text-sm text-red-600">注意して実行してください</p>
          </div>
          <div className="p-6">
            <button
              onClick={handleClearAllData}
              className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <FiTrash2 className="h-4 w-4 mr-2" />
              すべてのメモを削除
            </button>
            <p className="mt-2 text-xs text-gray-500">
              この操作は元に戻せません。実行前にエクスポートを推奨します。
            </p>
          </div>
        </section>

        {/* App Info */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">アプリ情報</h2>
          </div>
          <div className="p-6 text-sm text-gray-600 space-y-2">
            <p>QuickNote Solo v3.0.0</p>
            <p>個人用メモPWA</p>
            <p className="text-xs text-gray-500">
              データはローカル（IndexedDB）またはクラウド（Firebase）に保存されます
            </p>
          </div>
        </section>
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
        confirmText="削除"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}