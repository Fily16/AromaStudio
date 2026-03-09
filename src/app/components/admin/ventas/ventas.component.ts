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
  saving = signal(false);

  // Editable URL fields
  editScriptUrl = signal('');
  editFormUrl = signal('');
  editSheetUrl = signal('');

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
        // Sync edit fields with current values
        this.editScriptUrl.set(this.scriptUrl());
        this.editFormUrl.set(this.formUrl());
        this.editSheetUrl.set(this.sheetUrl());

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

  setEditUrl(field: 'script' | 'form' | 'sheet', event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (field === 'script') this.editScriptUrl.set(value);
    else if (field === 'form') this.editFormUrl.set(value);
    else this.editSheetUrl.set(value);
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
