import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Product, Banner, Promotion } from '../../models/api.models';
import { ProductCardComponent } from '../shared/product-card.component';
import { ScrollerComponent } from '../shared/scroller.component';
import { CdnImgPipe } from '../../shared/cdn-img.pipe';

interface CategoryCard {
  key: 'men' | 'women' | 'unisex';
  label: string;
  tagline: string;
  count: number;
  img: string | null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ProductCardComponent, ScrollerComponent, CdnImgPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  cart = inject(CartService);

  allProducts = signal<Product[]>([]);
  loading = signal(true);
  banners = signal<Banner[]>([]);
  promos = signal<Banner[]>([]);
  activePromos = signal<Promotion[]>([]);
  promoPopup = signal<Banner | null>(null);
  popupPromo = signal<Promotion | null>(null);
  private popupDecided = false;
  stockMap = signal<Record<number, number>>({});

  bannerIndex = signal(0);
  ctaVisible = signal(false);

  // Mosaico rotativo de promociones (combina publicaciones/banners + promos reales)
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

  private autoplayTimer: any = null;
  private revealObserver: IntersectionObserver | null = null;
  private revealFallbackTimer: any = null;
  private onScroll = () => this.ctaVisible.set(window.scrollY > 420);

  private readonly priorityFirst = ['yara rose', 'yara pink'];
  private readonly popularNames = [
    'yara', 'khamrah', 'sublime', 'vulkan', '9pm', 'barakkat',
    'asad', 'velvet', 'fakhar', 'raghba', 'club de nuit', 'amber oud'
  ];

