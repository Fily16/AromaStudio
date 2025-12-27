import { Component } from '@angular/core';
import { CatalogComponent } from './components/catalog/catalog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CatalogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'AromaStudio - Catálogo de Perfumes';
}
