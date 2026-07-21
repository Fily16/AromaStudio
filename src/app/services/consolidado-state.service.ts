import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ConsolidadoPublic } from '../models/api.models';

/**
 * Estado del consolidado para toda la tienda: carga al entrar + reconsulta periódica
 * ligera (para captar cambios del admin: reabrir, extender, cerrar o abrir el siguiente,
 * sin que el cliente tenga que recargar).
 *
 * El tiempo restante se calcula contra la hora del SERVIDOR (offset = serverNowMs −
 * Date.now()): si el visitante tiene el reloj desfasado o está en otra zona horaria,
 * el contador sigue siendo correcto. El tick de 1s solo corre mientras haya plazo
 * futuro y se detiene al llegar a cero.
 *
 * `open` es la única fuente de verdad del frontend para habilitar compras por encargo
 * (el backend valida igual: esto es solo la capa visual).
 */
@Injectable({ providedIn: 'root' })
export class ConsolidadoStateService {
  private api = inject(ApiService);

  state = signal<ConsolidadoPublic | null>(null);
  modalVisible = signal(false);
  /** true en cuanto se decide mostrar el aviso (antes del delay): evita choques con otros popups. */
  modalClaimed = signal(false);

  private offsetMs = 0;               // diferencia entre el reloj del servidor y el del visitante
  private nowMs = signal(Date.now());
  private timer: any = null;
  private pollTimer: any = null;      // reconsulta periódica del estado (capta cambios del admin)
  private loaded = false;

  /** Cada cuánto se re-consulta el estado (ms). El scheduler del backend corre cada 60s. */
  private static readonly POLL_MS = 40_000;

  /** Milisegundos que faltan para el cierre; null si el consolidado no tiene plazo. */
  remainingMs = computed(() => {
    const s = this.state();
    if (!s?.endsAtMs) return null;
    return Math.max(0, s.endsAtMs - (this.nowMs() + this.offsetMs));
  });

  /** Milisegundos que faltan para la apertura (PROGRAMADO); null si no hay fecha de inicio. */
  remainingToOpenMs = computed(() => {
    const s = this.state();
    if (!s?.startAtMs) return null;
    return Math.max(0, s.startAtMs - (this.nowMs() + this.offsetMs));
  });

  /**
   * Qué anuncia la franja superior: 'closes' (abierto con plazo corriendo),
   * 'opens' (programado con apertura futura) o null (nada que anunciar → la
   * franja no se renderiza). A diferencia de `open()`, aquí un estado
   * desconocido NO anuncia nada: mejor sin franja que una franja rota.
   */
  announcement = computed<'closes' | 'opens' | null>(() => {
    const s = this.state();
    if (!s) return null;
    const rem = this.remainingMs();
    if (s.open && rem !== null && rem > 0) return 'closes';
    const toOpen = this.remainingToOpenMs();
    if (s.status === 'PROGRAMADO' && toOpen !== null && toOpen > 0) return 'opens';
    return null;
  });

  /**
   * ¿Se pueden hacer pedidos por encargo? Se cierra en vivo al llegar el contador a 0.
   *
   * Mientras el estado NO se conoce (primera carga, o el backend no respondió por un
   * cold start) se asume ABIERTO a propósito: cerrar por defecto pintaría todo el
   * catálogo como "Encargo cerrado" en cada carga y ante cualquier hipo de red.
   * El backend es la fuente de verdad y rechaza el pedido si de verdad está cerrado.
   */
  open = computed(() => {
    const s = this.state();
    if (s === null) return true;      // desconocido ≠ cerrado
    if (!s.open) return false;
    const rem = this.remainingMs();
    return rem === null || rem > 0;
  });

  /** Falta menos de 24h: el contador se muestra en modo urgente. */
  urgent = computed(() => {
    const rem = this.remainingMs();
    return rem !== null && rem > 0 && rem < 24 * 3600 * 1000;
  });

