import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { Supplier, SupplierConstraint, ImportSummary, ImportPreview, ImportPreviewLine, ColumnMapping, RowOverride, PhotoCandidate, PhotoRow } from '../../../models/api.models';
import { CdnImgPipe } from '../../../shared/cdn-img.pipe';
import { ImageProbeService, ProbeResult } from '../../../shared/image-probe.service';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, CdnImgPipe],
  templateUrl: './import.component.html',
  styleUrl: './import.component.css'
})
export class ImportComponent implements OnInit {
  private api = inject(ApiService);
  probe = inject(ImageProbeService);

  suppliers = signal<Supplier[]>([]);
  selectedSupplierId = signal<number | null>(null);

  // Alta/edicion de proveedor
  showForm = signal(false);
  sForm: { id: number | null; name: string; minOrderUsd: number; priorityToReachMin: boolean } =
    { id: null, name: '', minOrderUsd: 0, priorityToReachMin: false };
  savingSupplier = signal(false);
  supplierMsg = signal('');
  supplierErr = signal('');

  // Restricciones de compra del proveedor en edición (mínimos: USD, unidades, por marca)
  sConstraints = signal<SupplierConstraint[]>([]);
  newConstraint: { type: string; valueNum: number | null; brand: string } =
    { type: 'MIN_UNITS', valueNum: null, brand: '' };
  constraintMsg = signal('');

  // Import + vista previa
  dragging = signal(false);
  loading = signal(false);
  preview = signal<ImportPreview | null>(null);
  editMapping: ColumnMapping | null = null;
  // Correcciones manuales (marca/nombre/ml/foto) de filas nuevas, por índice de fila
  overrides: Record<number, RowOverride> = {};
  // Filas con costo sospechoso (typo probable) aprobadas a mano por el admin
  approvedSuspicious: Record<number, boolean> = {};
  publishing = signal(false);

  // Apify: rellenar fotos de filas nuevas (de 1 en 1, con barra y pausa)
  enriching = signal(false);
  enrichPaused = signal(false);
  enrichDone = signal(0);
  enrichTotal = signal(0);
  enrichMsg = signal('');

  // Ajustes de Apify (nº de resultados, tamaño de lote y token, editables desde la UI)
  apifyResults = 6;
  apifyBatch = 10;
  apifyTokenInput = '';
  apifyHasToken = signal(false);
  settingsMsg = signal('');

  // Fotos faltantes/rotas del catálogo (por proveedor o TODO el catálogo)
  missSupplierId = signal<number | null>(null);
  missScopeAll = signal(false);
  missMode = signal<'faltantes' | 'rotas'>('faltantes');
  missing = signal<PhotoRow[]>([]);
  missLoading = signal(false);
  missEnriching = signal(false);
  missPaused = signal(false);
  missDone = signal(0);
  missTotal = signal(0);
  missMsg = signal('');
  missSource = signal<'google' | 'fragrantica' | 'bing'>('bing');
  // Escaneo de rotas EN EL NAVEGADOR (el único juez fiel de "se ve / no se ve")
  scanDone = signal(0);
  scanTotal = signal(0);

  // Revisión visual: candidatas finales por perfume, con validación y elección manual
  reviewOpen = signal(false);
  reviewIdx = signal(0);
  reviewRows: PhotoRow[] = [];
  reviewCands = signal<PhotoCandidate[]>([]);
  reviewStates = signal<Record<string, ProbeResult>>({});
  reviewChosen = signal<string | null>(null);
  reviewCurrent = signal<ProbeResult | null>(null);
  reviewLoading = signal(false);
  reviewSaving = signal(false);
  reviewMsg = signal('');
  summary = signal<ImportSummary | null>(null);
  message = signal('');
  error = signal('');

  // Cutover legacy
  archiving = signal(false);
  archiveMessage = signal('');

  ngOnInit() {
    this.loadSuppliers();
    this.api.getApifySettings().subscribe({
      next: (s) => { this.apifyResults = s.results; this.apifyBatch = s.batch; this.apifyHasToken.set(s.hasToken); },
      error: () => {}
    });
  }

