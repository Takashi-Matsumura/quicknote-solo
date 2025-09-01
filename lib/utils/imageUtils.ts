export interface ProcessedImage {
  originalBlob: Blob;
  thumbnailBlob: Blob;
  originalSize: number;
  thumbnailSize: number;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

/**
 * 画像ファイルをリサイズ・圧縮し、サムネイルも生成する
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // オリジナル画像の処理（最大1200x1200px、JPEG品質80%）
        const originalCanvas = document.createElement('canvas');
        const originalCtx = originalCanvas.getContext('2d');
        if (!originalCtx) throw new Error('Canvas context not available');
        
        // アスペクト比を保持してリサイズ
        const maxSize = 1200;
        const { width, height } = calculateDimensions(img.width, img.height, maxSize);
        
        originalCanvas.width = width;
        originalCanvas.height = height;
        originalCtx.drawImage(img, 0, 0, width, height);
        
        // サムネイル画像の処理（最大300x300px、JPEG品質70%）
        const thumbnailCanvas = document.createElement('canvas');
        const thumbnailCtx = thumbnailCanvas.getContext('2d');
        if (!thumbnailCtx) throw new Error('Thumbnail canvas context not available');
        
        const thumbnailMaxSize = 300;
        const { width: thumbnailWidth, height: thumbnailHeight } = calculateDimensions(
          img.width, 
          img.height, 
          thumbnailMaxSize
        );
        
        thumbnailCanvas.width = thumbnailWidth;
        thumbnailCanvas.height = thumbnailHeight;
        thumbnailCtx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);
        
        // Blobに変換
        originalCanvas.toBlob((originalBlob) => {
          if (!originalBlob) {
            reject(new Error('Failed to create original blob'));
            return;
          }
          
          thumbnailCanvas.toBlob((thumbnailBlob) => {
            if (!thumbnailBlob) {
              reject(new Error('Failed to create thumbnail blob'));
              return;
            }
            
            resolve({
              originalBlob,
              thumbnailBlob,
              originalSize: originalBlob.size,
              thumbnailSize: thumbnailBlob.size,
              width,
              height,
              thumbnailWidth,
              thumbnailHeight
            });
          }, 'image/jpeg', 0.7); // サムネイルは品質70%
        }, 'image/jpeg', 0.8); // オリジナルは品質80%
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * アスペクト比を保持してサイズを計算
 */
function calculateDimensions(originalWidth: number, originalHeight: number, maxSize: number): { width: number; height: number } {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  
  if (originalWidth > originalHeight) {
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio)
    };
  } else {
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize
    };
  }
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 画像ファイルかどうかを判定
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * サポートされている画像形式かどうかを判定
 */
export function isSupportedImageFormat(file: File): boolean {
  const supportedFormats = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  return supportedFormats.includes(file.type);
}