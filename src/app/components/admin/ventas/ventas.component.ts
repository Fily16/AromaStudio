import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../services/api.service';
import { Product } from '../../../models/api.models';

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
  private http = inject(HttpClient);

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
        }
        if (this.scriptUrl()) {
          this.loadStats();
          this.loadVentas();
        }
      }
    });
  }

  loadStats() {
    const url = this.scriptUrl();
    if (!url) return;
    this.loading.set(true);
    this.http.get<SheetStats>(`${url}?action=stats`).subscribe({
      next: (s) => { this.stats.set(s); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  loadVentas() {
    const url = this.scriptUrl();
    if (!url) return;
    this.http.get<VentaRow[]>(`${url}?action=ventas`).subscribe({
      next: (v) => this.ventas.set(v),
      error: () => {}
    });
  }

  syncStock() {
    const url = this.scriptUrl();
    if (!url) {
      this.message.set('Configura la URL del Web App primero');
      return;
    }

    this.syncing.set(true);
    this.message.set('Obteniendo productos y stock...');

    // Fetch products and retail stock in parallel
    this.api.getProducts().subscribe({
      next: (products) => {
        this.api.getRetailStock().subscribe({
          next: (stock) => {
            const payload = products
              .filter(p => (stock[p.id] ?? 0) > 0)
              .map(p => ({
                id: p.id,
                brand: p.brand,
                name: p.name,
                ml: p.ml,
                costPen: p.wholesalePricePen || 0,
                stock: stock[p.id] ?? 0,
                imageUrl: p.imageUrl || ''
              }));

            this.message.set(`Enviando ${payload.length} productos al Google Sheet...`);

            this.http.post(url, {
              action: 'syncStock',
              products: payload
            }).subscribe({
              next: () => {
                this.syncing.set(false);
                this.message.set(`Sincronizado! ${payload.length} productos enviados al Google Sheet`);
                this.loadStats();
                setTimeout(() => this.message.set(''), 4000);
              },
              error: (err) => {
                this.syncing.set(false);
                this.message.set('Error al sincronizar: ' + (err.message || 'Error de red'));
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
