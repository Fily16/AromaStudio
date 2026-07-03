import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { SearchService } from '../../services/search.service';
import { CartService } from '../../services/cart.service';

/**
 * Header global tipo FragranceNet: marca, mega-buscador con dropdown de
 * sugerencias (miniatura + precio) y categorías rápidas, y carrito con contador.
 * Layout que se reacomoda con flex-wrap (sin breakpoints fijos).
 */
@Component({
  selector: 'as-header',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="utility">
      Importación directa desde USA · Precios al por mayor · Envíos a todo el Perú
    </div>

    <header class="hdr">
      <div class="as-container hdr-row">
        <a class="brand" routerLink="/" aria-label="AromaStudio inicio">AromaStudio</a>

        <div class="search" [class.open]="search.open()">
          <input class="search-input" type="search" autocomplete="off"
                 [value]="search.term()"
                 (input)="onInput($event)"
                 (focus)="search.open.set(true)"
                 (keydown.enter)="onEnter()"
                 placeholder="Busca por nombre, marca o código (UPC)…"
                 aria-label="Buscar perfumes">
          <button class="search-go" (click)="onEnter()" aria-label="Buscar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          @if (search.open()) {
            <div class="dropdown">
              @if (search.loading()) {
                <div class="dd-msg">Buscando…</div>
              } @else if (search.term().trim().length >= 2 && search.results().length === 0) {
                <div class="dd-msg">Sin resultados para "{{ search.term() }}"</div>
              }

              @if (search.results().length) {
                <div class="dd-label">Productos</div>
                @for (r of search.results(); track r.id) {
                  <a class="dd-item" [routerLink]="['/producto', r.id]" (click)="pick()">
                    <div class="dd-thumb">
                      @if (r.imageUrl) { <img [src]="r.imageUrl" [alt]="r.name" loading="lazy"> }
                    </div>
                    <div class="dd-info">
                      <span class="dd-brand">{{ r.brand }}</span>
                      <span class="dd-name">{{ r.name }}@if (r.ml) { · {{ r.ml }}ml }</span>
                    </div>
                    <span class="dd-price">S/ {{ (r.wholesalePricePen || 0) | number:'1.2-2' }}</span>
                  </a>
                }
                <button class="dd-all" (click)="onEnter()">Ver todos los resultados →</button>
              }

              <div class="dd-label">Explorar</div>
              <div class="dd-cats">
                <button (click)="goCat('women')">Para Ella</button>
                <button (click)="goCat('men')">Para Él</button>
                <button (click)="goCat('unisex')">Unisex</button>
                <button (click)="goAll()">Todo el catálogo</button>
              </div>
            </div>
          }
        </div>

        <nav class="actions">
          <a class="catalog-link" routerLink="/catalogo">Catálogo</a>
          <a class="cart" routerLink="/cart" aria-label="Carrito">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="9" cy="21" r="1.6"/><circle cx="18" cy="21" r="1.6"/>
              <path d="M2.5 3h2l2.2 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 7H6"/>
            </svg>
            @if (cart.itemCount() > 0) { <span class="cart-badge">{{ cart.itemCount() }}</span> }
          </a>
        </nav>
      </div>
    </header>

    @if (search.open()) { <div class="search-backdrop" (click)="search.close()"></div> }
  `,
  styles: [`
    .utility {
      background: var(--accent-700);
      color: #fff;
      text-align: center;
      font-size: 0.72rem;
      letter-spacing: 0.03em;
      padding: 7px 12px;
    }
    .hdr {
      position: sticky; top: 0; z-index: 60;
      background: #fff;
      border-bottom: 1px solid var(--line);
    }
    .hdr-row {
      display: flex; align-items: center; gap: clamp(12px, 2.5vw, 28px);
      padding-block: 14px;
      flex-wrap: wrap;
    }
    .brand {
      font-family: var(--font-display);
      font-size: clamp(1.3rem, 1rem + 1.3vw, 1.8rem);
      font-weight: 700; color: var(--ink); letter-spacing: 0.01em;
      white-space: nowrap;
    }
    .search { position: relative; flex: 1 1 320px; display: flex; min-width: 220px; }
    .search-input {
      width: 100%;
      border: 1.5px solid var(--line-strong);
      border-right: none;
      border-radius: 999px 0 0 999px;
      padding: 11px 18px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color .15s var(--ease-out);
    }
    .search.open .search-input, .search-input:focus { border-color: var(--accent); }
    .search-go {
      border: 1.5px solid var(--accent);
      background: var(--accent);
      color: #fff;
      border-radius: 0 999px 999px 0;
      padding: 0 18px;
      display: grid; place-items: center;
    }
    .search-go:hover { background: var(--accent-700); border-color: var(--accent-700); }

    .dropdown {
      position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 70;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--r);
      box-shadow: var(--shadow-lg);
      max-height: min(70vh, 520px);
      overflow-y: auto;
      padding: 8px;
      animation: fadeSlideDown .16s var(--ease-out);
    }
    .dd-msg { padding: 16px; color: var(--muted); font-size: 0.86rem; text-align: center; }
    .dd-label {
      font-size: 0.64rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--muted); padding: 10px 10px 6px;
    }
    .dd-item {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 10px; border-radius: var(--r-sm);
    }
    .dd-item:hover { background: var(--bg-soft); }
    .dd-thumb {
      width: 46px; height: 46px; flex: none; border-radius: 6px;
      background: #fbfbfb; display: grid; place-items: center; overflow: hidden;
    }
    .dd-thumb img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
    .dd-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
    .dd-brand { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--accent); }
    .dd-name { font-size: 0.85rem; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dd-price { font-size: 0.85rem; font-weight: 700; color: var(--ink); white-space: nowrap; }
    .dd-all {
      width: 100%; text-align: left; padding: 10px; margin-top: 2px;
      color: var(--accent); font-weight: 600; font-size: 0.84rem;
      border-top: 1px solid var(--line);
    }
    .dd-all:hover { background: var(--bg-soft); }
    .dd-cats { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 10px 10px; }
    .dd-cats button {
      border: 1px solid var(--line-strong); background: #fff; color: var(--ink);
      border-radius: 999px; padding: 7px 14px; font-size: 0.8rem; font-weight: 500;
    }
    .dd-cats button:hover { border-color: var(--accent); color: var(--accent); }

    .actions { display: flex; align-items: center; gap: clamp(10px, 2vw, 22px); margin-left: auto; }
    .catalog-link { font-weight: 600; font-size: 0.88rem; color: var(--ink); }
    .catalog-link:hover { color: var(--accent); }
    .cart { position: relative; color: var(--ink); display: inline-flex; }
    .cart:hover { color: var(--accent); }
    .cart-badge {
      position: absolute; top: -7px; right: -9px;
      background: var(--accent); color: #fff;
      font-size: 0.64rem; font-weight: 700;
      min-width: 17px; height: 17px; padding: 0 4px;
      border-radius: 999px; display: grid; place-items: center;
    }
    .search-backdrop { position: fixed; inset: 0; z-index: 50; }

    /* En pantallas anchas el buscador puede ser más protagonista */
    @media (min-width: 760px) {
      .search { order: 0; }
      .actions { order: 0; }
    }
  `]
})
export class HeaderComponent {
  search = inject(SearchService);
  cart = inject(CartService);
  private router = inject(Router);

  onInput(ev: Event) {
    this.search.input((ev.target as HTMLInputElement).value);
  }

  onEnter() {
    const t = this.search.term().trim();
    this.search.close();
    if (t) this.router.navigate(['/catalogo'], { queryParams: { q: t } });
  }

  pick() {
    this.search.close();
  }

  goCat(category: string) {
    this.search.close();
    this.router.navigate(['/catalogo'], { queryParams: { category } });
  }

  goAll() {
    this.search.close();
    this.router.navigate(['/catalogo']);
  }
}
