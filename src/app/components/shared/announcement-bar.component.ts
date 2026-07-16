import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsolidadoStateService } from '../../services/consolidado-state.service';

/**
 * Franja superior permanente del consolidado (estilo retail: mensaje de urgencia +
 * pill + cuenta regresiva en cajas). Visible en PC/tablet/celular, pegada por encima
 * del header. Solo aparece cuando hay algo que anunciar:
 *  - ABIERTO con plazo  → "cierra en" (rojo urgente si faltan <24h, gradiente si extendido)
 *  - PROGRAMADO         → "abre en"
 *  - resto              → no se renderiza (0 altura; `has-announce` en <html> apaga la var)
 * En móvil el timer de 4 cajas se compacta a "2d 04:33:12".
 */
@Component({
  selector: 'as-announcement-bar',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (cs.announcement(); as mode) {
      <a class="ann" routerLink="/catalogo"
         [class.urgent]="mode === 'closes' && cs.urgent()"
         [class.ext]="mode === 'closes' && extended()">
        <span class="ann-pill">{{ pillText() }}</span>
        <span class="ann-msg">{{ msgText() }}</span>
        <span class="ann-timer">
          <span class="ann-u"><b>{{ days() }}</b><i>Días</i></span>
          <span class="ann-u"><b>{{ hours() }}</b><i>Hrs</i></span>
          <span class="ann-u"><b>{{ minutes() }}</b><i>Min</i></span>
          <span class="ann-u"><b>{{ seconds() }}</b><i>Seg</i></span>
        </span>
        <span class="ann-compact">{{ compact() }}</span>
      </a>
    }
  `,
  styles: [`
    .ann {
      position: sticky; top: 0; z-index: 70;
      display: flex; align-items: center; justify-content: center;
      gap: 14px; height: var(--announce-h, 46px);
      background: var(--sale); color: #fff;
      font-size: 0.88rem; padding-inline: 12px;
      overflow: hidden; text-decoration: none;
      box-shadow: 0 2px 10px rgba(179, 18, 43, 0.3);
      transition: filter .15s var(--ease-out);
    }
    .ann:hover { filter: brightness(1.08); }
    .ann.ext { background: linear-gradient(135deg, #b3122b, #e8541e); }
    .ann-pill {
      flex: none;
      background: #fff; color: var(--sale);
      border-radius: 999px; padding: 4px 12px;
      font-weight: 800; font-size: 0.64rem; letter-spacing: 0.06em;
      text-transform: uppercase; white-space: nowrap; line-height: 1.4;
    }
    .ann.ext .ann-pill { color: #c2320f; }
    .ann-msg {
      font-weight: 700; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; min-width: 0;
      text-shadow: 0 1px 2px rgba(0,0,0,.18);
    }
    .ann-timer { display: flex; align-items: center; gap: 6px; flex: none; }
    .ann-u {
      display: flex; align-items: baseline; gap: 4px;
      background: #fff; color: var(--sale);
      border-radius: 7px; padding: 3px 9px;
      box-shadow: 0 1px 4px rgba(0,0,0,.18);
      animation: annBeat 1.25s ease-in-out infinite;
    }
    .ann-u b {
      font-variant-numeric: tabular-nums; font-weight: 900;
      font-size: 1.12rem; line-height: 1.2;
    }
    .ann-u i {
      font-style: normal; font-weight: 700; font-size: 0.56rem;
      text-transform: uppercase; letter-spacing: 0.03em; opacity: 0.6;
    }
    .ann-compact {
      display: none; flex: none;
      font-variant-numeric: tabular-nums; font-weight: 900; white-space: nowrap;
      background: #fff; color: var(--sale); border-radius: 7px; padding: 3px 10px;
      font-size: 1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.18);
      animation: annBeat 1.25s ease-in-out infinite;
    }
    /* Últimas horas: el palpito se acelera */
    .ann.urgent .ann-u, .ann.urgent .ann-compact { animation-duration: 0.75s; }
    @keyframes annBeat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    @media (max-width: 640px) {
      .ann { gap: 8px; font-size: 0.8rem; padding-inline: 10px; }
      .ann-timer { display: none; }
      .ann-compact { display: inline-block; }
      .ann-pill { font-size: 0.56rem; padding: 3px 9px; letter-spacing: 0.05em; }
      .ann-msg { max-width: 40vw; }
    }
    @media (max-width: 360px) {
      .ann-msg { max-width: 32vw; }
    }
  `]
})
export class AnnouncementBarComponent {
  cs = inject(ConsolidadoStateService);

  extended = computed(() => !!this.cs.state()?.extended);

  /** Ms del plazo que corresponde al modo (cierre o apertura). */
  private ms = computed(() => {
    const mode = this.cs.announcement();
    if (mode === 'closes') return this.cs.remainingMs() ?? 0;
    if (mode === 'opens') return this.cs.remainingToOpenMs() ?? 0;
    return 0;
  });

  private parts = computed(() => {
    const total = Math.floor(this.ms() / 1000);
    return {
      d: Math.floor(total / 86400),
      h: Math.floor((total % 86400) / 3600),
      m: Math.floor((total % 3600) / 60),
      s: total % 60
    };
  });

  days = computed(() => this.pad(this.parts().d));
  hours = computed(() => this.pad(this.parts().h));
  minutes = computed(() => this.pad(this.parts().m));
  seconds = computed(() => this.pad(this.parts().s));

  pillText = computed(() => {
    if (this.cs.announcement() === 'opens') return 'Próxima apertura';
    if (this.extended()) return '¡Plazo extendido!';
    return this.cs.urgent() ? 'Últimas horas' : 'Últimos días';
  });

  msgText = computed(() => {
    const s = this.cs.state();
    if (this.cs.announcement() === 'opens') {
      return s?.title ? `${s.title} abre en` : 'El próximo consolidado abre en';
    }
    return s?.title ? `${s.title} · cierra en` : 'El consolidado cierra en';
  });

  /** Formato móvil: "2d 04:33:12" (sin días cuando quedan menos de 24h). */
  compact = computed(() => {
    const p = this.parts();
    const hms = `${this.pad(p.h)}:${this.pad(p.m)}:${this.pad(p.s)}`;
    return p.d > 0 ? `${p.d}d ${hms}` : hms;
  });

  private pad(n: number) { return String(n).padStart(2, '0'); }
}
