import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { NsoStateService } from '../../../services/nso-state.service';
import {
  NsoBrandGroup,
  NsoCandidateView,
  NsoCatalogPage,
  NsoProductRow,
  NsoRecordView,
  NsoReviewItem,
  NsoStatus,
  NsoSummary,
  NsoUploadSummary,
} from '../../../models/api.models';
import { CdnImgPipe } from '../../../shared/cdn-img.pipe';
import {
  NsoAssignChange,
  NsoAssignDialogComponent,
  NsoAssignProduct,
} from '../shared/nso-assign-dialog/nso-assign-dialog.component';
import {
  NSO_STATUS_INFO,
  NsoStatusInfo,
  brandKeyOf,
  countryName,
  isOtherCanCountry,
  isPossiblyExpired,
  isValidNsoCode,
  matchedByLabel,
  normalizeNsoCode,
  nsoStatusInfo,
} from '../../../shared/nso-labels';

type TabId = 'resumen' | 'revisar' | 'marca' | 'sin' | 'con' | 'catalogo';

/** Pestaña definida como DATO: sumar una es una línea aquí (patrón de review.component). */
interface NsoTab {
  id: TabId;
  label: string;
  /** Estado NSO que lista la pestaña (define el color del contador). */
  status?: NsoStatus;
  count: (s: NsoSummary | null) => number | null;
  load: () => void;
}

/** Tarjeta grande del resumen, también como dato. */
interface SummaryCard {
  info: NsoStatusInfo;
  tab: TabId;
  cta: string;
}

interface NewRecordForm {
  code: string;
  brand: string;
  declaredName: string;
  titular: string;
  ruc: string;
}

const CATALOG_PAGE_SIZE = 50;
const LIST_STEP = 60;
const POLL_MS = 2000;

/**
 * NSO (Notificación Sanitaria de DIGEMID): qué perfumes se pueden mostrar e importar.
 * Pensado para una persona NO técnica: cada tarjeta dice qué significa y qué hacer.
 *
 * El backend reconoce el NSO de cada perfume; aquí la dueña sube su lista, revisa los
 * dudosos, ve qué marcas tienen titular (para acogerse) y enciende el filtro de la tienda.
 * Todo es interno: el cliente de la tienda nunca ve la palabra NSO.
 */
