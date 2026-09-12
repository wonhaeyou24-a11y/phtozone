/** A decoded image, abstracting over ImageBitmap vs <img> fallback so callers can just draw()/dispose(). */
export interface DecodedImage {
  width: number;
  height: number;
  draw(ctx: CanvasRenderingContext2D, dw: number, dh: number): void;
  dispose(): void;
}

/** Decodes a file for canvas drawing. Never throws — returns null for corrupted/unreadable images (spec section 42). */
export async function decodeImage(file: File): Promise<DecodedImage | null> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, dw, dh) => ctx.drawImage(bitmap, 0, 0, dw, dh),
        dispose: () => bitmap.close(),
      };
    } catch {
      // fall through to <img>-based decoding below
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        draw: (ctx, dw, dh) => ctx.drawImage(img, 0, 0, dw, dh),
        dispose: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