  // ---------- Ajustes de Apify (nº resultados / token) ----------
  saveApifySettings() {
    const body: { results?: number; batch?: number; token?: string } = { results: +this.apifyResults, batch: +this.apifyBatch };
    if (this.apifyTokenInput.trim()) body.token = this.apifyTokenInput.trim();
    this.settingsMsg.set('Guardando…');
    this.api.saveApifySettings(body).subscribe({
      next: (s) => {
        this.apifyResults = s.results;
        this.apifyBatch = s.batch;
        this.apifyHasToken.set(s.hasToken);
        this.apifyTokenInput = '';
        this.settingsMsg.set('✓ ' + s.message);
      },
      error: (err) => this.settingsMsg.set('✗ ' + (err.error?.message || 'No se pudo guardar.'))
    });
  }

  // ---------- Fotos faltantes/rotas del catálogo ----------
  onMissSupplierChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    this.missScopeAll.set(v === 'all');
    this.missSupplierId.set(v && v !== 'null' && v !== 'all' ? +v : null);
    this.missing.set([]); this.missMsg.set('');
  }
  /** ¿Hay un alcance elegido (proveedor o todo el catálogo)? */
  missScopeReady(): boolean { return this.missScopeAll() || this.missSupplierId() != null; }
  private missScopeId(): number | null { return this.missScopeAll() ? null : this.missSupplierId(); }

  loadMissing() {
    if (!this.missScopeReady()) { this.missMsg.set('Selecciona un proveedor o "Todo el catálogo".'); return; }
    this.missMode.set('faltantes');
    this.missLoading.set(true); this.missMsg.set('');
    this.api.getMissingImages(this.missScopeId()).subscribe({
      next: (list) => {
        this.missLoading.set(false);
        this.missing.set(list);
        this.missMsg.set(list.length ? `${list.length} productos sin foto.` : 'No hay productos sin foto en este alcance.');
      },
      error: (err) => { this.missLoading.set(false); this.missMsg.set(err.error?.message || 'No se pudo cargar.'); }
    });
  }

  /**
   * Revisar fotos rotas v2: trae los productos CON foto y las valida EN ESTE navegador
   * cargando la MISMA URL final que ve el cliente (cdnImage). Detecta 404/403/red/
   * corruptas/MIME falso/placeholders — todo lo que el navegador no puede mostrar.
   */
  loadBroken() {
    if (!this.missScopeReady()) { this.missMsg.set('Selecciona un proveedor o "Todo el catálogo".'); return; }
    this.missMode.set('rotas');
    this.missLoading.set(true); this.missMsg.set(''); this.missing.set([]);
    this.missPaused.set(false);
    this.scanDone.set(0); this.scanTotal.set(0);
    this.api.getPhotos(this.missScopeId()).subscribe({
      next: async (list) => {
        this.scanTotal.set(list.length);
        const results = await this.probe.probeAll(list, r => r.imageUrl, {
          concurrency: 10,
          onProgress: (d) => this.scanDone.set(d),
          isPaused: () => this.missPaused()
        });
        const broken: PhotoRow[] = [];
        for (const row of list) {
          const res = results.get(row);
          if (res && !res.ok) broken.push({ ...row, selected: true, reason: res.reason });
        }
        this.missing.set(broken);
        this.missLoading.set(false);
        const paused = this.missPaused() && results.size < list.length;
        this.missMsg.set(broken.length
          ? `${broken.length} con foto rota de ${results.size} revisadas${paused ? ' (escaneo pausado)' : ''}. Destilda las que quieras conservar.`
          : (paused ? `Escaneo pausado (${results.size}/${list.length} revisadas), sin rotas hasta ahora.` : `Ninguna foto rota entre ${results.size} revisadas. 🎉`));
      },
      error: (err) => { this.missLoading.set(false); this.missMsg.set(err.error?.message || 'No se pudo revisar.'); }
    });
  }

  toggleMissSelected(id: number, checked: boolean) {
    this.missing.update(list => list.map(p => p.id === id ? { ...p, selected: checked } : p));
  }
  private missQuery(p: { brand: string; name: string; ml: number | null }): string {
    const ml = p.ml ? `${p.ml}ml` : '';
    return `${p.brand ?? ''} ${p.name ?? ''} ${ml} perfume`.replace(/\s+/g, ' ').trim();
  }

  /**
   * Auto-fill robusto: pide las N candidatas finales por lote y guarda la PRIMERA
   * que este navegador SÍ renderiza (antes se guardaba la primera a ciegas).
   * La elección queda cacheada como definitiva (choosePhoto).
   */
  async enrichMissing(source: 'google' | 'fragrantica' | 'bing' = 'bing') {
    const rotas = this.missMode() === 'rotas';
    const list = rotas
      ? this.missing().filter(p => p.selected !== false)   // rotas: solo las marcadas
      : this.missing().filter(p => !p.imageUrl);            // faltantes: las sin foto
    if (!list.length) { this.missMsg.set(rotas ? 'No hay ninguna seleccionada.' : 'Todos ya tienen foto.'); return; }
    this.missSource.set(source);
    this.missPaused.set(false); this.missEnriching.set(true);
    this.missTotal.set(list.length); this.missDone.set(0); this.missMsg.set('');
    const size = Math.max(1, +this.apifyBatch || 1);
    let found = 0, invalid = 0;
    for (let start = 0; start < list.length; start += size) {
      if (this.missPaused()) {
        this.missEnriching.set(false);
        this.missMsg.set(`⏸ Pausado. ${found} de ${this.missTotal()} con foto válida.`);
        return;
      }
      const chunk = list.slice(start, start + size);
      const items = chunk.map(p => ({ idx: p.id, upc: p.upc ?? null, query: this.missQuery(p) }));
      let res: Record<string, PhotoCandidate[]>;
      try {
        res = await firstValueFrom(this.api.fetchApifyCandidates(items, source, rotas));
      } catch (err: any) {
        this.missEnriching.set(false);
        this.missMsg.set(err?.error?.message || 'Error consultando Apify.');
        return;
      }
      for (const p of chunk) {
        const cands = res?.[String(p.id)] ?? [];
        let saved = false;
        for (const c of cands) {
          const pr = await this.probe.probe(c.url);
          if (!pr.ok) continue;
          try {
            await firstValueFrom(this.api.choosePhoto(p.id, c.url));
            p.imageUrl = c.url; p.reason = undefined; found++; saved = true;
          } catch { /* si no se pudo guardar, no cuenta */ }
          break;
        }
        if (!saved && cands.length) { p.reason = 'sin candidata válida'; invalid++; }
        this.missDone.update(d => d + 1);
      }
      this.missing.update(l => [...l]); // refresca miniaturas
    }
    this.missEnriching.set(false);
    this.missMsg.set(`✓ ${found} de ${this.missTotal()} con foto VALIDADA en navegador${invalid ? `; ${invalid} sin candidata que cargue (revísalas visualmente)` : ''}.`);
  }
  pauseMissing() { this.missPaused.set(true); }

  // ---------- Revisión visual: N candidatas finales + elección manual ----------
  openReview() {
    const rotas = this.missMode() === 'rotas';
    this.reviewRows = rotas ? this.missing().filter(p => p.selected !== false) : [...this.missing()];
    if (!this.reviewRows.length) { this.missMsg.set('No hay productos para revisar.'); return; }
    this.reviewIdx.set(0);
    this.reviewOpen.set(true);
    this.loadReviewItem(false);
  }
  reviewRow(): PhotoRow | undefined { return this.reviewRows[this.reviewIdx()]; }

  /** Carga las N candidatas FINALES del perfume actual y las valida con el navegador. */
  async loadReviewItem(force: boolean) {
    const p = this.reviewRow();
    if (!p) return;
    this.reviewLoading.set(true); this.reviewMsg.set('');
    this.reviewCands.set([]); this.reviewStates.set({});
    this.reviewChosen.set(null); this.reviewCurrent.set(null);

    if (p.imageUrl) this.probe.probe(p.imageUrl).then(r => this.reviewCurrent.set(r));

    let cands: PhotoCandidate[] = [];
    try {
      const res = await firstValueFrom(this.api.fetchApifyCandidates(
        [{ idx: p.id, upc: p.upc ?? null, query: this.missQuery(p) }], this.missSource(), force));
      cands = res?.[String(p.id)] ?? [];
    } catch (err: any) {
      this.reviewMsg.set(err?.error?.message || 'Error buscando candidatas.');
      this.reviewLoading.set(false);
      return;
    }
    this.reviewCands.set(cands);
    this.reviewLoading.set(false);
    if (!cands.length) {
      this.reviewMsg.set('Sin candidatas para este perfume. Prueba "Re-buscar" u otra fuente.');
      return;
    }
    // Validación en paralelo; preselecciona la primera VÁLIDA en el orden del ranking
    // (exactamente lo que guardaría el auto-fill).
    const results = await Promise.all(cands.map(c => this.probe.probe(c.url)));
    const states: Record<string, ProbeResult> = {};
    cands.forEach((c, i) => { states[c.url] = results[i]; });
    this.reviewStates.set(states);
    const firstOk = cands.find((c, i) => results[i].ok);
    this.reviewChosen.set(firstOk ? firstOk.url : null);
    if (!firstOk) this.reviewMsg.set('Ninguna candidata carga en el navegador. Usa "Re-buscar" u otra fuente.');
  }

  pickReview(url: string) { this.reviewChosen.set(url); }

  async saveReview(advance: boolean) {
    const p = this.reviewRow();
    const url = this.reviewChosen();
    if (!p || !url) return;
    this.reviewSaving.set(true);
    try {
      await firstValueFrom(this.api.choosePhoto(p.id, url));
      p.imageUrl = url;
      this.missing.update(l => l.map(x => x.id === p.id ? { ...x, imageUrl: url, reason: undefined } : x));
      this.reviewMsg.set('✓ Guardada.');
      if (advance) this.nextReview();
    } catch (err: any) {
      this.reviewMsg.set(err?.error?.message || 'No se pudo guardar.');
    }
    this.reviewSaving.set(false);
  }

  nextReview() {
    if (this.reviewIdx() < this.reviewRows.length - 1) {
      this.reviewIdx.update(i => i + 1);
      this.loadReviewItem(false);
    } else {
      this.reviewOpen.set(false);
    }
  }
  prevReview() {
    if (this.reviewIdx() > 0) {
      this.reviewIdx.update(i => i - 1);
      this.loadReviewItem(false);
    }
  }
  closeReview() { this.reviewOpen.set(false); }

  /** La MISMA URL final que valida el probe y que verá el cliente. */
  reviewUrl(u: string | null | undefined): string { return this.probe.finalUrl(u); }
  reasonLabel(r?: string): string { return this.probe.reasonLabel(r); }

  loadSuppliers(keepSelection = false) {
    this.api.getSuppliers().subscribe({
      next: (s) => {
        this.suppliers.set(s);
        if (!keepSelection && s.length && this.selectedSupplierId() == null) {
          const firstActive = s.find(x => x.active) ?? s[0];
          this.selectedSupplierId.set(firstActive.id);
        }
      },
      error: () => this.error.set('No se pudieron cargar los proveedores. Vuelve a iniciar sesión.')
    });
  }

  selectedSupplier() {
    return this.suppliers().find(s => s.id === this.selectedSupplierId()) ?? null;
  }

  onSupplierChange(e: Event) {
    this.selectedSupplierId.set(+(e.target as HTMLSelectElement).value);
    this.resetImport();
  }

  // ---------- CRUD proveedores ----------
  openNew() {
    this.sForm = { id: null, name: '', minOrderUsd: 0, priorityToReachMin: false };
    this.supplierMsg.set(''); this.supplierErr.set('');
    this.showForm.set(true);
  }
  openEdit(s: Supplier) {
    this.sForm = { id: s.id, name: s.name, minOrderUsd: s.minOrderUsd, priorityToReachMin: s.priorityToReachMin };
    this.supplierMsg.set(''); this.supplierErr.set('');
    this.showForm.set(true);
    this.loadConstraints(s.id);
  }
  cancelForm() { this.showForm.set(false); this.sConstraints.set([]); }

  // ---------- Restricciones de compra (mínimos como datos) ----------
  private loadConstraints(supplierId: number) {
    this.sConstraints.set([]);
    this.constraintMsg.set('');
    this.api.getSupplierConstraints(supplierId).subscribe({
      next: (list) => this.sConstraints.set(list),
      error: () => {}
    });
  }

  constraintLabel(c: SupplierConstraint): string {
    switch (c.type) {
      case 'MIN_ORDER_USD': return `Pedido mínimo $${c.valueNum}`;
      case 'MIN_UNITS': return `Mínimo ${c.valueNum} unidades`;
      case 'MIN_UNITS_PER_BRAND': {
        let brand = '';
        try { brand = JSON.parse(c.scopeJson || '{}').brand ?? ''; } catch {}
        return `Mínimo ${c.valueNum} uds de ${brand || '(marca?)'}`;
      }
      default: return `${c.type} = ${c.valueNum}`;
    }
  }

  addConstraint() {
    const sid = this.sForm.id;
    if (sid == null || this.newConstraint.valueNum == null || this.newConstraint.valueNum <= 0) {
      this.constraintMsg.set('Ingresa un valor mayor a 0.');
      return;
    }
    const body: SupplierConstraint = {
      type: this.newConstraint.type,
      valueNum: +this.newConstraint.valueNum,
      scopeJson: this.newConstraint.type === 'MIN_UNITS_PER_BRAND' && this.newConstraint.brand.trim()
        ? JSON.stringify({ brand: this.newConstraint.brand.trim() }) : null,
      active: true
    };
    this.api.addSupplierConstraint(sid, body).subscribe({
      next: () => {
        this.constraintMsg.set('✓ Restricción agregada. El plan de compra la respetará.');
        this.newConstraint = { type: 'MIN_UNITS', valueNum: null, brand: '' };
        this.loadConstraints(sid);
      },
      error: (e) => this.constraintMsg.set(e.error?.message || 'No se pudo agregar.')
    });
  }

  removeConstraint(c: SupplierConstraint) {
    const sid = this.sForm.id;
    if (sid == null || c.id == null) return;
    this.api.deleteSupplierConstraint(sid, c.id).subscribe({
      next: () => { this.constraintMsg.set('✓ Eliminada.'); this.loadConstraints(sid); },
      error: (e) => this.constraintMsg.set(e.error?.message || 'No se pudo eliminar.')
    });
  }

  saveSupplier() {
    if (!this.sForm.name.trim()) { this.supplierErr.set('El nombre es obligatorio.'); return; }
    this.savingSupplier.set(true); this.supplierErr.set(''); this.supplierMsg.set('');
    const req = {
      name: this.sForm.name.trim(),
      minOrderUsd: +this.sForm.minOrderUsd || 0,
      priorityToReachMin: !!this.sForm.priorityToReachMin
    };
    const fail = (err: any) => {
      this.savingSupplier.set(false);
      this.supplierErr.set(err.error?.message || 'No se pudo guardar el proveedor.');
    };
    if (this.sForm.id == null) {
      // Al CREAR: el formulario pasa a modo edición para agregar los mínimos de compra
      // ahí mismo (antes había que cerrar y volver a entrar con "Editar").
      this.api.createSupplier(req).subscribe({
        next: (s) => {
          this.savingSupplier.set(false);
          this.sForm.id = s.id;
          this.supplierMsg.set('✓ Proveedor creado. Ahora puedes agregar sus mínimos de compra aquí abajo.');
          this.loadConstraints(s.id);
          this.loadSuppliers(true);
        },
        error: fail
      });
    } else {
      this.api.updateSupplier(this.sForm.id, req).subscribe({
        next: () => {
          this.savingSupplier.set(false);
          this.supplierMsg.set('✓ Proveedor actualizado.');
          this.showForm.set(false);
          this.loadSuppliers(true);
        },
        error: fail
      });
    }
  }

  busySupplierId = signal<number | null>(null);

  toggleActive(s: Supplier) {
    this.supplierErr.set(''); this.supplierMsg.set('');
    this.busySupplierId.set(s.id);
    this.api.setSupplierActive(s.id, !s.active).subscribe({
      next: () => {
        this.busySupplierId.set(null);
        this.supplierMsg.set(!s.active
          ? `✓ ${s.name} activado. Los precios se recalculan en segundo plano (puede tardar unos minutos en reflejarse).`
          : `✓ ${s.name} desactivado. Sus ofertas salen de precios y comparación; el recálculo corre en segundo plano.`);
        this.loadSuppliers(true);
      },
      error: (err) => {
        this.busySupplierId.set(null);
        this.supplierErr.set(err.error?.message || 'No se pudo cambiar el estado.');
      }
    });
  }

  removeSupplier(s: Supplier) {
    if (!confirm(`Eliminar PERMANENTEMENTE a "${s.name}" y todas sus ofertas. Los precios se recalculan en segundo plano. ¿Continuar?`)) return;
    this.busySupplierId.set(s.id);
    this.supplierErr.set(''); this.supplierMsg.set('');
    this.api.deleteSupplier(s.id).subscribe({
      next: () => {
        this.busySupplierId.set(null);
        this.supplierMsg.set(`✓ ${s.name} eliminado. Los precios de sus productos se recalculan en segundo plano.`);
        if (this.selectedSupplierId() === s.id) this.selectedSupplierId.set(null);
        this.loadSuppliers();
      },
      error: (err) => {
        this.busySupplierId.set(null);
        this.supplierErr.set(err.error?.message || 'No se pudo eliminar.');
      }
    });
  }

  // ---------- Import con vista previa ----------
  onDragOver(e: DragEvent) { e.preventDefault(); this.dragging.set(true); }
  onDragLeave(e: DragEvent) { e.preventDefault(); this.dragging.set(false); }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragging.set(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) this.upload(f);
  }
  onFileSelected(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.upload(f);
  }

  resetImport() {
    this.preview.set(null); this.editMapping = null; this.overrides = {}; this.approvedSuspicious = {};
    this.summary.set(null);
    this.message.set(''); this.error.set('');
  }

  /** Cuántas filas sospechosas siguen sin aprobar (quedarían fuera de stock). */
  suspiciousUnapproved(): number {
    const p = this.preview();
    if (!p) return 0;
    return p.rows.filter(r => r.suspicious && !this.approvedSuspicious[r.idx]).length;
  }

  /** Inicializa las correcciones de las filas nuevas con lo que detectó el parser. */
  private seedOverrides(p: ImportPreview) {
    this.overrides = {};
    for (const r of p.rows) {
      if (r.editable) this.overrides[r.idx] = { brand: r.brand, name: r.name, ml: r.ml };
    }
  }

  upload(file: File) {
    const sid = this.selectedSupplierId();
    this.resetImport();
    if (sid == null) { this.error.set('Selecciona un proveedor primero.'); return; }
    if (!/\.xlsx?$/i.test(file.name)) { this.error.set('El archivo debe ser .xlsx'); return; }
    this.loading.set(true);
    this.api.previewImport(sid, file).subscribe({
      next: (p) => {
        this.loading.set(false);
        this.preview.set(p);
        this.editMapping = p.mapping ? { ...p.mapping } : null;
        this.seedOverrides(p);
        this.message.set('Vista previa lista. Revisa y publica cuando esté correcto.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Error al leer el Excel.');
      }
    });
  }

  reparse() {
    const p = this.preview();
    if (!p || !this.editMapping) return;
    this.loading.set(true); this.error.set('');
    this.api.reparseBatch(p.batchId, this.editMapping).subscribe({
      next: (np) => {
        this.loading.set(false);
        this.preview.set(np);
        this.editMapping = np.mapping ? { ...np.mapping } : null;
        this.seedOverrides(np);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'No se pudo re-analizar.');
      }
    });
  }

  publish() {
    const p = this.preview();
    if (!p) return;
    const pendingSusp = this.suspiciousUnapproved();
    const warn = pendingSusp > 0
      ? `\n\nOJO: ${pendingSusp} fila(s) con costo sospechoso quedarán FUERA de stock (marca su casilla ✓ para aprobarlas).`
      : '';
    if (!confirm('Se publicará a la tienda: los productos y precios quedarán visibles para el cliente.' + warn + '\n¿Continuar?')) return;
    const approvedSuspiciousIdx = Object.entries(this.approvedSuspicious)
      .filter(([, ok]) => ok).map(([idx]) => +idx);
    this.publishing.set(true); this.error.set('');
    this.api.publishBatch(p.batchId, { overrides: this.overrides, approvedSuspiciousIdx }).subscribe({
      next: (s) => {
        this.publishing.set(false);
        this.summary.set(s);
        this.preview.set(null);
        this.editMapping = null;
        this.message.set('✓ Publicado. Ya está en vista del cliente.');
        this.loadSuppliers(true);
      },
      error: (err) => {
        this.publishing.set(false);
        this.error.set(err.error?.message || 'No se pudo publicar.');
      }
    });
  }

  discard() {
    const p = this.preview();
    if (!p) { this.resetImport(); return; }
    this.api.discardBatch(p.batchId).subscribe({
      next: () => { this.resetImport(); this.message.set('Vista previa descartada. Nada cambió en la tienda.'); },
      error: () => this.resetImport()
    });
  }

  // ---------- Apify: rellenar fotos de las filas NUEVAS ----------
  newRows() {
    const p = this.preview();
    return p ? p.rows.filter(r => r.editable) : [];
  }
  /** Filas nuevas que aún no tienen foto asignada. */
  private rowsNeedingPhoto() {
    return this.newRows().filter(r => !this.overrides[r.idx]?.imageUrl);
  }
  /** Consulta como la manual: título original SIN el tamaño (100ml/oz) + "perfume". */
  private buildQuery(row: ImportPreviewLine | undefined, idx: number): string {
    if (row?.rawTitle && row.rawTitle.trim()) {
      return `${row.rawTitle} perfume`
        .replace(/\b\d+(\.\d+)?\s*(ml|oz)\b/gi, ' ')  // quitar tamaño (ruido para Google)
        .replace(/\s+/g, ' ').trim();
    }
    const o = this.overrides[idx] || {};
    const ml = o.ml ? `${o.ml}ml` : '';
    return `${o.brand ?? ''} ${o.name ?? ''} ${ml} perfume`.replace(/\s+/g, ' ').trim();
  }

  enrichPhotos() {
    const pending = this.rowsNeedingPhoto();
    if (!pending.length) { this.enrichMsg.set('Todas las filas nuevas ya tienen foto.'); return; }
    this.error.set('');
    this.enrichPaused.set(false);
    this.enriching.set(true);
    this.enrichTotal.set(pending.length);
    this.enrichDone.set(0);
    this.enrichMsg.set('');
    this.processOne(pending.map(r => r.idx), 0, 0);
  }

  pauseEnrich() { this.enrichPaused.set(true); }

  /** Si una foto traída sale rota, la quitamos (muestra "nuevo" en vez del ícono roto). */
  imgFailed(idx: number) {
    if (this.overrides[idx]?.imageUrl) {
      this.overrides[idx] = { ...this.overrides[idx], imageUrl: null };
    }
  }

  clearPhotoCache() {
    if (!confirm('Limpiar el caché de fotos: los perfumes se volverán a buscar la próxima vez (gasta unos pocos tokens, pero con la búsqueda mejorada). ¿Continuar?')) return;
    this.api.clearApifyCache().subscribe({
      next: (r) => this.enrichMsg.set('✓ ' + r.message),
      error: (err) => this.error.set(err.error?.message || 'No se pudo limpiar el caché.')
    });
  }

  // De 1 en 1: busca una foto, la muestra, y sigue con la siguiente. Se puede pausar entre cada una.
  private processOne(idxs: number[], i: number, found: number) {
    if (this.enrichPaused()) {
      this.enriching.set(false);
      this.enrichMsg.set(`⏸ Pausado. Encontradas ${found} de ${this.enrichTotal()}. Pulsa "Rellenar" para continuar.`);
      return;
    }
    if (i >= idxs.length) {
      this.enriching.set(false);
      this.enrichMsg.set(`✓ Fotos encontradas: ${found} de ${this.enrichTotal()}.`);
      return;
    }
    const idx = idxs[i];
    const row = this.preview()?.rows.find(r => r.idx === idx);
    const items = [{ idx, upc: row?.upc ?? null, query: this.buildQuery(row, idx) }];
    this.api.fetchApifyImages(items).subscribe({
      next: (res) => {
        let f = found;
        const url = res?.[String(idx)];
        if (url) { this.overrides[idx] = { ...(this.overrides[idx] || {}), imageUrl: url }; f++; }
        this.enrichDone.set(i + 1);
        this.processOne(idxs, i + 1, f);
      },
      error: (err) => {
        this.enriching.set(false);
        this.error.set(err.error?.message || 'Error consultando Apify. ¿Configuraste APIFY_TOKEN?');
      }
    });
  }

  archive() {
    if (!confirm('Esto archivará el catálogo viejo (productos sin ofertas de proveedor). NO se borra nada. ¿Continuar?')) return;
    this.archiving.set(true); this.archiveMessage.set('');
    this.api.archiveLegacyCatalog().subscribe({
      next: (r) => { this.archiving.set(false); this.archiveMessage.set('✓ ' + r.message); },
      error: (err) => { this.archiving.set(false); this.archiveMessage.set('✗ ' + (err.error?.message || 'No se pudo archivar')); }
    });
  }
}
