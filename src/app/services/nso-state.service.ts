import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { NsoIndexRow, NsoStatus, NsoSummary } from '../models/api.models';
import { countryOfNsoCode, isOtherCanCountry } from '../shared/nso-labels';

/**
 * Estado NSO compartido por las pantallas admin (solo interno, la tienda no lo usa):
 * resumen (conteos, filtro de tienda, progreso de verificación), índice productId →
 * estado (1 request) y el número de perfumes pendientes de revisión (badge del menú).
 *
 * El índice solo trae productos con fila: un producto que no aparece cuenta como
 * SIN_VERIFICAR. El backend es la fuente de verdad del filtro; esto es solo la capa visual.
 */
@Injectable({ providedIn: 'root' })
export class NsoStateService {
  private api = inject(ApiService);

  summary = signal<NsoSummary | null>(null);
  index = signal<Map<number, NsoIndexRow>>(new Map());
  pendingCount = signal(0);
  /** true mientras se descarga el índice. */
  indexLoading = signal(false);
  /** El índice ya se descargó bien al menos una vez (antes de eso, todo parece «Sin verificar»). */
  indexLoaded = signal(false);
  /** true mientras se descarga el resumen. */
  summaryLoading = signal(false);
  /**
   * Errores por separado: las dos peticiones salen juntas y el éxito de una NO debe borrar el
   * error de la otra (si no, una pantalla quedaría en «Cargando…» para siempre sin resumen).
   */
  summaryError = signal('');
  indexError = signal('');
  /** Mensaje de error de la última carga ('' si todo fue bien). */
  loadError = computed(() => this.summaryError() || this.indexError());

  private loaded = false;

  /** El filtro "solo perfumes con NSO" está realmente activo (interruptor + lista cargada). */
  gateEffective = computed(() => !!this.summary()?.gateEffective);
  /** Hay al menos un código NSO activo en la lista. */
  catalogLoaded = computed(() => (this.summary()?.catalogActiveRecords ?? 0) > 0);
  /**
   * ¿Cuentan los NSO de otro país (CO/BO/EC)? Config nso_accept_can_codes. Si el backend aún no
   * manda el dato se asume true (el valor por defecto de la config).
   */
  acceptCanCodes = computed(() => this.summary()?.acceptCanCodes !== false);

  /**
   * Carga resumen + índice UNA vez por sesión de app (las pantallas pueden llamarlo sin miedo).
   * Si la última carga falló, vuelve a intentar.
   */
  load() {
    if (this.loaded && !this.loadError()) return;
    this.refresh();
  }

  /** Vuelve a pedir todo: resumen (incluye pendientes) e índice. */
  refresh() {
    this.loaded = true;
    this.refreshSummary();
    this.refreshIndex();
  }

  /**
   * Reintento pedido por una pantalla que no puede seguir sin el resumen: vuelve a pedir todo
   * si falta el resumen o algo falló, salvo que el resumen ya esté en camino.
   */
  retryIfMissing() {
    if (this.summaryLoading()) return;
    if (!this.summary() || this.loadError()) this.refresh();
  }

  /** Solo el resumen (liviano): conteos, filtro, progreso y pendientes del badge. */
  refreshSummary() {
    this.summaryLoading.set(true);
    this.api.getNsoSummary().subscribe({
      next: (s) => {
        this.summaryLoading.set(false);
        this.setSummary(s);
      },
      error: (e) => {
        this.summaryLoading.set(false);
        this.summaryError.set(e?.error?.message || 'No se pudo cargar el resumen NSO.');
      },
    });
  }

  /** Solo el número de pendientes (para el badge del menú, sin bajar el resumen). */
  refreshCount() {
    this.api.getNsoPendingCount().subscribe({
      next: (r) => this.pendingCount.set(r?.pending ?? 0),
      error: () => {},
    });
  }

  refreshIndex() {
    this.indexLoading.set(true);
    this.api.getNsoIndex().subscribe({
      next: (rows) => {
        const m = new Map<number, NsoIndexRow>();
        for (const r of rows ?? []) m.set(r.productId, r);
        this.index.set(m);
        this.indexLoading.set(false);
        this.indexLoaded.set(true);
        this.indexError.set('');
      },
      error: (e) => {
        this.indexLoading.set(false);
        this.indexError.set(e?.error?.message || 'No se pudo cargar el estado NSO de los productos.');
      },
    });
  }

  /**
   * Tras una decisión (aprobar, quitar, asignar…): refresca el resumen y, si alguna
   * pantalla ya cargó el índice, también el índice.
   */
  afterChange() {
    this.refreshSummary();
    if (this.loaded) this.refreshIndex();
  }

  /** Resumen recién llegado (de aquí o de otra pantalla): también borra el error del resumen. */
  setSummary(s: NsoSummary | null) {
    this.summary.set(s);
    if (s) {
      this.pendingCount.set(s.pendingCandidates ?? 0);
      this.summaryError.set('');
    }
  }

  /** Actualización optimista de un producto en el índice (sin esperar al servidor). */
  patchIndex(productId: number, patch: Partial<NsoIndexRow>) {
    this.index.update((prev) => {
      const next = new Map(prev);
      const base: NsoIndexRow = prev.get(productId) ?? {
        productId,
        status: 'SIN_VERIFICAR',
        nsoCode: null,
        matchedBy: null,
        locked: false,
        score: null,
        country: null,
        nsoYear: null,
        otherCanCountry: false,
        possiblyExpired: false,
      };
      next.set(productId, { ...base, ...patch, productId });
      return next;
    });
  }

  rowOf(productId: number): NsoIndexRow | null {
    return this.index().get(productId) ?? null;
  }

  /** Estado NSO del producto; si no tiene fila en el índice = SIN_VERIFICAR. */
  statusOf(productId: number): NsoStatus {
    return this.index().get(productId)?.status ?? 'SIN_VERIFICAR';
  }

  /**
   * ¿Queda oculto en la tienda (y fuera de las compras) por el filtro NSO? Solo con el filtro activo:
   * sin NSO confirmado, o con un NSO de otro país cuando la configuración no los acepta.
   * (Mismo criterio que el backend; aquí solo es la capa visual.)
   */
  isHidden(productId: number): boolean {
    if (!this.gateEffective()) return false;
    const row = this.index().get(productId);
    if (!row || row.status !== 'CON_NSO') return true;
    if (!this.acceptCanCodes()) {
      return isOtherCanCountry(row.country ?? countryOfNsoCode(row.nsoCode));
    }
    return false;
  }
}
