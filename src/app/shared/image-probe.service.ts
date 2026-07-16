import { Injectable } from '@angular/core';
import { cdnImage } from './img.util';

export type ProbeReason = 'sin-url' | 'error' | 'timeout' | 'placeholder';

export interface ProbeResult {
  ok: boolean;
  reason?: ProbeReason;
  width?: number;
  height?: number;
}

/**
 * Validador de imágenes "igual que el navegador": carga la MISMA URL final que
 * genera el storefront (cdnImage: http(s) → weserv webp; rutas locales y data:
 * crudas, resueltas contra el origin) en un Image() real y decide con
 * onload/onerror + decode(). Si el navegador no puede mostrarla — 404, 403,
 * red, archivo corrupto, formato/MIME inválido, 0 bytes, no decodificable —
 * aquí sale rota. Reutilizable por cualquier pantalla que valide imágenes.
 */
@Injectable({ providedIn: 'root' })
export class ImageProbeService {

  /** Timeout por imagen: pasado esto, para el usuario "no carga". */
  private static readonly TIMEOUT_MS = 12_000;
  /** Lado mínimo: por debajo es un placeholder tipo "no permission", no una foto. */
  private static readonly MIN_SIDE_PX = 60;

  /** Dedup: la misma URL final se valida una sola vez por sesión. */
  private cache = new Map<string, Promise<ProbeResult>>();

  /** La MISMA transformación de URL que usa la tienda pública. */
  finalUrl(raw: string | null | undefined, width = 500): string {
    return cdnImage(raw, width);
  }

  probe(raw: string | null | undefined, width = 500): Promise<ProbeResult> {
    const u = (raw ?? '').trim();
    if (!u) return Promise.resolve({ ok: false, reason: 'sin-url' });
    const url = this.finalUrl(u, width);
    let p = this.cache.get(url);
    if (!p) {
      p = this.load(url);
      this.cache.set(url, p);
    }
    return p;
  }

  private load(url: string): Promise<ProbeResult> {
    return new Promise<ProbeResult>((resolve) => {
      const img = new Image();
      let done = false;
      const finish = (r: ProbeResult) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(r);
      };
      const timer = setTimeout(() => {
        img.src = ''; // cancela la carga pendiente
        finish({ ok: false, reason: 'timeout' });
      }, ImageProbeService.TIMEOUT_MS);

      img.onerror = () => finish({ ok: false, reason: 'error' });
      img.onload = async () => {
        try {
          // decode() rechaza contenido que el navegador no puede renderizar
          // (corrupto, MIME falso) aunque onload haya llegado a dispararse.
          if (typeof img.decode === 'function') await img.decode();
        } catch {
          finish({ ok: false, reason: 'error' });
          return;
        }
        const w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { finish({ ok: false, reason: 'error' }); return; }
        if (Math.min(w, h) < ImageProbeService.MIN_SIDE_PX) {
          finish({ ok: false, reason: 'placeholder', width: w, height: h });
          return;
        }
        finish({ ok: true, width: w, height: h });
      };
      img.src = url;
    });
  }

  /**
   * Valida una lista con un pool de N cargas simultáneas. Devuelve los resultados
   * de lo procesado (si isPaused corta, el mapa queda parcial). El dedup interno
   * hace que re-lanzar un escaneo pausado sea casi gratis.
   */
  async probeAll<T>(
    items: T[],
    getUrl: (it: T) => string | null | undefined,
    opts: { concurrency?: number; onProgress?: (done: number, total: number) => void; isPaused?: () => boolean } = {}
  ): Promise<Map<T, ProbeResult>> {
    const out = new Map<T, ProbeResult>();
    if (!items.length) return out;
    const concurrency = Math.min(opts.concurrency ?? 10, items.length);
    let next = 0, done = 0;
    const worker = async () => {
      while (next < items.length) {
        if (opts.isPaused?.()) return;
        const it = items[next++];
        out.set(it, await this.probe(getUrl(it)));
        done++;
        opts.onProgress?.(done, items.length);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    return out;
  }

  /** Etiqueta corta en español para mostrar el motivo en la UI. */
  reasonLabel(reason?: string): string {
    switch (reason) {
      case 'sin-url': return 'sin URL';
      case 'timeout': return 'no responde';
      case 'placeholder': return 'placeholder diminuto';
      case 'error': return 'no carga (404/403/corrupta)';
      default: return reason || 'rota';
    }
  }
}
