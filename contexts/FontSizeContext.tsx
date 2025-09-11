"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FontSize = 'small' | 'medium' | 'large';

interface FontSizeContextType {
  fontSize: FontSize;
  changeFontSize: (size: FontSize) => void;
  nextFontSize: () => void;
  getFontSizeClass: () => string;
  getFontSizeLabel: () => string;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const FONT_SIZE_KEY = 'quicknote-font-size';

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>('small');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFontSize = localStorage.getItem(FONT_SIZE_KEY) as FontSize;
      if (savedFontSize && ['small', 'medium', 'large'].includes(savedFontSize)) {
        setFontSize(savedFontSize);
      }
    }
  }, []);

  const changeFontSize = (size: FontSize) => {
    setFontSize(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FONT_SIZE_KEY, size);
    }
  };

  const nextFontSize = () => {
    const sizeOrder: FontSize[] = ['small', 'medium', 'large'];
    const currentIndex = sizeOrder.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % sizeOrder.length;
    changeFontSize(sizeOrder[nextIndex]);
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-sm';
      case 'medium':
        return 'text-base';
      case 'large':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  const getFontSizeLabel = () => {
    switch (fontSize) {
      case 'small':
        return '小';
      case 'medium':
        return '中';
      case 'large':
        return '大';
      default:
        return '小';
    }
  };

  return (
    <FontSizeContext.Provider value={{
      fontSize,
      changeFontSize,
      nextFontSize,
      getFontSizeClass,
      getFontSizeLabel,
    }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}