import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { AppConfig } from '../../../models/api.models';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './config.component.html',
  styleUrl: './config.component.css'
})
export class ConfigComponent implements OnInit {
  private api = inject(ApiService);

  configs = signal<AppConfig[]>([]);
  editing = signal<string | null>(null);
  editValue = signal('');
  message = signal('');

  readonly labels: Record<string, string> = {
    courier_cost_per_kg: 'Costo Courier por KG (USD)',
    exchange_rate: 'Tipo de Cambio (USD → PEN)',
    target_margin: 'Margen Objetivo (%)',
    min_order_usd: 'Pedido Mínimo (USD)',
    box_weight_g: 'Peso de Caja (gramos)',
    perfumes_per_box: 'Perfumes por Caja',
    yape_number: 'Número de Yape',
    miami_shipping_threshold: 'Umbral Envío Miami (USD)',
    miami_shipping_extra: 'Costo Extra Miami (USD)',
    wholesale_profit_per_unit: 'Ganancia por Unidad Consolidado (S/)',
    deposit_per_unit: 'Separación por Perfume (S/)',
    google_script_url: 'Google Apps Script - Web App URL',
    google_form_url: 'Google Form URL',
    google_sheet_url: 'Google Sheet URL'
  };

  // NUEVO: Método de reinicio
  resetSystem() {
    if (confirm('🚨 ¡ATENCIÓN! Esto borrará TODAS las ventas, el inventario de tienda, los pedidos de clientes y los consolidados. Tus perfumes y precios NO se borrarán. ¿Estás absolutamente seguro de empezar desde cero?')) {
      this.api.factoryResetOperations().subscribe({
        next: (res) => {
          alert(res.message);
          window.location.reload(); // Recarga la página para mostrar todo en cero
        },
        error: (err) => {
          console.error(err);
          alert('Hubo un error al reiniciar. Revisa la consola.');
        }
      });
    }
  }
  ngOnInit() { this.load(); }

  load() {
    this.api.getConfig().subscribe(c => this.configs.set(c));
  }

  getLabel(key: string): string {
    return this.labels[key] || key;
  }

  startEdit(config: AppConfig) {
    this.editing.set(config.configKey);
    this.editValue.set(config.configValue);
  }

  cancelEdit() {
    this.editing.set(null);
    this.editValue.set('');
  }

  saveEdit(key: string) {
    const value = this.editValue();
    if (!value.trim()) {
      this.message.set('⚠ El valor no puede estar vacío');
      setTimeout(() => this.message.set(''), 3000);
      return;
    }
    this.api.updateConfig(key, value).subscribe({
      next: () => {
        this.message.set('✓ Configuración actualizada');
        this.editing.set(null);
        this.load();
        setTimeout(() => this.message.set(''), 3000);
      },
      error: (err) => {
        console.error('Error saving config:', err);
        const detail = err.status === 401 || err.status === 403
          ? 'Sesión expirada — vuelve a iniciar sesión'
          : (err.error?.message || 'Error de red');
        this.message.set('✗ ' + detail);
        setTimeout(() => this.message.set(''), 5000);
      }
    });
  }

  setEditValue(e: Event) {
    this.editValue.set((e.target as HTMLInputElement).value);
  }
}
