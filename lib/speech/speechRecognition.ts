"use client";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  addEventListener(type: 'result', listener: (event: SpeechRecognitionEvent) => void): void;
  addEventListener(type: 'error', listener: (event: SpeechRecognitionErrorEvent) => void): void;
  addEventListener(type: 'start' | 'end' | 'soundstart' | 'soundend' | 'speechstart' | 'speechend', listener: (event: Event) => void): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionCallbacks {
  onResult?: (result: SpeechRecognitionResult) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onSoundStart?: () => void;
  onSoundEnd?: () => void;
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionConstructor = 
        window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognitionConstructor) {
        this.recognition = new SpeechRecognitionConstructor();
        this.setupRecognition();
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ja-JP';
    this.recognition.maxAlternatives = 1;
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public isCurrentlyListening(): boolean {
    return this.isListening;
  }

  public async startListening(callbacks: SpeechRecognitionCallbacks = {}): Promise<void> {
    if (!this.recognition) {
      callbacks.onError?.('音声認識がサポートされていません');
      return;
    }

    if (this.isListening) {
      callbacks.onError?.('既に音声認識が実行中です');
      return;
    }

    // 権限チェック
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      callbacks.onError?.('マイクへのアクセス権限が必要です');
      return;
    }

    // イベントリスナーをクリア
    this.clearEventListeners();

    // 新しいイベントリスナーを設定
    this.recognition.addEventListener('start', () => {
      this.isListening = true;
      callbacks.onStart?.();
    });

    this.recognition.addEventListener('result', (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      
      if (lastResult) {
        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence;
        const isFinal = lastResult.isFinal;

        callbacks.onResult?.({
          transcript: transcript.trim(),
          confidence,
          isFinal
        });
      }
    });

    this.recognition.addEventListener('error', (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      let errorMessage = '音声認識エラーが発生しました';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'マイクへのアクセスが拒否されました';
          break;
        case 'no-speech':
          errorMessage = '音声が検出されませんでした';
          break;
        case 'audio-capture':
          errorMessage = 'マイクにアクセスできません';
          break;
        case 'network':
          errorMessage = 'ネットワークエラーが発生しました';
          break;
      }
      
      callbacks.onError?.(errorMessage);
    });

    this.recognition.addEventListener('end', () => {
      this.isListening = false;
      callbacks.onEnd?.();
    });

    this.recognition.addEventListener('soundstart', () => {
      callbacks.onSoundStart?.();
    });

    this.recognition.addEventListener('soundend', () => {
      callbacks.onSoundEnd?.();
    });

    // 音声認識開始
    try {
      this.recognition.start();
    } catch {
      this.isListening = false;
      callbacks.onError?.('音声認識の開始に失敗しました');
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  public abortListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  private clearEventListeners(): void {
    if (!this.recognition) return;
    
    // 新しいインスタンスを作成してイベントリスナーをクリア
    const SpeechRecognitionConstructor = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionConstructor) {
      this.recognition = new SpeechRecognitionConstructor();
      this.setupRecognition();
    }
  }
}

// シングルトンインスタンス
let speechService: SpeechRecognitionService | null = null;

export function getSpeechRecognitionService(): SpeechRecognitionService {
  if (!speechService) {
    speechService = new SpeechRecognitionService();
  }
  return speechService;
}