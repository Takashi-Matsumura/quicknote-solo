import { useState, useEffect } from 'react';
import { isMobileDevice, isTabletDevice, isDesktopDevice, getDeviceType, DeviceType, isSmallScreen } from '@/lib/utils/device';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: DeviceType;
  isSmallScreen: boolean;
  width: number;
  height: number;
}

/**
 * デバイス情報を管理するカスタムフック
 */
export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop' as DeviceType,
        isSmallScreen: false,
        width: 1920,
        height: 1080,
      };
    }

    return {
      isMobile: isMobileDevice(),
      isTablet: isTabletDevice(),
      isDesktop: isDesktopDevice(),
      deviceType: getDeviceType(),
      isSmallScreen: isSmallScreen(),
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo({
        isMobile: isMobileDevice(),
        isTablet: isTabletDevice(),
        isDesktop: isDesktopDevice(),
        deviceType: getDeviceType(),
        isSmallScreen: isSmallScreen(),
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // 初期化時に一度実行
    updateDeviceInfo();

    // リサイズイベントをリッスン
    window.addEventListener('resize', updateDeviceInfo);
    
    // オリエンテーション変更をリッスン（モバイル対応）
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

/**
 * モバイルデバイス用の最適化されたフック
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);
  
  return isMobile;
}