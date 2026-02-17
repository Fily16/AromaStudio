import { Component, computed, inject, signal, AfterViewInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PerfumeService } from '../../services/perfume.service';
import { PerfumeCardComponent } from '../perfume-card/perfume-card.component';
import { FormsModule } from '@angular/forms';
import { Perfume } from '../../models/perfume.model';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [PerfumeCardComponent, FormsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements AfterViewInit, OnDestroy {
  private perfumeService = inject(PerfumeService);
  private platformId = inject(PLATFORM_ID);

  // View state - sin hero
  currentView = signal<'landing' | 'retail' | 'wholesale'>('landing');

  searchQuery = signal('');
  selectedCategory = signal<'all' | 'men' | 'women' | 'unisex'>('all');
  sortBy = signal<'name' | 'price-asc' | 'price-desc' | 'brand'>('name');

  allPerfumes = this.perfumeService.getAllPerfumes();

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.initScrollAnimations(), 100);
    }
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(st => st.kill());
  }

  private initScrollAnimations(): void {
    // Animate landing page elements
    if (this.currentView() === 'landing') {
      gsap.from('.landing-logo', {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });

      gsap.from('.landing-tagline', {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out'
      });

      gsap.from('.landing-buttons', {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.4,
        ease: 'power3.out'
      });
    }
  }

  initCatalogAnimations(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Esperar a que el DOM se actualice
    setTimeout(() => {
      // Animate header
      gsap.from('.section-header', {
        y: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      });

      // Animate filters
      gsap.from('.filters-section', {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out'
      });

      // Animate cards with stagger and scroll trigger
      gsap.utils.toArray<HTMLElement>('.perfume-card-wrapper').forEach((card, i) => {
        gsap.from(card, {
          y: 60,
          opacity: 0,
          duration: 0.8,
          delay: i * 0.05, // Stagger inicial
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 90%',
            toggleActions: 'play none none none'
          }
        });
      });

      // Parallax effect on card images
      gsap.utils.toArray<HTMLElement>('.card-image-parallax').forEach(img => {
        gsap.to(img, {
          yPercent: -10,
          ease: 'none',
          scrollTrigger: {
            trigger: img,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1
          }
        });
      });
    }, 100);
  }

  setView(view: 'landing' | 'retail' | 'wholesale'): void {
    this.currentView.set(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-initialize animations when view changes
    if (view === 'retail' || view === 'wholesale') {
      ScrollTrigger.getAll().forEach(st => st.kill());
      this.initCatalogAnimations();
    }
  }

  // Wholesale products
  wholesaleProducts = [
    {
      id: 1,
      name: 'Eclaire',
      brand: 'Lattafa',
      wholesalePrice: 100,
      imageUrl: 'imagenes/eclaire.jpg'
    },
    {
      id: 2,
      name: 'Yara Candy',
      brand: 'Lattafa',
      wholesalePrice: 90,
      imageUrl: 'imagenes/yara candy.webp'
    },
    {
      id: 3,
      name: 'Yara Rosa',
      brand: 'Lattafa',
      wholesalePrice: 90,
      imageUrl: 'imagenes/yara.webp'
    },
    {
      id: 4,
      name: 'Sublime',
      brand: 'Lattafa',
      wholesalePrice: 95,
      imageUrl: 'imagenes/lattafa sublime.webp'
    },
    {
      id: 5,
      name: 'Asad',
      brand: 'Lattafa',
      wholesalePrice: 95,
      imageUrl: 'imagenes/lattafa asad.webp'
    },
    {
      id: 6,
      name: 'Khamrah Dukhan',
      brand: 'Lattafa',
      wholesalePrice: 110,
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
