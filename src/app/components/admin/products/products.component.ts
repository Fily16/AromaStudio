import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Product, ProductOffersView, OfferIndexRow } from '../../../models/api.models';
import { CdnImgPipe } from '../../../shared/cdn-img.pipe';
import { downloadResellerExcel } from '../../../shared/reseller-excel.util';
import { downloadResellerPdf } from '../../../shared/reseller-pdf.util';

/** Contexto por producto para evaluar filtros (ofertas del catálogo + stock de tienda). */
interface FilterCtx { offers: OfferIndexRow[]; stock: number; }

/**
 * Filtro rápido definido como DATO: agregar uno nuevo es UNA línea en `quickFilters`,
 * sin tocar la lógica de filtrado ni la plantilla.
 */
interface QuickFilter {
  id: string;
  label: string;
  group: string;
  hint?: string;
  test: (p: Product, c: FilterCtx) => boolean;
}

/**
 * Productos (ERP): tabla clara con costo USD, puesto en Perú (con envío + caja),
 * precio Consolidado (+20) y Stock (+35), stock actual y edición inline.
 * Filtros combinables: por proveedor (+ estado dentro de ese proveedor) y por
 * banderas del catálogo (sin UPC, sin foto, sold out, etc.).
 */
@Component({
  selector: 'app-products',
  standalone: true,
  imports: [DecimalPipe, DatePipe, CdnImgPipe],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);

  products = signal<Product[]>([]);
  pricing = signal<Record<number, { landedPen: number; consolidadoPen: number; stockPen: number }>>({});
  stockMap = signal<Record<number, number>>({});
  search = signal('');
  sortOption = signal('default');
  visibleCount = signal(40);
  message = signal('');

  // ===== Filtros =====
  /** Índice de ofertas de todo el catálogo (1 request): quién vende cada producto y si tiene stock. */
  offersIndex = signal<OfferIndexRow[]>([]);
  /** 'ALL' | 'NONE' (sin proveedor) | id del proveedor como texto. */
  supplierFilter = signal<string>('ALL');
  /** Dentro del proveedor elegido: todos / disponibles / sold out. */
  supplierStock = signal<'ALL' | 'IN' | 'OUT'>('ALL');
  activeFilters = signal<Set<string>>(new Set());

  private offersByProduct = computed(() => {
    const m = new Map<number, OfferIndexRow[]>();
    for (const o of this.offersIndex()) {
      const arr = m.get(o.productId);
      if (arr) arr.push(o); else m.set(o.productId, [o]);
    }
    return m;
  });

  /** Proveedores presentes en el catálogo, derivados del índice (sin request extra). */
  suppliers = computed(() => {
    const m = new Map<number, string>();
    for (const o of this.offersIndex()) if (!m.has(o.supplierId)) m.set(o.supplierId, o.supplierName);
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  });

  /** Catálogo de filtros. Para sumar uno nuevo: agrega una línea aquí. */
  readonly quickFilters: QuickFilter[] = [
    { id: 'no-supplier', group: 'Proveedores', label: 'Sin proveedor',
      hint: 'Ningún proveedor lo tiene cargado (catálogo antiguo / CristFragance)',
      test: (_p, c) => c.offers.length === 0 },
    { id: 'sold-out', group: 'Proveedores', label: 'Sold out en todos',
      hint: 'Está en algún proveedor, pero ninguno tiene stock',
      test: (_p, c) => c.offers.length > 0 && c.offers.every(o => !o.inStock) },
    { id: 'in-stock', group: 'Proveedores', label: 'Disponible en alguno',
      test: (_p, c) => c.offers.some(o => o.inStock) },
    { id: 'multi', group: 'Proveedores', label: 'En 2+ proveedores',
      test: (_p, c) => new Set(c.offers.map(o => o.supplierId)).size >= 2 },

    { id: 'no-upc', group: 'Datos incompletos', label: 'Sin código (UPC)', test: p => !p.gtin },
    { id: 'no-photo', group: 'Datos incompletos', label: 'Sin foto', test: p => !p.imageUrl },
    { id: 'no-price', group: 'Datos incompletos', label: 'Sin precio', test: p => !p.wholesalePricePen },
    { id: 'no-notes', group: 'Datos incompletos', label: 'Sin notas olfativas', test: p => !p.notesTop },
    { id: 'no-ml', group: 'Datos incompletos', label: 'Sin tamaño (ml)', test: p => !p.ml },

    { id: 'hidden', group: 'Catálogo', label: 'Ocultos en la tienda', test: p => p.available === false },
    { id: 'locked', group: 'Catálogo', label: 'Precio bloqueado', test: p => !!p.priceLocked },
    { id: 'review', group: 'Catálogo', label: 'En revisión', test: p => !!p.matchPending },
    { id: 'gtin-conflict', group: 'Catálogo', label: 'Conflicto de UPC', test: p => !!p.gtinConflict },
    { id: 'with-stock', group: 'Catálogo', label: 'Con stock en tienda', test: (_p, c) => c.stock > 0 },
  ];

  /** Agrupación para la plantilla (se arma sola desde `quickFilters`). */
  readonly filterGroups = ['Proveedores', 'Datos incompletos', 'Catálogo']
    .map(g => ({ name: g, filters: this.quickFilters.filter(f => f.group === g) }));

  // Config para recálculo en el editor
  cfg = signal({ courier: 9, tc: 3.4, repackPerBox: 3.5, perBox: 4 });

  // Lista de precios reventa (+S/30) en Excel / PDF
  xlGenerating = signal(false);
  xlWithImages = signal(true);   // con fotos por defecto (descarga en paralelo, rápido)
  xlDone = signal(0);
  xlTotal = signal(0);

  private resellerRows() {
    return this.products()
      .filter(p => p.available !== false && !(p as any).archived && (p.wholesalePricePen || 0) > 0)
      .sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`))
      .map(p => ({
        brand: p.brand, name: p.name, ml: p.ml, imageUrl: p.imageUrl,
        sellPen: Math.round(p.wholesalePricePen || 0) + 30
      }));
  }

  async downloadPriceList() {
    if (this.xlGenerating()) return;
    const rows = this.resellerRows();
    if (!rows.length) { this.message.set('No hay productos con precio para exportar.'); return; }
    this.xlGenerating.set(true);
    this.xlTotal.set(rows.length);
    this.xlDone.set(0);
    try {
      await downloadResellerExcel({
        title: 'Lista de precios',
        subtitle: '',
        filename: 'lista-precios.xlsx',
        rows, withImages: this.xlWithImages(),
        onProgress: (d, t) => { this.xlDone.set(d); this.xlTotal.set(t); }
      });
    } catch { /* noop */ }
    this.xlGenerating.set(false);
  }

  async downloadPdf() {
    if (this.xlGenerating()) return;
    const rows = this.resellerRows();
    if (!rows.length) { this.message.set('No hay productos con precio para exportar.'); return; }
    this.xlGenerating.set(true);
    this.xlTotal.set(rows.length);
    this.xlDone.set(0);
    try {
      await downloadResellerPdf({
        title: 'Catálogo de precios',
        subtitle: '',
        filename: 'catalogo-precios.pdf',
        rows, onProgress: (d, t) => { this.xlDone.set(d); this.xlTotal.set(t); }
      });
    } catch { /* noop */ }
    this.xlGenerating.set(false);
  }

  // Vista multi-proveedor: ofertas del producto (quién lo vende y a qué costo)
  offersView = signal<ProductOffersView | null>(null);
  offersProduct = signal<Product | null>(null);
  offersLoading = signal(false);

  showOffers(p: Product) {
    this.offersProduct.set(p);
    this.offersView.set(null);
    this.offersLoading.set(true);
    this.api.getProductOffers(p.id).subscribe({
      next: (v) => { this.offersLoading.set(false); this.offersView.set(v); },
      error: () => { this.offersLoading.set(false); this.toast('No se pudieron cargar los proveedores.'); }
    });
  }
  closeOffers() { this.offersProduct.set(null); this.offersView.set(null); }

  basisLabel(basis: string): string {
    switch (basis) {
      case 'CHEAPEST': return 'el proveedor más barato';
      case 'PRIORITY': return 'el proveedor prioritario';
      case 'WORST_PLAUSIBLE': return 'el más caro plausible (conservador)';
      default: return basis;
    }
  }

  // Edición
  editingId = signal<number | null>(null);
  edit = signal({ name: '', brand: '', category: 'unisex', imageUrl: '', priceUsd: 0, weightG: 0, consolidado: 0, stock: 0, priceLocked: false });

  // Crear
  showCreate = signal(false);
  nuevo = signal<Partial<Product>>({ sku: '', brand: '', name: '', type: 'EDP', ml: 100, priceUsd: 0, weightG: 350, category: 'unisex' as any, available: true });

  ngOnInit() {
    this.load();
    this.api.getConfig().subscribe({
      next: (c) => {
        const g = (k: string, d: number) => { const x = c.find(i => i.configKey === k); return x ? +x.configValue : d; };
        this.cfg.set({ courier: g('courier_cost_per_kg', 9), tc: g('exchange_rate', 3.4), repackPerBox: g('repack_cost_per_box', 3.5), perBox: g('perfumes_per_box', 4) });
      },
      error: () => {}
    });
  }

  load() {
    this.api.getProducts().subscribe(p => this.products.set(p));
    this.api.getProductsPricing().subscribe({
      next: (list) => {
        const map: Record<number, any> = {};
        for (const r of list) map[r.id] = { landedPen: r.landedPen, consolidadoPen: r.consolidadoPen, stockPen: r.stockPen };
        this.pricing.set(map);
      },
      error: () => {}
    });
    this.api.getRetailStock().subscribe({ next: (s) => this.stockMap.set(s || {}), error: () => {} });
    // Índice de ofertas: alimenta el filtro por proveedor / sold out (1 sola consulta).
    this.api.getOffersIndex().subscribe({ next: (idx) => this.offersIndex.set(idx || []), error: () => {} });
  }

  landedPen(id: number): number { return this.pricing()[id]?.landedPen ?? 0; }
  stockQty(id: number): number { return this.stockMap()[id] || 0; }

  // Recálculo local (mismo modelo del backend) para el editor
  private calcLandedPen(priceUsd: number, weightG: number): number {
    const c = this.cfg();
    return (priceUsd + (weightG / 1000) * c.courier + c.repackPerBox / c.perBox) * c.tc;
  }

  private ctxFor(p: Product): FilterCtx {
    return { offers: this.offersByProduct().get(p.id) || [], stock: this.stockQty(p.id) };
  }

  /** Filtro de proveedor + su sub-filtro de stock (dentro de ESE proveedor). */
  private passSupplier(offers: OfferIndexRow[]): boolean {
    const f = this.supplierFilter();
    if (f === 'ALL') return true;
    if (f === 'NONE') return offers.length === 0;
    const mine = offers.filter(o => o.supplierId === +f);
    if (!mine.length) return false;
    const st = this.supplierStock();
    if (st === 'IN') return mine.some(o => o.inStock);
    if (st === 'OUT') return mine.every(o => !o.inStock);
    return true;
  }

  /** Base: búsqueda + proveedor. Los filtros rápidos se cuentan y aplican sobre esto. */
  private baseFiltered = computed(() => {
    const q = this.search().toLowerCase().trim();
    return this.products().filter(p => {
      if (q && !(`${p.name} ${p.brand} ${p.sku} ${p.gtin || ''}`).toLowerCase().includes(q)) return false;
      return this.passSupplier(this.offersByProduct().get(p.id) || []);
    });
  });

  /** Cuántos productos caen en cada filtro rápido (según lo ya filtrado por búsqueda/proveedor). */
  filterCounts = computed(() => {
    const base = this.baseFiltered();
    const out: Record<string, number> = {};
    for (const f of this.quickFilters) {
      out[f.id] = base.reduce((n, p) => n + (f.test(p, this.ctxFor(p)) ? 1 : 0), 0);
    }
    return out;
  });

  filtered = computed(() => {
    const active = this.activeFilters();
    const quick = this.quickFilters.filter(f => active.has(f.id));
    let r = quick.length
      ? this.baseFiltered().filter(p => {
          const ctx = this.ctxFor(p);
          return quick.every(f => f.test(p, ctx));
        })
      : this.baseFiltered();
    const s = this.sortOption();
    if (s !== 'default') {
      r = [...r].sort((a, b) => {
        if (s === 'name_asc') return (a.brand + a.name).localeCompare(b.brand + b.name);
        if (s === 'price_desc') return (b.priceUsd || 0) - (a.priceUsd || 0);
        if (s === 'price_asc') return (a.priceUsd || 0) - (b.priceUsd || 0);
        if (s === 'stock') return this.stockQty(b.id) - this.stockQty(a.id);
        return 0;
      });
    }
    return r;
  });
  visible = computed(() => this.filtered().slice(0, this.visibleCount()));
  hasMore = computed(() => this.visibleCount() < this.filtered().length);
  loadMore() { this.visibleCount.update(v => v + 40); }

  onSearch(e: Event) { this.search.set((e.target as HTMLInputElement).value); this.visibleCount.set(40); }
  onSort(e: Event) { this.sortOption.set((e.target as HTMLSelectElement).value); }

  onSupplier(e: Event) {
    this.supplierFilter.set((e.target as HTMLSelectElement).value);
    this.supplierStock.set('ALL');
    this.visibleCount.set(40);
  }
  setSupplierStock(v: 'ALL' | 'IN' | 'OUT') { this.supplierStock.set(v); this.visibleCount.set(40); }

  toggleFilter(id: string) {
    this.activeFilters.update(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
    this.visibleCount.set(40);
  }
  clearFilters() {
    this.activeFilters.set(new Set());
    this.supplierFilter.set('ALL');
    this.supplierStock.set('ALL');
    this.visibleCount.set(40);
  }
  activeFilterCount = computed(() =>
    this.activeFilters().size + (this.supplierFilter() === 'ALL' ? 0 : 1));

  /** Nombres de los proveedores que venden el producto (chips en la tabla). */
  supplierChips(productId: number): { name: string; inStock: boolean }[] {
    const byName = new Map<string, boolean>();
    for (const o of this.offersByProduct().get(productId) || []) {
      byName.set(o.supplierName, (byName.get(o.supplierName) || false) || o.inStock);
    }
    return [...byName].map(([name, inStock]) => ({ name, inStock }));
  }

  // --- Edición ---
  startEdit(p: Product) {
    this.editingId.set(p.id);
    this.edit.set({
      name: p.name, brand: p.brand, category: p.category || 'unisex', imageUrl: p.imageUrl || '',
      priceUsd: p.priceUsd || 0, weightG: p.weightG || 0,
      consolidado: p.wholesalePricePen || 0, stock: p.stockPricePen || 0,
      priceLocked: !!(p as any).priceLocked
    });
  }
  cancelEdit() { this.editingId.set(null); }
  toggleLock(e: Event) { this.edit.set({ ...this.edit(), priceLocked: (e.target as HTMLInputElement).checked }); }
  editField(field: string, e: Event) {
    const t = e.target as HTMLInputElement;
    const val: any = t.type === 'number' ? +t.value : t.value;
    this.edit.set({ ...this.edit(), [field]: val });
  }
  /** Rellena consolidado/stock con la fórmula a partir del costo y peso editados. */
  recalc() {
    const e = this.edit();
    const landed = this.calcLandedPen(e.priceUsd, e.weightG);
    this.edit.set({ ...e, consolidado: Math.ceil(landed + 20), stock: Math.ceil(landed + 35) });
  }
  save() {
    const id = this.editingId();
    if (id == null) return;
    const e = this.edit();
    this.api.updateProduct(id, {
      name: e.name, brand: e.brand, category: e.category as any, imageUrl: e.imageUrl || null,
      priceUsd: e.priceUsd, weightG: e.weightG,
      wholesalePricePen: e.consolidado || null, stockPricePen: e.stock || null,
      priceLocked: e.priceLocked
    } as any).subscribe({
      next: () => { this.editingId.set(null); this.load(); this.toast('Producto actualizado'); },
      error: () => this.toast('Error al guardar')
    });
  }

  toggleAvailable(p: Product) {
    this.api.updateProduct(p.id, { available: !p.available }).subscribe(() => this.load());
  }
  deleteProduct(id: number) {
    if (!confirm('¿Eliminar este producto? No se puede deshacer.')) return;
    this.api.deleteProduct(id).subscribe({ next: () => this.load(), error: () => this.toast('No se pudo eliminar') });
  }

  // --- Crear ---
  toggleCreate() { this.showCreate.update(v => !v); }
  newField(field: string, e: Event) {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    const val: any = (t as HTMLInputElement).type === 'number' ? +t.value : t.value;
    this.nuevo.set({ ...this.nuevo(), [field]: val });
  }
  create() {
    const p = this.nuevo();
    if (!p.sku || !p.brand || !p.name) { this.toast('SKU, marca y nombre son obligatorios'); return; }
    this.api.createProduct(p).subscribe({
      next: () => { this.showCreate.set(false); this.nuevo.set({ sku: '', brand: '', name: '', type: 'EDP', ml: 100, priceUsd: 0, weightG: 350, category: 'unisex' as any, available: true }); this.load(); this.toast('Producto creado'); },
      error: (e) => this.toast('Error: ' + (e.error?.message || 'no se pudo crear'))
    });
  }

  private toast(m: string) { this.message.set(m); setTimeout(() => this.message.set(''), 3000); }
}
