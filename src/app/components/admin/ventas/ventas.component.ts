import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { Order, Product, RetailSale } from '../../../models/api.models';

interface VentaRow {
  fecha: string;
  producto: string;
  marca: string;
  cantidad: number;
  precioVenta: number;
  costoUnit: number;
  subtotal: number;
  ganancia: number;
  canal: string;
}

interface SheetStats {
  totalVentas: number;
  totalIngresos: number;
  totalGanancia: number;
  totalStock: number;
  productosConStock: number;
  porCanal: Record<string, number>;
  topProductos: Record<string, number>;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './ventas.component.html',
  styleUrl: './ventas.component.css'
})
export class VentasComponent implements OnInit {
  private api = inject(ApiService);

  // Config
  scriptUrl = signal('');
  formUrl = signal('');
  sheetUrl = signal('');

  // State
  stats = signal<SheetStats | null>(null);
  ventas = signal<VentaRow[]>([]);
  syncing = signal(false);
  loading = signal(false);
  message = signal('');
  tab = signal<'dashboard' | 'ventas' | 'config'>('dashboard');
  saving = signal(false);

  // Editable URL fields
  editScriptUrl = signal('');
  editFormUrl = signal('');
  editSheetUrl = signal('');

  // Backend callback config (for Google Form -> Backend sync)
  backendUrl = signal('');
  apiKey = signal('');
  editBackendUrl = signal('');

  // Store purchases (Compra Tienda)
  storeOrders = signal<Order[]>([]);

  // Ventas grouped by store purchase
  groupedVentas = computed(() => {
    const orders = this.storeOrders();
    const ventas = this.ventas();

    if (orders.length === 0) return [];

    // Sort orders by date ascending
    const sorted = [...orders].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Group ventas by purchase period
    return sorted.map((order, index) => {
      const orderDate = new Date(order.createdAt);
      const nextOrderDate = index < sorted.length - 1
        ? new Date(sorted[index + 1].createdAt)
        : null;

      // Parse ventas dates (format: dd/MM/yyyy HH:mm)
      const periodVentas = ventas.filter(v => {
        if (!v.fecha) return false;
        const parts = v.fecha.split(' ')[0].split('/');
        if (parts.length < 3) return false;
        const ventaDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
        return ventaDate >= orderDate && (!nextOrderDate || ventaDate < nextOrderDate);
      });

      return {
        number: index + 1,
        order,
        ventas: periodVentas
      };
    });
  });

  // Check if any grouped period actually has ventas
  hasGroupedVentas = computed(() =>
    this.groupedVentas().some(g => g.ventas.length > 0)
  );

  // Real ganancia calculated from corrected ventas
  realGanancia = computed(() =>
    this.ventas().reduce((sum, v) => sum + v.ganancia, 0)
  );
  realIngresos = computed(() =>
    this.ventas().reduce((sum, v) => sum + (v.precioVenta * v.cantidad), 0)
  );

