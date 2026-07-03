/**
 * Optimización de imágenes vía CDN (wsrv.nl / images.weserv.nl):
 * redimensiona, comprime, entrega en WebP y cachea globalmente.
 *
 * - Imágenes remotas (http/https, ej. ebay/jomashop) → se sirven optimizadas y nítidas.
 * - data: (promos subidas) y rutas locales/relativas → se devuelven tal cual.
 */
export function cdnImage(url: string | null | undefined, width = 500, quality = 74): string {
  if (!url) return '';
  const u = url.trim();
  if (u.startsWith('data:') || !/^https?:\/\//i.test(u)) return u; // local/relativa/base64
  return `https://images.weserv.nl/?url=${encodeURIComponent(u)}&w=${width}&q=${quality}&output=webp&we`;
}
