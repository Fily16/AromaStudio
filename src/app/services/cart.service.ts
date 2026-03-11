import { Injectable, signal, computed } from '@angular/core';
import { CartItem, Product } from '../models/api.models';

export type CatalogType = 'CONSOLIDADO' | 'RETAIL' | 'WHOLESALE' | null;

@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<CartItem[]>([]);

  // Nuevo: Guardamos el tipo de catálogo actual
  readonly catalogType = signal<CatalogType>(null);

  readonly cartItems = this.items.asReadonly();
  readonly itemCount = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  readonly totalPen = computed(() => this.items().reduce((sum, i) => sum + (i.unitPricePen * i.quantity), 0));
  readonly isEmpty = computed(() => this.items().length === 0);

  // Modificado: Recibe el tipo de catálogo desde donde se está agregando
  addItem(product: Product, quantity: number = 1, type: CatalogType = 'RETAIL') {
    // Si cambia el tipo de catálogo, limpiamos el carrito para no mezclar peras con manzanas
    if (this.catalogType() !== type && this.items().length > 0) {
      if(confirm('¿Deseas vaciar el carrito actual para agregar productos de otro catálogo?')) {
        this.clear();
      } else {
        return; // Cancela la acción si el usuario no quiere vaciar
      }
    }

    this.catalogType.set(type);
    const current = this.items();
    const existing = current.find(i => i.product.id === product.id);

    // Asignar precio según el catálogo
    let unitPrice = 0;
    if (type === 'RETAIL') {
      unitPrice = product.retailPricePen ?? 0;
    } else {
      // Para WHOLESALE y CONSOLIDADO usamos el precio al por mayor
      unitPrice = product.wholesalePricePen ?? 0;
    }

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
    if (this.items().length === 0) {
      this.catalogType.set(null); // Resetea el tipo si se vacía
    }
  }

  clear() {
    this.items.set([]);
    this.catalogType.set(null);
  }

  getOrderItems() {
    return this.items().map(i => ({
      productId: i.product.id,
      quantity: i.quantity,
      unitPricePen: i.unitPricePen
    }));
  }
}
