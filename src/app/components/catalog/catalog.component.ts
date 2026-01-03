import { Component, computed, inject, signal } from '@angular/core';
import { PerfumeService } from '../../services/perfume.service';
import { PerfumeCardComponent } from '../perfume-card/perfume-card.component';
import { FormsModule } from '@angular/forms';
import { Perfume } from '../../models/perfume.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [PerfumeCardComponent, FormsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent {
  private perfumeService = inject(PerfumeService);

  // View state
  currentView = signal<'landing' | 'retail' | 'wholesale'>('landing');

  searchQuery = signal('');
  selectedCategory = signal<'all' | 'men' | 'women' | 'unisex'>('all');
  sortBy = signal<'name' | 'price-asc' | 'price-desc' | 'brand'>('name');

  allPerfumes = this.perfumeService.getAllPerfumes();

  setView(view: 'landing' | 'retail' | 'wholesale'): void {
    this.currentView.set(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Wholesale products
  wholesaleProducts = [
    {
      id: 1,
      name: 'Eclaire',
      brand: 'Lattafa',
      wholesalePrice: 126,
      imageUrl: 'imagenes/eclaire.jpg'
    },
    {
      id: 2,
      name: 'Yara Candy',
      brand: 'Lattafa',
      wholesalePrice: 115,
      imageUrl: 'imagenes/yara candy.webp'
    },
    {
      id: 3,
      name: 'Yara Rosa',
      brand: 'Lattafa',
      wholesalePrice: 115,
      imageUrl: 'imagenes/yara.webp'
    },
    {
      id: 4,
      name: 'Sublime',
      brand: 'Lattafa',
      wholesalePrice: 120,
      imageUrl: 'imagenes/lattafa sublime.webp'
    },
    {
      id: 5,
      name: 'Asad',
      brand: 'Lattafa',
      wholesalePrice: 115,
      imageUrl: 'imagenes/lattafa asad.webp'
    },
    {
      id: 6,
      name: 'Khamrah Dukhan',
      brand: 'Lattafa',
      wholesalePrice: 140,
      imageUrl: 'imagenes/khamrah dukhan.webp'
    }
  ];

  filteredPerfumes = computed(() => {
    let perfumes = [...this.allPerfumes];

    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      perfumes = perfumes.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    // Filter by category
    const category = this.selectedCategory();
    if (category !== 'all') {
      perfumes = perfumes.filter(p => p.category === category);
    }

    // Sort
    const sort = this.sortBy();
    switch (sort) {
      case 'name':
        perfumes.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        perfumes.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        perfumes.sort((a, b) => b.price - a.price);
        break;
      case 'brand':
        perfumes.sort((a, b) => a.brand.localeCompare(b.brand));
        break;
    }

    return perfumes;
  });

  totalCount = computed(() => this.filteredPerfumes().length);

  categories = [
    { value: 'all', label: 'Todos' },
    { value: 'men', label: 'Hombre' },
    { value: 'women', label: 'Mujer' },
    { value: 'unisex', label: 'Unisex' }
  ];

  sortOptions = [
    { value: 'name', label: 'Nombre A-Z' },
    { value: 'price-asc', label: 'Precio: Menor a Mayor' },
    { value: 'price-desc', label: 'Precio: Mayor a Menor' },
    { value: 'brand', label: 'Marca' }
  ];

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onCategoryChange(category: 'all' | 'men' | 'women' | 'unisex'): void {
    this.selectedCategory.set(category);
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value as 'name' | 'price-asc' | 'price-desc' | 'brand');
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.sortBy.set('name');
  }

  trackByPerfume(index: number, perfume: Perfume): number {
    return perfume.id;
  }

  getWhatsAppLink(product: { name: string; brand: string; wholesalePrice: number; imageUrl: string }): string {
    const message = `🛒 *PEDIDO AL POR MAYOR*

📦 *Producto:* ${product.name}
🏷️ *Marca:* ${product.brand}
💰 *Precio mayorista:* S/ ${product.wholesalePrice} por unidad

📌 *Mínimo 6 unidades*

¡Hola! Me interesa este perfume al por mayor. ¿Tienen disponibilidad?`;

    return `https://wa.me/51903250695?text=${encodeURIComponent(message)}`;
  }
}
