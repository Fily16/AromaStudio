import { Component, computed, inject, signal, OnInit, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Product, Order } from '../../models/api.models';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  cart = inject(CartService);

  allProducts = signal<Product[]>([]);
  loading = signal(true);

  searchQuery = signal('');
  brandFilter = signal('Todos');
  currentPage = signal(1);
  itemsPerPage = 15;

  cartToast = signal('');
  selectedQty = signal<Record<number, number>>({});

  ngOnInit() {
    this.api.getProducts({ onlyAvailable: true }).subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    try {
      (window as any).ttq?.track('ViewContent', {
        content_type: 'product_group',
        content_name: 'Catálogo',
        currency: 'PEN'
      });
    } catch {}
    try {
      (window as any).fbq?.('track', 'ViewContent', {
        content_type: 'product_group',
        content_name: 'Catálogo',
        currency: 'PEN'
      });
    } catch {}
  }

  wholesaleProducts = computed(() => {
    return this.allProducts().filter(p => p.wholesalePricePen && p.wholesalePricePen > 0);
  });

  brands = computed(() => {
    const brandSet = [...new Set(this.wholesaleProducts().map(p => p.brand))];
    return ['Todos', ...brandSet.sort()];
  });

  filteredProducts = computed(() => {
    let products = [...this.wholesaleProducts()];
    const query = this.searchQuery().toLowerCase().trim();
    const brand = this.brandFilter();
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

  totalPages = computed(() =>
    Math.ceil(this.filteredProducts().length / this.itemsPerPage)
  );

  paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredProducts().slice(start, start + this.itemsPerPage);
  });

  resultsCount = computed(() => this.filteredProducts().length);

  private resetPage = effect(() => {
    this.searchQuery();
    this.brandFilter();
    this.currentPage.set(1);
  });

  onSearchChange(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    if (query.length >= 3) {
      try { (window as any).ttq?.track('Search', { query, content_type: 'product' }); } catch {}
      try { (window as any).fbq?.('track', 'Search', { search_string: query, content_type: 'product' }); } catch {}
    }
  }

  onBrandChange(brand: string) {
    this.brandFilter.set(brand);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
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

  goToProduct(id: number) {
    this.router.navigate(['/producto', id]);
  }

  getQty(productId: number): number {
    return this.selectedQty()[productId] ?? 1;
  }

  changeQty(productId: number, delta: number) {
    const next = Math.max(1, this.getQty(productId) + delta);
    this.selectedQty.update(q => ({ ...q, [productId]: next }));
  }

  addToCart(product: Product) {
    const qty = this.getQty(product.id);
    if (!product.wholesalePricePen) return;
    this.cart.addItem(product, qty, 'CONSOLIDADO');

    try {
      (window as any).ttq?.track('AddToCart', {
        content_id: product.id.toString(),
        content_name: `${product.brand} - ${product.name}`,
        content_type: 'product',
        quantity: qty,
        price: product.wholesalePricePen,
        value: product.wholesalePricePen * qty,
        currency: 'PEN'
      });
    } catch {}
    try {
      (window as any).fbq?.('track', 'AddToCart', {
        content_ids: [product.id.toString()],
        content_name: `${product.brand} - ${product.name}`,
        content_type: 'product',
        value: product.wholesalePricePen * qty,
        currency: 'PEN'
      });
    } catch {}

    this.cartToast.set(`${product.brand} - ${product.name} (x${qty}) agregado`);
    setTimeout(() => this.cartToast.set(''), 2500);
    this.selectedQty.update(q => ({ ...q, [product.id]: 1 }));
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  trackWhatsAppContact(event: Event) {
    event.preventDefault();
    try { (window as any).ttq?.track('Contact', { content_type: 'product', content_name: 'WhatsApp FAB' }); } catch {}
    try { (window as any).fbq?.('track', 'Contact', { content_name: 'WhatsApp FAB' }); } catch {}
    setTimeout(() => { window.open('https://wa.me/51981587009', '_blank'); }, 300);
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
