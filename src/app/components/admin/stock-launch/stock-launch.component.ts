import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Product, RetailInventory, RetailSale } from '../../../models/api.models';
import { PromotionsAdminComponent } from '../promotions/promotions-admin.component';

/**
 * Lanzar a stock: el admin selecciona perfumes que tiene físicamente y los "lanza"
 * a la tienda. El backend crea inventario retail y fija el precio = costo landed + S/35.
 */
@Component({
  selector: 'app-admin-stock-launch',
  standalone: true,
  imports: [DecimalPipe, PromotionsAdminComponent],
  template: `
    <div class="ord-head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px">
      <h2 class="adm-section-title" style="margin:0">Stock de tienda</h2>
      <div class="adm-kpi profit" style="padding:10px 16px;min-width:180px">
        <div class="k-label">Ganado con stock</div>
        <div class="k-value" style="font-size:1.3rem">S/ {{ earned() | number:'1.0-0' }}</div>
      </div>
    </div>

    <!-- Pestañas: stock de tienda / promociones -->
    <div class="sl-tabs">
      <button [class.on]="tab() === 'stock'" (click)="tab.set('stock')">Stock de tienda</button>
      <button [class.on]="tab() === 'promos'" (click)="tab.set('promos')">Promociones</button>
    </div>

    @if (tab() === 'stock') {
    <p style="color:var(--a-muted);margin-bottom:16px;max-width:640px">
      Selecciona los perfumes que tienes y dale <b>Lanzar</b>. Aparecerán como
      “entrega inmediata” en la tienda, con precio automático de <b>costo + S/35</b>.
    </p>

    <div class="sl-grid">
      <!-- Catálogo -->
      <div class="adm-card">
        <div class="adm-card-pad" style="border-bottom:1px solid var(--a-line)">
          <input class="adm-input" type="search" placeholder="Buscar perfume por nombre, marca o SKU…"
                 [value]="query()" (input)="query.set($any($event.target).value)">
        </div>
        <div class="sl-list">
          @if (loading()) {
            <p style="padding:18px;color:var(--a-muted)">Cargando catálogo…</p>
          } @else {
            @for (p of filtered(); track p.id) {
              <label class="sl-item" [class.on]="selected().has(p.id)">
                <input type="checkbox" [checked]="selected().has(p.id)" (change)="toggle(p)">
                <div class="sl-thumb">
                  @if (p.imageUrl) { <img [src]="p.imageUrl" [alt]="p.name"> } @else { <span>{{ p.brand }}</span> }
                </div>
                <div class="sl-info">
                  <span class="sl-brand">{{ p.brand }}</span>
                  <span class="sl-name">{{ p.name }} @if (p.ml) { · {{ p.ml }}ml }</span>
                </div>
                <span class="sl-price">S/ {{ (p.wholesalePricePen || 0) | number:'1.0-0' }}</span>
              </label>
            } @empty {
              <p style="padding:18px;color:var(--a-muted)">Sin resultados.</p>
            }
          }
        </div>
      </div>

      <!-- Seleccionados -->
      <div class="adm-card adm-card-pad sl-cart">
        <h3 style="font-weight:700;margin-bottom:12px">Para lanzar ({{ selected().size }})</h3>
        @if (selected().size === 0) {
          <p style="color:var(--a-muted);font-size:.88rem">Aún no seleccionas perfumes.</p>
        } @else {
          <div class="sl-selected">
            @for (row of selectedRows(); track row.product.id) {
              <div class="sl-row">
                <span class="sl-row-name">{{ row.product.brand }} — {{ row.product.name }}</span>
                <div class="sl-qty">
                  <button class="adm-btn ghost sm" (click)="changeQty(row.product.id, -1)">−</button>
                  <span>{{ row.qty }}</span>
                  <button class="adm-btn ghost sm" (click)="changeQty(row.product.id, 1)">+</button>
                </div>
                <button class="adm-btn ghost sm" (click)="remove(row.product.id)" title="Quitar">✕</button>
              </div>
            }
          </div>
          <button class="adm-btn primary" style="width:100%;margin-top:16px" (click)="launch()" [disabled]="launching()">
            {{ launching() ? 'Lanzando…' : 'Lanzar ' + totalUnits() + ' unidades a la tienda' }}
          </button>
        }
        @if (message()) { <p class="sl-msg">{{ message() }}</p> }
      </div>
    </div>

    <!-- Stock actual en tienda -->
    <h3 style="font-weight:700;margin:26px 0 12px">En stock ahora ({{ stockRows().length }})</h3>
    @if (stockRows().length === 0) {
      <div class="adm-card adm-card-pad" style="color:var(--a-muted)">Aún no tienes perfumes en stock. Lanza algunos arriba.</div>
    } @else {
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead><tr><th>Perfume</th><th class="num">En stock</th><th class="num">Precio tienda</th><th>Vender</th></tr></thead>
          <tbody>
            @for (r of stockRows(); track r.product.id) {
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div class="sl-thumb">@if (r.product.imageUrl) { <img [src]="r.product.imageUrl" [alt]="r.product.name"> } @else { <span>{{ r.product.brand }}</span> }</div>
                    <div><b>{{ r.product.brand }}</b><div style="font-size:.82rem;color:var(--a-muted)">{{ r.product.name }} @if (r.product.ml) { · {{ r.product.ml }}ml }</div></div>
                  </div>
                </td>
                <td class="num">{{ r.quantity }}</td>
                <td class="num">S/ {{ (r.product.stockPricePen || 0) | number:'1.2-2' }}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <input class="adm-input" type="number" min="1" [max]="r.quantity" [value]="1" #q style="width:64px;padding:6px 8px">
                    <button class="adm-btn ok sm" (click)="sell(r, +q.value)">Vender</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    }

    @if (tab() === 'promos') {
      <app-promotions-admin></app-promotions-admin>
    }
  `,
  styles: [`
    .sl-tabs { display: inline-flex; gap: 4px; background: var(--a-surface-2); border: 1px solid var(--a-line); border-radius: 999px; padding: 4px; margin-bottom: 18px; }
    .sl-tabs button { border: none; background: none; cursor: pointer; font: inherit; padding: 7px 18px; border-radius: 999px; font-size: .86rem; font-weight: 600; color: var(--a-muted); }
    .sl-tabs button.on { background: var(--a-surface); color: var(--a-ink); box-shadow: var(--a-shadow); }
    .sl-grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
    @media (min-width: 900px) { .sl-grid { grid-template-columns: 1fr 340px; align-items: start; } }
    .sl-list { max-height: 62vh; overflow-y: auto; }
    .sl-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--a-line); cursor: pointer; }
    .sl-item:hover { background: var(--a-surface-2); }
    .sl-item.on { background: var(--a-accent-050); }
    .sl-item input { width: 16px; height: 16px; accent-color: var(--a-accent); }
    .sl-thumb { width: 40px; height: 40px; border-radius: 6px; background: #f4f4f6; display: grid; place-items: center; overflow: hidden; flex: 0 0 auto; }
    .sl-thumb img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
    .sl-thumb span { font-size: .6rem; color: var(--a-faint); text-align: center; }
    .sl-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .sl-brand { font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; color: var(--a-muted); font-weight: 700; }
    .sl-name { font-size: .88rem; color: var(--a-ink); }
    .sl-price { font-weight: 700; font-size: .88rem; }
    .sl-cart { position: sticky; top: 76px; }
    .sl-selected { display: flex; flex-direction: column; gap: 8px; }
    .sl-row { display: flex; align-items: center; gap: 8px; }
    .sl-row-name { flex: 1; font-size: .82rem; }
    .sl-qty { display: flex; align-items: center; gap: 6px; }
    .sl-qty span { min-width: 20px; text-align: center; font-weight: 600; font-size: .85rem; }
    .sl-msg { margin-top: 12px; color: var(--a-ok); font-weight: 600; font-size: .88rem; }
  `]
})
export class StockLaunchComponent {
  private api = inject(ApiService);

