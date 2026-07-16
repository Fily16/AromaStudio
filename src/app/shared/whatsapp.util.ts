/**
 * Número de WhatsApp del negocio, centralizado: antes estaba copiado a mano en
 * 7+ archivos y el footer mostraba un número distinto al que abrían los enlaces.
 */
export const WHATSAPP_PHONE = '51933134699';
export const WHATSAPP_DISPLAY = '933 134 699';

/** Enlace wa.me, con mensaje precargado opcional. */
export function waLink(text?: string): string {
  return text
    ? `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${WHATSAPP_PHONE}`;
}

/** Dispara los píxeles de TikTok y Meta con el evento 'Contact'. */
export function trackContact(payload?: Record<string, unknown>): void {
  try { (window as any).ttq?.track('Contact', payload ?? {}); } catch { }
  try { (window as any).fbq?.('track', 'Contact', payload ?? {}); } catch { }
}

/** Pixel + apertura de WhatsApp con un pequeño delay para que el evento alcance a salir. */
export function openWhatsApp(text?: string, payload?: Record<string, unknown>, delayMs = 300): void {
  trackContact(payload);
  setTimeout(() => window.open(waLink(text), '_blank'), delayMs);
}