  showcaseProducts = computed(() => {
    const products = this.allProducts().filter(p => p.wholesalePricePen && p.wholesalePricePen > 0);
    if (products.length === 0) return [];

    const scored = products.map(p => {
      let score = 0;
      const nameLower = p.name.toLowerCase();
      const brandLower = p.brand.toLowerCase();

      for (const first of this.priorityFirst) {
        if (nameLower.includes(first)) { score += 500; break; }
      }
      for (const pop of this.popularNames) {
        if (nameLower.includes(pop) || brandLower.includes(pop)) { score += 100; break; }
      }
      if (p.isHighlighted) score += 50;
      if (p.isNew) score += 30;
      score += Math.max(0, 200 - (p.wholesalePricePen ?? 0));

      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map(s => s.product);
  });

  bestSellers = computed(() => this.showcaseProducts());

  newArrivals = computed(() =>
    this.allProducts()
      .filter(p => p.isNew && p.wholesalePricePen && p.wholesalePricePen > 0)
      .slice(0, 12)
  );

  private readonly genericBrands = new Set([
    'sin marca', 'diseñador', 'designer', 'eau de parfum', 'citrus notes',
    'perfume', 'fragancia', 'fragrance', 'tester'
  ]);

  brands = computed(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const p of this.allProducts()) {
      if (!p.wholesalePricePen || p.wholesalePricePen <= 0) continue;
      const label = (p.brand || '').split(' - ')[0].trim();
      if (!label || /\d/.test(label) || !/^[A-ZÁÉÍÓÚÑ]/.test(label)) continue;
      const key = label.toLowerCase();
      if (this.genericBrands.has(key)) continue;
      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { label, count: 1 });
    }
    return [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 18)
      .map(e => e.label);
  });

  // Lista duplicada para el marquee infinito de marcas (loop sin salto)
  brandsLoop = computed(() => {
    const b = this.brands();
    return b.length ? [...b, ...b] : [];
  });

  categoryCards = computed<CategoryCard[]>(() => {
    const defs: Omit<CategoryCard, 'count' | 'img'>[] = [
      { key: 'women', label: 'Para Ella', tagline: 'Dulces, florales y envolventes' },
      { key: 'men', label: 'Para Él', tagline: 'Intensos, especiados y elegantes' },
      { key: 'unisex', label: 'Unisex', tagline: 'Versátiles para cada momento' }
    ];
    // Imágenes editoriales fijas para hombre/mujer (subidas por el negocio)
    const fixedImg: Record<string, string> = {
      women: 'categorias/mujer.jpg',
      men: 'categorias/hombre.jpg'
    };
    const available = this.allProducts().filter(p => p.wholesalePricePen && p.wholesalePricePen > 0);
    return defs
      .map(d => {
        const items = available.filter(p => p.category === d.key);
        const img = fixedImg[d.key] ?? items.find(p => p.imageUrl)?.imageUrl ?? null;
        return { ...d, count: items.length, img };
      })
      .filter(c => c.count > 0);
  });

  ngOnInit() {
    this.api.getProducts({ onlyAvailable: true }).subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.loading.set(false);
        setTimeout(() => this.setupReveal());
      },
      error: () => this.loading.set(false)
    });

    this.api.getPublicConfig().subscribe({
      next: (cfg) => {
        this.banners.set(cfg.banners ?? []);
        this.promos.set(cfg.promos ?? []);
        this.startAutoplay();
        this.maybeShowPromoPopup();
      },
      error: () => {}
    });

    this.api.getRetailStock().subscribe({
      next: (stock) => this.stockMap.set(stock || {}),
      error: () => {}
    });

    this.api.getActivePromotions().subscribe({
      next: (p) => { this.activePromos.set(p); this.maybeShowPromoPopup(); },
      error: () => {}
    });

    window.addEventListener('scroll', this.onScroll, { passive: true });

    // Rotación del mosaico de promociones: cada 10s se desvanece y aparece otra.
    this.promoRotTimer = setInterval(() => {
      if (this.combinedPubs().length < 2) return;
      this.mosaicFade.set(true);
      setTimeout(() => { this.rotIndex.update(v => v + 1); this.mosaicFade.set(false); }, 450);
    }, 10000);

    try { (window as any).ttq?.track('ViewContent', { content_type: 'product_group', content_name: 'Home', currency: 'PEN' }); } catch {}
    try { (window as any).fbq?.('track', 'ViewContent', { content_type: 'product_group', content_name: 'Home', currency: 'PEN' }); } catch {}
  }

  ngOnDestroy() {
    this.stopAutoplay();
    window.removeEventListener('scroll', this.onScroll);
    this.revealObserver?.disconnect();
    if (this.revealFallbackTimer) clearInterval(this.revealFallbackTimer);
    if (this.promoRotTimer) clearInterval(this.promoRotTimer);
  }

  goPub(item: any) {
    if (item?.kind === 'promo') this.router.navigate(['/promocion', item.promo.id]);
    else if (item?.banner) this.goBanner(item.banner);
  }

  isInStock(id: number): boolean {
    return (this.stockMap()[id] || 0) > 0;
  }
  stockQtyFor(id: number): number {
    return this.stockMap()[id] || 0;
  }

  /** Muestra el popup al abrir (una vez por sesión): elige al azar entre las publicaciones
   *  (banners de promo + promociones reales activas). Conviven ambos. */
  private maybeShowPromoPopup() {
    if (this.popupDecided) return;
    const banners = this.promos();
    const proms = this.activePromos();
    const pubs: { kind: 'banner' | 'promo'; banner?: Banner; promo?: Promotion }[] = [
      ...banners.map(b => ({ kind: 'banner' as const, banner: b })),
      ...proms.map(p => ({ kind: 'promo' as const, promo: p }))
    ];
    if (!pubs.length) return;
    try { if (sessionStorage.getItem('promo_popup_seen')) { this.popupDecided = true; return; } } catch {}
    this.popupDecided = true;
    const pick = pubs[Math.floor(Math.random() * pubs.length)];
    setTimeout(() => {
      if (pick.kind === 'promo') this.popupPromo.set(pick.promo!);
      else this.promoPopup.set(pick.banner!);
    }, 1200);
  }

  closePromoPopup() {
    this.promoPopup.set(null);
    this.popupPromo.set(null);
    try { sessionStorage.setItem('promo_popup_seen', '1'); } catch {}
  }

  clickPromoPopup() {
    const b = this.promoPopup();
    this.closePromoPopup();
    if (b) this.goBanner(b);
  }

  clickPromoPopupPromo() {
    const p = this.popupPromo();
    this.closePromoPopup();
    if (p) this.router.navigate(['/promocion', p.id]);
  }

  goPromoPage(id: number) { this.router.navigate(['/promocion', id]); }

  private setupReveal() {
    const elements = [...(this.host.nativeElement as HTMLElement).querySelectorAll('.reveal')];
    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('in'));
      return;
    }
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            this.revealObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    elements.forEach(el => this.revealObserver!.observe(el));

    this.revealFallbackTimer = setInterval(() => {
      this.onScroll();
      const pending = elements.filter(el => !el.classList.contains('in'));
      if (pending.length === 0) {
        clearInterval(this.revealFallbackTimer);
        this.revealFallbackTimer = null;
        return;
      }
      const vh = window.innerHeight || document.documentElement.clientHeight;
      for (const el of pending) {
        if (el.getBoundingClientRect().top < vh * 0.95) el.classList.add('in');
      }
    }, 400);
  }

  private startAutoplay() {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      const total = this.banners().length;
      if (total > 1) this.bannerIndex.set((this.bannerIndex() + 1) % total);
    }, 5000);
  }

  private stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  goToBannerSlide(index: number) {
    if (index === this.bannerIndex()) return;
    this.bannerIndex.set(index);
    this.startAutoplay();
  }

  /** Resuelve el destino de un banner segun su linkType. */
  goBanner(b: Banner) {
    switch (b.linkType) {
      case 'product':
        this.router.navigate(['/producto', b.linkValue]); break;
      case 'brand':
        this.router.navigate(['/catalogo'], { queryParams: { brand: b.linkValue } }); break;
      case 'category':
        if (b.linkValue && b.linkValue !== 'all') this.router.navigate(['/catalogo'], { queryParams: { category: b.linkValue } });
        else this.router.navigate(['/catalogo']);
        break;
      case 'search':
        this.router.navigate(['/catalogo'], { queryParams: { q: b.linkValue } }); break;
      case 'url':
        if (b.linkValue) window.open(b.linkValue, '_blank'); break;
      default:
        this.router.navigate(['/catalogo']);
    }
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToCatalog() {
    this.router.navigate(['/catalogo']);
  }

  trackWhatsAppContact(event: Event) {
    event.preventDefault();
    try { (window as any).ttq?.track('Contact', { content_type: 'product', content_name: 'WhatsApp FAB' }); } catch {}
    try { (window as any).fbq?.('track', 'Contact', { content_name: 'WhatsApp FAB' }); } catch {}
    setTimeout(() => { window.open('https://wa.me/51981587009', '_blank'); }, 300);
  }
}
