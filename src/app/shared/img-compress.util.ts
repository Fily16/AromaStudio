/**
 * Comprime una imagen en el NAVEGADOR antes de subirla: la foto de 4MB del
 * celular se convierte en ~150KB WebP. Se guarda en la base de datos (el
 * hosting no tiene disco persistente), así que el peso importa de verdad.
 */
export interface CompressedImage {
  dataUrl: string;      // data:image/webp;base64,....
  contentType: string;  // image/webp | image/jpeg
  sizeBytes: number;    // tamaño real del binario (no del string base64)
}

export async function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close(); throw new Error('No se pudo procesar la imagen.'); }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP pesa ~30% menos; Safari viejo no lo exporta y cae a JPEG solo.
  let dataUrl = canvas.toDataURL('image/webp', quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  const contentType = dataUrl.slice(5, dataUrl.indexOf(';'));
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return { dataUrl, contentType, sizeBytes: Math.ceil(base64.length * 3 / 4) };
}

/** Peso legible para la UI ("148 KB"). */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
