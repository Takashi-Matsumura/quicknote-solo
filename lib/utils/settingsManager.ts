export interface StorageConfig<T> {
  key: string;
  defaultValue: T;
  validator?: (value: unknown) => value is T;
}

export class SettingsManager<T> {
  private config: StorageConfig<T>;
  private listeners: ((value: T) => void)[] = [];

  constructor(config: StorageConfig<T>) {
    this.config = config;
  }

  get(): T {
    if (typeof window === 'undefined') {
      return this.config.defaultValue;
    }

    try {
      const stored = localStorage.getItem(this.config.key);
      if (stored === null) {
        return this.config.defaultValue;
      }

      const parsed = JSON.parse(stored);
      
      if (this.config.validator && !this.config.validator(parsed)) {
        console.warn(`Invalid stored value for ${this.config.key}, using default`);
        return this.config.defaultValue;
      }

      return parsed;
    } catch (error) {
      console.error(`Error reading ${this.config.key} from localStorage:`, error);
      return this.config.defaultValue;
    }
  }

  set(value: T): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.config.key, JSON.stringify(value));
      this.notifyListeners(value);
    } catch (error) {
      console.error(`Error saving ${this.config.key} to localStorage:`, error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.config.key);
    this.notifyListeners(this.config.defaultValue);
  }

  subscribe(callback: (value: T) => void): () => void {
    this.listeners.push(callback);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(value: T): void {
    this.listeners.forEach(callback => {
      try {
        callback(value);
      } catch (error) {
        console.error('Error in settings listener:', error);
      }
    });
  }
}

export function createSettingsManager<T>(config: StorageConfig<T>): SettingsManager<T> {
  return new SettingsManager(config);
}