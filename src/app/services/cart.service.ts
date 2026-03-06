import { Injectable, signal, computed } from '@angular/core';
import { CartItem, Product } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<CartItem[]>([]);

  readonly cartItems = this.items.asReadonly();
  readonly itemCount = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  readonly totalPen = computed(() => this.items().reduce((sum, i) => sum + (i.unitPricePen * i.quantity), 0));
  readonly isEmpty = computed(() => this.items().length === 0);

  addItem(product: Product, quantity: number = 1) {
    const current = this.items();
    const existing = current.find(i => i.product.id === product.id);

    const unitPrice = product.wholesalePricePen ?? product.retailPricePen ?? 0;

    if (existing) {
      this.items.set(current.map(i =>
        i.product.id === product.id
          ? { ...i, quantity: i.quantity + quantity }
          : i
      ));
    } else {
      this.items.set([...current, { product, quantity, unitPricePen: unitPrice }]);
    }
  }

  updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this.items.set(this.items().map(i =>
      i.product.id === productId ? { ...i, quantity } : i
    ));
  }

  removeItem(productId: number) {
    this.items.set(this.items().filter(i => i.product.id !== productId));
  }

  clear() {
    this.items.set([]);
  }

  getOrderItems() {
    return this.items().map(i => ({
      productId: i.product.id,
      quantity: i.quantity,
      unitPricePen: i.unitPricePen
    }));
  }
}
