import { Component, computed, effect, inject, signal, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ApiService } from '../../services/api.service';
import { DecimalPipe } from '@angular/common';
import { Product, Banner, Promotion } from '../../models/api.models';
import { ProductCardComponent } from '../shared/product-card.component';
import { CdnImgPipe } from '../../shared/cdn-img.pipe';
import { SHALOM_AGENCIES, SHALOM_DEPARTMENTS, ShalomAgency } from '../../data/shalom-agencies';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ProductCardComponent, CdnImgPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnDestroy {
  cart = inject(CartService);
  private api = inject(ApiService);
  private router = inject(Router);

  // Mosaico rotativo de promociones (checkout), igual que el home pero un poco más chico
  rotIndex = signal(0);
  mosaicFade = signal(false);
  private promoRotTimer: any = null;
  combinedPubs = computed(() => {
    const proms = this.activePromos().map(p => ({ kind: 'promo' as const, promo: p }));
    const banners = this.promos().map(b => ({ kind: 'banner' as const, banner: b }));
    return [...proms, ...banners];
  });
  mosaicItems = computed(() => {
    const all = this.combinedPubs();
    if (all.length === 0) return [];
    const n = Math.min(all.length, 3);
    const start = this.rotIndex() % all.length;
    const out: any[] = [];
    for (let i = 0; i < n; i++) out.push(all[(start + i) % all.length]);
    return out;
  });

  /** Pedido mínimo mayorista (unidades). */
  readonly minUnits = 6;
  crossSell = signal<Product[]>([]);
  promos = signal<Banner[]>([]);
  activePromos = signal<Promotion[]>([]);
  stockMap = signal<Record<number, number>>({});
  private lastIdsKey = '';

  totalUnits = computed(() => this.cart.cartItems().reduce((s, i) => s + i.quantity, 0));
  unitsLeft = computed(() => Math.max(0, this.minUnits - this.totalUnits()));
  minReached = computed(() => this.totalUnits() >= this.minUnits);
  progressPct = computed(() => Math.min(100, (this.totalUnits() / this.minUnits) * 100));
  depositPen = computed(() => this.totalUnits() * 20);

  constructor() {
    this.api.getRetailStock().subscribe({ next: (s) => this.stockMap.set(s || {}), error: () => {} });
    this.api.getPublicConfig().subscribe({ next: (cfg) => this.promos.set(cfg.promos ?? []), error: () => {} });
    this.api.getActivePromotions().subscribe({ next: (p) => this.activePromos.set(p), error: () => {} });

    // Rotación del mosaico de promos en el checkout (cada 10s con desvanecido)
    this.promoRotTimer = setInterval(() => {
      if (this.combinedPubs().length < 2) return;
      this.mosaicFade.set(true);
      setTimeout(() => { this.rotIndex.update(v => v + 1); this.mosaicFade.set(false); }, 450);
    }, 10000);

    // Recalcula el cross-sell cuando cambia el conjunto de productos del carrito
    effect(() => {
      const ids = this.cart.cartItems().map(i => i.product.id);
      const key = [...ids].sort().join(',');
      if (key === this.lastIdsKey) return;
      this.lastIdsKey = key;
      if (ids.length === 0) { this.crossSell.set([]); return; }
      this.api.getCartCrossSell(ids, 8).subscribe({
        next: (r) => this.crossSell.set(r.filter(p => !ids.includes(p.id))),
        error: () => this.crossSell.set([])
      });
    });
  }

  isInStock(id: number): boolean {
    return (this.stockMap()[id] || 0) > 0;
  }

  stockHitId = signal<number | null>(null);

  /** Tope de cantidad: en stock (canal STOCK) no más de lo disponible; consolidado sin tope. */
  private maxQty(productId: number): number {
    if (this.cart.catalogType() !== 'STOCK') return Infinity;
    const s = this.stockMap()[productId] || 0;
    return s > 0 ? s : Infinity;
  }

  updateQty(productId: number, event: Event) {
    const qty = +(event.target as HTMLInputElement).value;
    this.cart.updateQuantity(productId, Math.min(this.maxQty(productId), Math.max(1, qty)));
  }

  changeQty(productId: number, current: number, delta: number) {
    const max = this.maxQty(productId);
    if (delta > 0 && current >= max) {
      this.stockHitId.set(productId);
      setTimeout(() => { if (this.stockHitId() === productId) this.stockHitId.set(null); }, 2800);
      return;
    }
    this.cart.updateQuantity(productId, Math.min(max, Math.max(1, current + delta)));
  }

  remove(productId: number) {
    this.cart.removeItem(productId);
  }

  // --- Promociones en el carrito ---
  removePromoLine(promoId: number) { this.cart.removePromo(promoId); }
  changePromoQty(promoId: number, current: number, delta: number, maxStock: number) {
    this.cart.updatePromoQuantity(promoId, Math.max(1, Math.min(maxStock, current + delta)));
  }
  goPromoPage(id: number) { this.router.navigate(['/promocion', id]); }
  goPub(item: any) {
    if (item?.kind === 'promo') this.router.navigate(['/promocion', item.promo.id]);
    else if (item?.banner) this.goPromo(item.banner);
  }
  ngOnDestroy() { if (this.promoRotTimer) clearInterval(this.promoRotTimer); }

  // ===== Flujo unificado: bolsa → checkout → listo (una sola vista, sin recargar) =====
  phase = signal<'bag' | 'checkout' | 'done'>('bag');

  clientName = signal('');
  clientPhone = signal('');
  deliveryMethod = signal<'LIMA' | 'SHALOM'>('LIMA');
  shippingName = signal('');
  shippingDni = signal('');
  shippingPhone = signal('');
  shippingAddress = signal('');
  isAddingToExisting = signal(false);
  existingOrderCode = signal('');

  departments = SHALOM_DEPARTMENTS;
  selectedDepartment = signal('');
  selectedAgency = signal<ShalomAgency | null>(null);
  agenciesForDepartment = computed(() => {
    const d = this.selectedDepartment();
    return d ? SHALOM_AGENCIES.filter(a => a.departamento === d) : [];
  });

  submitting = signal(false);
  submitError = signal('');
  successCode = signal('');
  successDeposit = signal(0);
  successRemaining = signal(0);
  successTotal = signal(0);
  savedTotal = signal(0);
  savedItems = signal<{ label: string; qty: number; sub: number }[]>([]);

  goToCheckout() {
    if (this.cart.isEmpty()) return;
    if (!this.minReached() && this.cart.catalogType() !== 'STOCK') return;
    if (typeof (window as any).ttq !== 'undefined') {
      (window as any).ttq.track('InitiateCheckout', {
        content_type: 'product', value: this.cart.totalPen(), currency: 'PEN', quantity: this.totalUnits()
      });
    }
    if (typeof (window as any).fbq !== 'undefined') {
      (window as any).fbq('track', 'InitiateCheckout', {
        value: this.cart.totalPen(), currency: 'PEN', num_items: this.totalUnits()
      });
    }
    this.phase.set('checkout');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  }

  backToBag() { this.phase.set('bag'); this.submitError.set(''); }

  onDepartmentChange(dept: string) {
    this.selectedDepartment.set(dept);
    this.selectedAgency.set(null);
    this.shippingAddress.set('');
  }
  onAgencyChange(nombre: string) {
    const a = this.agenciesForDepartment().find(x => x.nombre === nombre) || null;
    this.selectedAgency.set(a);
    this.shippingAddress.set(a ? `Shalom ${a.nombre} - ${a.direccion}` : '');
  }

  submitOrder() {
    if (!this.clientName() || !this.clientPhone()) { this.submitError.set('Completa tu nombre y número de WhatsApp.'); return; }
    if (this.isAddingToExisting() && !this.existingOrderCode().trim()) { this.submitError.set('Ingresa el código de tu pedido anterior (ej. AS-0012).'); return; }
    if (this.deliveryMethod() === 'SHALOM') {
      if (!this.shippingName() || !this.shippingDni() || !this.shippingPhone()) { this.submitError.set('Completa los datos para el envío por Shalom.'); return; }
      if (!this.selectedAgency()) { this.submitError.set('Selecciona una agencia Shalom de la lista.'); return; }
    }

    const saved = this.cart.cartItems().map(i => ({
      label: `${i.product.brand} ${i.product.name} ${i.product.ml ? i.product.ml + 'ml' : ''}`.trim(),
      qty: i.quantity, sub: i.unitPricePen * i.quantity
    }));
    const savedPromos = this.cart.promoItems().map(p => ({
      label: `PROMO ${p.promo.name}`, qty: p.quantity, sub: p.promo.pricePen * p.quantity
    }));
    this.savedItems.set([...saved, ...savedPromos]);
    this.savedTotal.set(this.cart.totalPen());
    this.successDeposit.set(this.depositPen());

    this.submitting.set(true);
    this.submitError.set('');
    const payload: any = {
      clientName: this.clientName(),
      clientPhone: this.clientPhone(),
      channel: this.cart.catalogType() || 'CONSOLIDADO',
      deliveryMethod: this.deliveryMethod(),
      shippingName: this.shippingName(),
      shippingDni: this.shippingDni(),
      shippingPhone: this.shippingPhone(),
      shippingAddress: this.shippingAddress(),
      shippingDepartment: this.selectedDepartment(),
      shippingAgency: this.selectedAgency()?.nombre || '',
      items: this.cart.getOrderItems(),
      promotions: this.cart.getPromoLines()
    };
    if (this.isAddingToExisting() && this.existingOrderCode().trim()) payload.existingOrderCode = this.existingOrderCode().trim();

    this.api.createOrder(payload).subscribe({
      next: (order) => {
        this.successCode.set(order.orderCode);
        this.successRemaining.set(order.remainingPen);
        this.successTotal.set(order.totalPen);
        try { (window as any).ttq?.track('PlaceAnOrder', { content_type: 'product', value: order.totalPen, currency: 'PEN' }); } catch {}
        try { (window as any).fbq?.('track', 'Purchase', { value: order.totalPen, currency: 'PEN', content_type: 'product' }); } catch {}
        this.phase.set('done');
        this.cart.clear();
        this.submitting.set(false);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      },
      error: (err) => { this.submitError.set(err.error?.message || 'Error al crear el pedido. Intenta de nuevo.'); this.submitting.set(false); }
    });
  }

  sendCheckoutWhatsApp() {
    let msg = `Hola, soy *${this.clientName()}*.\nMi código de pedido es *${this.successCode()}*.\n\nQuiero confirmar mi pedido:\n\n`;
    for (const it of this.savedItems()) msg += `• ${it.label} x${it.qty} — S/ ${it.sub.toFixed(2)}\n`;
    msg += `\n*Total: S/ ${this.savedTotal().toFixed(2)}*`;
    if (this.successDeposit() > 0) msg += `\n*Separación: S/ ${this.successDeposit().toFixed(2)}*`;
    if (this.deliveryMethod() === 'SHALOM' && this.selectedAgency()) msg += `\n\nEnvío a: Shalom ${this.selectedAgency()!.nombre}`;
    window.open(`https://wa.me/51981587009?text=${encodeURIComponent(msg)}`, '_blank');
  }

  finishHome() { this.router.navigate(['/']); }

  orderViaWhatsApp() {
    const items = this.cart.cartItems();
    const catType = this.cart.catalogType() === 'STOCK' ? 'de entrega inmediata (stock)' : 'por encargo (consolidado)';
    let message = `¡Hola! Quiero hacer un pedido ${catType}:\n\n`;

    for (const item of items) {
      const subtotal = (item.unitPricePen * item.quantity).toFixed(2);
      message += `• ${item.product.brand} - ${item.product.name} ${item.product.ml}ml x${item.quantity} — S/ ${subtotal}\n`;
    }
    message += `\nTotal: S/ ${this.cart.totalPen().toFixed(2)}`;

    if (typeof (window as any).ttq !== 'undefined') {
      (window as any).ttq.track('Contact', { value: this.cart.totalPen(), currency: 'PEN' });
    }
    if (typeof (window as any).fbq !== 'undefined') {
      (window as any).fbq('track', 'Contact', { value: this.cart.totalPen(), currency: 'PEN' });
    }

    const url = `https://wa.me/51981587009?text=${encodeURIComponent(message)}`;
    setTimeout(() => {
      window.open(url, '_blank');
      this.cart.clear();
    }, 300);
  }

  goBack() {
    this.router.navigate(['/catalogo']);
  }

  goPromo(b: Banner) {
    switch (b.linkType) {
      case 'product': this.router.navigate(['/producto', b.linkValue]); break;
      case 'brand': this.router.navigate(['/catalogo'], { queryParams: { brand: b.linkValue } }); break;
      case 'category':
        if (b.linkValue && b.linkValue !== 'all') this.router.navigate(['/catalogo'], { queryParams: { category: b.linkValue } });
        else this.router.navigate(['/catalogo']);
        break;
      case 'search': this.router.navigate(['/catalogo'], { queryParams: { q: b.linkValue } }); break;
      case 'url': if (b.linkValue) window.open(b.linkValue, '_blank'); break;
      default: this.router.navigate(['/catalogo']);
    }
  }
}
