import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { Supplier, ImportSummary, ImportPreview, ImportPreviewLine, ColumnMapping, RowOverride } from '../../../models/api.models';
import { CdnImgPipe } from '../../../shared/cdn-img.pipe';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, CdnImgPipe],
  templateUrl: './import.component.html',
  styleUrl: './import.component.css'
})
export class ImportComponent implements OnInit {
  private api = inject(ApiService);

  suppliers = signal<Supplier[]>([]);
  selectedSupplierId = signal<number | null>(null);

  // Alta/edicion de proveedor
  showForm = signal(false);
  sForm: { id: number | null; name: string; minOrderUsd: number; priorityToReachMin: boolean } =
    { id: null, name: '', minOrderUsd: 0, priorityToReachMin: false };
  savingSupplier = signal(false);
  supplierMsg = signal('');
  supplierErr = signal('');

  // Import + vista previa
  dragging = signal(false);
  loading = signal(false);
  preview = signal<ImportPreview | null>(null);
  editMapping: ColumnMapping | null = null;
  // Correcciones manuales (marca/nombre/ml/foto) de filas nuevas, por índice de fila
  overrides: Record<number, RowOverride> = {};
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

  // Fotos faltantes del catálogo (por proveedor)
  missSupplierId = signal<number | null>(null);
  missing = signal<{ id: number; brand: string; name: string; ml: number | null; upc: string | null; imageUrl?: string | null }[]>([]);
  missLoading = signal(false);
  missEnriching = signal(false);
  missPaused = signal(false);
  missDone = signal(0);
  missTotal = signal(0);
  missMsg = signal('');
  missSource = signal<'google' | 'fragrantica' | 'bing'>('bing');
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

  // ---------- Fotos faltantes del catálogo (por proveedor) ----------
  onMissSupplierChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    this.missSupplierId.set(v && v !== 'null' ? +v : null);
    this.missing.set([]); this.missMsg.set('');
  }
  loadMissing() {
    const sid = this.missSupplierId();
    if (sid == null) { this.missMsg.set('Selecciona un proveedor.'); return; }
    this.missLoading.set(true); this.missMsg.set('');
    this.api.getMissingImages(sid).subscribe({
      next: (list) => {
        this.missLoading.set(false);
        this.missing.set(list);
        this.missMsg.set(list.length ? `${list.length} productos sin foto.` : 'No hay productos sin foto para este proveedor.');
      },
      error: (err) => { this.missLoading.set(false); this.missMsg.set(err.error?.message || 'No se pudo cargar.'); }
    });
  }
  private missQuery(p: { brand: string; name: string; ml: number | null }): string {
    const ml = p.ml ? `${p.ml}ml` : '';
    return `${p.brand ?? ''} ${p.name ?? ''} ${ml} perfume`.replace(/\s+/g, ' ').trim();
  }
  enrichMissing(source: 'google' | 'fragrantica' | 'bing' = 'bing') {
    const list = this.missing().filter(p => !p.imageUrl);
    if (!list.length) { this.missMsg.set('Todos ya tienen foto.'); return; }
    this.missSource.set(source);
    this.missPaused.set(false); this.missEnriching.set(true);
    this.missTotal.set(list.length); this.missDone.set(0); this.missMsg.set('');
    this.processMissingChunk(list, 0, 0);
  }
  pauseMissing() { this.missPaused.set(true); }
  // Procesa POR LOTES (tamaño configurable): manda N perfumes en una sola corrida del actor.
  private processMissingChunk(list: { id: number; brand: string; name: string; ml: number | null; upc: string | null; imageUrl?: string | null }[], start: number, found: number) {
    if (this.missPaused()) { this.missEnriching.set(false); this.missMsg.set(`⏸ Pausado. ${found} de ${this.missTotal()} con foto.`); return; }
    if (start >= list.length) { this.missEnriching.set(false); this.missMsg.set(`✓ ${found} de ${this.missTotal()} rellenadas.`); return; }
    const size = Math.max(1, +this.apifyBatch || 1);
    const chunk = list.slice(start, start + size);
    const items = chunk.map(p => ({ idx: p.id, upc: p.upc ?? null, query: this.missQuery(p) }));
    this.api.fetchApifyImages(items, this.missSource()).subscribe({
      next: (res) => {
        let f = found;
        for (const p of chunk) {
          const url = res?.[String(p.id)];
          if (url) { this.api.updateProduct(p.id, { imageUrl: url }).subscribe(); p.imageUrl = url; f++; }
        }
        this.missDone.set(Math.min(this.missTotal(), start + chunk.length));
        this.processMissingChunk(list, start + size, f);
      },
      error: (err) => { this.missEnriching.set(false); this.missMsg.set(err.error?.message || 'Error consultando Apify.'); }
    });
  }

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
  }
  cancelForm() { this.showForm.set(false); }

  saveSupplier() {
    if (!this.sForm.name.trim()) { this.supplierErr.set('El nombre es obligatorio.'); return; }
    this.savingSupplier.set(true); this.supplierErr.set(''); this.supplierMsg.set('');
    const req = {
      name: this.sForm.name.trim(),
      minOrderUsd: +this.sForm.minOrderUsd || 0,
      priorityToReachMin: !!this.sForm.priorityToReachMin
    };
    const done = (msg: string) => {
      this.savingSupplier.set(false);
      this.supplierMsg.set(msg);
      this.showForm.set(false);
      this.loadSuppliers(true);
    };
    const fail = (err: any) => {
      this.savingSupplier.set(false);
      this.supplierErr.set(err.error?.message || 'No se pudo guardar el proveedor.');
    };
    if (this.sForm.id == null) {
      this.api.createSupplier(req).subscribe({ next: () => done('✓ Proveedor creado.'), error: fail });
    } else {
      this.api.updateSupplier(this.sForm.id, req).subscribe({ next: () => done('✓ Proveedor actualizado.'), error: fail });
    }
  }

  toggleActive(s: Supplier) {
    this.supplierErr.set(''); this.supplierMsg.set('');
    this.api.setSupplierActive(s.id, !s.active).subscribe({
      next: () => {
        this.supplierMsg.set(!s.active ? `✓ ${s.name} activado.` : `✓ ${s.name} desactivado (fuera de precios y comparación).`);
        this.loadSuppliers(true);
      },
      error: (err) => this.supplierErr.set(err.error?.message || 'No se pudo cambiar el estado.')
    });
  }

  removeSupplier(s: Supplier) {
    if (!confirm(`Eliminar PERMANENTEMENTE a "${s.name}" y todas sus ofertas. Los precios se recalculan. ¿Continuar?`)) return;
    this.api.deleteSupplier(s.id).subscribe({
      next: () => {
        this.supplierMsg.set(`✓ ${s.name} eliminado.`);
        if (this.selectedSupplierId() === s.id) this.selectedSupplierId.set(null);
        this.loadSuppliers();
      },
      error: (err) => this.supplierErr.set(err.error?.message || 'No se pudo eliminar.')
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
    this.preview.set(null); this.editMapping = null; this.overrides = {}; this.summary.set(null);
    this.message.set(''); this.error.set('');
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
    if (!confirm('Se publicará a la tienda: los productos y precios quedarán visibles para el cliente. ¿Continuar?')) return;
    this.publishing.set(true); this.error.set('');
    this.api.publishBatch(p.batchId, { overrides: this.overrides }).subscribe({
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
