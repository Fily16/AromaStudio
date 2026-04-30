import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/api.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  cart = inject(CartService);

  allProducts = signal<Product[]>([]);
  loading = signal(true);

  currentSlide = signal(0);
  prevSlideIndex = signal(-1);
  slideDirection = signal<'next' | 'prev'>('next');
  isTransitioning = signal(false);
  private autoplayTimer: any = null;

  // Yara Rose/Pink first, then popular names
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

      // Highest priority: yara rose / yara pink goes first
      for (const first of this.priorityFirst) {
        if (nameLower.includes(first)) {
          score += 500;
          break;
        }
      }

      for (const pop of this.popularNames) {
        if (nameLower.includes(pop) || brandLower.includes(pop)) {
          score += 100;
          break;
        }
      }

      if (p.isHighlighted) score += 50;
      if (p.isNew) score += 30;
      score += Math.max(0, 200 - (p.wholesalePricePen ?? 0));

      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 10).map(s => s.product);
  });

  brands = computed(() => {
    const brandSet = new Set(
      this.allProducts()
        .filter(p => p.wholesalePricePen && p.wholesalePricePen > 0)
        .map(p => p.brand)
    );
    return [...brandSet].sort();
  });

  displayBrands = computed(() => this.brands().slice(0, 10));
  extraBrandsCount = computed(() => Math.max(0, this.brands().length - 10));

  ngOnInit() {
    this.api.getProducts({ onlyAvailable: true }).subscribe({
      next: (products) => {
        this.allProducts.set(products);
        this.loading.set(false);
        this.startAutoplay();
      },
      error: () => this.loading.set(false)
    });

    try { (window as any).ttq?.track('ViewContent', { content_type: 'product_group', content_name: 'Home', currency: 'PEN' }); } catch {}
    try { (window as any).fbq?.('track', 'ViewContent', { content_type: 'product_group', content_name: 'Home', currency: 'PEN' }); } catch {}
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

  private startAutoplay() {
    this.stopAutoplay();
    this.autoplayTimer = setInterval(() => {
      this.advanceSlide('next');
    }, 3500);
  }

  private stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  private advanceSlide(direction: 'next' | 'prev') {
    const total = this.showcaseProducts().length;
    if (total === 0) return;
    const current = this.currentSlide();
    this.prevSlideIndex.set(current);
    this.slideDirection.set(direction);
    this.isTransitioning.set(true);
    this.currentSlide.set(direction === 'next' ? (current + 1) % total : (current - 1 + total) % total);
    setTimeout(() => {
      this.isTransitioning.set(false);
      this.prevSlideIndex.set(-1);
    }, 700);
  }

  goToSlide(index: number) {
    if (index === this.currentSlide()) return;
    this.stopAutoplay();
    const current = this.currentSlide();
    this.prevSlideIndex.set(current);
    this.slideDirection.set(index > current ? 'next' : 'prev');
    this.isTransitioning.set(true);
    this.currentSlide.set(index);
    setTimeout(() => {
      this.isTransitioning.set(false);
      this.prevSlideIndex.set(-1);
    }, 700);
    this.startAutoplay();
  }

  goToProduct(id: number) {
    this.router.navigate(['/producto', id]);
  }

  goToCatalog() {
    this.router.navigate(['/catalogo']);
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
}
