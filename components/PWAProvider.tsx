"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/pwa/register-sw";

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}