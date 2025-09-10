export class UserError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'UserError';
  }
}

export interface ErrorLogContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: Record<string, unknown>;
}

export class ErrorHandler {
  private static readonly MAX_LOG_ENTRIES = 100;
  private static errorLogs: Array<{
    timestamp: number;
    error: string;
    context?: ErrorLogContext;
  }> = [];

  static handle(
    error: unknown, 
    userMessage: string, 
    context?: ErrorLogContext
  ): UserError {
    const userError = this.createUserError(userMessage, error instanceof Error ? error : undefined);
    
    this.logError(error, context);
    
    // デバッグ環境では詳細なエラーを出力
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', {
        userMessage,
        originalError: error,
        context,
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    return userError;
  }

  static createUserError(message: string, cause?: Error): UserError {
    return new UserError(message, cause);
  }

  static logError(error: unknown, context?: ErrorLogContext): void {
    const errorString = error instanceof Error 
      ? `${error.name}: ${error.message}` 
      : String(error);

    const logEntry = {
      timestamp: Date.now(),
      error: errorString,
      context
    };

    this.errorLogs.unshift(logEntry);
    
    // ログサイズ制限
    if (this.errorLogs.length > this.MAX_LOG_ENTRIES) {
      this.errorLogs = this.errorLogs.slice(0, this.MAX_LOG_ENTRIES);
    }

    // プロダクション環境では必要最小限のログのみ
    if (process.env.NODE_ENV === 'production') {
      console.error(`[${new Date().toISOString()}] ${errorString}`, context?.component || '');
    }
  }

  static getErrorLogs(): ReadonlyArray<{
    timestamp: number;
    error: string;
    context?: ErrorLogContext;
  }> {
    return this.errorLogs;
  }

  static clearErrorLogs(): void {
    this.errorLogs = [];
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string,
    context?: ErrorLogContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handle(error, errorMessage, context);
    }
  }

  static withSyncErrorHandling<T>(
    operation: () => T,
    errorMessage: string,
    context?: ErrorLogContext
  ): T {
    try {
      return operation();
    } catch (error) {
      throw this.handle(error, errorMessage, context);
    }
  }

  static isUserError(error: unknown): error is UserError {
    return error instanceof UserError;
  }

  static getErrorMessage(error: unknown): string {
    if (this.isUserError(error)) {
      return error.message;
    }
    
    if (error instanceof Error) {
      return process.env.NODE_ENV === 'development' 
        ? error.message 
        : '予期しないエラーが発生しました';
    }
    
    return '不明なエラーが発生しました';
  }
}

export const ErrorMessages = {
  NETWORK: 'ネットワークエラーが発生しました。接続を確認してください。',
  STORAGE: 'データの保存に失敗しました。',
  FIREBASE: 'クラウド同期でエラーが発生しました。',
  VOICE_RECOGNITION: '音声認識でエラーが発生しました。',
  FILE_UPLOAD: 'ファイルのアップロードに失敗しました。',
  PERMISSION: '権限が不足しています。',
  VALIDATION: '入力内容に問題があります。',
  UNKNOWN: '予期しないエラーが発生しました。'
} as const;