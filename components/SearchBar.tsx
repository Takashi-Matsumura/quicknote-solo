"use client";

import { useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, onClear, placeholder = "メモを検索..." }: SearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleSearchClick = () => {
    setIsExpanded(true);
  };
  
  const handleBlur = () => {
    if (!value) {
      setIsExpanded(false);
    }
  };
  
  const handleClear = () => {
    onClear();
    setIsExpanded(false);
  };
  
  // アイコンのみ表示状態
  if (!isExpanded && !value) {
    return (
      <div className="flex justify-start">
        <button
          onClick={handleSearchClick}
          className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          title="検索"
        >
          <FiSearch className="h-5 w-5" />
        </button>
      </div>
    );
  }
  
  // 入力フィールド展開状態
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiSearch className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        autoFocus
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}