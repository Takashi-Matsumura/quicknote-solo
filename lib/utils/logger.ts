interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  
  private static sanitizeData(data: unknown): unknown {
    if (typeof data === 'string') {
      // TOTP秘密キーやFirebase設定をマスク
      return data
        .replace(/AIza[A-Za-z0-9_-]{35}/g, 'AIza***MASKED***')
        .replace(/[A-Z2-7]{32}/g, '***TOTP_SECRET_MASKED***')
        .replace(/1:[0-9]+:web:[a-z0-9]+/g, '***FIREBASE_APP_ID_MASKED***');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data as Record<string, unknown> };
      
      // 機密フィールドをマスク
      const sensitiveFields = ['secret', 'apiKey', 'token', 'password', 'key'];
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '***MASKED***';
        }
      });
      
      return sanitized;
    }
    
    return data;
  }

  static log(message: string, data?: unknown, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data: sanitizedData,
      context
    };
    
    console.log('[LOG]', JSON.stringify(logEntry, null, 2));
  }

  static error(message: string, error?: Error | unknown, context?: LogContext): void {
    const sanitizedError = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : this.sanitizeData(error);
      
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: sanitizedError,
      context
    };
    
    console.error('[ERROR]', JSON.stringify(logEntry, null, 2));
  }

  static warn(message: string, data?: unknown, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data: sanitizedData,
      context
    };
    
    console.warn('[WARN]', JSON.stringify(logEntry, null, 2));
  }

  // 本番環境でのデバッグ用（緊急時のみ使用）
  static debugProd(message: string, data?: unknown): void {
    if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      const sanitizedData = data ? this.sanitizeData(data) : undefined;
      console.log('[DEBUG]', message, sanitizedData);
    }
  }
}

export default Logger;