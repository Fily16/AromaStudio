import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsolidadoStateService } from '../../services/consolidado-state.service';

/**
 * Aviso de alta prioridad del consolidado abierto: se muestra sobre banners y
 * promociones al entrar al sitio, con cuenta regresiva en vivo hasta el cierre.
 * Solo se cierra con la X (no con clic afuera) y no reaparece en la sesión.
 */
@Component({
  selector: 'app-countdown-modal',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (cs.modalVisible() && cs.state(); as s) {
      <div class="cd-overlay">
        <div class="cd-card" [class.ext]="s.extended">
          <button class="cd-x" (click)="cs.closeModal()" aria-label="Cerrar">✕</button>

          @if (cs.imageUrl(); as img) {
            <img class="cd-img" [src]="img" alt="" />
          }

          <div class="cd-body">
            <div class="cd-flag">
              {{ s.extended ? '⏰ ¡Plazo extendido! Aprovecha' : '🔥 Consolidado abierto' }}
            </div>

            <h3 class="cd-title">{{ s.title || 'Pedidos por encargo abiertos' }}</h3>
            @if (s.description) { <p class="cd-desc">{{ s.description }}</p> }

            <p class="cd-label">
              {{ cs.urgent() ? '⚠️ ¡Últimas horas para participar!' : 'El pedido cierra en' }}
            </p>

            <div class="cd-timer" [class.urgent]="cs.urgent()">
              <div class="cd-unit"><b>{{ days() }}</b><span>días</span></div>
              <i>:</i>
              <div class="cd-unit"><b>{{ hours() }}</b><span>hrs</span></div>
              <i>:</i>
              <div class="cd-unit"><b>{{ minutes() }}</b><span>min</span></div>
              <i>:</i>
              <div class="cd-unit"><b>{{ seconds() }}</b><span>seg</span></div>
            </div>

            <a class="cd-cta" routerLink="/catalogo" (click)="cs.closeModal()">Hacer mi pedido ahora</a>
            <button class="cd-later" (click)="cs.closeModal()">Seguir viendo</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cd-overlay {
      position: fixed; inset: 0; z-index: 300;      /* sobre el popup de promos (200) */
      background: rgba(0,0,0,.58);
      display: grid; place-items: center; padding: 20px;
      animation: fadeIn .25s var(--ease-out);
    }
    .cd-card {
      position: relative; background: #fff; border-radius: var(--r);
      overflow: hidden; width: min(94vw, 440px); max-height: 94vh; overflow-y: auto;
      box-shadow: var(--shadow-xl); animation: scaleIn .3s var(--ease-spring);
      border-top: 5px solid var(--sale);
    }
    .cd-card.ext { border-top-color: #e8541e; }
    .cd-x {
      position: absolute; top: 8px; right: 8px; z-index: 2;
      width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer;
      background: rgba(255,255,255,.92); color: var(--ink); font-size: 15px; line-height: 1;
      box-shadow: var(--shadow-sm);
    }
    .cd-x:hover { background: #fff; }
    .cd-img { width: 100%; max-height: 200px; object-fit: cover; display: block; background: var(--line); }
    .cd-body { padding: 18px 20px 20px; text-align: center; }
    .cd-flag {
      display: inline-block; background: var(--sale); color: #fff;
      font-size: .72rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
      padding: 4px 12px; border-radius: 999px; margin-bottom: 10px;
    }
    .cd-card.ext .cd-flag { background: linear-gradient(135deg, #b3122b, #e8541e); }
    .cd-title { font-size: 1.25rem; font-weight: 800; letter-spacing: -.01em; margin-bottom: 4px; }
    .cd-desc { color: var(--muted); font-size: .88rem; margin-bottom: 12px; }
    .cd-label { color: var(--muted); font-size: .8rem; font-weight: 600; margin: 12px 0 8px; }
    .cd-timer {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      background: #fff5f6; border: 1px solid #f6d3d8; border-radius: 12px;
      padding: 12px 10px; margin-bottom: 16px;
    }
    .cd-timer i { color: var(--sale); font-style: normal; font-weight: 700; opacity: .5; margin-bottom: 12px; }
    .cd-unit { display: flex; flex-direction: column; min-width: 52px; }
    .cd-unit b {
      font-size: 1.75rem; font-weight: 800; color: var(--sale);
      font-variant-numeric: tabular-nums; line-height: 1.1;
    }
    .cd-unit span { font-size: .62rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 700; }
    .cd-timer.urgent { animation: pulse-soft 1.6s ease-in-out infinite; }
    .cd-cta {
      display: block; background: var(--accent); color: #fff;
      padding: 12px 18px; border-radius: 999px; font-weight: 700; font-size: .92rem;
      text-decoration: none; transition: transform .15s var(--ease-out), filter .15s;
    }
    .cd-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .cd-later {
      margin-top: 8px; background: none; border: none; cursor: pointer;
      color: var(--muted); font-size: .8rem; text-decoration: underline;
    }
    @media (max-width: 380px) {
      .cd-unit { min-width: 44px; }
      .cd-unit b { font-size: 1.45rem; }
    }
  `]
})
export class CountdownModalComponent {
  cs = inject(ConsolidadoStateService);

  private parts = computed(() => {
    const ms = this.cs.remainingMs() ?? 0;
    const total = Math.floor(ms / 1000);
    return {
      d: Math.floor(total / 86400),
      h: Math.floor((total % 86400) / 3600),
      m: Math.floor((total % 3600) / 60),
      s: total % 60
    };
  });

  days = computed(() => String(this.parts().d));
  hours = computed(() => this.pad(this.parts().h));
  minutes = computed(() => this.pad(this.parts().m));
  seconds = computed(() => this.pad(this.parts().s));

  private pad(n: number) { return String(n).padStart(2, '0'); }
}
