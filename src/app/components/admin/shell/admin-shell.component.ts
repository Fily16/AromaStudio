import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';

/**
 * Shell del ERP admin: sidebar de navegación + topbar (consolidado activo, usuario, salir).
 * Las páginas admin se renderizan en el <router-outlet> como rutas hijas.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="adm">
      <div class="adm-shell">
        @if (menuOpen()) { <div class="adm-scrim" (click)="menuOpen.set(false)"></div> }

        <aside class="adm-sidebar" [class.open]="menuOpen()">
          <div class="adm-brand">AromaStudio <small>ERP</small></div>
          <nav class="adm-nav" (click)="menuOpen.set(false)">
            <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              Pedidos
            </a>
            <a routerLink="/admin/productos" routerLinkActive="active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7"/></svg>
              Productos
            </a>
            <a routerLink="/admin/stock" routerLinkActive="active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16v13H4zM4 7l2-3h12l2 3M9 12h6"/></svg>
              Stock de tienda
            </a>
            <a routerLink="/admin/importar" routerLinkActive="active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
              Importar Excel
            </a>
            <div class="adm-nav-spacer"></div>
            <a routerLink="/admin/ajustes" routerLinkActive="active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 00-1.7-1L14.5 2h-4l-.4 2.6a7 7 0 00-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 000 2l-2 1.5 2 3.4 2.3-1a7 7 0 001.7 1l.4 2.6h4l.4-2.6a7 7 0 001.7-1l2.3 1 2-3.4-2-1.5a7 7 0 00.1-1z"/></svg>
              Ajustes
            </a>
          </nav>
        </aside>

        <div class="adm-main">
          <header class="adm-topbar">
            <button class="adm-btn ghost sm adm-burger" (click)="menuOpen.set(true)" aria-label="Menú">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <h1>Panel</h1>
            <div class="spacer"></div>
            @if (consolidado(); as c) {
              <span class="adm-chip">Consolidado #{{ c }} · activo</span>
            }
            <div class="adm-user">
              <span><b>{{ auth.name() || 'Admin' }}</b></span>
              <button class="adm-btn sm" (click)="logout()">Salir</button>
            </div>
          </header>
          <main class="adm-content">
            <router-outlet />
          </main>
        </div>
      </div>
    </div>
  `
})
export class AdminShellComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  menuOpen = signal(false);
  consolidado = signal<number | null>(null);

  constructor() {
    this.api.getActiveConsolidado().subscribe({
      next: (c) => this.consolidado.set(c?.id ?? null),
      error: () => {}
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
  }
}
