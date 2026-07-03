import { Component, computed, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Product, Order, Banner, Promotion } from '../../models/api.models';
import { ProductCardComponent } from '../shared/product-card.component';
import { NoteIconComponent } from '../shared/note-icon.component';
import { CdnImgPipe } from '../../shared/cdn-img.pipe';
import {
  parseNotes, noteLabel, familyLabel, FamilyCode, FAMILY_ORDER,
  OCCASION_LABEL, SEASON_LABEL, SEASON_ORDER
} from '../shared/note-catalog';

type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'new';
type StockKey = 'all' | 'in' | 'order' | 'promos';
type GenderKey = 'all' | 'men' | 'women' | 'unisex';
type OccasionKey = 'all' | 'dia' | 'noche' | 'versatil';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule, DecimalPipe, ProductCardComponent, RouterLink, NoteIconComponent, CdnImgPipe],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  cart = inject(CartService);

  allProducts = signal<Product[]>([]);
  loading = signal(true);
  stockMap = signal<Record<number, number>>({});
  sidebarPromo = signal<Banner | null>(null);

  // Promociones rotativas en los filtros (cambian cada 10s con desvanecido)
  promoList = signal<Promotion[]>([]);
  promoIdx = signal(0);
  promoFade = signal(false);
  private promoTimer: any = null;
  currentPromotion = computed(() => {
    const l = this.promoList();
    return l.length ? l[this.promoIdx() % l.length] : null;
  });

  // ---- Filtros ----
  query = signal('');
  gender = signal<GenderKey>('all');
  selectedBrands = signal<Set<string>>(new Set());
  priceMin = signal<number | null>(null);
  priceMax = signal<number | null>(null);
  stockFilter = signal<StockKey>('all');
  // --- Filtros olfativos ---
  selectedFamilies = signal<Set<string>>(new Set());
  occasionFilter = signal<OccasionKey>('all');
  selectedSeasons = signal<Set<string>>(new Set());
  noteQuery = signal('');
  sort = signal<SortKey>('relevance');
  visibleCount = signal(24);
  showFilters = signal(false); // bottom-sheet móvil
  collapsedSections = signal<Set<string>>(new Set()); // secciones de filtro plegadas

  // Etiquetas para el template
  seasonOrder = SEASON_ORDER;
  seasonLabel = (s: string) => SEASON_LABEL[s] || s;

  ngOnInit() {
    this.api.getProducts({ onlyAvailable: true }).subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.api.getRetailStock().subscribe({
      next: (stock) => this.stockMap.set(stock || {}),
      error: () => {}
    });
    this.api.getPublicConfig().subscribe({
      next: (cfg) => {
        const promos = cfg.promos ?? [];
        if (promos.length) this.sidebarPromo.set(promos[0]);
      },
      error: () => {}
    });
    this.api.getActivePromotions().subscribe({
      next: (p) => { this.promoList.set(p); },
      error: () => {}
    });
    // Rotación cada 10s con desvanecido
    this.promoTimer = setInterval(() => {
      if (this.promoList().length < 2) return;
      this.promoFade.set(true);
      setTimeout(() => { this.promoIdx.update(v => v + 1); this.promoFade.set(false); }, 450);
    }, 10000);

    // Lee q / brand / category de la URL (buscador del header, banners, footer)
    this.route.queryParams.subscribe((params) => {
      this.query.set(params['q'] ?? '');
      const cat = params['category'];
      this.gender.set(cat === 'men' || cat === 'women' || cat === 'unisex' ? cat : 'all');
      if (params['brand']) this.selectedBrands.set(new Set([params['brand']]));
      if (params['family']) this.selectedFamilies.set(new Set([params['family']]));
    });

    try { (window as any).ttq?.track('ViewContent', { content_type: 'product_group', content_name: 'Catálogo', currency: 'PEN' }); } catch {}
    try { (window as any).fbq?.('track', 'ViewContent', { content_type: 'product_group', content_name: 'Catálogo', currency: 'PEN' }); } catch {}
  }

  ngOnDestroy() { if (this.promoTimer) clearInterval(this.promoTimer); }

  goPromoPage(id: number) { this.router.navigate(['/promocion', id]); }

  wholesaleProducts = computed(() =>
    this.allProducts().filter(p => p.wholesalePricePen && p.wholesalePricePen > 0)
  );

  private baseBrand = (b: string | null | undefined) => (b || '').split(' - ')[0].trim();

  brandFacets = computed(() => {
    const m = new Map<string, number>();
    for (const p of this.wholesaleProducts()) {
      const b = this.baseBrand(p.brand);
      if (!b || /^\d/.test(b)) continue;
      m.set(b, (m.get(b) || 0) + 1);
    }
    return [...m.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  });

  familyFacets = computed(() => {
    const m = new Map<string, number>();
    for (const p of this.wholesaleProducts()) {
      const f = p.olfactiveFamily;
      if (f) m.set(f, (m.get(f) || 0) + 1);
    }
    return FAMILY_ORDER
      .filter(f => m.has(f))
      .map(f => ({ code: f as FamilyCode, label: familyLabel(f), count: m.get(f)! }));
  });

  private productNoteText(p: Product): string {
    const slugs = [...parseNotes(p.notesTop), ...parseNotes(p.notesMiddle), ...parseNotes(p.notesBase)];
    return slugs.map(s => s + ' ' + noteLabel(s)).join(' ').toLowerCase();
  }

  filteredProducts = computed(() => {
    let list = this.wholesaleProducts();

    const q = this.query().toLowerCase().trim();
    if (q) {
      const tokens = q.split(/\s+/);
      list = list.filter(p => {
        const hay = `${p.name} ${p.brand} ${p.sku ?? ''} ${p.gtin ?? ''}`.toLowerCase();
        return tokens.every(t => hay.includes(t));
      });
    }

    const g = this.gender();
    if (g !== 'all') list = list.filter(p => p.category === g);

    const brands = this.selectedBrands();
    if (brands.size) list = list.filter(p => brands.has(this.baseBrand(p.brand)));

    const min = this.priceMin(), max = this.priceMax();
    if (min != null) list = list.filter(p => (p.wholesalePricePen || 0) >= min);
    if (max != null) list = list.filter(p => (p.wholesalePricePen || 0) <= max);

    const sf = this.stockFilter();
    if (sf === 'in') list = list.filter(p => this.isInStock(p.id));
    else if (sf === 'order') list = list.filter(p => !this.isInStock(p.id));

    const fams = this.selectedFamilies();
    if (fams.size) list = list.filter(p => p.olfactiveFamily != null && fams.has(p.olfactiveFamily));

    const occ = this.occasionFilter();
    if (occ !== 'all') list = list.filter(p => p.occasion === occ);

    const seasons = this.selectedSeasons();
    if (seasons.size) list = list.filter(p => {
      const ps = parseNotes(p.seasons);
      return ps.some(s => seasons.has(s));
    });

    const nq = this.noteQuery().toLowerCase().trim();
    if (nq) list = list.filter(p => this.productNoteText(p).includes(nq));

    list = [...list];
    switch (this.sort()) {
      case 'price-asc': list.sort((a, b) => (a.wholesalePricePen || 0) - (b.wholesalePricePen || 0)); break;
      case 'price-desc': list.sort((a, b) => (b.wholesalePricePen || 0) - (a.wholesalePricePen || 0)); break;
      case 'new': list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
    }
    return list;
  });

  displayed = computed(() => this.filteredProducts().slice(0, this.visibleCount()));
  resultsCount = computed(() => this.filteredProducts().length);
  canLoadMore = computed(() => this.visibleCount() < this.filteredProducts().length);
  activeFilterCount = computed(() =>
    (this.gender() !== 'all' ? 1 : 0) + this.selectedBrands().size +
    (this.priceMin() != null || this.priceMax() != null ? 1 : 0) +
    (this.stockFilter() !== 'all' ? 1 : 0) +
    this.selectedFamilies().size +
    (this.occasionFilter() !== 'all' ? 1 : 0) +
    this.selectedSeasons().size +
    (this.noteQuery().trim() ? 1 : 0)
  );

  // Reinicia el "ver más" cuando cambian los filtros
  private resetVisible = effect(() => {
    this.query(); this.gender(); this.selectedBrands();
    this.priceMin(); this.priceMax(); this.stockFilter();
    this.selectedFamilies(); this.occasionFilter(); this.selectedSeasons(); this.noteQuery();
    this.sort();
    this.visibleCount.set(24);
  });

  // Modo de compra según el filtro: "En stock" → STOCK (precio inmediato); resto → CONSOLIDADO.
  catalogMode = computed<'CONSOLIDADO' | 'STOCK'>(() => this.stockFilter() === 'in' ? 'STOCK' : 'CONSOLIDADO');

  isInStock(id: number): boolean {
    return (this.stockMap()[id] || 0) > 0;
  }
  stockQtyFor(id: number): number {
    return this.stockMap()[id] || 0;
  }

  onSearchInput(ev: Event) {
    const q = (ev.target as HTMLInputElement).value;
    this.query.set(q);
    if (q.length >= 3) {
      try { (window as any).ttq?.track('Search', { query: q, content_type: 'product' }); } catch {}
      try { (window as any).fbq?.('track', 'Search', { search_string: q, content_type: 'product' }); } catch {}
    }
  }

  toggleBrand(brand: string) {
    const next = new Set(this.selectedBrands());
    next.has(brand) ? next.delete(brand) : next.add(brand);
    this.selectedBrands.set(next);
  }

  setGender(g: GenderKey) { this.gender.set(g); }
  setStock(s: StockKey) { this.stockFilter.set(s); }

  toggleFamily(code: string) {
    const next = new Set(this.selectedFamilies());
    next.has(code) ? next.delete(code) : next.add(code);
    this.selectedFamilies.set(next);
  }
  setOccasion(o: OccasionKey) { this.occasionFilter.set(this.occasionFilter() === o ? 'all' : o); }
  toggleSeason(s: string) {
    const next = new Set(this.selectedSeasons());
    next.has(s) ? next.delete(s) : next.add(s);
    this.selectedSeasons.set(next);
  }
  onNoteInput(ev: Event) { this.noteQuery.set((ev.target as HTMLInputElement).value); }

  isOpen(key: string): boolean { return !this.collapsedSections().has(key); }
  toggleSection(key: string) {
    const next = new Set(this.collapsedSections());
    next.has(key) ? next.delete(key) : next.add(key);
    this.collapsedSections.set(next);
  }

  setSort(ev: Event) { this.sort.set((ev.target as HTMLSelectElement).value as SortKey); }
  setPriceMin(ev: Event) { const v = (ev.target as HTMLInputElement).value; this.priceMin.set(v ? +v : null); }
  setPriceMax(ev: Event) { const v = (ev.target as HTMLInputElement).value; this.priceMax.set(v ? +v : null); }

  clearFilters() {
    this.query.set('');
    this.gender.set('all');
    this.selectedBrands.set(new Set());
    this.priceMin.set(null);
    this.priceMax.set(null);
    this.stockFilter.set('all');
    this.selectedFamilies.set(new Set());
    this.occasionFilter.set('all');
    this.selectedSeasons.set(new Set());
    this.noteQuery.set('');
    this.router.navigate(['/catalogo']);
  }

  loadMore() { this.visibleCount.update(n => n + 24); }
  toggleFilters() { this.showFilters.update(v => !v); }

  // =====================================================================
  // ===== EDIT ORDER MODAL (cliente edita su pedido por código+teléfono)
  // ===== Lógica preservada del catálogo original.
  // =====================================================================
  showEditModal = signal(false);
  editStep = signal<'lookup' | 'edit' | 'done'>('lookup');
  editOrderCode = signal('');
  editOrderPhone = signal('');
  editOrder = signal<Order | null>(null);
  editItems = signal<{ productId: number; product: Product; quantity: number; unitPrice: number }[]>([]);
  editError = signal('');
  editLoading = signal(false);
  editMessage = signal('');
  editOldUnits = signal(0);

  editSwapIndex = signal<number | null>(null);
  editPickerSearch = signal('');
  editPickerMode = signal<'swap' | 'add' | null>(null);
  editAddSearch = signal('');

  editTotalUnits = computed(() => this.editItems().reduce((sum, i) => sum + i.quantity, 0));
  editNewTotal = computed(() => this.editItems().reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  editCorrectDeposit = computed(() => this.editTotalUnits() * 20);
  editExtraUnits = computed(() => Math.max(0, this.editTotalUnits() - this.editOldUnits()));
  editExtraDeposit = computed(() => this.editExtraUnits() * 20);
  editTotalDeposit = computed(() => this.editCorrectDeposit());
  editRemaining = computed(() => this.editNewTotal() - this.editTotalDeposit());

  editAvailableProducts = computed(() => {
    const currentIds = new Set(this.editItems().map(i => i.productId));
    const search = this.editAddSearch().toLowerCase().trim();
    let products = this.wholesaleProducts().filter(p => !currentIds.has(p.id));
    if (search) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search)
      );
    }
    return products;
  });

  editSwapProducts = computed(() => {
    const swapIdx = this.editSwapIndex();
    const items = this.editItems();
    const excludeIds = new Set(items.filter((_, i) => i !== swapIdx).map(i => i.productId));
    const search = this.editPickerSearch().toLowerCase().trim();
    let products = this.wholesaleProducts().filter(p => !excludeIds.has(p.id));
    if (search) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search)
      );
    }
    return products;
  });

  openEditModal() {
    this.showEditModal.set(true);
    this.editStep.set('lookup');
    this.editOrderCode.set('');
    this.editOrderPhone.set('');
    this.editOrder.set(null);
    this.editItems.set([]);
    this.editError.set('');
    this.editMessage.set('');
    this.editSwapIndex.set(null);
    this.editPickerMode.set(null);
    this.editPickerSearch.set('');
    this.editAddSearch.set('');
  }

  closeEditModal() { this.showEditModal.set(false); }

  onEditCodeInput(event: Event) { this.editOrderCode.set((event.target as HTMLInputElement).value); }
  onEditPhoneInput(event: Event) { this.editOrderPhone.set((event.target as HTMLInputElement).value); }

  lookupOrder() {
    const code = this.editOrderCode().trim().toUpperCase();
    const phone = this.editOrderPhone().replace(/\s+/g, '').trim();
    if (!code || !phone) {
      this.editError.set('Ingresa tu código de pedido y número de celular.');
      return;
    }
    this.editError.set('');
    this.editLoading.set(true);

    this.api.getOrderByCode(code).subscribe({
      next: (order) => {
        if (order.clientPhone.replace(/\s+/g, '') !== phone) {
          this.editError.set('El número de celular no coincide con este pedido.');
          this.editLoading.set(false);
          return;
        }
        this.editOrder.set(order);
        this.editOldUnits.set(order.items.reduce((sum, i) => sum + i.quantity, 0));
        this.editItems.set(order.items.map(i => ({
          productId: i.product.id,
          product: i.product,
          quantity: i.quantity,
          unitPrice: i.unitPricePen
        })));
        this.editStep.set('edit');
        this.editLoading.set(false);
      },
      error: () => {
        this.editError.set('No se encontró un pedido con ese código.');
        this.editLoading.set(false);
      }
    });
  }

  editChangeItemQty(index: number, delta: number) {
    this.editItems.update(items => {
      const copy = [...items];
      copy[index] = { ...copy[index], quantity: Math.max(1, copy[index].quantity + delta) };
      return copy;
    });
  }

  editRemoveItem(index: number) {
    this.editItems.update(items => items.filter((_, i) => i !== index));
  }

  openSwapPicker(index: number) {
    this.editSwapIndex.set(index);
    this.editPickerMode.set('swap');
    this.editPickerSearch.set('');
  }

  closeSwapPicker() {
    this.editSwapIndex.set(null);
    this.editPickerMode.set(null);
    this.editPickerSearch.set('');
  }

  editSwapProduct(product: Product) {
    const idx = this.editSwapIndex();
    if (idx === null) return;
    const price = product.wholesalePricePen ?? 0;
    this.editItems.update(items => {
      const copy = [...items];
      copy[idx] = { ...copy[idx], productId: product.id, product, unitPrice: price };
      return copy;
    });
    this.closeSwapPicker();
  }

  editAddProduct(product: Product) {
    const price = product.wholesalePricePen ?? 0;
    this.editItems.update(items => [...items, {
      productId: product.id,
      product,
      quantity: 1,
      unitPrice: price
    }]);
  }

  onEditPickerSearch(event: Event) { this.editPickerSearch.set((event.target as HTMLInputElement).value); }
  onEditAddSearch(event: Event) { this.editAddSearch.set((event.target as HTMLInputElement).value); }

  editSave() {
    const items = this.editItems();
    if (items.length === 0) {
      this.editError.set('El pedido debe tener al menos un producto.');
      return;
    }
    this.editError.set('');
    this.editLoading.set(true);

    const request = {
      clientName: this.editOrder()!.clientName,
      clientPhone: this.editOrderPhone().replace(/\s+/g, ''),
      existingOrderCode: this.editOrderCode().trim().toUpperCase(),
      items: items.map(i => ({ productId: i.productId, quantity: i.quantity, unitPricePen: i.unitPrice }))
    };

    this.api.editOrderByClient(request).subscribe({
      next: (order) => {
        this.editOrder.set(order);
        this.editStep.set('done');
        this.editLoading.set(false);
        if (this.editExtraUnits() > 0) {
          this.editMessage.set(`Pedido actualizado. Debes pagar S/ ${this.editExtraDeposit().toFixed(2)} adicional de adelanto por las ${this.editExtraUnits()} unidades nuevas.`);
        } else {
          this.editMessage.set('Pedido actualizado correctamente. No hay adelanto adicional.');
        }
      },
      error: (err) => {
        this.editError.set(err.error?.message || 'Error al guardar los cambios.');
        this.editLoading.set(false);
      }
    });
  }
}
