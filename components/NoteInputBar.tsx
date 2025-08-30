"use client";

import { useState, useEffect, useCallback } from "react";
import { FiSend, FiMapPin, FiMic, FiMicOff } from "react-icons/fi";
import { getLocationSetting } from "@/lib/settings/locationSettings";
import { getSpeechEnabled, getSpeechAutoSubmit } from "@/lib/settings/speechSettings";
import { getSpeechRecognitionService, SpeechRecognitionResult } from "@/lib/speech/speechRecognition";

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
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechService] = useState(() => getSpeechRecognitionService());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setLocationEnabled(getLocationSetting());
    setSpeechEnabled(getSpeechEnabled());

    // 設定変更を監視するためのイベントリスナー
    const handleStorageChange = () => {
      setLocationEnabled(getLocationSetting());
      setSpeechEnabled(getSpeechEnabled());
    };

    const handleSpeechSettingChange = () => {
      setSpeechEnabled(getSpeechEnabled());
    };

    window.addEventListener("storage", handleStorageChange);
    // カスタムイベントも監視（同一タブでの設定変更用）
    window.addEventListener("locationSettingChanged", handleStorageChange);
    window.addEventListener("speechSettingChanged", handleSpeechSettingChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("locationSettingChanged", handleStorageChange);
      window.removeEventListener("speechSettingChanged", handleSpeechSettingChange);
    };
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim() && !isSubmitting) {
      const includeLocation = getLocationSetting();
      onSubmit(text.trim(), includeLocation);
      setText("");
      setInterimText("");
    }
  }, [text, isSubmitting, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSpeechResult = useCallback((result: SpeechRecognitionResult) => {
    if (result.isFinal) {
      const finalText = (text + result.transcript).trim();
      setText(finalText);
      setInterimText("");
      
      // 自動送信が有効な場合は自動で送信
      if (getSpeechAutoSubmit() && finalText) {
        setTimeout(() => {
          if (!isSubmitting) {
            const includeLocation = getLocationSetting();
            onSubmit(finalText, includeLocation);
            setText("");
          }
        }, 500); // 500ms後に自動送信
      }
    } else {
      setInterimText(result.transcript);
    }
  }, [text, isSubmitting, onSubmit]);

  const handleMicClick = useCallback(async () => {
    if (!speechService.isSupported()) {
      alert("お使いのブラウザは音声認識をサポートしていません");
      return;
    }

    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    } else {
      speechService.startListening({
        onResult: handleSpeechResult,
        onStart: () => setIsListening(true),
        onEnd: () => {
          setIsListening(false);
          setInterimText("");
        },
        onError: (error) => {
          setIsListening(false);
          setInterimText("");
          console.error("Speech recognition error:", error);
        }
      });
    }
  }, [speechService, isListening, handleSpeechResult]);

  const displayText = text + interimText;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-12 safe-area-bottom z-50">
      <form onSubmit={handleSubmit} className="flex items-start space-x-3">
        <div className="flex items-center px-6 pb-3 space-x-3 w-full">
          <div
            className="flex-shrink-0 flex pb-2 items-start justify-center transition-colors"
            title={
              locationEnabled ? "位置情報記録：有効" : "位置情報記録：無効"
            }
            style={{ width: "28px" }}
          >
            <FiMapPin
              className={`h-7 w-7 transition-colors ${
                locationEnabled ? "text-blue-500" : "text-gray-400"
              }`}
            />
          </div>
          
          <div className="flex-1 relative">
            <textarea
              value={displayText}
              onChange={(e) => {
                if (!isListening) {
                  setText(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening 
                  ? "音声を認識中..." 
                  : placeholder
              }
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                isListening ? "bg-red-50 border-red-200" : ""
              }`}
              rows={1}
              style={{
                minHeight: "40px",
                maxHeight: "120px",
                resize: "none",
              }}
              disabled={isListening}
            />
            {interimText && (
              <div className="absolute inset-0 px-4 py-2 text-gray-400 italic pointer-events-none">
                {text}{interimText}
              </div>
            )}
          </div>
          
          {/* 音声入力ボタン */}
          {isClient && speechEnabled && speechService.isSupported() && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isSubmitting}
              className={`flex-shrink-0 flex mb-1 items-center justify-center rounded-lg transition-colors mt-0 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse hover:bg-red-600"
                  : "bg-gray-500 text-white hover:bg-gray-600"
              } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              title={isListening ? "録音中 (クリックで停止)" : "音声入力"}
              style={{ height: "40px", width: "40px" }}
            >
              {isListening ? (
                <FiMicOff className="h-4 w-4" />
              ) : (
                <FiMic className="h-4 w-4" />
              )}
            </button>
          )}
          
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
