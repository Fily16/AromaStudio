import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CartService } from '../../services/cart.service';
import { Promotion } from '../../models/api.models';

/** Página pública de una promoción (pack): perfumes + precio + un solo botón "Agregar". */
@Component({
  selector: 'app-promo-page',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './promo-page.component.html',
  styleUrl: './promo-page.component.css'
})
export class PromoPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private router = inject(Router);
  cart = inject(CartService);

  promo = signal<Promotion | null>(null);
  loading = signal(true);
  notFound = signal(false);
  toast = signal('');

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.notFound.set(true); this.loading.set(false); return; }
    this.api.getPromotion(id).subscribe({
      next: (p) => { this.promo.set(p); this.loading.set(false); },
      error: () => { this.notFound.set(true); this.loading.set(false); }
    });
  }

  soldOut(): boolean { const p = this.promo(); return !p || p.stockQty <= 0 || !p.active; }

  add() {
    const p = this.promo();
    if (!p) return;
    const ok = this.cart.addPromo(p, 1);
    if (!ok) {
      this.showToast('Tu carrito tiene productos por encargo. Las promos van con entrega inmediata.');
      return;
    }
    this.showToast('¡Promoción agregada al carrito!');
  }

  goCart() { this.router.navigate(['/cart']); }

  private showToast(m: string) { this.toast.set(m); setTimeout(() => this.toast.set(''), 3500); }
}
