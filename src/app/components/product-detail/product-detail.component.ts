import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/api.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
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
  loading = signal(true);
  quantity = signal(1);
  cartToast = signal('');

  similarProducts = computed(() => {
    const p = this.product();
    if (!p) return [];
    return this.allProducts()
      .filter(other =>
        other.id !== p.id &&
        other.wholesalePricePen &&
        other.wholesalePricePen > 0 &&
        (other.brand === p.brand || other.category === p.category)
      )
      .slice(0, 4);
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.api.getProducts({ onlyAvailable: true }).subscribe({
      next: (products) => this.allProducts.set(products)
    });

    this.loadProduct(id);
  }

  private loadProduct(id: number) {
    this.loading.set(true);
    this.api.getProduct(id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.loading.set(false);

        try {
          (window as any).ttq?.track('ViewContent', {
            content_id: product.id.toString(),
            content_name: `${product.brand} - ${product.name}`,
            content_type: 'product',
            price: product.wholesalePricePen,
            currency: 'PEN'
          });
        } catch {}
        try {
          (window as any).fbq?.('track', 'ViewContent', {
            content_ids: [product.id.toString()],
            content_name: `${product.brand} - ${product.name}`,
            content_type: 'product',
            value: product.wholesalePricePen,
            currency: 'PEN'
          });
        } catch {}
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/catalogo']);
      }
    });
  }

  changeQty(delta: number) {
    this.quantity.update(q => Math.max(1, q + delta));
  }

  addToCart() {
    const p = this.product();
    if (!p || !p.wholesalePricePen) return;
    this.cart.addItem(p, this.quantity(), 'CONSOLIDADO');

    try {
      (window as any).ttq?.track('AddToCart', {
        content_id: p.id.toString(),
        content_name: `${p.brand} - ${p.name}`,
        content_type: 'product',
        quantity: this.quantity(),
        price: p.wholesalePricePen,
        value: p.wholesalePricePen * this.quantity(),
        currency: 'PEN'
      });
    } catch {}
    try {
      (window as any).fbq?.('track', 'AddToCart', {
        content_ids: [p.id.toString()],
        content_name: `${p.brand} - ${p.name}`,
        content_type: 'product',
        value: p.wholesalePricePen * this.quantity(),
        currency: 'PEN'
      });
    } catch {}

    this.cartToast.set(`${p.brand} - ${p.name} (x${this.quantity()}) agregado`);
    setTimeout(() => this.cartToast.set(''), 2500);
    this.quantity.set(1);
  }

  getWhatsAppLink(): string {
    const p = this.product();
    if (!p) return '';
    const message = `¡Hola! Me interesa:\n\n${p.brand} - ${p.name} ${p.ml}ml\nPrecio: S/ ${p.wholesalePricePen}\n\n¿Tienen disponibilidad?`;
    return `https://wa.me/51981587009?text=${encodeURIComponent(message)}`;
  }

  goToProduct(id: number) {
    this.quantity.set(1);
    this.loadProduct(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
