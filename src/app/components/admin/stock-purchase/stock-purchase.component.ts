import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Product, BreakdownSection } from '../../../models/api.models';

@Component({
  selector: 'app-stock-purchase',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './stock-purchase.component.html',
  styleUrl: './stock-purchase.component.css'
})
export class StockPurchaseComponent implements OnInit {
  private api = inject(ApiService);

  products = signal<Product[]>([]);
  search = signal('');
  cart = signal<Map<number, { product: Product; quantity: number }>>(new Map());
  preview = signal<BreakdownSection | null>(null);
  message = signal('');
  loading = signal(false);
  exchangeRate = signal(3.75);
  courierCostPerKg = signal(7);

  ngOnInit() {
    this.loadProducts();
    this.api.getConfig().subscribe(configs => {
      for (const c of configs) {
        if (c.configKey === 'exchange_rate') this.exchangeRate.set(+c.configValue);
        if (c.configKey === 'courier_cost_per_kg') this.courierCostPerKg.set(+c.configValue);
      }
    });
  }

  loadProducts() {
    this.api.getProducts().subscribe(p => this.products.set(p));
  }

  landedCostPen(p: Product): number {
    const shippingUsd = ((p.weightG || 0) / 1000) * this.courierCostPerKg();
    return (p.priceUsd + shippingUsd) * this.exchangeRate();
  }

  filteredProducts() {
    const q = this.search().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }

  onSearchInput(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  getCartQty(productId: number): number {
    return this.cart().get(productId)?.quantity ?? 0;
  }

  updateQty(product: Product, event: Event) {
    const qty = +(event.target as HTMLInputElement).value;
    const map = new Map(this.cart());
    if (qty <= 0) {
      map.delete(product.id);
    } else {
      map.set(product.id, { product, quantity: qty });
    }
    this.cart.set(map);
    this.preview.set(null);
  }

  addToCart(product: Product) {
    const map = new Map(this.cart());
    const existing = map.get(product.id);
    map.set(product.id, { product, quantity: (existing?.quantity ?? 0) + 1 });
    this.cart.set(map);
    this.preview.set(null);
  }

  removeFromCart(productId: number) {
    const map = new Map(this.cart());
    map.delete(productId);
    this.cart.set(map);
    this.preview.set(null);
  }

  cartItems() {
    return Array.from(this.cart().values());
  }

  cartTotal() {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  previewPurchase() {
    const items = this.cartItems().map(i => ({ productId: i.product.id, quantity: i.quantity }));
    if (!items.length) return;
    this.loading.set(true);
    this.api.previewStockPurchase({ items }).subscribe({
      next: p => { this.preview.set(p); this.loading.set(false); },
      error: () => { this.message.set('Error al calcular preview'); this.loading.set(false); }
    });
  }

  confirmPurchase() {
    const items = this.cartItems().map(i => ({ productId: i.product.id, quantity: i.quantity }));
    if (!items.length) return;
    this.loading.set(true);
    this.api.createStockPurchase({ items }).subscribe({
      next: () => {
        this.message.set('Compra registrada exitosamente');
        this.cart.set(new Map());
        this.preview.set(null);
        this.loading.set(false);
        setTimeout(() => this.message.set(''), 4000);
      },
      error: () => { this.message.set('Error al registrar compra'); this.loading.set(false); }
    });
  }
}
