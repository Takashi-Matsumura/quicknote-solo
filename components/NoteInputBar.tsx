"use client";

import { useState, useEffect } from "react";
import { FiSend, FiMapPin } from "react-icons/fi";
import { getLocationSetting } from "@/lib/settings/locationSettings";

interface NoteInputBarProps {
  onSubmit: (text: string, includeLocation: boolean) => void;
  isSubmitting?: boolean;
  placeholder?: string;
}

export default function NoteInputBar({
  onSubmit,
  isSubmitting = false,
  placeholder = "メモを入力...（Shift+Enterで送信）",
}: NoteInputBarProps) {
  const [text, setText] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(true);

  useEffect(() => {
    setLocationEnabled(getLocationSetting());

    // 設定変更を監視するためのイベントリスナー
    const handleStorageChange = () => {
      setLocationEnabled(getLocationSetting());
    };

    window.addEventListener("storage", handleStorageChange);
    // カスタムイベントも監視（同一タブでの設定変更用）
    window.addEventListener("locationSettingChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("locationSettingChanged", handleStorageChange);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isSubmitting) {
      const includeLocation = getLocationSetting();
      onSubmit(text.trim(), includeLocation);
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-12 safe-area-bottom">
      <form onSubmit={handleSubmit} className="flex items-start space-x-3">
        <div className="flex items-center px-10 pb-3 space-x-3 w-full">
          <div
            className="flex-shrink-0 flex pb-2 items-start justify-center transition-colors"
            title={
              locationEnabled ? "位置情報記録：有効" : "位置情報記録：無効"
            }
            style={{ width: "32px" }}
          >
            <FiMapPin
              className={`h-8 w-8 transition-colors ${
                locationEnabled ? "text-blue-500" : "text-gray-400"
              }`}
            />
          </div>
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              rows={1}
              style={{
                minHeight: "40px",
                maxHeight: "120px",
                resize: "none",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting}
            className="flex-shrink-0 flex mb-1 items-center justify-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-0"
            title="送信"
            style={{ height: "40px", width: "40px" }}
          >
            <FiSend className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
