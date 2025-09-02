"use client";

import { useState, useEffect, useCallback } from "react";
import { FiSend, FiMapPin, FiMic, FiMicOff, FiPlus } from "react-icons/fi";
import { getLocationSetting } from "@/lib/settings/locationSettings";
import { getSpeechEnabled } from "@/lib/settings/speechSettings";
import { getStorageType } from "@/lib/settings/firebaseSettings";
import { getSpeechRecognitionService, SpeechRecognitionResult } from "@/lib/speech/speechRecognition";
import { useIsMobile } from "@/lib/hooks/useDevice";
import { processImageFile, isImageFile, isSupportedImageFormat, formatFileSize } from "@/lib/utils/imageUtils";
import { uploadImage } from "@/lib/firebase/storage";
import { isFirebaseStorageAvailable } from "@/lib/firebase/config";
import type { FileAttachment } from "@/lib/models/note";

interface NoteInputBarProps {
  onSubmit: (text: string, includeLocation: boolean) => void;
  onFileDropped?: (file: FileAttachment, text: string) => void;
  isSubmitting?: boolean;
  placeholder?: string;
}

export default function NoteInputBar({
  onSubmit,
  onFileDropped,
  isSubmitting = false,
  placeholder = "メモを入力...（Enterで改行、Shift+Enterで送信）",
}: NoteInputBarProps) {
  const [text, setText] = useState("");
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechService] = useState(() => getSpeechRecognitionService());
  const [isClient, setIsClient] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [buttonMode, setButtonMode] = useState<'mic' | 'file'>('mic');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const isMobile = useIsMobile();
  
  // クライアントサイドでのみ画面幅を取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // モバイルデバイスまたは小さい画面幅の場合にモバイルUIを表示
  const shouldShowMobileUI = isMobile || windowWidth < 768;
  
  // BlobをBase64に変換するユーティリティ関数
  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  useEffect(() => {
    setIsClient(true);
    setLocationEnabled(getLocationSetting());
    setSpeechEnabled(getSpeechEnabled());

    const handleStorageChange = () => {
      setLocationEnabled(getLocationSetting());
      setSpeechEnabled(getSpeechEnabled());
    };

    const handleSpeechSettingChange = () => {
      setSpeechEnabled(getSpeechEnabled());
    };

    window.addEventListener("storage", handleStorageChange);
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
      
      // スマホの場合は自動登録
      if (shouldShowMobileUI && finalText) {
        setTimeout(() => {
          if (!isSubmitting) {
            const includeLocation = getLocationSetting();
            onSubmit(finalText, includeLocation);
            setText("");
            setIsListening(false);
          }
        }, 500);
      }
      // PCモードの場合はテキストモードに戻る
      else if (!shouldShowMobileUI && isVoiceMode) {
        setTimeout(() => {
          setIsVoiceMode(false);
          setIsListening(false);
        }, 1000);
      }
    } else {
      setInterimText(result.transcript);
    }
  }, [text, isSubmitting, onSubmit, shouldShowMobileUI, isVoiceMode]);

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

  // ドラッグ&ドロップ処理
  const processFile = useCallback(async (file: File) => {
    if (!onFileDropped) return;
    
    // 画像ファイル以外は処理しない
    if (!isImageFile(file)) {
      alert('画像ファイルのみアップロード可能です');
      return;
    }
    
    // サポートされていない形式
    if (!isSupportedImageFormat(file)) {
      alert('サポートされていない画像形式です\nサポート形式: JPEG, PNG, GIF, WebP');
      return;
    }
    
    try {
      const storageType = getStorageType();
      
      if (storageType === 'firebase' && isFirebaseStorageAvailable()) {
        // Firebase使用時: 画像を処理してStorageにアップロード
        const processed = await processImageFile(file);
        
        console.log(`処理完了: ${formatFileSize(file.size)} → オリジナル: ${formatFileSize(processed.originalSize)}, サムネイル: ${formatFileSize(processed.thumbnailSize)}`);
        
        try {
          // Firebase Storageにアップロード
          const originalUrl = await uploadImage(processed.originalBlob, file.name, 'images');
          const thumbnailUrl = await uploadImage(processed.thumbnailBlob, `thumb_${file.name}`, 'thumbnails');
        
        const fileAttachment: FileAttachment = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: originalUrl,
          thumbnailUrl,
          uploadedAt: Date.now(),
          width: processed.width,
          height: processed.height,
          thumbnailWidth: processed.thumbnailWidth,
          thumbnailHeight: processed.thumbnailHeight
        };
        
          onFileDropped(fileAttachment, text);
        } catch (storageError) {
          console.warn('Firebase Storage upload failed, falling back to local storage:', storageError);
          alert('Firebase Storageが利用できません。\nローカルストレージで保存します。');
          
          // ローカルストレージにフォールバック
          const originalBase64 = await blobToBase64(processed.originalBlob);
          const thumbnailBase64 = await blobToBase64(processed.thumbnailBlob);
          
          const fallbackAttachment: FileAttachment = {
            id: Date.now().toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            url: originalBase64,
            thumbnailUrl: thumbnailBase64,
            data: originalBase64.split(',')[1],
            uploadedAt: Date.now(),
            width: processed.width,
            height: processed.height,
            thumbnailWidth: processed.thumbnailWidth,
            thumbnailHeight: processed.thumbnailHeight
          };
          
          onFileDropped(fallbackAttachment, text);
        }
      } else {
        // ローカルストレージ使用時 or Firebase Storage未有効時: Base64エンコード
        const processed = await processImageFile(file);
        
        // Base64に変換
        const originalBase64 = await blobToBase64(processed.originalBlob);
        const thumbnailBase64 = await blobToBase64(processed.thumbnailBlob);
        
        const fileAttachment: FileAttachment = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: originalBase64,
          thumbnailUrl: thumbnailBase64,
          data: originalBase64.split(',')[1], // Base64のみ（後方互換性用）
          uploadedAt: Date.now(),
          width: processed.width,
          height: processed.height,
          thumbnailWidth: processed.thumbnailWidth,
          thumbnailHeight: processed.thumbnailHeight
        };
        
        onFileDropped(fileAttachment, text);
      }
      
      // テキスト入力をクリア
      setText("");
      setInterimText("");
      
    } catch (error) {
      console.error('ファイル処理エラー:', error);
      alert('画像の処理中にエラーが発生しました');
    }
  }, [text, onFileDropped, blobToBase64]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0]; // 最初のファイルのみ処理
      if (file.size > 3 * 1024 * 1024) { // 3MB制限（Firestore制限対応）
        alert("ファイルサイズは3MBまでです");
        return;
      }
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // スワイプ処理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // 左スワイプ：ファイルモードに切り替え
        setButtonMode('file');
      } else {
        // 右スワイプ：マイクモードに切り替え
        setButtonMode('mic');
      }
    }
    setTouchStartX(null);
  }, [touchStartX]);

  // ファイル選択処理
  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert("ファイルサイズは3MBまでです");
          return;
        }
        processFile(file);
      }
    };
    input.click();
  }, [processFile]);

  const displayText = text + interimText;

  // モバイル用の音声専用UI
  if (shouldShowMobileUI) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-6 pb-12 safe-area-bottom z-50">
        
        {/* 音声認識結果表示エリア */}
        {(text || interimText) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg min-h-[80px] max-h-[120px] overflow-y-auto">
            <div className="text-gray-800">
              {text}
              {interimText && (
                <span className="text-gray-400 italic">{interimText}</span>
              )}
            </div>
          </div>
        )}
        
        {/* 音声入力中の視覚的フィードバック */}
        {isListening && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center space-x-2 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              <span className="text-sm font-medium">音声を認識中...</span>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
            </div>
          </div>
        )}
        
        {/* メイン音声入力ボタンエリア */}
        <div className="flex flex-col items-center space-y-4">
          {/* メインボタン（スワイプ対応） */}
          {isClient && speechEnabled && speechService.isSupported() ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative"
            >
              <button
                type="button"
                onClick={buttonMode === 'mic' ? handleMicClick : handleFileSelect}
                disabled={isSubmitting}
                className={`relative flex items-center justify-center rounded-full transition-all duration-500 transform ${
                  isDragOver
                    ? "bg-green-500 text-white scale-110 shadow-xl ring-4 ring-green-300"
                    : buttonMode === 'file'
                    ? "bg-green-500 text-white hover:bg-green-600 hover:scale-105 shadow-md"
                    : isListening
                    ? "bg-red-500 text-white scale-110 shadow-lg animate-pulse"
                    : "bg-blue-800 text-white hover:bg-blue-900 hover:scale-105 shadow-md"
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                style={{ height: "100px", width: "100px" }}
              >
                {isDragOver || buttonMode === 'file' ? (
                  <FiPlus className="h-12 w-12" />
                ) : isListening ? (
                  <>
                    <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-pulse"></div>
                    <FiMicOff className="h-10 w-10" />
                  </>
                ) : (
                  <FiMic className="h-10 w-10" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-gray-200 rounded-full flex items-center justify-center" style={{ height: "100px", width: "100px" }}>
                <FiMic className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-sm text-red-500 text-center max-w-xs">
                {!isClient && "読み込み中..."}
                {isClient && !speechEnabled && "音声入力が無効です"}
                {isClient && speechEnabled && !speechService.isSupported() && "音声認識がサポートされていません"}
              </p>
            </div>
          )}
          
          {/* ステータステキスト */}
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-gray-800">
              {isListening 
                ? "録音中..." 
                : buttonMode === 'file' 
                ? "画像を選択してメモ登録" 
                : "音声でメモを追加"
              }
            </p>
            <p className="text-sm text-gray-600">
              {isListening 
                ? "再度タップして録音停止・自動保存" 
                : buttonMode === 'file'
                ? "＋ボタンをタップして画像を選択"
                : "マイクボタンをタップして録音開始"
              }
            </p>
          </div>
          
          {/* 位置情報表示 */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-full">
            <FiMapPin
              className={`h-4 w-4 transition-colors ${
                locationEnabled ? "text-blue-800" : "text-gray-400"
              }`}
            />
            <span className="text-sm text-gray-600">
              {locationEnabled ? "位置情報を含めて保存" : "位置情報なしで保存"}
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  // PCモード：音声入力モードの場合は大きなマイクUIを表示
  if (!shouldShowMobileUI && isVoiceMode) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-8 pb-12 safe-area-bottom z-50">
        {/* 音声認識結果表示エリア */}
        {(text || interimText) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg min-h-[60px] max-h-[100px] overflow-y-auto mx-auto max-w-2xl">
            <div className="text-gray-800">
              {text}
              {interimText && (
                <span className="text-gray-400 italic">{interimText}</span>
              )}
            </div>
          </div>
        )}
        
        {/* 音声入力中の視覚的フィードバック */}
        {isListening && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center space-x-2 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              <span className="text-sm font-medium">音声を認識中...</span>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
            </div>
          </div>
        )}
        
        {/* メイン音声入力ボタンエリア */}
        <div className="flex flex-col items-center space-y-4">
          {/* 大きな円形マイクボタン（ドロップ領域） */}
          {isClient && speechEnabled && speechService.isSupported() ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="relative"
            >
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isSubmitting}
                className={`relative flex items-center justify-center rounded-full transition-all duration-300 transform ${
                  isDragOver
                    ? "bg-green-500 text-white scale-110 shadow-xl ring-4 ring-green-300"
                    : isListening
                    ? "bg-red-500 text-white scale-110 shadow-xl"
                    : "bg-blue-800 text-white hover:bg-blue-900 hover:scale-105 shadow-lg"
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                style={{ height: "80px", width: "80px" }}
              >
                {isDragOver ? (
                  <FiPlus className="h-8 w-8" />
                ) : isListening ? (
                  <>
                    <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-pulse"></div>
                    <FiMicOff className="h-8 w-8" />
                  </>
                ) : (
                  <FiMic className="h-8 w-8" />
                )}
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              <FiMic className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-gray-800">
              {isListening ? "録音中..." : "音声入力モード"}
            </p>
            <p className="text-sm text-gray-600">
              {isListening 
                ? "マイクボタンをクリックして録音停止" 
                : "マイクボタンをクリックして録音開始"
              }
            </p>
          </div>
          
          {/* 戻るボタン */}
          <button
            type="button"
            onClick={() => setIsVoiceMode(false)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            テキスト入力に戻る
          </button>
        </div>
      </div>
    );
  }
  
  // PCモード：通常のテキスト入力UI
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-12 safe-area-bottom z-50">
      <form onSubmit={handleSubmit} className="flex items-start space-x-3">
        <div className="flex items-start px-6 pb-3 space-x-3 w-full">
          <div
            className="flex-shrink-0 flex items-start justify-center transition-colors"
            title={
              locationEnabled ? "位置情報記録：有効" : "位置情報記録：無効"
            }
            style={{ width: "28px", paddingTop: "8px" }}
          >
            <FiMapPin
              className={`h-7 w-7 transition-colors ${
                locationEnabled ? "text-blue-800" : "text-gray-400"
              }`}
            />
          </div>
          
          <div className="flex-1 flex flex-col">
            <div 
              className="relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                value={displayText}
                onChange={(e) => {
                  if (!isListening) {
                    setText(e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isDragOver
                    ? "ファイルをドロップしてください..."
                    : isListening 
                    ? "音声を認識中..." 
                    : placeholder
                }
                className={`w-full px-4 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-700 focus:border-transparent outline-none transition-all ${
                  isDragOver
                    ? "bg-green-50 border-green-400 ring-2 ring-green-300"
                    : isListening 
                    ? "bg-red-50 border-red-200" 
                    : "border-gray-300"
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
            
            {/* 操作説明 */}
            <p className="text-xs text-gray-500 mt-1 text-center">
              ファイルをドラッグ＆ドロップしてメモ登録できます
            </p>
          </div>
          
          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting}
            className="flex-shrink-0 flex items-center justify-center bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="送信"
            style={{ height: "40px", width: "40px" }}
          >
            <FiSend className="h-4 w-4" />
          </button>
          
          {/* 音声入力ボタン（PCモード用） */}
          {isClient && speechEnabled && speechService.isSupported() && (
            <button
              type="button"
              onClick={() => setIsVoiceMode(true)}
              disabled={isSubmitting}
              className="flex-shrink-0 flex items-center justify-center rounded-lg transition-colors bg-gray-500 text-white hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="音声入力モードに切り替え"
              style={{ height: "40px", width: "40px" }}
            >
              <FiMic className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}