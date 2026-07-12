/**
 * Descarga imágenes en PARALELO (vía proxy wsrv como JPG cuadrado) para incrustarlas
 * en Excel/PDF. Best-effort: las que fallan se omiten. Devuelve un mapa url -> ArrayBuffer.
 */
export async function fetchImages(
  urls: (string | null | undefined)[],
  onProgress?: (done: number, total: number) => void,
  size = 220,
  concurrency = 8
): Promise<Map<string, ArrayBuffer>> {
  const uniq = [...new Set(urls.filter((u): u is string => !!u && /^https?:\/\//i.test(u)))];
  const map = new Map<string, ArrayBuffer>();
  const total = uniq.length;
  let done = 0;
  let idx = 0;

  async function worker() {
    while (idx < uniq.length) {
      const u = uniq[idx++];
      try {
        const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(u)}&w=${size}&h=${size}&fit=cover&output=jpg`;
        const res = await fetch(proxied);
        if (res.ok) map.set(u, await res.arrayBuffer());
      } catch { /* omite */ }
      done++;
      onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, uniq.length) }, () => worker()));
  return map;
}

/** ArrayBuffer -> data URL base64 (para jsPDF.addImage). */
export function bufferToDataUrl(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return 'data:image/jpeg;base64,' + btoa(binary);
}
