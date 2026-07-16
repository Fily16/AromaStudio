import { Component } from '@angular/core';
import { openWhatsApp, waLink } from '../../shared/whatsapp.util';

/**
 * Botón flotante de WhatsApp SOLO para celular (≤640px): pill fijo en la esquina
 * inferior IZQUIERDA con texto visible, presente en todas las rutas públicas.
 * En desktop no se muestra (el home conserva su círculo clásico a la derecha).
 * z-index 80: por debajo del bottom-sheet de filtros del catálogo (90/100),
 * que lo tapa mientras está abierto — a propósito.
 */
@Component({
  selector: 'as-whatsapp-fab',
  standalone: true,
  template: `
    <a class="wa-pill" [href]="href" (click)="go($event)" target="_blank" rel="noopener"
       aria-label="Contáctanos por WhatsApp">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.5-.3.3c-.1.1-.3.3-.1.6.1.3.7 1.1 1.5 1.8 1 .9 1.8 1.1 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.1.1.6-.1 1.3Z"/>
      </svg>
      <span>Contáctanos</span>
    </a>
  `,
  styles: [`
    .wa-pill {
      position: fixed;
      left: 14px;
      bottom: calc(14px + env(safe-area-inset-bottom, 0px));
      z-index: 80;
      display: none;
      align-items: center;
      gap: 8px;
      min-height: 48px;
      padding: 12px 18px;
      border-radius: 999px;
      background: #25d366;
      color: #fff;
      font-weight: 700;
      font-size: 0.9rem;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(37, 211, 102, 0.45);
    }
    .wa-pill:active { transform: scale(0.97); }
    @media (max-width: 640px) {
      .wa-pill { display: inline-flex; }
    }
  `]
})
export class WhatsappFabComponent {
  href = waLink();

  go(ev: Event) {
    ev.preventDefault();
    openWhatsApp(undefined, { content_name: 'WhatsApp FAB móvil' });
  }
}
