/**
 * デバイス検出ユーティリティ
 */

/**
 * モバイルデバイスかどうかを判定
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // User Agentによる判定
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'iemobile', 'opera mini'
  ];
  
  const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // 画面幅による判定（768px未満をモバイルとする）
  const isMobileWidth = window.innerWidth < 768;
  
  // タッチデバイスかどうかの判定
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return isMobileUserAgent || (isMobileWidth && isTouchDevice);
}

/**
 * タブレットデバイスかどうかを判定
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  
  // iPadやAndroidタブレットの判定
  const isTabletUserAgent = userAgent.includes('ipad') || 
    (userAgent.includes('android') && !userAgent.includes('mobile'));
  
  // 画面幅による判定（768px以上1024px未満をタブレットとする）
  const isTabletWidth = width >= 768 && width < 1024;
  
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return isTabletUserAgent || (isTabletWidth && isTouchDevice);
}

/**
 * デスクトップデバイスかどうかを判定
 */
export function isDesktopDevice(): boolean {
  return !isMobileDevice() && !isTabletDevice();
}

/**
 * 画面サイズに基づくデバイスタイプを取得
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function getDeviceType(): DeviceType {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
}

/**
 * レスポンシブ対応のためのブレークポイント判定
 */
export function isSmallScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 640;
}

export function isMediumScreen(): boolean {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  return width >= 640 && width < 1024;
}

export function isLargeScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 1024;
}