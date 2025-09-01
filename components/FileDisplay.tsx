"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiDownload, FiFile, FiImage, FiFileText, FiX } from "react-icons/fi";
import type { FileAttachment } from "@/lib/models/note";
import { getStorageType } from "@/lib/settings/firebaseSettings";

interface FileDisplayProps {
  attachments: FileAttachment[];
  compact?: boolean;
  showDownloadButton?: boolean;
  maxDisplay?: number;
}

export default function FileDisplay({
  attachments,
  compact = false,
  showDownloadButton = true,
  maxDisplay = 5
}: FileDisplayProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return FiImage;
    if (mimeType.includes("text") || mimeType.includes("document")) return FiFileText;
    return FiFile;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadFile = useCallback((attachment: FileAttachment) => {
    try {
      const storageType = getStorageType();
      
      if (storageType === 'firebase') {
        // Firebase Storage: 直接URLを使用
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // ローカルストレージ: Base64データからBlobを作成
        if (!attachment.data) {
          console.error('No data available for download');
          return;
        }
        
        const byteCharacters = atob(attachment.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: attachment.type });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  }, []);

  const renderImagePreview = useCallback((attachment: FileAttachment) => {
    if (!attachment.type.startsWith('image/')) return null;
    
    const storageType = getStorageType();
    let thumbnailUrl: string;
    let fullImageUrl: string;
    
    if (storageType === 'firebase') {
      // Firebase: サムネイルとオリジナルURLを使用
      thumbnailUrl = attachment.thumbnailUrl || attachment.url;
      fullImageUrl = attachment.url;
    } else {
      // ローカル: Base64データを使用
      thumbnailUrl = attachment.thumbnailUrl || attachment.url;
      fullImageUrl = attachment.url;
    }
    
    return (
      <div className="relative">
        <img
          src={thumbnailUrl}
          alt={attachment.name}
          className={`rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity ${
            compact ? "w-16 h-16" : "w-24 h-24"
          }`}
          onClick={() => setExpandedImage(fullImageUrl)}
          loading="lazy"
        />
      </div>
    );
  }, [compact]);

  const displayedAttachments = attachments.slice(0, maxDisplay);
  const remainingCount = attachments.length - maxDisplay;

  if (attachments.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* ファイル一覧 */}
      <div className={compact ? "space-y-1" : "space-y-2"}>
        {displayedAttachments.map((attachment) => {
          const Icon = getFileIcon(attachment.type);
          const isImage = attachment.type.startsWith('image/');
          
          return (
            <div
              key={attachment.id}
              className={`flex items-center space-x-3 p-2 bg-gray-50 rounded-lg ${
                compact ? "text-xs" : "text-sm"
              }`}
            >
              {/* ファイルプレビュー/アイコン */}
              <div className="flex-shrink-0">
                {isImage ? (
                  renderImagePreview(attachment)
                ) : (
                  <div className={`flex items-center justify-center rounded-lg bg-gray-200 ${
                    compact ? "w-8 h-8" : "w-12 h-12"
                  }`}>
                    <Icon className={`text-gray-600 ${compact ? "h-4 w-4" : "h-6 w-6"}`} />
                  </div>
                )}
              </div>
              
              {/* ファイル情報 */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {attachment.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(attachment.size)} • {attachment.type}
                </p>
              </div>
              
              {/* ダウンロードボタン */}
              {showDownloadButton && (
                <button
                  onClick={() => downloadFile(attachment)}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-blue-500 rounded transition-colors"
                  title="ダウンロード"
                >
                  <FiDownload className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
        
        {/* 残りのファイル数表示 */}
        {remainingCount > 0 && (
          <div className="text-xs text-gray-500 px-2">
            +{remainingCount}個のファイル
          </div>
        )}
      </div>
      
      {/* 画像拡大表示モーダル */}
      {expandedImage && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            zIndex: 9999 
          }}
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative w-screen h-screen flex items-center justify-center">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-6 right-6 bg-black bg-opacity-60 rounded-full p-3 text-white hover:text-gray-300 hover:bg-opacity-80 transition-all"
              style={{ zIndex: 10000 }}
            >
              <FiX className="h-6 w-6" />
            </button>
            <img
              src={expandedImage}
              alt="拡大表示"
              className="object-contain rounded-lg shadow-2xl"
              style={{ 
                maxWidth: '100vw', 
                maxHeight: '100vh',
                width: 'auto',
                height: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}