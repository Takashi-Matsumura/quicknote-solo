"use client";

import { useEffect } from "react";
import { registerServiceWorker, unregisterServiceWorker } from "@/pwa/register-sw";

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 開発環境ではService Workerを無効化
    if (process.env.NODE_ENV !== 'development') {
      registerServiceWorker();
    } else {
      console.log('Service Worker disabled in development mode - unregistering existing worker');
      // 既存のService Workerをアンインストール
      unregisterServiceWorker();
      
      // キャッシュもクリア
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            console.log('Deleting cache:', cacheName);
            caches.delete(cacheName);
          });
        });
      }
    }
  }, []);

  return <>{children}</>;
}