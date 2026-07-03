import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../../services/api.service';

/**
 * Ajustes mínimos del ERP: solo los valores que cambian con el tiempo
 * (tipo de cambio USD→PEN y costo del courier por kg). El resto queda fijo.
 */
@Component({
  selector: 'app-admin-settings',
  standalone: true,
  template: `
    <h2 class="adm-section-title">Ajustes</h2>
    <div class="adm-card adm-card-pad" style="max-width:440px">
      @if (loading()) {
        <p style="color:var(--a-muted)">Cargando…</p>
      } @else {
        <div class="adm-field" style="margin-bottom:16px">
          <label>Tipo de cambio (USD → PEN)</label>
          <input class="adm-input" type="number" step="0.01" min="0"
                 [value]="exchangeRate()" (input)="exchangeRate.set(+$any($event.target).value)">
        </div>
        <div class="adm-field" style="margin-bottom:20px">
          <label>Courier por kilo (USD)</label>
          <input class="adm-input" type="number" step="0.1" min="0"
                 [value]="courier()" (input)="courier.set(+$any($event.target).value)">
        </div>
        <button class="adm-btn primary" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
        @if (saved()) { <span style="margin-left:12px;color:var(--a-ok);font-weight:600">✓ Guardado</span> }
        <p style="color:var(--a-faint);font-size:.8rem;margin-top:16px">
          El resto de parámetros (caja, depósito, margen) están fijos en el sistema.
        </p>
      }
    </div>
  `
})
export class SettingsComponent {
  private api = inject(ApiService);

  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  exchangeRate = signal(0);
  courier = signal(0);

  constructor() {
    this.api.getConfig().subscribe({
      next: (cfg) => {
        const ex = cfg.find(c => c.configKey === 'exchange_rate');
        const co = cfg.find(c => c.configKey === 'courier_cost_per_kg');
        this.exchangeRate.set(ex ? +ex.configValue : 0);
        this.courier.set(co ? +co.configValue : 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save() {
    this.saving.set(true);
    this.saved.set(false);
    this.api.updateConfig('exchange_rate', String(this.exchangeRate())).subscribe({
      next: () => {
        this.api.updateConfig('courier_cost_per_kg', String(this.courier())).subscribe({
          next: () => { this.saving.set(false); this.saved.set(true); setTimeout(() => this.saved.set(false), 2500); },
          error: () => this.saving.set(false)
        });
      },
      error: () => this.saving.set(false)
    });
  }
}
