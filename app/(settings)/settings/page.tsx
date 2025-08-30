"use client";

import { useState, useEffect } from "react";
import { FiDownload, FiUpload, FiTrash2, FiArrowLeft, FiMapPin } from "react-icons/fi";
import Link from "next/link";

import { getAllNotes, clearAllNotes } from "@/lib/db/indexedDb";
import { downloadJsonFile } from "@/lib/export/json";
import { downloadCsvFile } from "@/lib/export/csv";
import { downloadMarkdownFile } from "@/lib/export/md";
import { importFromJson, readFileAsText } from "@/lib/import/json";
import { getLocationSetting, setLocationSetting } from "@/lib/settings/locationSettings";
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
    setLocationEnabled(getLocationSetting());
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
            <p>QuickNote Solo v1.0.0</p>
            <p>個人用1行メモPWA</p>
            <p className="text-xs text-gray-500">
              データはブラウザのIndexedDBに保存されます
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