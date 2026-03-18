import { Component, computed, inject, signal, AfterViewInit, OnDestroy, OnInit, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Product, Order } from '../../models/api.models';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  private platformId = inject(PLATFORM_ID);
  cart = inject(CartService);
  private router = inject(Router);

  currentView = signal<'landing' | 'retail' | 'wholesale' | 'mayor'>('retail');

  // All products from API
  allProducts = signal<Product[]>([]);
  retailStock = signal<Record<number, number>>({});
  loading = signal(true);

  // Retail filters
  searchQuery = signal('');
  selectedCategory = signal<'all' | 'men' | 'women' | 'unisex'>('all');
  sortBy = signal<'name' | 'price-asc' | 'price-desc' | 'brand'>('name');

  // Wholesale filters
  wholesaleSearch = signal('');
  wholesalePage = signal(1);
  wholesaleItemsPerPage = 15;
  wholesaleBrandFilter = signal('Todos');

  // Por Mayor filters
  mayorSearch = signal('');
  mayorCategory = signal<'all' | 'men' | 'women' | 'unisex'>('all');
  mayorSortBy = signal<'name' | 'price-asc' | 'price-desc' | 'brand'>('name');

  // Cart toast
  cartToast = signal('');

  // Quantity selector per product
  selectedQty = signal<Record<number, number>>({});

  ngOnInit() {
    this.api.getProducts({ onlyAvailable: true }).subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.api.getRetailStock().subscribe({
      next: (stock) => this.retailStock.set(stock),
      error: () => {} // silently ignore if endpoint not available
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initScrollAnimations(), 100);
    }
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(st => st.kill());
  }

  private initScrollAnimations(): void {
    if (this.currentView() === 'landing') {
      gsap.from('.landing-logo', { y: 40, opacity: 0, duration: 1, ease: 'power3.out' });
      gsap.from('.landing-tagline', { y: 30, opacity: 0, duration: 1, delay: 0.2, ease: 'power3.out' });
      gsap.from('.landing-buttons', { y: 30, opacity: 0, duration: 1, delay: 0.4, ease: 'power3.out' });
    }
  }

  initCatalogAnimations(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      gsap.from('.section-header', { y: -30, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.from('.filters-section, .wholesale-filters', { y: 20, opacity: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' });
      gsap.utils.toArray<HTMLElement>('.perfume-card-wrapper, .wholesale-card').forEach((card, i) => {
        gsap.from(card, {
          y: 60, opacity: 0, duration: 0.8, delay: i * 0.05, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' }
        });
      });
    }, 100);
  }

  setView(view: 'landing' | 'retail' | 'wholesale' | 'mayor'): void {
    this.currentView.set(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view !== 'landing') {
      ScrollTrigger.getAll().forEach(st => st.kill());
      this.initCatalogAnimations();
    }
  }

  // === Retail products (only those with actual stock) ===
  retailProducts = computed(() => {
    const stock = this.retailStock();
    return this.allProducts().filter(p =>
      p.retailPricePen && p.retailPricePen > 0 && (stock[p.id] ?? 0) > 0
    );
  });

  getStock(productId: number): number {
    return this.retailStock()[productId] ?? 0;
  }

  filteredRetailProducts = computed(() => {
    let products = [...this.retailProducts()];
    const query = this.searchQuery().toLowerCase();
    if (query) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query)
      );
    }
    const category = this.selectedCategory();
    if (category !== 'all') {
      products = products.filter(p => p.category === category);
    }
    const sort = this.sortBy();
    switch (sort) {
      case 'name': products.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'price-asc': products.sort((a, b) => (a.retailPricePen ?? 0) - (b.retailPricePen ?? 0)); break;
      case 'price-desc': products.sort((a, b) => (b.retailPricePen ?? 0) - (a.retailPricePen ?? 0)); break;
      case 'brand': products.sort((a, b) => a.brand.localeCompare(b.brand)); break;
    }
    return products;
  });

  retailCount = computed(() => this.filteredRetailProducts().length);

  // === Wholesale products ===
  wholesaleProducts = computed(() => {
    return this.allProducts().filter(p => p.wholesalePricePen && p.wholesalePricePen > 0);
  });

  wholesaleBrands = computed(() => {
    const brands = [...new Set(this.wholesaleProducts().map(p => p.brand))];
    return ['Todos', ...brands.sort()];
  });

  filteredWholesaleProducts = computed(() => {
    let products = [...this.wholesaleProducts()];
    const query = this.wholesaleSearch().toLowerCase().trim();
    const brand = this.wholesaleBrandFilter();
    if (query) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query)
      );
    }
    if (brand !== 'Todos') {
      products = products.filter(p => p.brand === brand);
    }
    return products;
  });

  wholesaleTotalPages = computed(() =>
    Math.ceil(this.filteredWholesaleProducts().length / this.wholesaleItemsPerPage)
  );

  paginatedWholesaleProducts = computed(() => {
    const start = (this.wholesalePage() - 1) * this.wholesaleItemsPerPage;
    return this.filteredWholesaleProducts().slice(start, start + this.wholesaleItemsPerPage);
  });

  wholesaleResultsCount = computed(() => this.filteredWholesaleProducts().length);

  // === Por Mayor products (same stock as retail, mayor prices) ===
  mayorProducts = computed(() => {
    const stock = this.retailStock();
    return this.allProducts().filter(p =>
      p.mayorPricePen && p.mayorPricePen > 0 && (stock[p.id] ?? 0) > 0
    );
  });

  filteredMayorProducts = computed(() => {
    let products = [...this.mayorProducts()];
    const query = this.mayorSearch().toLowerCase();
    if (query) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query)
      );
    }
    const category = this.mayorCategory();
    if (category !== 'all') {
      products = products.filter(p => p.category === category);
    }
    const sort = this.mayorSortBy();
    switch (sort) {
      case 'name': products.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'price-asc': products.sort((a, b) => (a.mayorPricePen ?? 0) - (b.mayorPricePen ?? 0)); break;
      case 'price-desc': products.sort((a, b) => (b.mayorPricePen ?? 0) - (a.mayorPricePen ?? 0)); break;
      case 'brand': products.sort((a, b) => a.brand.localeCompare(b.brand)); break;
    }
    return products;
  });

  mayorCount = computed(() => this.filteredMayorProducts().length);

  private searchEffect = effect(() => {
    this.wholesaleSearch();
    this.wholesaleBrandFilter();
    this.wholesalePage.set(1);
  });

  // === Categories & sorting ===
  categories = [
    { value: 'all', label: 'Todos' },
    { value: 'men', label: 'Hombre' },
    { value: 'women', label: 'Mujer' },
    { value: 'unisex', label: 'Unisex' }
  ];

  sortOptions = [
    { value: 'name', label: 'Nombre A-Z' },
    { value: 'price-asc', label: 'Precio: Menor a Mayor' },
    { value: 'price-desc', label: 'Precio: Mayor a Menor' },
    { value: 'brand', label: 'Marca' }
  ];

  // === Event handlers ===
  onSearchChange(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onCategoryChange(category: 'all' | 'men' | 'women' | 'unisex'): void {
    this.selectedCategory.set(category);
  }

  onSortChange(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as any);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.sortBy.set('name');
  }

  // Mayor event handlers
  onMayorSearchChange(event: Event): void {
    this.mayorSearch.set((event.target as HTMLInputElement).value);
  }

  onMayorCategoryChange(category: 'all' | 'men' | 'women' | 'unisex'): void {
    this.mayorCategory.set(category);
  }

  onMayorSortChange(event: Event): void {
    this.mayorSortBy.set((event.target as HTMLSelectElement).value as any);
  }

  clearMayorFilters(): void {
    this.mayorSearch.set('');
    this.mayorCategory.set('all');
    this.mayorSortBy.set('name');
  }

  getMayorWhatsAppLink(product: Product): string {
    const message = `¡Hola! Estoy interesado/a en compra por mayor:\n\n${product.brand} - ${product.name} ${product.ml}ml\nPrecio por mayor: S/ ${product.mayorPricePen}\n\n¿Cuál es la cantidad mínima y el proceso de compra?`;
    return `https://wa.me/51903250695?text=${encodeURIComponent(message)}`;
  }

  onWholesaleSearchChange(event: Event): void {
    this.wholesaleSearch.set((event.target as HTMLInputElement).value);
  }

  onWholesaleBrandChange(brand: string): void {
    this.wholesaleBrandFilter.set(brand);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.wholesaleTotalPages()) {
      this.wholesalePage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const total = this.wholesaleTotalPages();
    const current = this.wholesalePage();
    const pages: number[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1);
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  // === Quantity selector ===
  getQty(productId: number): number {
    return this.selectedQty()[productId] ?? 1;
  }

  changeQty(productId: number, delta: number): void {
    const current = this.getQty(productId);
    const next = Math.max(1, current + delta);
    this.selectedQty.update(q => ({ ...q, [productId]: next }));
  }

  addToCartWithQty(product: Product, priceType: 'wholesale' | 'retail' | 'mayor'): void {
    const qty = this.getQty(product.id);
    const price = priceType === 'wholesale' ? product.wholesalePricePen : priceType === 'mayor' ? product.mayorPricePen : product.retailPricePen;
    if (!price) return;
    const cartProduct = { ...product, wholesalePricePen: price, retailPricePen: price };

    // AQUÍ ESTÁ LA MAGIA: Traducimos tu "priceType" al "CatalogType" del servicio
    let catalogType: 'CONSOLIDADO' | 'RETAIL' | 'WHOLESALE' = 'RETAIL';
    if (priceType === 'wholesale') catalogType = 'CONSOLIDADO';
    if (priceType === 'mayor') catalogType = 'WHOLESALE';
    if (priceType === 'retail') catalogType = 'RETAIL';

    // Ahora enviamos el catalogType como tercer parámetro
    this.cart.addItem(cartProduct, qty, catalogType);

    this.cartToast.set(`${product.brand} - ${product.name} (x${qty}) agregado`);
    setTimeout(() => this.cartToast.set(''), 2500);
    // Reset qty to 1 after adding
    this.selectedQty.update(q => ({ ...q, [product.id]: 1 }));
  }

  // === Cart ===
  // === Cart ===
  addToCart(product: Product, priceType: 'wholesale' | 'retail'): void {
    const price = priceType === 'wholesale' ? product.wholesalePricePen : product.retailPricePen;
    if (!price) return;

    // Lo mismo aquí para el botón sin cantidad
    let catalogType: 'CONSOLIDADO' | 'RETAIL' | 'WHOLESALE' = 'RETAIL';
    if (priceType === 'wholesale') catalogType = 'CONSOLIDADO';

    const cartProduct = { ...product, wholesalePricePen: price, retailPricePen: price };

    // Enviamos el catalogType
    this.cart.addItem(cartProduct, 1, catalogType);

    this.cartToast.set(`${product.brand} - ${product.name} agregado`);
    setTimeout(() => this.cartToast.set(''), 2500);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  // === WhatsApp ===
  getWhatsAppLink(product: Product, priceType: 'wholesale' | 'retail'): string {
    const price = priceType === 'wholesale' ? product.wholesalePricePen : product.retailPricePen;
    const message = `¡Hola! Me interesa:\n\n${product.brand} - ${product.name} ${product.ml}ml\nPrecio: S/ ${price}\n\n¿Tienen disponibilidad?`;
    return `https://wa.me/51903250695?text=${encodeURIComponent(message)}`;
  }

  getRetailWhatsAppLink(product: Product): string {
    const message = `¡Hola! Estoy interesado/a en:\n\n${product.brand} - ${product.name} ${product.ml}ml\nPrecio: S/ ${product.retailPricePen}\n\n¿Tienen disponibilidad? ¿Cuál es el proceso para realizar la compra?`;
    return `https://wa.me/51903250695?text=${encodeURIComponent(message)}`;
  }

  // === Edit Order Modal ===
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

  // Swap picker state
  editSwapIndex = signal<number | null>(null);
  editPickerSearch = signal('');
  editPickerMode = signal<'swap' | 'add' | null>(null);

  // Add product search
  editAddSearch = signal('');

  editTotalUnits = computed(() => this.editItems().reduce((sum, i) => sum + i.quantity, 0));
  editNewTotal = computed(() => this.editItems().reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  editExtraUnits = computed(() => Math.max(0, this.editTotalUnits() - this.editOldUnits()));
  editExtraDeposit = computed(() => this.editExtraUnits() * 20);
  editCurrentDeposit = computed(() => {
    const order = this.editOrder();
    return order ? (order.depositAmountPen || 0) : 0;
  });
  editTotalDeposit = computed(() => this.editCurrentDeposit() + this.editExtraDeposit());
  editRemaining = computed(() => this.editNewTotal() - this.editTotalDeposit());

  // Products available for adding (not already in the order)
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

  // Products for swap picker (excludes current items except the one being swapped)
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

  // Open swap picker for a specific item
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

  // Swap item at index with new product
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

  // Add product from picker
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
      clientPhone: this.editOrderPhone(),
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
