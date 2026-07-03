import { Component, Input, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Product } from '../../models/api.models';
import { CartService } from '../../services/cart.service';
import { cdnImage } from '../../shared/img.util';

/**
 * Tarjeta de producto reutilizable (catálogo, carruseles, recomendaciones).
 * Estilo FragranceNet "Best Sellers": imagen sobre gris claro, marca, nombre,
 * concentración, pill de género (Hombre/Mujer/Unisex) y precio mayorista.
 * Layout intrínseco con container queries (se adapta al ancho del contenedor).
 */
@Component({
  selector: 'as-product-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <a class="pc" [routerLink]="['/producto', product.id]">
      <div class="pc-media">
        @if (product.imageUrl) {
          <img [src]="imgUrl(product.imageUrl, 500)" [alt]="product.brand + ' ' + product.name"
               [attr.loading]="eager ? 'eager' : 'lazy'" decoding="async">
        } @else {
          <div class="pc-noimg">{{ brandLabel }}</div>
        }
        @if (product.isNew) {
          <div class="pc-badges"><span class="as-badge as-badge--new">Nuevo</span></div>
        }
      </div>

      <div class="pc-body">
        <span class="pc-brand">{{ brandLabel }}</span>
        <span class="pc-name">{{ product.name }}</span>
        @if (concentration) { <span class="pc-meta">{{ concentration }}</span> }

        <div class="pc-tags">
          <span class="pc-gender">{{ genderLabel }}</span>
          @if (mode === 'STOCK') {
            @if (lowStock) { <span class="pc-stock low">¡Últimas unidades!</span> }
            @else { <span class="pc-stock in">Entrega inmediata</span> }
          } @else {
            <span class="pc-stock">Por encargo</span>
          }
        </div>

        <div class="pc-price">
          <span class="pc-now">S/ {{ displayPrice | number:'1.0-0' }}</span>
          @if (hasSaving) { <span class="pc-was">S/ {{ product.retailPricePen | number:'1.0-0' }}</span> }
        </div>
        @if (hasSaving) { <span class="pc-save">{{ savingPct }}% de descuento</span> }
      </div>

      <button type="button" class="pc-add" (click)="addToCart($event)" [class.added]="added()" [class.blocked]="blocked()">
        {{ blocked() ? 'Vacía el carrito primero' : (added() ? '✓ Agregado' : 'Agregar') }}
      </button>
    </a>
  `,
  styles: [`
    .pc {
      container-type: inline-size;
      display: flex;
      flex-direction: column;
      background: #fff;
      height: 100%;
      transition: box-shadow .18s var(--ease-out), transform .18s var(--ease-out);
    }
    .pc:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-3px);
    }
    .pc-media {
      position: relative;
      aspect-ratio: 1 / 1;
      background: #f4f4f4;
      display: grid;
      place-items: center;
      padding: 9%;
    }
    .pc-media img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
    .pc-noimg { font-family: var(--font-display); color: var(--muted); font-size: 1rem; text-align: center; }
    .pc-badges { position: absolute; top: 9px; left: 9px; display: flex; flex-direction: column; gap: 5px; align-items: flex-start; }

    .pc-body { display: flex; flex-direction: column; gap: 4px; padding: 13px 13px 9px; flex: 1; }
    .pc-brand {
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--muted);
    }
    .pc-name {
      font-size: 0.98rem; color: var(--ink); line-height: 1.25; font-weight: 600;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      min-height: 2.4em;
    }
    .pc-meta { font-size: 0.74rem; color: var(--muted); }

    .pc-tags { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
    .pc-gender {
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
      background: #ececec; color: #555; padding: 4px 9px; border-radius: 4px; line-height: 1;
    }
    .pc-stock { font-size: 0.72rem; color: var(--muted); font-weight: 500; }
    .pc-stock.in { color: var(--ok); font-weight: 600; }
    .pc-stock.low { color: var(--sale); font-weight: 700; }

    .pc-price { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; }
    .pc-now { font-size: 1.12rem; font-weight: 800; color: var(--ink); }
    .pc-was { font-size: 0.82rem; color: var(--muted); text-decoration: line-through; }
    .pc-save { font-size: 0.74rem; font-weight: 700; color: var(--sale); margin-top: 2px; }

    .pc-add {
      margin: 0 13px 13px;
      border: 1px solid var(--accent);
      background: #fff;
      color: var(--accent);
      font-weight: 600;
      font-size: 0.85rem;
      padding: 10px;
      border-radius: var(--r-sm);
      transition: background .15s var(--ease-out), color .15s var(--ease-out);
    }
    .pc-add:hover { background: var(--accent); color: #fff; }
    .pc-add.added { background: var(--ok); border-color: var(--ok); color: #fff; }
    .pc-add.blocked { background: var(--sale); border-color: var(--sale); color: #fff; font-size: 0.74rem; }

    @container (max-width: 190px) {
      .pc-name { font-size: 0.86rem; }
      .pc-now { font-size: 1rem; }
      .pc-add { font-size: 0.78rem; padding: 9px; }
    }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() inStock = false;
  @Input() stockQty = 0;
  /** Modo del catálogo: CONSOLIDADO (por encargo, +20) o STOCK (entrega inmediata, +35). */
  @Input() mode: 'CONSOLIDADO' | 'STOCK' = 'CONSOLIDADO';
  @Input() eager = false;

  blocked = signal(false);

  /** Pocas unidades en stock → aviso "¡Últimas unidades!" (no se muestra el número exacto). */
  get lowStock(): boolean {
    return this.stockQty > 0 && this.stockQty <= 3;
  }

  private cart = inject(CartService);
  added = signal(false);

  /** Imagen optimizada vía CDN (redimensiona + comprime + WebP + caché). */
  imgUrl(u: string | null, w = 500): string { return cdnImage(u, w); }

  get brandLabel(): string {
    return (this.product.brand || '').split(' - ')[0].trim();
  }

  get genderLabel(): string {
    const c = this.product.category;
    return c === 'men' ? 'Hombre' : c === 'women' ? 'Mujer' : 'Unisex';
  }

  get concentration(): string {
    const t = (this.product.type || '').trim();
    const ml = this.product.ml ? `${this.product.ml} ml` : '';
    return [t, ml].filter(Boolean).join(' · ');
  }

  /** Precio según el MODO: stock (entrega inmediata, +35) o consolidado (por encargo, +20). */
  get displayPrice(): number {
    if (this.mode === 'STOCK') return this.product.stockPricePen || this.product.wholesalePricePen || 0;
    return this.product.wholesalePricePen || 0;
  }

  get hasSaving(): boolean {
    const r = this.product.retailPricePen;
    return !!r && r > this.displayPrice;
  }

  get savingPct(): number {
    const r = this.product.retailPricePen!;
    return Math.round((1 - this.displayPrice / r) * 100);
  }

  addToCart(ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    // Agrega con el canal del modo. Si hay mezcla de canales, se bloquea.
    const ok = this.cart.addItem(this.product, 1, this.mode, this.displayPrice);
    if (!ok) {
      this.blocked.set(true);
      setTimeout(() => this.blocked.set(false), 2500);
      return;
    }
    this.added.set(true);
    setTimeout(() => this.added.set(false), 1300);

    const p = this.product;
    const value = this.displayPrice;
    try {
      (window as any).ttq?.track('AddToCart', {
        content_id: String(p.id), content_name: `${p.brand} - ${p.name}`,
        content_type: 'product', price: value, value, currency: 'PEN', quantity: 1
      });
    } catch {}
    try {
      (window as any).fbq?.('track', 'AddToCart', {
        content_ids: [String(p.id)], content_name: `${p.brand} - ${p.name}`,
        content_type: 'product', value, currency: 'PEN'
      });
    } catch {}
  }
}
