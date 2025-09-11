"use client";

import { useState, useRef, useEffect } from "react";
import { FiSettings, FiInfo, FiRefreshCw, FiType, FiMenu, FiX } from "react-icons/fi";
import Link from "next/link";
import { useFontSize } from "@/contexts/FontSizeContext";

interface HeaderLauncherProps {
  onSync: () => void;
  onInfo: () => void;
}

export default function HeaderLauncher({ onSync, onInfo }: HeaderLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);
  const { nextFontSize, getFontSizeLabel } = useFontSize();

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (launcherRef.current && !launcherRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const toggleLauncher = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={launcherRef}>
      {/* メニューボタン */}
      <button
        onClick={toggleLauncher}
        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        title="メニュー"
      >
        {isOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
      </button>

      {/* ランチャー */}
      <div
        className={`absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-48 transform transition-all duration-300 ease-out origin-top-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-x-0'
            : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
        }`}
      >
        <div className="py-2">
          {/* 文字サイズ変更 */}
          <button
            onClick={() => handleItemClick(nextFontSize)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
          >
            <FiType className="h-4 w-4" />
            <span>文字サイズ</span>
            <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
              {getFontSizeLabel()}
            </span>
          </button>

          {/* 同期 */}
          <button
            onClick={() => handleItemClick(onSync)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
          >
            <FiRefreshCw className="h-4 w-4" />
            <span>同期</span>
          </button>

          <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

          {/* 設定 */}
          <Link
            href="/settings"
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            <div className="flex items-center space-x-3">
              <FiSettings className="h-4 w-4" />
              <span>設定</span>
            </div>
          </Link>

          {/* アプリ情報 */}
          <button
            onClick={() => handleItemClick(onInfo)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
          >
            <FiInfo className="h-4 w-4" />
            <span>アプリ情報</span>
          </button>
        </div>
      </div>
    </div>
  );
}