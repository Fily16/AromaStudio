import { Component, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from './components/layout/header.component';
import { FooterComponent } from './components/layout/footer.component';
import { CountdownModalComponent } from './components/shared/countdown-modal.component';
import { AnnouncementBarComponent } from './components/shared/announcement-bar.component';
import { WhatsappFabComponent } from './components/shared/whatsapp-fab.component';
import { ConsolidadoStateService } from './services/consolidado-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CountdownModalComponent, AnnouncementBarComponent, WhatsappFabComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'AromaStudio - Catálogo de Perfumes';
  private router = inject(Router);
  private consolidado = inject(ConsolidadoStateService);
  private doc = inject(DOCUMENT);

  /** Header/footer de la tienda: ocultos en el panel admin. */
  showChrome = signal(true);

  constructor() {
    this.update(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => this.update((e as NavigationEnd).urlAfterRedirects));

    // El estado del consolidado se carga una sola vez, en cualquier ruta pública:
    // así el aviso aparece aunque el cliente entre directo al catálogo o a una ficha.
    if (this.showChrome()) this.consolidado.load();

    // La franja de anuncio ocupa altura real: la clase en <html> enciende la var
    // --announce-h que desplaza header sticky, offsets y scroll-padding. Con la
    // franja oculta la var vale 0 y todo queda exactamente como sin franja.
    effect(() => {
      const on = this.showChrome() && this.consolidado.announcement() !== null;
      this.doc.documentElement.classList.toggle('has-announce', on);
    });
  }

  private update(url: string) {
    this.showChrome.set(!url.startsWith('/admin'));
  }
}
