import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Footer global de la tienda. */
@Component({
  selector: 'as-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="ft">
      <div class="as-container ft-grid">
        <div class="ft-brand">
          <span class="brand">AromaStudio</span>
          <p>Perfumes árabes originales importados desde USA. Venta al por mayor y unitaria, con envíos a todo el Perú.</p>
          <a class="wa" href="https://wa.me/51933134699" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.5-.3.3c-.1.1-.3.3-.1.6.1.3.7 1.1 1.5 1.8 1 .9 1.8 1.1 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.1.1.6-.1 1.3Z"/></svg>
            981 587 009
          </a>
        </div>

        <div class="ft-col">
          <h4>Tienda</h4>
          <a routerLink="/catalogo">Catálogo completo</a>
          <a routerLink="/catalogo" [queryParams]="{ category: 'women' }">Para Ella</a>
          <a routerLink="/catalogo" [queryParams]="{ category: 'men' }">Para Él</a>
          <a routerLink="/catalogo" [queryParams]="{ category: 'unisex' }">Unisex</a>
        </div>

        <div class="ft-col">
          <h4>Cómo comprar</h4>
          <a routerLink="/catalogo">1. Elige tus perfumes</a>
          <a routerLink="/cart">2. Revisa tu carrito</a>
          <span>3. Coordina y paga por WhatsApp</span>
        </div>

        <div class="ft-col">
          <h4>Confianza</h4>
          <span>Productos 100% originales</span>
          <span>Importación directa</span>
          <span>Atención por WhatsApp</span>
        </div>
      </div>
      <div class="ft-base as-container">
        <span>© {{ year }} AromaStudio · Perfumería árabe</span>
      </div>
    </footer>
  `,
  styles: [`
    .ft { background: var(--bg-soft); border-top: 1px solid var(--line); margin-top: 40px; }
    .ft-grid {
      display: grid; gap: clamp(20px, 4vw, 48px);
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      padding-block: clamp(32px, 5vw, 56px);
    }
    .ft-brand { max-width: 340px; }
    .brand { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--ink); }
    .ft-brand p { color: var(--muted); font-size: 0.86rem; margin: 10px 0 16px; line-height: 1.6; }
    .wa {
      display: inline-flex; align-items: center; gap: 8px;
      color: #128c40; font-weight: 700; font-size: 0.9rem;
    }
    .ft-col { display: flex; flex-direction: column; gap: 10px; }
    .ft-col h4 { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink); margin-bottom: 2px; }
    .ft-col a, .ft-col span { color: var(--muted); font-size: 0.85rem; }
    .ft-col a:hover { color: var(--accent); }
    .ft-base {
      border-top: 1px solid var(--line);
      padding-block: 18px;
      font-size: 0.78rem; color: var(--muted);
    }
  `]
})
export class FooterComponent {
  year = new Date().getFullYear();
}
