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

    <div class="adm-card adm-card-pad" style="max-width:440px;margin-top:18px">
      <h3 style="font-weight:700;margin-bottom:6px">Claude</h3>
      <p style="color:var(--a-muted);font-size:.86rem;line-height:1.5;margin-bottom:12px">
        Claude entra a tu panel con un permiso que dura un año, sin guardar tu contraseña. Si desconectas,
        deja de entrar al instante y la próxima vez te volverá a pedir tu usuario y clave en esta misma página.
        Tu sesión del panel no se ve afectada.
      </p>
      @if (claudeMsg()) { <p style="color:var(--a-ok);font-weight:600;font-size:.86rem">{{ claudeMsg() }}</p> }
      @if (desconectadoEl()) {
        <p style="color:var(--a-faint);font-size:.8rem;margin-bottom:10px">Última desconexión: {{ desconectadoEl() }}</p>
      }
      <button class="adm-btn danger" (click)="desconectarClaude()" [disabled]="desconectando()">
        {{ desconectando() ? 'Desconectando…' : 'Desconectar Claude' }}
      </button>
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
  desconectando = signal(false);
  claudeMsg = signal('');
  desconectadoEl = signal('');

  constructor() {
    this.api.getAgentTokenStatus().subscribe({
      next: (s) => this.desconectadoEl.set(s.revokedAt ? new Date(s.revokedAt).toLocaleString('es-PE') : ''),
      error: () => {}
    });
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

  desconectarClaude() {
    const aviso = '¿Desconectar Claude?\n\nDejará de entrar a tu panel al instante. La próxima vez tendrás que autorizarlo con tu usuario y clave.';
    if (!confirm(aviso)) return;
    this.desconectando.set(true);
    this.claudeMsg.set('');
    this.api.revokeAgentTokens().subscribe({
      next: (s) => {
        this.desconectando.set(false);
        this.claudeMsg.set('✓ Claude quedó desconectado.');
        this.desconectadoEl.set(s.revokedAt ? new Date(s.revokedAt).toLocaleString('es-PE') : '');
        setTimeout(() => this.claudeMsg.set(''), 4000);
      },
      error: () => { this.desconectando.set(false); this.claudeMsg.set('No se pudo desconectar. Intenta de nuevo.'); }
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