  // Products for sync
  products = signal<Product[]>([]);
  retailStock = signal<Record<number, number>>({});

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    this.api.getConfig().subscribe({
      next: (configs) => {
        for (const c of configs) {
          if (c.configKey === 'google_script_url') this.scriptUrl.set(c.configValue);
          if (c.configKey === 'google_form_url') this.formUrl.set(c.configValue);
          if (c.configKey === 'google_sheet_url') this.sheetUrl.set(c.configValue);
          if (c.configKey === 'backend_public_url') this.backendUrl.set(c.configValue);
          if (c.configKey === 'form_sale_api_key') this.apiKey.set(c.configValue);
        }
        // Sync edit fields with current values
        this.editScriptUrl.set(this.scriptUrl());
        this.editFormUrl.set(this.formUrl());
        this.editSheetUrl.set(this.sheetUrl());
        this.editBackendUrl.set(this.backendUrl());

        // Always load store orders
        this.loadStoreOrders();

        if (this.scriptUrl()) {
          this.loadStats();
          this.loadVentas();
        }
      }
    });
  }

  saveUrls() {
    this.saving.set(true);
    this.message.set('Guardando URLs...');

    const updates: { key: string; value: string }[] = [];
    if (this.editScriptUrl().trim()) updates.push({ key: 'google_script_url', value: this.editScriptUrl().trim() });
    if (this.editFormUrl().trim()) updates.push({ key: 'google_form_url', value: this.editFormUrl().trim() });
    if (this.editSheetUrl().trim()) updates.push({ key: 'google_sheet_url', value: this.editSheetUrl().trim() });
    if (this.editBackendUrl().trim()) updates.push({ key: 'backend_public_url', value: this.editBackendUrl().trim() });

    if (updates.length === 0) {
      this.message.set('Ingresa al menos una URL');
      this.saving.set(false);
      return;
    }

    let completed = 0;
    let errors = 0;
    for (const u of updates) {
      this.api.updateConfig(u.key, u.value).subscribe({
        next: () => {
          completed++;
          if (completed + errors === updates.length) this.onSaveComplete(errors);
        },
        error: () => {
          errors++;
          if (completed + errors === updates.length) this.onSaveComplete(errors);
        }
      });
    }
  }

  private onSaveComplete(errors: number) {
    this.saving.set(false);
    if (errors > 0) {
      this.message.set('Error al guardar algunas URLs. Revisa que estés logueado.');
    } else {
      this.message.set('URLs guardadas correctamente!');
      this.loadConfig();
    }
    setTimeout(() => this.message.set(''), 4000);
  }

  setEditUrl(field: 'script' | 'form' | 'sheet' | 'backend', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'script') this.editScriptUrl.set(value);
    else if (field === 'form') this.editFormUrl.set(value);
    else if (field === 'sheet') this.editSheetUrl.set(value);
    else if (field === 'backend') this.editBackendUrl.set(value);
  }

  loadStats() {
    if (!this.scriptUrl()) return;
    this.loading.set(true);
    this.api.googleProxyGet('stats').subscribe({
      next: (s: SheetStats) => { this.stats.set(s); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  loadVentas() {
    if (!this.scriptUrl()) return;
    // Load ventas from Google Sheets
    this.api.googleProxyGet('ventas').subscribe({
      next: (v: VentaRow[]) => {
        // Load real costs from backend inventory to fix costs
        this.api.getRetailInventory(false).subscribe({
          next: (inventory) => {
            // Build cost map: average cost per product name
            const costMap: Record<string, number> = {};
            const qtyMap: Record<string, number> = {};
            for (const inv of inventory) {
              const key = `${inv.product.brand} - ${inv.product.name}`;
              const cost = inv.costPerUnitPen ?? 0;
              const qty = inv.quantity ?? 0;
              if (cost > 0) {
                costMap[key] = (costMap[key] || 0) + cost * Math.max(qty, 1);
                qtyMap[key] = (qtyMap[key] || 0) + Math.max(qty, 1);
              }
            }

            // Replace Sheet cost with real inventory cost
            const fixed = v.map(venta => {
              const key = `${venta.marca} - ${venta.producto}`;
              if (qtyMap[key] && costMap[key]) {
                const realCost = costMap[key] / qtyMap[key];
                return {
                  ...venta,
                  costoUnit: realCost,
                  ganancia: (venta.precioVenta * venta.cantidad) - (realCost * venta.cantidad)
                };
              }
              return venta;
            });
            this.ventas.set(fixed);
          },
          error: () => this.ventas.set(v) // fallback: use Sheet costs
        });
      },
      error: () => {}
    });
  }

  loadStoreOrders() {
    this.api.getOrders().subscribe({
      next: (orders) => {
        const store = orders.filter(o => o.clientName === 'COMPRA TIENDA');
        this.storeOrders.set(store);
      },
      error: () => {}
    });
  }

  syncStock() {
    if (!this.scriptUrl()) {
      this.message.set('Configura la URL del Web App primero');
      return;
    }

    this.syncing.set(true);
    this.message.set('Obteniendo productos y stock...');

    this.api.getProducts().subscribe({
      next: (products) => {
        this.api.getRetailStock().subscribe({
          next: (stock) => {
            // Load inventory to get REAL cost per unit (not consolidado price)
            this.api.getRetailInventory(true).subscribe({
              next: (inventory) => {
                // Calculate average cost per product from inventory
                const costMap: Record<number, number> = {};
                const qtyMap: Record<number, number> = {};
                for (const inv of inventory) {
                  const pid = inv.product.id;
                  const cost = inv.costPerUnitPen ?? 0;
                  const qty = inv.quantity ?? 0;
                  if (qty > 0) {
                    costMap[pid] = (costMap[pid] || 0) + cost * qty;
                    qtyMap[pid] = (qtyMap[pid] || 0) + qty;
                  }
                }

                const payload = products
                  .filter(p => (stock[p.id] ?? 0) > 0)
                  .map(p => {
                    // Use real cost from inventory, fallback to wholesalePricePen
                    const realCost = qtyMap[p.id] ? costMap[p.id] / qtyMap[p.id] : (p.wholesalePricePen || 0);
                    return {
                      id: p.id,
                      brand: p.brand,
                      name: p.name,
                      ml: p.ml,
                      costPen: realCost,
                      stock: stock[p.id] ?? 0,
                      imageUrl: p.imageUrl || ''
                    };
                  });

                this.message.set(`Enviando ${payload.length} productos al Google Sheet...`);

                this.api.googleProxyPost({
                  action: 'syncStock',
                  products: payload,
                  backendUrl: this.backendUrl() || '',
                  apiKey: this.apiKey() || ''
                }).subscribe({
                  next: () => {
                    this.message.set('Productos sincronizados. Importando ventas del Sheet...');
                    this.importSheetStock();
                  },
                  error: (err) => {
                    this.syncing.set(false);
                    this.message.set('Error al sincronizar: ' + (err.message || 'Error de red'));
                  }
                });
              },
              error: () => {
                this.syncing.set(false);
                this.message.set('Error al obtener inventario');
              }
            });
          },
          error: () => {
            this.syncing.set(false);
            this.message.set('Error al obtener stock del backend');
          }
        });
      },
      error: () => {
        this.syncing.set(false);
        this.message.set('Error al obtener productos');
      }
    });
  }

  /** Read stock from Google Sheet and adjust backend inventory to match */
  importSheetStock() {
    this.api.googleProxyGet('getSheetStock').subscribe({
      next: (sheetStock: Record<string, number>) => {
        if (!sheetStock || Object.keys(sheetStock).length === 0) {
          this.syncing.set(false);
          this.message.set('Sincronizado! (sin datos de stock en Sheet)');
          this.loadStats();
          setTimeout(() => this.message.set(''), 4000);
          return;
        }
        // Send sheet stock to backend to adjust inventory
        this.api.syncFromSheet(sheetStock).subscribe({
          next: (res: any) => {
            this.syncing.set(false);
            const removed = res.unitsRemoved || 0;
            if (removed > 0) {
              this.message.set(`Sincronizado! ${removed} unidades vendidas importadas del Sheet`);
            } else {
              this.message.set('Sincronizado! Stock al dia');
            }
            this.loadStats();
            setTimeout(() => this.message.set(''), 5000);
          },
          error: () => {
            this.syncing.set(false);
            this.message.set('Productos enviados, pero error al importar ventas del Sheet');
            setTimeout(() => this.message.set(''), 5000);
          }
        });
      },
      error: () => {
        this.syncing.set(false);
        this.message.set('Productos enviados, pero error al leer stock del Sheet');
        setTimeout(() => this.message.set(''), 5000);
      }
    });
  }

  openForm() {
    const url = this.formUrl();
    if (url) window.open(url, '_blank');
    else this.message.set('Configura la URL del formulario en Config');
  }

  openSheet() {
    const url = this.sheetUrl();
    if (url) window.open(url, '_blank');
    else this.message.set('Configura la URL del Google Sheet en Config');
  }

  canalKeys(): string[] {
    const s = this.stats();
    return s ? Object.keys(s.porCanal) : [];
  }

  setTab(t: 'dashboard' | 'ventas' | 'config') {
    this.tab.set(t);
    this.message.set('');
  }
}