  /** Carga el estado una sola vez por sesión de app y decide si mostrar el aviso. */
  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.api.getCurrentConsolidado().subscribe({
      next: (s) => {
        this.offsetMs = (s.serverNowMs ?? Date.now()) - Date.now();
        this.state.set(s);
        this.startTicking();
        this.maybeShowModal();
      },
      error: () => { /* sin aviso: la tienda funciona igual */ }
    });
    this.startAutoRefresh();
  }

  /**
   * Reconsulta periódica: mientras la tienda esté abierta, cada POLL_MS re-pregunta el
   * estado. Así una REAPERTURA del admin (o extensión / cierre / apertura del siguiente)
   * llega al cliente sin recargar la página. El tick de 1s del countdown corre aparte.
   */
  private startAutoRefresh() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.refresh(), ConsolidadoStateService.POLL_MS);
  }

  private startTicking() {
    this.stopTicking();
    const s = this.state();
    if (!s) return;
    // Corre si hay CUALQUIER plazo futuro: el cierre (endsAt) o la apertura programada (startAt).
    const nextDeadline = Math.max(s.endsAtMs ?? 0, s.startAtMs ?? 0);
    if (nextDeadline - (Date.now() + this.offsetMs) <= 0) return;
    this.nowMs.set(Date.now());
    this.timer = setInterval(() => {
      this.nowMs.set(Date.now());
      if (this.remainingMs() === 0) {
        this.stopTicking();
        this.refresh(); // el plazo venció: confirmar el estado real con el servidor
        return;
      }
      this.maybeRefreshOnOpen();
    }, 1000);
  }

  /**
   * Un PROGRAMADO llegó a su hora de apertura: re-consulta para pasar la franja
   * de "Abre en" a la cuenta regresiva de cierre. El scheduler del backend corre
   * cada 60s, así que se reintenta una vez más pasado ese margen. La clave por
   * consolidado+fecha evita un bucle de refresh si el backend aún no lo abrió.
   */
  private openRefreshedFor = '';
  private maybeRefreshOnOpen() {
    const s = this.state();
    if (!s || s.status !== 'PROGRAMADO' || this.remainingToOpenMs() !== 0) return;
    const key = `${s.id}_${s.startAtMs}`;
    if (this.openRefreshedFor === key) return;
    this.openRefreshedFor = key;
    this.refresh();
    setTimeout(() => {
      if (this.state()?.status === 'PROGRAMADO') this.refresh();
    }, 70_000);
  }

  private stopTicking() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** Re-consulta el estado (al vencer el plazo). */
  private refresh() {
    this.api.getCurrentConsolidado().subscribe({
      next: (s) => {
        this.offsetMs = (s.serverNowMs ?? Date.now()) - Date.now();
        this.state.set(s);
        // Si el admin extendió el plazo, hay que volver a contar: sin esto el
        // reloj quedaría congelado en el valor viejo.
        this.startTicking();
      },
      error: () => {}
    });
  }

  /**
   * Muestra el aviso salvo que ya lo hayan cerrado en esta sesión.
   * La clave incluye el plazo: un consolidado nuevo O una extensión lo vuelven a mostrar.
   */
  private maybeShowModal() {
    const s = this.state();
    if (!s?.open || !s.endsAtMs) return;
    try {
      if (sessionStorage.getItem(this.sessionKey(s))) return;
    } catch { /* modo privado: se muestra igual */ }
    // Se "reserva" el turno YA (aunque el modal salga en 1.2s): otros popups
    // consultan modalClaimed() y esperan, en vez de encimarse.
    this.modalClaimed.set(true);
    setTimeout(() => this.modalVisible.set(true), 1200);
  }

  closeModal() {
    this.modalVisible.set(false);
    this.modalClaimed.set(false);
    const s = this.state();
    if (!s) return;
    try { sessionStorage.setItem(this.sessionKey(s), '1'); } catch { }
  }

  private sessionKey(s: ConsolidadoPublic) {
    return `consolidado_modal_${s.id}_${s.endsAtMs}`;
  }

  /** URL de la imagen del aviso (o null). */
  imageUrl(): string | null {
    const id = this.state()?.imageMediaId;
    return id ? this.api.mediaUrl(id) : null;
  }
}
