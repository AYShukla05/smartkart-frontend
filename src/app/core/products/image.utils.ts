/**
 * Converts an image File to a WebP Blob using the Canvas API.
 * Maintains aspect ratio. Max dimension: 1920px.
 */
export function convertToWebp(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("WebP conversion failed"));
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function isValidImageType(file: File): boolean {
  return ["image/jpeg", "image/jpg", "image/png"].includes(file.type);
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}
