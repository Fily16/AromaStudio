import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/api.models';
import { ProductCardComponent } from '../shared/product-card.component';
import { NoteIconComponent } from '../shared/note-icon.component';
import { ScrollerComponent } from '../shared/scroller.component';
import { CdnImgPipe } from '../../shared/cdn-img.pipe';
import { parseNotes, noteLabel, familyLabel, OCCASION_LABEL, SEASON_LABEL, SEASON_ORDER } from '../shared/note-catalog';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [DecimalPipe, RouterLink, ProductCardComponent, NoteIconComponent, ScrollerComponent, CdnImgPipe],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  cart = inject(CartService);

  product = signal<Product | null>(null);
  allProducts = signal<Product[]>([]);
  related = signal<Product[]>([]);
  stockMap = signal<Record<number, number>>({});
  loading = signal(true);
  quantity = signal(1);
  cartToast = signal('');

  /** Variantes de tamaño: mismo nombre y marca, distinto ml. */
  variants = computed(() => {
    const p = this.product();
    if (!p) return [];
    const name = p.name.trim().toLowerCase();
    return this.allProducts()
      .filter(o => o.brand === p.brand && o.name.trim().toLowerCase() === name && o.ml)
      .sort((a, b) => (a.ml || 0) - (b.ml || 0));
  });

  /** Similares por contenido (marca/categoría), excluyendo lo ya recomendado por el backend. */
  similar = computed(() => {
    const p = this.product();
    if (!p) return [];
    const relatedIds = new Set(this.related().map(r => r.id));
    return this.allProducts()
      .filter(o =>
        o.id !== p.id && !relatedIds.has(o.id) &&
        o.wholesalePricePen && o.wholesalePricePen > 0 &&
        (o.brand === p.brand || o.category === p.category)
      )
      .slice(0, 10);
  });

  // --- Notas olfativas ---
  notesTop = computed(() => parseNotes(this.product()?.notesTop));
  notesMiddle = computed(() => parseNotes(this.product()?.notesMiddle));
  notesBase = computed(() => parseNotes(this.product()?.notesBase));
  hasNotes = computed(() => this.notesTop().length + this.notesMiddle().length + this.notesBase().length > 0);
  family = computed(() => this.product()?.olfactiveFamily || null);
  occasion = computed(() => this.product()?.occasion || null);
  seasonList = computed(() => {
    const set = new Set(parseNotes(this.product()?.seasons));
    return SEASON_ORDER.filter(s => set.has(s));
  });
  hasProfile = computed(() => !!this.family() || !!this.occasion() || this.seasonList().length > 0);

  label(slug: string) { return noteLabel(slug); }
  famLabel(code: string) { return familyLabel(code); }
  occLabel(code: string) { return OCCASION_LABEL[code] || code; }
  seaLabel(code: string) { return SEASON_LABEL[code] || code; }

  // Canal elegido por el cliente en la ficha (si el producto está en stock, puede elegir).
  buyMode = signal<'CONSOLIDADO' | 'STOCK'>('CONSOLIDADO');
  blocked = signal(false);

  canBuyStock = computed(() => {
    const p = this.product();
    return !!p && this.isInStock(p.id) && !!p.stockPricePen;
  });
  // Precio según el canal elegido: stock (costo+35) o consolidado (costo+20).
  price = computed(() => {
    const p = this.product();
    if (!p) return 0;
    return this.buyMode() === 'STOCK' && p.stockPricePen ? p.stockPricePen : (p.wholesalePricePen || 0);
  });
  stockQtyOf = computed(() => {
    const p = this.product();
    return p ? (this.stockMap()[p.id] || 0) : 0;
  });
  lowStock = computed(() => this.buyMode() === 'STOCK' && this.stockQtyOf() > 0 && this.stockQtyOf() <= 3);

  hasSaving = computed(() => {
    const p = this.product();
    return !!p && !!p.retailPricePen && p.retailPricePen > this.price();
  });
  savingPct = computed(() => {
    const p = this.product()!;
    return Math.round((1 - (this.price() / p.retailPricePen!)) * 100);
  });

  ngOnInit() {
    this.api.getProducts({ onlyAvailable: true }).subscribe({
      next: (products) => this.allProducts.set(products)
    });
    this.api.getRetailStock().subscribe({
      next: (stock) => this.stockMap.set(stock || {}),
      error: () => {}
    });

    // Reacciona a cambios de :id (al navegar entre recomendados sin recargar)
    this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('id'));
      if (id) this.loadProduct(id);
    });
  }

  isInStock(id: number): boolean {
    return (this.stockMap()[id] || 0) > 0;
  }

  private loadProduct(id: number) {
    this.loading.set(true);
    this.quantity.set(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.api.getProduct(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);

        try {
          (window as any).ttq?.track('ViewContent', {
            content_id: product.id.toString(),
            content_name: `${product.brand} - ${product.name}`,
            content_type: 'product', price: product.wholesalePricePen, currency: 'PEN'
          });
        } catch {}
        try {
          (window as any).fbq?.('track', 'ViewContent', {
            content_ids: [product.id.toString()],
            content_name: `${product.brand} - ${product.name}`,
            content_type: 'product', value: product.wholesalePricePen, currency: 'PEN'
          });
        } catch {}
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/catalogo']);
      }
    });

    this.related.set([]);
    this.api.getRelated(id, 10).subscribe({
      next: (items) => this.related.set(items),
      error: () => this.related.set([])
    });
  }

  stockHit = signal(false);

  setBuyMode(mode: 'CONSOLIDADO' | 'STOCK') {
    this.buyMode.set(mode);
    if (mode === 'STOCK') this.quantity.set(Math.min(this.quantity(), Math.max(1, this.stockQtyOf())));
  }

  changeQty(delta: number) {
    if (this.buyMode() === 'STOCK') {
      const max = this.stockQtyOf();
      if (delta > 0 && this.quantity() >= max) {
        this.stockHit.set(true);
        setTimeout(() => this.stockHit.set(false), 2800);
        return;
      }
      this.quantity.update(q => Math.min(max, Math.max(1, q + delta)));
    } else {
      this.quantity.update(q => Math.max(1, q + delta));
    }
  }

  addToCart() {
    const p = this.product();
    if (!p || !p.wholesalePricePen) return;
    const channel = this.buyMode();
    const ok = this.cart.addItem(p, this.quantity(), channel, this.price());
    if (!ok) {
      this.blocked.set(true);
      setTimeout(() => this.blocked.set(false), 2800);
      return;
    }

    try {
      (window as any).ttq?.track('AddToCart', {
        content_id: p.id.toString(), content_name: `${p.brand} - ${p.name}`,
        content_type: 'product', quantity: this.quantity(),
        price: p.wholesalePricePen, value: p.wholesalePricePen * this.quantity(), currency: 'PEN'
      });
    } catch {}
    try {
      (window as any).fbq?.('track', 'AddToCart', {
        content_ids: [p.id.toString()], content_name: `${p.brand} - ${p.name}`,
        content_type: 'product', value: p.wholesalePricePen * this.quantity(), currency: 'PEN'
      });
    } catch {}

    this.cartToast.set(`${p.brand} - ${p.name} (x${this.quantity()}) agregado`);
    setTimeout(() => this.cartToast.set(''), 2500);
    this.quantity.set(1);
  }

  getWhatsAppLink(): string {
    const p = this.product();
    if (!p) return '';
    const message = `¡Hola! Me interesa:\n\n${p.brand} - ${p.name} ${p.ml}ml\nPrecio: S/ ${this.price()}\n\n¿Tienen disponibilidad?`;
    return `https://wa.me/51981587009?text=${encodeURIComponent(message)}`;
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  trackWhatsAppContact(event: Event) {
    event.preventDefault();
    try { (window as any).ttq?.track('Contact', { content_type: 'product', content_name: 'WhatsApp Detalle' }); } catch {}
    try { (window as any).fbq?.('track', 'Contact', { content_name: 'WhatsApp Detalle' }); } catch {}
    window.open(this.getWhatsAppLink() || 'https://wa.me/51981587009', '_blank');
  }
}
