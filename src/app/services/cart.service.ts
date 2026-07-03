import { Injectable, signal, computed } from '@angular/core';
import { CartItem, PromoCartItem, Product, Promotion } from '../models/api.models';

// Canal de compra: CONSOLIDADO (por encargo, +20) o STOCK (entrega inmediata, +35).
// Las promociones (packs) son compatibles con STOCK (entrega inmediata), nunca con CONSOLIDADO.
export type CatalogType = 'CONSOLIDADO' | 'STOCK' | null;

@Injectable({ providedIn: 'root' })
export class CartService {
  private items = signal<CartItem[]>([]);
  private promos = signal<PromoCartItem[]>([]);

  // Tipo de catálogo actual del carrito
  readonly catalogType = signal<CatalogType>(null);

  readonly cartItems = this.items.asReadonly();
  readonly promoItems = this.promos.asReadonly();

  readonly itemCount = computed(() =>
    this.items().reduce((sum, i) => sum + i.quantity, 0) +
    this.promos().reduce((sum, p) => sum + p.quantity, 0));

  readonly totalPen = computed(() =>
    this.items().reduce((sum, i) => sum + (i.unitPricePen * i.quantity), 0) +
    this.promos().reduce((sum, p) => sum + (p.promo.pricePen * p.quantity), 0));

  readonly isEmpty = computed(() => this.items().length === 0 && this.promos().length === 0);

  readonly hasPromos = computed(() => this.promos().length > 0);

  /**
   * Agrega un PRODUCTO al carrito con un CANAL explícito (CONSOLIDADO o STOCK) y su precio.
   * - No se pueden mezclar canales de producto (stock + consolidado).
   * - No se puede agregar CONSOLIDADO si el carrito tiene promociones (packs = entrega inmediata).
   * Devuelve false si la operación se bloquea (el componente muestra un aviso).
   */
  addItem(product: Product, quantity: number = 1, channel: 'CONSOLIDADO' | 'STOCK' = 'CONSOLIDADO', unitPrice: number = 0): boolean {
    const current = this.items();
    // Bloquear consolidado cuando hay promos en el carrito
    if (channel === 'CONSOLIDADO' && this.promos().length > 0) {
      return false;
    }
    // Bloquear mezcla de canales de producto
    if (current.length > 0 && this.catalogType() !== null && this.catalogType() !== channel) {
      return false;
    }
    this.catalogType.set(channel);
    const existing = current.find(i => i.product.id === product.id);
    if (existing) {
      this.items.set(current.map(i =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
      ));
    } else {
      this.items.set([...current, { product, quantity, unitPricePen: unitPrice }]);
    }
    return true;
  }

  /**
   * Agrega una PROMOCIÓN (pack) al carrito. Compatible con STOCK y otras promos, nunca con CONSOLIDADO.
   * Respeta el stock propio de la promo. Devuelve false si se bloquea.
   */
  addPromo(promo: Promotion, quantity: number = 1): boolean {
    if (this.catalogType() === 'CONSOLIDADO') {
      return false; // no mezclar packs con pedidos por encargo
    }
    const current = this.promos();
    const existing = current.find(p => p.promo.id === promo.id);
    const currentQty = existing ? existing.quantity : 0;
    const maxQty = promo.stockQty ?? 0;
    if (currentQty + quantity > maxQty) {
      // topar al stock disponible
      quantity = Math.max(0, maxQty - currentQty);
      if (quantity === 0) return false;
    }
    this.catalogType.set('STOCK'); // las promos van por el canal de entrega inmediata
    if (existing) {
      this.promos.set(current.map(p =>
        p.promo.id === promo.id ? { ...p, quantity: p.quantity + quantity } : p
      ));
    } else {
      this.promos.set([...current, { promo, quantity }]);
    }
    return true;
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

  updatePromoQuantity(promoId: number, quantity: number) {
    if (quantity <= 0) {
      this.removePromo(promoId);
      return;
    }
    this.promos.set(this.promos().map(p =>
      p.promo.id === promoId ? { ...p, quantity: Math.min(quantity, p.promo.stockQty ?? quantity) } : p
    ));
  }

  removeItem(productId: number) {
    this.items.set(this.items().filter(i => i.product.id !== productId));
    this.resetTypeIfEmpty();
  }

  removePromo(promoId: number) {
    this.promos.set(this.promos().filter(p => p.promo.id !== promoId));
    this.resetTypeIfEmpty();
  }

  private resetTypeIfEmpty() {
    if (this.items().length === 0 && this.promos().length === 0) {
      this.catalogType.set(null);
    } else if (this.items().length === 0 && this.promos().length > 0) {
      this.catalogType.set('STOCK');
    }
  }

  clear() {
    this.items.set([]);
    this.promos.set([]);
    this.catalogType.set(null);
  }

  getOrderItems() {
    return this.items().map(i => ({
      productId: i.product.id,
      quantity: i.quantity,
      unitPricePen: i.unitPricePen
    }));
  }

  getPromoLines() {
    return this.promos().map(p => ({
      promotionId: p.promo.id,
      quantity: p.quantity
    }));
  }
}
