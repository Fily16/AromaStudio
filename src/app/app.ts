import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from './components/layout/header.component';
import { FooterComponent } from './components/layout/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'AromaStudio - Catálogo de Perfumes';
  private router = inject(Router);

  /** Header/footer de la tienda: ocultos en el panel admin. */
  showChrome = signal(true);

  constructor() {
    this.update(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => this.update((e as NavigationEnd).urlAfterRedirects));
  }

  private update(url: string) {
    this.showChrome.set(!url.startsWith('/admin'));
  }
}
