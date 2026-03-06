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
    miami_shipping_extra: 'Costo Extra Miami (USD)'
  };

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
    this.api.updateConfig(key, value).subscribe({
      next: () => {
        this.message.set('Configuración actualizada');
        this.editing.set(null);
        this.load();
        setTimeout(() => this.message.set(''), 3000);
      },
      error: () => this.message.set('Error al actualizar')
    });
  }

  setEditValue(e: Event) {
    this.editValue.set((e.target as HTMLInputElement).value);
  }
}
