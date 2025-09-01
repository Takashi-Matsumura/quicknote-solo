"use client";

import { useState, useRef, useCallback } from "react";
import { FiPaperclip, FiX, FiFile, FiImage, FiFileText } from "react-icons/fi";
import type { FileAttachment } from "@/lib/models/note";

interface FileUploadProps {
  onFilesSelected: (files: FileAttachment[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // bytes
  acceptedTypes?: string[];
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = [
  "image/*",
  "application/pdf",
  "text/*",
  ".doc",
  ".docx",
  ".xlsx",
  ".xls",
  ".ppt",
  ".pptx"
];

export default function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSizePerFile = MAX_FILE_SIZE,
  acceptedTypes = ACCEPTED_TYPES,
  disabled = false
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFiles = useCallback(async (files: FileList) => {
    if (disabled) return;
    
    setIsProcessing(true);
    const newAttachments: FileAttachment[] = [];

    try {
      for (let i = 0; i < files.length && i < maxFiles; i++) {
        const file = files[i];

        // サイズチェック
        if (file.size > maxSizePerFile) {
          alert(`ファイル "${file.name}" のサイズが大きすぎます（最大: ${formatFileSize(maxSizePerFile)}）`);
          continue;
        }

        // Base64エンコード
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // data:image/jpeg;base64, の部分を除去してBase64データのみを取得
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const attachment: FileAttachment = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: `data:${file.type};base64,${base64Data}`,
          data: base64Data,
          uploadedAt: Date.now()
        };

        newAttachments.push(attachment);
      }

      const updatedFiles = [...selectedFiles, ...newAttachments].slice(0, maxFiles);
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
      
    } catch (error) {
      console.error("ファイルの処理に失敗しました:", error);
      alert("ファイルの処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles, onFilesSelected, maxFiles, maxSizePerFile, disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // inputの値をクリアして、同じファイルを再選択可能にする
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles, disabled]);

  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = selectedFiles.filter(file => file.id !== fileId);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  }, [selectedFiles, onFilesSelected]);

  const handleButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* ファイル選択エリア */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
          isDragOver 
            ? "border-blue-500 bg-blue-50" 
            : disabled 
              ? "border-gray-200 bg-gray-50 cursor-not-allowed" 
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <FiPaperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        
        {isProcessing ? (
          <div className="text-blue-600">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            ファイルを処理中...
          </div>
        ) : (
          <div className={disabled ? "text-gray-400" : "text-gray-600"}>
            <p className="font-medium">
              ファイルを選択またはドラッグ&ドロップ
            </p>
            <p className="text-sm mt-1">
              最大{maxFiles}ファイル、{formatFileSize(maxSizePerFile)}まで
            </p>
          </div>
        )}
      </div>

      {/* 選択されたファイルのリスト */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            添付ファイル ({selectedFiles.length})
          </h4>
          <div className="space-y-1">
            {selectedFiles.map((file) => {
              const Icon = getFileIcon(file.type);
              return (
                <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {file.type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded"
                    disabled={disabled}
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}