  tab = signal<'stock' | 'promos'>('stock');
  loading = signal(true);
  launching = signal(false);
  message = signal('');
  allProducts = signal<Product[]>([]);
  query = signal('');
  selected = signal<Map<number, number>>(new Map());
  inventory = signal<RetailInventory[]>([]);
  sales = signal<RetailSale[]>([]);

  // Stock agregado por producto (suma de filas de inventario con cantidad > 0)
  stockRows = computed(() => {
    const m = new Map<number, { product: Product; quantity: number }>();
    for (const inv of this.inventory()) {
      if (!inv.product || (inv.quantity || 0) <= 0) continue;
      const row = m.get(inv.product.id);
      if (row) row.quantity += inv.quantity;
      else m.set(inv.product.id, { product: inv.product, quantity: inv.quantity });
    }
    return [...m.values()].sort((a, b) => a.product.brand.localeCompare(b.product.brand));
  });

  earned = computed(() => this.sales().reduce((s, x) => s + (x.profitPen || 0), 0));

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    let list = this.allProducts();
    if (q) {
      const tokens = q.split(/\s+/);
      list = list.filter(p => {
        const hay = `${p.name} ${p.brand} ${p.sku ?? ''}`.toLowerCase();
        return tokens.every(t => hay.includes(t));
      });
    }
    return list.slice(0, 80);
  });

  selectedRows = computed(() => {
    const map = this.selected();
    const byId = new Map(this.allProducts().map(p => [p.id, p]));
    return [...map.entries()]
      .filter(([id]) => byId.has(id))
      .map(([id, qty]) => ({ product: byId.get(id)!, qty }));
  });

  totalUnits = computed(() => [...this.selected().values()].reduce((a, b) => a + b, 0));

  constructor() {
    this.api.getProducts({ onlyAvailable: false }).subscribe({
      next: (products) => { this.allProducts.set(products); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.loadStock();
  }

  loadStock() {
    this.api.getRetailInventory(true).subscribe({ next: (inv) => this.inventory.set(inv), error: () => {} });
    this.api.getRetailSales().subscribe({ next: (s) => this.sales.set(s), error: () => {} });
  }

  sell(row: { product: Product; quantity: number }, qty: number) {
    const n = Math.max(1, Math.min(qty || 1, row.quantity));
    const price = row.product.stockPricePen || 0;
    this.api.registerRetailSale({ productId: row.product.id, quantity: n, salePricePen: price, channel: 'TIENDA' }).subscribe({
      next: () => { this.message.set(`✓ Vendiste ${n} × ${row.product.brand} ${row.product.name}.`); this.loadStock(); },
      error: () => this.message.set('No se pudo registrar la venta.')
    });
  }

  toggle(p: Product) {
    const next = new Map(this.selected());
    next.has(p.id) ? next.delete(p.id) : next.set(p.id, 1);
    this.selected.set(next);
  }

  changeQty(id: number, delta: number) {
    const next = new Map(this.selected());
    const q = Math.max(1, (next.get(id) || 1) + delta);
    next.set(id, q);
    this.selected.set(next);
  }

  remove(id: number) {
    const next = new Map(this.selected());
    next.delete(id);
    this.selected.set(next);
  }

  launch() {
    const items = [...this.selected().entries()].map(([productId, quantity]) => ({ productId, quantity }));
    if (!items.length) return;
    this.launching.set(true);
    this.message.set('');
    this.api.launchToStock(items).subscribe({
      next: (res) => {
        this.launching.set(false);
        this.message.set(`✓ ${res.launched} perfume(s) lanzados a la tienda con precio costo + S/35.`);
        this.selected.set(new Map());
        this.loadStock();
      },
      error: () => {
        this.launching.set(false);
        this.message.set('Ocurrió un error al lanzar. Intenta de nuevo.');
      }
    });
  }
}