@Component({
  selector: 'app-admin-nso',
  standalone: true,
  imports: [DecimalPipe, CdnImgPipe, NsoAssignDialogComponent],
  templateUrl: './nso.component.html',
  styleUrl: './nso.component.css',
  host: { '(document:keydown.escape)': 'closeModals()' },
})
export class NsoComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  nso = inject(NsoStateService);

  // ===== Pestañas =====
  tab = signal<TabId>('resumen');

  readonly tabs: NsoTab[] = [
    { id: 'resumen', label: 'Resumen', count: () => null, load: () => {} },
    {
      id: 'revisar', label: 'Por revisar', status: 'EN_REVISION',
      count: (s) => s?.counts?.EN_REVISION ?? null, load: () => this.loadReview(),
    },
    {
      id: 'marca', label: 'La marca tiene NSO', status: 'MARCA_CON_NSO',
      count: (s) => s?.counts?.MARCA_CON_NSO ?? null, load: () => this.loadBrandGroups(),
    },
    {
      id: 'sin', label: 'Sin NSO', status: 'SIN_NSO',
      count: (s) => s?.counts?.SIN_NSO ?? null, load: () => this.loadSin(),
    },
    {
      id: 'con', label: 'Con NSO', status: 'CON_NSO',
      count: (s) => s?.counts?.CON_NSO ?? null, load: () => this.loadCon(),
    },
    {
      id: 'catalogo', label: 'Catálogo', count: (s) => s?.catalogRecords ?? null,
      load: () => this.loadCatalog(),
    },
  ];

  readonly cards: SummaryCard[] = [
    { info: NSO_STATUS_INFO.CON_NSO, tab: 'con', cta: 'Ver perfumes' },
    { info: NSO_STATUS_INFO.EN_REVISION, tab: 'revisar', cta: 'Revisar ahora' },
    { info: NSO_STATUS_INFO.MARCA_CON_NSO, tab: 'marca', cta: 'Ver titulares' },
    { info: NSO_STATUS_INFO.SIN_NSO, tab: 'sin', cta: 'Ver lista' },
  ];

  readonly steps = [
    { title: 'Sube tu lista de NSO', text: 'El Excel o CSV con los códigos. Puedes volver a subirla cuando la actualices.' },
    { title: 'Importa tus proveedores', text: 'Como siempre, en «Importar Excel». Cada perfume se compara solo con tu lista.' },
    { title: 'Revisa los dudosos', text: 'En «Por revisar» confirmas si el NSO parecido es el mismo perfume.' },
    { title: 'Activa el filtro', text: 'Con el botón de abajo tu tienda muestra solo perfumes con NSO.' },
  ];

  // ===== Mensajes (toast con estilo propio) =====
  message = signal('');
  error = signal('');
  private msgTimer: ReturnType<typeof setTimeout> | null = null;
  private errTimer: ReturnType<typeof setTimeout> | null = null;

  // ===== Resumen =====
  summary = this.nso.summary;
  summaryLoading = signal(false);
  summaryError = signal('');
  gateBusy = signal(false);
  settingsBusy = signal(false);
  rematchStarting = signal(false);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollInFlight = false;
  private destroyed = false;

  catalogLoaded = computed(() => (this.summary()?.catalogActiveRecords ?? 0) > 0);
  rematch = computed(() => this.summary()?.rematch ?? null);
  rematchRunning = computed(() => !!this.rematch()?.running);
  rematchPct = computed(() => {
    const r = this.rematch();
    if (!r || !r.total) return 0;
    return Math.min(100, Math.round((r.processed / r.total) * 100));
  });
  hiddenIfActivated = computed(() => {
    const s = this.summary();
    return s ? Math.max(0, (s.publicNow ?? 0) - (s.publicIfActivated ?? 0)) : 0;
  });

  // ===== Subir lista =====
  uploadFile = signal<File | null>(null);
  uploading = signal(false);
  uploadResult = signal<NsoUploadSummary | null>(null);
  dragOver = signal(false);

  // ===== Por revisar =====
  reviewItems = signal<NsoReviewItem[]>([]);
  reviewLoading = signal(false);
  busyProductId = signal<number | null>(null);

  // ===== Listas (marca / sin / con) =====
  brandGroups = signal<NsoBrandGroup[]>([]);
  brandLoading = signal(false);
  sinRows = signal<NsoProductRow[]>([]);
  sinLoading = signal(false);
  conRows = signal<NsoProductRow[]>([]);
  conLoading = signal(false);
  listFilter = signal('');
  listLimit = signal(LIST_STEP);

  filteredBrandGroups = computed(() => {
    const q = this.fold(this.listFilter());
    const groups = this.brandGroups();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        this.fold(g.brandName).includes(q) ||
        g.products.some((p) => this.fold(`${p.brand} ${p.name}`).includes(q)) ||
        g.titulares.some((t) => this.fold(`${t.titular ?? ''} ${t.ruc ?? ''}`).includes(q)),
    );
  });
  filteredSin = computed(() => this.filterRows(this.sinRows()));
  filteredCon = computed(() => this.filterRows(this.conRows()));

  // ===== Catálogo =====
  catData = signal<NsoCatalogPage | null>(null);
  catLoading = signal(false);
  catQ = signal('');
  catPage = signal(0);
  catTotalPages = computed(() => {
    const d = this.catData();
    return d ? Math.max(1, Math.ceil(d.total / (d.size || CATALOG_PAGE_SIZE))) : 1;
  });
  codeBusy = signal<string | null>(null);
  showAddCode = signal(false);
  newRec = signal<NewRecordForm>(this.emptyRecord());
  newRecBusy = signal(false);
  newRecError = signal('');
  newRecCodeOk = computed(() => isValidNsoCode(this.newRec().code));

  // ===== Diálogo compartido: asignar / cambiar / quitar código =====
  assignTarget = signal<NsoAssignProduct | null>(null);

  // ===== Modal: "esta marca es la misma que…" =====
  aliasTarget = signal<NsoProductRow | null>(null);
  aliasSearch = signal('');
  aliasResults = signal<string[]>([]);
  aliasSearching = signal(false);
  aliasBusy = signal(false);

  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // ===================================================================
  // Ciclo de vida
  // ===================================================================
  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('tab') as TabId | null;
    if (t && this.tabs.some((x) => x.id === t)) this.tab.set(t);
    this.loadSummary();
    this.currentTab().load();
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.stopPolling();
    if (this.msgTimer) clearTimeout(this.msgTimer);
    if (this.errTimer) clearTimeout(this.errTimer);
    this.debounceTimers.forEach((h) => clearTimeout(h));
    this.debounceTimers.clear();
  }

  currentTab(): NsoTab {
    return this.tabs.find((t) => t.id === this.tab()) ?? this.tabs[0];
  }

  setTab(id: TabId) {
    if (this.tab() !== id) {
      this.listFilter.set('');
      this.listLimit.set(LIST_STEP);
    }
    this.tab.set(id);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: id === 'resumen' ? null : id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.currentTab().load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tabCount(t: NsoTab): number | null {
    return t.count(this.summary());
  }

  // ===================================================================
  // Resumen, verificación y filtro de tienda
  // ===================================================================
  loadSummary() {
    this.summaryLoading.set(true);
    this.api.getNsoSummary().subscribe({
      next: (s) => {
        this.summaryLoading.set(false);
        this.summaryError.set('');
        this.nso.setSummary(s);
        if (s?.rematch?.running) this.startPolling();
      },
      error: (e) => {
        this.summaryLoading.set(false);
        this.summaryError.set(this.errMsg(e, 'No pudimos cargar el resumen de NSO.'));
      },
    });
  }

  count(status: NsoStatus): number {
    return this.summary()?.counts?.[status] ?? 0;
  }

  rematchAll() {
    if (this.rematchRunning() || this.rematchStarting()) return;
    this.rematchStarting.set(true);
    this.api.startNsoRematch().subscribe({
      next: () => {
        this.rematchStarting.set(false);
        this.toast('Verificando todos tus perfumes… puedes seguir usando el panel.');
        this.markRematchRunning();
        this.startPolling();
      },
      error: (e) => {
        this.rematchStarting.set(false);
        if (e?.status === 409) {
          this.toast('Ya se está verificando. Te mostramos el avance.');
          this.startPolling();
        } else {
          this.showError(this.errMsg(e, 'No se pudo empezar la verificación.'));
        }
      },
    });
  }

  /** Pinta la barra al instante (el primer poll trae los números reales). */
  private markRematchRunning() {
    const s = this.summary();
    if (!s) return;
    const prev = s.rematch ?? { processed: 0, total: 0, startedAt: null, finishedAt: null };
    this.nso.setSummary({ ...s, rematch: { ...prev, running: true, error: null } });
  }

  private startPolling() {
    if (this.pollTimer || this.destroyed) return;
    this.pollTimer = setInterval(() => this.pollOnce(), POLL_MS);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private pollOnce() {
    if (this.pollInFlight) return;
    this.pollInFlight = true;
    this.api.getNsoSummary().subscribe({
      next: (s) => {
        this.pollInFlight = false;
        if (this.destroyed) return;
        this.nso.setSummary(s);
        if (!s?.rematch?.running) {
          this.stopPolling();
          if (s?.rematch?.error) {
            this.showError('La verificación se detuvo: ' + s.rematch.error);
          } else {
            this.toast('✓ Verificación terminada. Los números ya están al día.');
          }
          this.nso.afterChange();
          if (this.tab() !== 'resumen') this.currentTab().load();
        }
      },
      error: () => {
        this.pollInFlight = false; // hipo de red: el siguiente tick reintenta
      },
    });
  }

  toggleGate() {
    const s = this.summary();
    if (!s || this.gateBusy()) return;
    const enable = !s.gateEnabled;
    if (enable) {
      if (!this.catalogLoaded()) return;
      // A mitad de la verificación los perfumes aún no revisados cuentan como ocultos: los números
      // del aviso estarían a medias y la tienda quedaría casi vacía hasta que termine.
      if (this.rematchRunning()) {
        this.toast('Espera a que termine la verificación para activar el filtro.');
        return;
      }
      const visible = s.publicIfActivated ?? 0;
      const hidden = this.hiddenIfActivated();
      let text =
        visible === 0
          ? `¡Atención! Con el filtro activo tu tienda quedaría VACÍA: ninguno de tus ${s.publicNow} perfumes tiene NSO confirmado.`
          : `Tu tienda mostrará ${visible} perfumes y ocultará ${hidden}.`;
      text +=
        '\n\nLos ocultos NO se borran: vuelven a aparecer si apagas este botón o cuando encuentres su NSO.';
      const pending = this.count('EN_REVISION');
      if (pending > 0) {
        text += `\n\nOjo: aún tienes ${pending} perfumes por revisar; mientras tanto quedarán ocultos.`;
      }
      if (!confirm(text + '\n\n¿Activar el filtro?')) return;
    } else {
      if (
        !confirm(
          `Tu tienda volverá a mostrar los ${s.publicNow} perfumes disponibles, tengan o no NSO.\n\n¿Apagar el filtro?`,
        )
      )
        return;
    }
    this.gateBusy.set(true);
    this.api.setNsoGate(enable).subscribe({
      next: (sum) => {
        this.gateBusy.set(false);
        this.nso.setSummary(sum);
        this.toast(
          enable
            ? '✓ Listo: tu tienda ahora muestra solo perfumes con NSO.'
            : '✓ Listo: tu tienda vuelve a mostrar todos los perfumes.',
        );
      },
      error: (e) => {
        this.gateBusy.set(false);
        this.showError(
          e?.status === 409
            ? 'Primero sube tu lista de NSO: sin lista no se puede activar el filtro.'
            : this.errMsg(e, 'No se pudo cambiar el filtro de la tienda.'),
        );
      },
    });
  }

  /**
   * «Aceptar NSO de otros países de la Comunidad Andina»: con «Sí» un NSO de Colombia, Bolivia
   * o Ecuador cuenta como «Con NSO» (etiquetado); con «No» solo cuentan los de Perú.
   */
  toggleAcceptCan() {
    const s = this.summary();
    if (!s || this.settingsBusy()) return;
    const accept = !this.nso.acceptCanCodes();
    const gateOn = !!s.gateEffective;
    const text = accept
      ? '¿Aceptar los NSO de Colombia, Bolivia y Ecuador?\n\n' +
        'Los perfumes que tienen NSO de esos países contarán como «Con NSO»' +
        (gateOn ? ' y volverán a verse en tu tienda.' : '.')
      : '¿Dejar de aceptar los NSO de Colombia, Bolivia y Ecuador?\n\n' +
        'Los perfumes que solo tienen NSO de esos países ' +
        (gateOn
          ? 'se ocultarán de tu tienda y no se podrán volver a comprar.'
          : 'no contarán cuando actives el filtro de la tienda.') +
        ' No se borran: puedes volver a cambiarlo cuando quieras.';
    if (!confirm(text)) return;
    this.settingsBusy.set(true);
    this.api.setNsoSettings({ acceptCanCodes: accept }).subscribe({
      next: (sum) => {
        this.settingsBusy.set(false);
        this.nso.setSummary(sum);
        if (sum?.rematch?.running) this.startPolling();
        this.toast(
          accept
            ? '✓ Listo: los NSO de Colombia, Bolivia y Ecuador cuentan.'
            : '✓ Listo: ahora solo cuentan los NSO de Perú.',
        );
      },
      error: (e) => {
        this.settingsBusy.set(false);
        this.showError(this.errMsg(e, 'No se pudo guardar el cambio.'));
      },
    });
  }

  // ===== Subir lista NSO =====
  onFilePicked(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.pickFile(input.files?.[0] ?? null);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragOver.set(false);
    this.pickFile(ev.dataTransfer?.files?.[0] ?? null);
  }

  private pickFile(f: File | null) {
    this.uploadResult.set(null);
    if (!f) return;
    if (!/\.(xlsx|csv)$/i.test(f.name)) {
      this.uploadFile.set(null);
      this.showError('Ese archivo no sirve: sube la lista en Excel (.xlsx) o CSV (.csv).');
      return;
    }
    this.uploadFile.set(f);
  }

  upload(input: HTMLInputElement) {
    const f = this.uploadFile();
    if (!f || this.uploading()) return;
    this.uploading.set(true);
    this.api.uploadNsoCatalog(f).subscribe({
      next: (r) => {
        this.uploading.set(false);
        this.uploadResult.set(r);
        this.uploadFile.set(null);
        input.value = '';
        this.toast(`✓ Lista cargada: ${r.recordsRead} códigos leídos.`);
        this.loadSummary();
        if (r.rematchStarted) {
          this.markRematchRunning();
          this.startPolling();
        }
        this.nso.afterChange();
      },
      error: (e) => {
        this.uploading.set(false);
        this.showError(
          this.errMsg(e, 'No pudimos leer el archivo. Revisa que tenga las columnas NSO, Marca y Producto.'),
        );
      },
    });
  }

  goToCatalogCode(code: string) {
    this.catQ.set(code);
    this.catPage.set(0);
    this.setTab('catalogo');
  }

  // ===================================================================
  // Por revisar
  // ===================================================================
  loadReview() {
    this.reviewLoading.set(true);
    this.api.getNsoReview().subscribe({
      next: (list) => {
        this.reviewLoading.set(false);
        this.reviewItems.set(list ?? []);
      },
      error: (e) => {
        this.reviewLoading.set(false);
        this.showError(this.errMsg(e, 'No se pudo cargar la lista por revisar.'));
      },
    });
  }

  acceptCandidate(item: NsoReviewItem, c: NsoCandidateView) {
    const pid = item.product.id;
    if (this.busyProductId() != null) return;
    this.busyProductId.set(pid);
    const pos = this.reviewItems().findIndex((x) => x.product.id === pid);
    this.reviewItems.update((l) => l.filter((x) => x.product.id !== pid)); // optimista
    this.api.acceptNsoCandidate(c.id).subscribe({
      next: (r) => {
        this.busyProductId.set(null);
        const also = (r.alsoResolved ?? []).filter((id) => id !== pid);
        if (also.length) this.reviewItems.update((l) => l.filter((x) => !also.includes(x.product.id)));
        this.nso.patchIndex(pid, {
          status: 'CON_NSO', nsoCode: r.nsoCode ?? c.nsoCode, matchedBy: 'APROBADO', locked: true,
          country: c.country, nsoYear: c.nsoYear, score: c.score,
          otherCanCountry: isOtherCanCountry(c.country), possiblyExpired: isPossiblyExpired(c.nsoYear),
        });
        for (const id of also) this.nso.patchIndex(id, { status: 'CON_NSO', nsoCode: r.nsoCode ?? c.nsoCode });
        this.toast(
          `✓ «${this.productName(item.product)}» quedó con NSO ${r.nsoCode ?? c.nsoCode}` +
            (also.length ? ` · también se resolvieron ${also.length} iguales (otros tamaños o proveedores).` : '.'),
        );
        this.nso.afterChange();
      },
      error: (e) => {
        this.busyProductId.set(null);
        this.restoreReviewItem(item, pos);
        this.showError(this.errMsg(e, 'No se pudo guardar tu decisión.'));
      },
    });
  }

  rejectAll(item: NsoReviewItem) {
    const pid = item.product.id;
    if (this.busyProductId() != null) return;
    this.busyProductId.set(pid);
    const pos = this.reviewItems().findIndex((x) => x.product.id === pid);
    this.reviewItems.update((l) => l.filter((x) => x.product.id !== pid));
    this.api.rejectAllNso(pid).subscribe({
      next: (r) => {
        this.busyProductId.set(null);
        this.nso.patchIndex(pid, { status: r.status, nsoCode: null, matchedBy: null, locked: false });
        this.toast(
          `Listo: esas opciones no se volverán a proponer. «${this.productName(item.product)}» ahora está en «${nsoStatusInfo(r.status).label}».`,
        );
        this.nso.afterChange();
      },
      error: (e) => {
        this.busyProductId.set(null);
        this.restoreReviewItem(item, pos);
        this.showError(this.errMsg(e, 'No se pudo guardar tu decisión.'));
      },
    });
  }

  private restoreReviewItem(item: NsoReviewItem, pos: number) {
    this.reviewItems.update((l) => {
      if (l.some((x) => x.product.id === item.product.id)) return l;
      const next = [...l];
      next.splice(pos < 0 ? next.length : Math.min(pos, next.length), 0, item);
      return next;
    });
  }

  // ===================================================================
  // Listas: la marca tiene NSO / sin NSO / con NSO
  // ===================================================================
  loadBrandGroups() {
    this.brandLoading.set(true);
    this.api.getNsoBrandGroups().subscribe({
      next: (g) => {
        this.brandLoading.set(false);
        this.brandGroups.set(g ?? []);
      },
      error: (e) => {
        this.brandLoading.set(false);
        this.showError(this.errMsg(e, 'No se pudieron cargar las marcas.'));
      },
    });
  }

  loadSin() {
    this.sinLoading.set(true);
    this.api.getNsoProducts('SIN_NSO').subscribe({
      next: (rows) => {
        this.sinLoading.set(false);
        this.sinRows.set(rows ?? []);
      },
      error: (e) => {
        this.sinLoading.set(false);
        this.showError(this.errMsg(e, 'No se pudo cargar la lista.'));
      },
    });
  }

  loadCon() {
    this.conLoading.set(true);
    this.api.getNsoProducts('CON_NSO').subscribe({
      next: (rows) => {
        this.conLoading.set(false);
        this.conRows.set(rows ?? []);
      },
      error: (e) => {
        this.conLoading.set(false);
        this.showError(this.errMsg(e, 'No se pudo cargar la lista.'));
      },
    });
  }

  onListFilter(ev: Event) {
    this.listFilter.set((ev.target as HTMLInputElement).value);
    this.listLimit.set(LIST_STEP);
  }

  clearListFilter() {
    this.listFilter.set('');
    this.listLimit.set(LIST_STEP);
  }

  showMore() {
    this.listLimit.update((n) => n + LIST_STEP);
  }

  copyRuc(ruc: string | null) {
    if (!ruc) return;
    const done = () => this.toast(`RUC ${ruc} copiado. Pégalo donde lo necesites.`);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(ruc).then(done).catch(() => this.copyFallback(ruc));
    } else {
      this.copyFallback(ruc);
    }
  }

  private copyFallback(ruc: string) {
    window.prompt('Copia el RUC (Ctrl+C):', ruc);
  }

  unassign(row: NsoProductRow) {
    if (this.busyProductId() != null) return;
    const hiddenNote = this.nso.gateEffective() ? '\nMientras no tenga NSO, no se verá en tu tienda.' : '';
    if (
      !confirm(
        `¿Quitar el NSO ${row.nsoCode ?? ''} de «${row.brand} ${row.name}»?\n\nSe volverá a verificar solo con tu lista.${hiddenNote}`,
      )
    )
      return;
    this.busyProductId.set(row.id);
    const pos = this.conRows().findIndex((x) => x.id === row.id);
    this.conRows.update((l) => l.filter((x) => x.id !== row.id));
    this.api.unassignNso(row.id).subscribe({
      next: (r) => {
        this.busyProductId.set(null);
        this.nso.patchIndex(row.id, { status: r.status, nsoCode: r.nsoCode ?? null, matchedBy: null, locked: false });
        if (r.status === 'CON_NSO') this.loadCon(); // se volvió a reconocer solo
        this.toast(`Listo: «${row.brand} ${row.name}» ahora está en «${nsoStatusInfo(r.status).label}».`);
        this.nso.afterChange();
      },
      error: (e) => {
        this.busyProductId.set(null);
        this.conRows.update((l) => {
          if (l.some((x) => x.id === row.id)) return l;
          const next = [...l];
          next.splice(pos < 0 ? next.length : Math.min(pos, next.length), 0, row);
          return next;
        });
        this.showError(this.errMsg(e, 'No se pudo quitar el NSO.'));
      },
    });
  }

  // ===== Modal: "Esta marca es la misma que…" =====
  openAlias(row: NsoProductRow) {
    this.aliasTarget.set(row);
    this.aliasResults.set([]);
    this.aliasSearch.set(row.suggestedBrand ?? '');
    if (row.suggestedBrand) this.searchAliasBrands(row.suggestedBrand);
  }

  onAliasSearch(ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.aliasSearch.set(v);
    this.debounce('alias', () => this.searchAliasBrands(v), 350);
  }

  private searchAliasBrands(q: string) {
    const term = q.trim();
    if (term.length < 2) {
      this.aliasResults.set([]);
      return;
    }
    this.aliasSearching.set(true);
    this.api.getNsoCatalog({ q: term, page: 0, size: 100 }).subscribe({
      next: (page) => {
        this.aliasSearching.set(false);
        const seen = new Map<string, string>();
        for (const r of page?.items ?? []) {
          if (!r.brand) continue;
          const k = brandKeyOf(r.brand);
          if (!seen.has(k)) seen.set(k, r.brand);
        }
        this.aliasResults.set([...seen.values()].sort((a, b) => a.localeCompare(b)));
      },
      error: () => this.aliasSearching.set(false),
    });
  }

  chooseAlias(catalogBrand: string) {
    const t = this.aliasTarget();
    if (!t || this.aliasBusy()) return;
    if (
      !confirm(
        `¿«${t.brand}» es la misma marca que «${catalogBrand}» de tu lista NSO?\n\nVamos a volver a verificar todos los perfumes de «${t.brand}».`,
      )
    )
      return;
    this.aliasBusy.set(true);
    // El backend pliega la marca con su propia función: se manda tal cual aparece en la lista.
    this.api.addNsoBrandAlias(t.brand, catalogBrand).subscribe({
      next: (r) => {
        this.aliasBusy.set(false);
        this.aliasTarget.set(null);
        this.toast(`✓ Listo: se volvieron a verificar ${r.rematched} perfumes de «${t.brand}».`);
        this.loadSin();
        this.nso.afterChange();
      },
      error: (e) => {
        this.aliasBusy.set(false);
        this.showError(this.errMsg(e, 'No se pudo guardar la marca.'));
      },
    });
  }

  // ===== Diálogo: asignar / buscar otro código (componente compartido) =====
  openAssign(
    p: { id: number; brand: string; name: string; ml: number | null; nsoCode?: string | null; status?: NsoStatus },
    status?: NsoStatus,
  ) {
    this.assignTarget.set({
      id: p.id, brand: p.brand, name: p.name, ml: p.ml, nsoCode: p.nsoCode, status: p.status ?? status,
    });
  }

  /** El diálogo ya guardó y actualizó el índice: aquí solo se ajustan las listas visibles. */
  onAssignChanged(ch: NsoAssignChange) {
    if (ch.action === 'assign') {
      this.removeProductFromLists(ch.productId);
      if (this.tab() === 'con') this.loadCon();
    } else {
      this.conRows.update((l) => l.filter((x) => x.id !== ch.productId));
      if (ch.status === 'CON_NSO') this.loadCon(); // se volvió a reconocer solo
    }
    this.toast(ch.message);
  }

  private removeProductFromLists(id: number) {
    this.reviewItems.update((l) => l.filter((x) => x.product.id !== id));
    this.sinRows.update((l) => l.filter((x) => x.id !== id));
    this.brandGroups.update((groups) =>
      groups
        .map((g) => ({ ...g, products: g.products.filter((p) => p.id !== id) }))
        .filter((g) => g.products.length > 0),
    );
  }

  /** Escape: cierra «esta marca es la misma que…» (el diálogo de código maneja su propio Escape). */
  closeModals() {
    if (!this.aliasBusy()) this.aliasTarget.set(null);
  }

  // ===================================================================
  // Catálogo NSO
  // ===================================================================
  loadCatalog() {
    this.catLoading.set(true);
    this.api
      .getNsoCatalog({ q: this.catQ().trim(), page: this.catPage(), size: CATALOG_PAGE_SIZE })
      .subscribe({
        next: (page) => {
          this.catLoading.set(false);
          this.catData.set(page);
        },
        error: (e) => {
          this.catLoading.set(false);
          this.showError(this.errMsg(e, 'No se pudo cargar tu lista de códigos.'));
        },
      });
  }

  onCatSearch(ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.catQ.set(v);
    this.debounce('catalog', () => {
      this.catPage.set(0);
      this.loadCatalog();
    }, 350);
  }

  catGo(delta: number) {
    const next = this.catPage() + delta;
    if (next < 0 || next >= this.catTotalPages()) return;
    this.catPage.set(next);
    this.loadCatalog();
  }

  toggleAddCode() {
    this.showAddCode.update((v) => !v);
    this.newRecError.set('');
    if (!this.showAddCode()) this.newRec.set(this.emptyRecord());
  }

  setNewRec(field: keyof NewRecordForm, ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.newRec.update((f) => ({ ...f, [field]: v }));
    this.newRecError.set('');
  }

  saveNewRecord() {
    if (this.newRecBusy()) return;
    const f = this.newRec();
    const code = normalizeNsoCode(f.code);
    if (!isValidNsoCode(code)) {
      this.newRecError.set('El código no tiene el formato correcto. Ejemplo: NSOC70523-25PE');
      return;
    }
    if (!f.brand.trim() || !f.declaredName.trim()) {
      this.newRecError.set('Escribe la marca y el nombre del perfume como figura en el NSO.');
      return;
    }
    this.newRecBusy.set(true);
    this.api
      .createNsoRecord({
        code,
        brand: f.brand.trim(),
        declaredName: f.declaredName.trim(),
        ...(f.titular.trim() ? { titular: f.titular.trim() } : {}),
        ...(f.ruc.trim() ? { ruc: f.ruc.trim() } : {}),
      })
      .subscribe({
        next: (res) => {
          this.newRecBusy.set(false);
          this.showAddCode.set(false);
          this.newRec.set(this.emptyRecord());
          const rec = res.record;
          this.catData.update((d) =>
            d ? { ...d, items: [rec, ...d.items.filter((x) => x.code !== rec.code)], total: d.total + 1 } : d,
          );
          const linked = res.linkedProducts ?? [];
          const withNso = linked.filter((p) => p.status === 'CON_NSO').length;
          const toReview = linked.filter((p) => p.status === 'EN_REVISION').length;
          let msg = `✓ Código ${rec.code} agregado a tu lista.`;
          if (withNso > 0) msg += ` ${withNso} ${withNso === 1 ? 'perfume quedó' : 'perfumes quedaron'} con NSO.`;
          if (toReview > 0) msg += ` ${toReview} ${toReview === 1 ? 'pasó' : 'pasaron'} a «Por revisar».`;
          this.toast(msg);
          this.nso.afterChange();
        },
        error: (e) => {
          this.newRecBusy.set(false);
          this.newRecError.set(
            e?.status === 409
              ? 'Ese código ya está en tu lista. Búscalo arriba.'
              : this.errMsg(e, 'No se pudo agregar el código.'),
          );
        },
      });
  }

  toggleCodeActive(rec: NsoRecordView) {
    if (this.codeBusy()) return;
    const active = !rec.active;
    this.codeBusy.set(rec.code);
    this.api.setNsoCodeActive(rec.code, active, false).subscribe({
      next: (preview) => {
        const affected = preview?.affectedProducts ?? [];
        const names = affected
          .slice(0, 8)
          .map((p) => `• ${p.brand} ${p.name}`)
          .join('\n');
        const more = affected.length > 8 ? `\n… y ${affected.length - 8} más` : '';
        let text: string;
        if (active) {
          text =
            `¿Activar el código ${rec.code}?` +
            (affected.length
              ? `\n\nEstos ${affected.length} perfumes se volverán a verificar con él:\n${names}${more}`
              : '\n\nSe usará al verificar tus perfumes.');
        } else {
          text =
            `¿Desactivar el código ${rec.code}?` +
            (affected.length
              ? `\n\nEstos ${affected.length} perfumes dejarán de tener este NSO` +
                (this.nso.gateEffective() ? ' y se ocultarán de tu tienda' : '') +
                `:\n${names}${more}`
              : '\n\nNingún perfume lo está usando.');
        }
        if (!confirm(text)) {
          this.codeBusy.set(null);
          return;
        }
        this.api.setNsoCodeActive(rec.code, active, true).subscribe({
          next: () => {
            this.codeBusy.set(null);
            this.catData.update((d) =>
              d ? { ...d, items: d.items.map((x) => (x.code === rec.code ? { ...x, active } : x)) } : d,
            );
            this.toast(active ? `✓ Código ${rec.code} activado.` : `✓ Código ${rec.code} desactivado.`);
            this.nso.afterChange();
          },
          error: (e) => {
            this.codeBusy.set(null);
            this.showError(this.errMsg(e, 'No se pudo cambiar el código.'));
          },
        });
      },
      error: (e) => {
        this.codeBusy.set(null);
        this.showError(this.errMsg(e, 'No se pudo revisar qué perfumes usan este código.'));
      },
    });
  }

  // ===================================================================
  // Ayudas para la plantilla
  // ===================================================================
  info(status: string | null | undefined): NsoStatusInfo {
    return nsoStatusInfo(status);
  }

  matchedBy(m: string | null | undefined): string {
    return matchedByLabel(m);
  }

  country(c: string | null | undefined): string {
    return countryName(c);
  }

  otherCountry(c: string | null | undefined): boolean {
    return isOtherCanCountry(c);
  }

  expired(year: number | null | undefined): boolean {
    return isPossiblyExpired(year);
  }

  pct(score: number | null | undefined): number {
    return score == null ? 0 : Math.round(score * 100);
  }

  productName(p: { brand: string; name: string; ml?: number | null }): string {
    return `${p.brand} ${p.name}${p.ml ? ' ' + p.ml + 'ml' : ''}`;
  }

  /** Fecha legible; tolera ISO, epoch o nulos sin romper la plantilla. */
  fmtDate(v: string | number | null | undefined): string {
    if (v == null || v === '') return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private filterRows(rows: NsoProductRow[]): NsoProductRow[] {
    const q = this.fold(this.listFilter());
    if (!q) return rows;
    return rows.filter((r) => {
      const suppliers = (r.suppliers ?? []).join(' ');
      const text = `${r.brand} ${r.name} ${r.nsoCode ?? ''} ${r.declaredName ?? ''} ${suppliers}`;
      return this.fold(text).includes(q);
    });
  }

  private fold(s: string | null | undefined): string {
    return (s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private emptyRecord(): NewRecordForm {
    return { code: '', brand: '', declaredName: '', titular: '', ruc: '' };
  }

  private debounce(key: string, fn: () => void, ms: number) {
    const prev = this.debounceTimers.get(key);
    if (prev) clearTimeout(prev);
    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);
        if (!this.destroyed) fn();
      }, ms),
    );
  }

  private errMsg(e: any, fallback: string): string {
    if (e?.status === 0) return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
    if (e?.status === 401 || e?.status === 403) return 'Tu sesión venció. Vuelve a iniciar sesión.';
    return e?.error?.message || fallback;
  }

  toast(m: string) {
    this.message.set(m);
    if (this.msgTimer) clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.message.set(''), 4000);
  }

  showError(m: string) {
    this.error.set(m);
    if (this.errTimer) clearTimeout(this.errTimer);
    this.errTimer = setTimeout(() => this.error.set(''), 8000);
  }
}
