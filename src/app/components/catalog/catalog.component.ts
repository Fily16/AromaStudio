import { Component, computed, inject, signal, AfterViewInit, OnDestroy, PLATFORM_ID, effect } from '@angular/core';
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

  // Wholesale products - Catálogo completo 2026
  wholesaleProducts = [
    // ═══════════════════════════════════════
    // AFNAN - Línea 9PM / 9AM
    // ═══════════════════════════════════════
    { id: 1, name: '9PM Tester', brand: 'Afnan', wholesalePrice: 92, imageUrl: '' },
    { id: 2, name: '9PM', brand: 'Afnan', wholesalePrice: 100, imageUrl: '' },
    { id: 3, name: '9AM Dive', brand: 'Afnan', wholesalePrice: 100, imageUrl: 'imagenes/afnan 9 am dive.webp' },
    { id: 4, name: '9PM Rebel Tester', brand: 'Afnan', wholesalePrice: 118, imageUrl: '' },
    { id: 5, name: '9PM Rebel', brand: 'Afnan', wholesalePrice: 118, imageUrl: '' },
    { id: 6, name: '9PM Elixir', brand: 'Afnan', wholesalePrice: 118, imageUrl: 'imagenes/9 pm elixir.webp' },
    { id: 7, name: '9PM Elixir Tester', brand: 'Afnan', wholesalePrice: 118, imageUrl: '' },

    // ═══════════════════════════════════════
    // ZIMAYA
    // ═══════════════════════════════════════
    { id: 8, name: 'Tiramisu', brand: 'Zimaya', wholesalePrice: 118, imageUrl: '' },

    // ═══════════════════════════════════════
    // LATTAFA
    // ═══════════════════════════════════════
    { id: 9, name: 'Sublime', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/lattafa sublime.webp' },
    { id: 10, name: 'Honor & Glory', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/honos and glory.jpg' },
    { id: 11, name: 'Amethyst', brand: 'Lattafa', wholesalePrice: 92, imageUrl: '' },
    { id: 12, name: 'Oud for Glory', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/lattafa oud for glory.jpg' },
    { id: 13, name: 'Asad', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/lattafa asad.webp' },
    { id: 14, name: 'Asad Bourbon', brand: 'Lattafa', wholesalePrice: 100, imageUrl: 'imagenes/lattafa asad bournbon.webp' },
    { id: 15, name: 'Yara Pink', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/yara.webp' },
    { id: 16, name: 'Yara Tous', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/yara tous.jpg' },
    { id: 17, name: 'Yara Moi', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/yara moi.webp' },
    { id: 18, name: 'Yara Candy', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/yara candy.webp' },
    { id: 19, name: 'Fakhar Black', brand: 'Lattafa', wholesalePrice: 92, imageUrl: '' },
    { id: 20, name: 'Fakhar Gold', brand: 'Lattafa', wholesalePrice: 92, imageUrl: 'imagenes/fakhar extrait gold.webp' },
    { id: 21, name: 'Fakhar Rose', brand: 'Lattafa', wholesalePrice: 92, imageUrl: '' },
    { id: 22, name: 'Fakhar Platin', brand: 'Lattafa', wholesalePrice: 118, imageUrl: 'imagenes/fakhar platin.jpg' },
    { id: 23, name: 'Khamrah Clásico', brand: 'Lattafa', wholesalePrice: 100, imageUrl: 'imagenes/lattafa khamrah.jpg' },
    { id: 24, name: 'Khamrah Qahwa', brand: 'Lattafa', wholesalePrice: 100, imageUrl: '' },
    { id: 25, name: 'Khamrah Dukhan', brand: 'Lattafa', wholesalePrice: 100, imageUrl: 'imagenes/khamrah dukhan.webp' },
    { id: 26, name: 'Asad Elixir', brand: 'Lattafa', wholesalePrice: 118, imageUrl: '' },
    { id: 27, name: 'Yara Elixir', brand: 'Lattafa', wholesalePrice: 118, imageUrl: '' },
    { id: 28, name: 'Jasoor', brand: 'Lattafa', wholesalePrice: 100, imageUrl: '' },
    { id: 29, name: 'Atlas', brand: 'Lattafa', wholesalePrice: 118, imageUrl: '' },
    { id: 30, name: 'Fire on Ice', brand: 'Lattafa', wholesalePrice: 130, imageUrl: '' },
    { id: 31, name: 'The Kingdom', brand: 'Lattafa', wholesalePrice: 100, imageUrl: 'imagenes/the kingdom Men.webp' },
    { id: 32, name: 'Eclaire', brand: 'Lattafa', wholesalePrice: 100, imageUrl: 'imagenes/eclaire.jpg' },
    { id: 33, name: 'Pisa Pride', brand: 'Lattafa', wholesalePrice: 130, imageUrl: '' },
    { id: 34, name: 'Mango Ice', brand: 'Lattafa', wholesalePrice: 100, imageUrl: '' },

    // ═══════════════════════════════════════
    // FRENCH AVENUE
    // ═══════════════════════════════════════
    { id: 35, name: 'Vulcan Feu', brand: 'French Avenue', wholesalePrice: 141, imageUrl: '' },

    // ═══════════════════════════════════════
    // ARMAF - Odyssey
    // ═══════════════════════════════════════
    { id: 36, name: 'Odyssey Mandarin Sky', brand: 'Armaf', wholesalePrice: 100, imageUrl: 'imagenes/odyssey mandarin sky.webp' },
    { id: 37, name: 'Odyssey Mandarin Sky Elixir', brand: 'Armaf', wholesalePrice: 130, imageUrl: 'imagenes/odyssey mandarin sky elixir.webp' },
    { id: 38, name: 'Odyssey Artisto', brand: 'Armaf', wholesalePrice: 118, imageUrl: '' },
    { id: 39, name: 'Odyssey Revolution', brand: 'Armaf', wholesalePrice: 130, imageUrl: 'imagenes/odyssey revolution.webp' },
    { id: 40, name: 'Odyssey Marshmallow', brand: 'Armaf', wholesalePrice: 130, imageUrl: '' },
    { id: 41, name: 'Odyssey Black Forest', brand: 'Armaf', wholesalePrice: 118, imageUrl: '' },
    { id: 42, name: 'Odyssey Toffee Coffee', brand: 'Armaf', wholesalePrice: 130, imageUrl: '' },
    { id: 43, name: 'Odyssey Bahamas', brand: 'Armaf', wholesalePrice: 130, imageUrl: '' },
    { id: 44, name: 'Odyssey Go Mango', brand: 'Armaf', wholesalePrice: 118, imageUrl: '' },
    { id: 45, name: 'Odyssey Aqua', brand: 'Armaf', wholesalePrice: 100, imageUrl: 'imagenes/odyssey aqua.webp' },
    { id: 46, name: 'Odyssey Mega', brand: 'Armaf', wholesalePrice: 92, imageUrl: 'imagenes/odyssey mega.webp' },
    { id: 47, name: 'Odyssey Black', brand: 'Armaf', wholesalePrice: 100, imageUrl: '' },
    { id: 48, name: 'Odyssey White', brand: 'Armaf', wholesalePrice: 92, imageUrl: '' },
    { id: 49, name: 'Odyssey Vintage', brand: 'Armaf', wholesalePrice: 130, imageUrl: '' },
    { id: 50, name: 'Odyssey Candee', brand: 'Armaf', wholesalePrice: 100, imageUrl: 'imagenes/odyssey candy.webp' },
    { id: 51, name: 'Odyssey Montagne', brand: 'Armaf', wholesalePrice: 100, imageUrl: 'imagenes/odyssey montagne.jpg' },

    // ═══════════════════════════════════════
    // ARMAF - Club de Nuit
    // ═══════════════════════════════════════
    { id: 52, name: 'Club de Nuit Intense', brand: 'Armaf', wholesalePrice: 100, imageUrl: 'imagenes/club de nuit intense man.jpg' },
    { id: 53, name: 'Club de Nuit Urban Man Elixir', brand: 'Armaf', wholesalePrice: 118, imageUrl: 'imagenes/club de nuit urban elixir.webp' },
    { id: 54, name: 'Club de Nuit Iconic', brand: 'Armaf', wholesalePrice: 130, imageUrl: '' },
    { id: 55, name: 'Club de Nuit Bling', brand: 'Armaf', wholesalePrice: 152, imageUrl: '' },
    { id: 56, name: 'Club de Nuit Women', brand: 'Armaf', wholesalePrice: 100, imageUrl: '' },
    { id: 57, name: 'Club de Nuit Precioux', brand: 'Armaf', wholesalePrice: 161, imageUrl: '' },
    { id: 58, name: 'Club de Nuit Untold', brand: 'Armaf', wholesalePrice: 130, imageUrl: 'imagenes/club de nuit untold.webp' },
    { id: 59, name: 'Club de Nuit Sillage', brand: 'Armaf', wholesalePrice: 118, imageUrl: '' },

    // ═══════════════════════════════════════
    // ARMAF - Otros
    // ═══════════════════════════════════════
    { id: 60, name: 'Beach Party', brand: 'Armaf', wholesalePrice: 130, imageUrl: '' },
    { id: 61, name: 'Eter Arabian Sky', brand: 'Armaf', wholesalePrice: 145, imageUrl: '' },
    { id: 62, name: 'Champion Sugar', brand: 'Armaf', wholesalePrice: 118, imageUrl: '' },
    { id: 63, name: 'Champion Goat', brand: 'Armaf', wholesalePrice: 118, imageUrl: '' },
    { id: 64, name: 'Champion Money', brand: 'Armaf', wholesalePrice: 118, imageUrl: '' },

    // ═══════════════════════════════════════
    // MAISON ALHAMBRA
    // ═══════════════════════════════════════
    { id: 65, name: 'Aruba Gold', brand: 'Maison Alhambra', wholesalePrice: 92, imageUrl: '' },
    { id: 66, name: 'Sceptre Malachite', brand: 'Maison Alhambra', wholesalePrice: 100, imageUrl: '' },
    { id: 67, name: 'Philos Pura', brand: 'Maison Alhambra', wholesalePrice: 73, imageUrl: '' },
    { id: 68, name: 'Yeah Man', brand: 'Maison Alhambra', wholesalePrice: 73, imageUrl: '' },
    { id: 69, name: 'Your Touch', brand: 'Maison Alhambra', wholesalePrice: 80, imageUrl: '' },
    { id: 70, name: 'Jean Lowe Inmortal', brand: 'Maison Alhambra', wholesalePrice: 100, imageUrl: 'imagenes/jean lowe immortal.jpg' },
    { id: 71, name: 'Jean Lowe Azure', brand: 'Maison Alhambra', wholesalePrice: 100, imageUrl: '' },
    { id: 72, name: 'Jean Lowe Vibe', brand: 'Maison Alhambra', wholesalePrice: 100, imageUrl: '' },

    // ═══════════════════════════════════════
    // RASASI - Hawas
    // ═══════════════════════════════════════
    { id: 73, name: 'Hawas', brand: 'Rasasi', wholesalePrice: 100, imageUrl: 'imagenes/hawas for him.webp' },
    { id: 74, name: 'Hawas Ice', brand: 'Rasasi', wholesalePrice: 118, imageUrl: '' },
    { id: 75, name: 'Hawas Elixir', brand: 'Rasasi', wholesalePrice: 100, imageUrl: 'imagenes/hawas elixir.webp' },
    { id: 76, name: 'Hawas Fire', brand: 'Rasasi', wholesalePrice: 146, imageUrl: '' },
    { id: 77, name: 'Hawas London', brand: 'Rasasi', wholesalePrice: 161, imageUrl: '' },
    { id: 78, name: 'Hawas Malibu', brand: 'Rasasi', wholesalePrice: 139, imageUrl: '' },
    { id: 79, name: 'Hawas Tropical', brand: 'Rasasi', wholesalePrice: 138, imageUrl: '' },
    { id: 80, name: 'Hawas Atlantis', brand: 'Rasasi', wholesalePrice: 161, imageUrl: '' },

    // ═══════════════════════════════════════
    // AL HARAMAIN - Amber Oud
    // ═══════════════════════════════════════
    { id: 81, name: 'Amber Oud Gold Edition', brand: 'Al Haramain', wholesalePrice: 180, imageUrl: 'imagenes/amber oud gold edition 100 ml.webp' },
    { id: 82, name: 'Amber Oud Gold Edition 200ML', brand: 'Al Haramain', wholesalePrice: 238, imageUrl: '' },
    { id: 83, name: 'Amber Oud Aqua Dubai', brand: 'Al Haramain', wholesalePrice: 158, imageUrl: '' },
    { id: 84, name: 'Amber Oud Aqua Dubai 100ML', brand: 'Al Haramain', wholesalePrice: 182, imageUrl: '' },

    // ═══════════════════════════════════════
    // TUBBEES
    // ═══════════════════════════════════════
    { id: 85, name: 'Tubbees Chocolate Fudge', brand: 'Tubbees', wholesalePrice: 52, imageUrl: '' },
    { id: 86, name: 'Tubbees Cookies and Cream', brand: 'Tubbees', wholesalePrice: 52, imageUrl: '' },
    { id: 87, name: 'Tubbees Candy Pop', brand: 'Tubbees', wholesalePrice: 52, imageUrl: '' },
    { id: 88, name: 'Tubbees Cherry Luxe', brand: 'Tubbees', wholesalePrice: 52, imageUrl: '' },

    // ═══════════════════════════════════════
    // JO MILANO - Game of Spades
    // ═══════════════════════════════════════
    { id: 89, name: 'Game of Spades Wildcard', brand: 'Jo Milano', wholesalePrice: 223, imageUrl: '' },
    { id: 90, name: 'Game of Spades Full House', brand: 'Jo Milano', wholesalePrice: 233, imageUrl: '' },
    { id: 91, name: 'Game of Spades Royale', brand: 'Jo Milano', wholesalePrice: 227, imageUrl: '' },
    { id: 92, name: 'Game of Spades Diamond', brand: 'Jo Milano', wholesalePrice: 243, imageUrl: '' },
    { id: 93, name: 'Game of Spades Emerald', brand: 'Jo Milano', wholesalePrice: 243, imageUrl: '' },
    { id: 94, name: 'Game of Spades No Limit', brand: 'Jo Milano', wholesalePrice: 236, imageUrl: '' },
    { id: 95, name: 'Game of Spades Doble Bonus', brand: 'Jo Milano', wholesalePrice: 237, imageUrl: '' },
    { id: 96, name: 'Game of Spades Bonus', brand: 'Jo Milano', wholesalePrice: 243, imageUrl: '' },

    // ═══════════════════════════════════════
    // BHARARA
    // ═══════════════════════════════════════
    { id: 97, name: 'Bharara King', brand: 'Bharara', wholesalePrice: 177, imageUrl: 'imagenes/bharara king edp 100 ml.png' },
    { id: 98, name: 'Bharara King Parfum', brand: 'Bharara', wholesalePrice: 226, imageUrl: '' },
    { id: 99, name: 'Bharara Chocolate', brand: 'Bharara', wholesalePrice: 219, imageUrl: '' },

    // ═══════════════════════════════════════
    // ROME
    // ═══════════════════════════════════════
    { id: 100, name: 'Rome Pour Homme', brand: 'Rome', wholesalePrice: 100, imageUrl: 'imagenes/Rome.webp' },
    { id: 101, name: 'Rome Imagine', brand: 'Rome', wholesalePrice: 100, imageUrl: '' },
    { id: 102, name: 'Rome Paradox', brand: 'Rome', wholesalePrice: 100, imageUrl: '' },
    { id: 103, name: 'Rome Femme', brand: 'Rome', wholesalePrice: 100, imageUrl: '' },
    { id: 104, name: 'Rome Yum Yum', brand: 'Rome', wholesalePrice: 100, imageUrl: '' },

    // ═══════════════════════════════════════
    // DUMONT - Nitro
    // ═══════════════════════════════════════
    { id: 105, name: 'Nitro Red', brand: 'Dumont', wholesalePrice: 118, imageUrl: 'imagenes/nitro red.webp' },
    { id: 106, name: 'Nitro Red Intensely', brand: 'Dumont', wholesalePrice: 149, imageUrl: '' },
    { id: 107, name: 'Nitro White', brand: 'Dumont', wholesalePrice: 118, imageUrl: '' },
    { id: 108, name: 'Nitro Blue', brand: 'Dumont', wholesalePrice: 100, imageUrl: '' },
    { id: 109, name: 'Nitro Green', brand: 'Dumont', wholesalePrice: 100, imageUrl: '' },
    { id: 110, name: 'Nitro Black', brand: 'Dumont', wholesalePrice: 118, imageUrl: '' },
    { id: 111, name: 'Nitro Platinum', brand: 'Dumont', wholesalePrice: 100, imageUrl: '' },
    { id: 112, name: 'Nitro Elixir', brand: 'Dumont', wholesalePrice: 149, imageUrl: '' },

    // ═══════════════════════════════════════
    // EMPORIO ARMANI - Stronger With You
    // ═══════════════════════════════════════
    { id: 113, name: 'Stronger Intensely', brand: 'Emporio Armani', wholesalePrice: 322, imageUrl: '' },
    { id: 114, name: 'Stronger Intensely Tester', brand: 'Emporio Armani', wholesalePrice: 275, imageUrl: '' },
    { id: 115, name: 'Stronger Absolutely', brand: 'Emporio Armani', wholesalePrice: 322, imageUrl: '' },
    { id: 116, name: 'Stronger Freeze', brand: 'Emporio Armani', wholesalePrice: 274, imageUrl: '' },
    { id: 117, name: 'Stronger EDT', brand: 'Emporio Armani', wholesalePrice: 268, imageUrl: '' },

    // ═══════════════════════════════════════
    // GIORGIO ARMANI - Acqua di Gio
    // ═══════════════════════════════════════
    { id: 118, name: 'Acqua Di Gio Profondo', brand: 'Giorgio Armani', wholesalePrice: 334, imageUrl: '' },
    { id: 119, name: 'Acqua Di Gio Profondo Parfum', brand: 'Giorgio Armani', wholesalePrice: 356, imageUrl: '' },
    { id: 120, name: 'Acqua Di Gio Elixir', brand: 'Giorgio Armani', wholesalePrice: 369, imageUrl: '' },

    // ═══════════════════════════════════════
    // JEAN PAUL GAULTIER
    // ═══════════════════════════════════════
    { id: 121, name: 'Le Male Elixir', brand: 'Jean Paul Gaultier', wholesalePrice: 404, imageUrl: '' },
    { id: 122, name: 'Le Male Elixir Tester', brand: 'Jean Paul Gaultier', wholesalePrice: 324, imageUrl: '' },
    { id: 123, name: 'Le Male Le Parfum', brand: 'Jean Paul Gaultier', wholesalePrice: 378, imageUrl: '' },
    { id: 124, name: 'Le Male Le Parfum Tester 75ML', brand: 'Jean Paul Gaultier', wholesalePrice: 288, imageUrl: '' },
    { id: 125, name: 'Le Beau Le Parfum', brand: 'Jean Paul Gaultier', wholesalePrice: 375, imageUrl: '' },
    { id: 126, name: 'Le Beau Le Parfum Tester', brand: 'Jean Paul Gaultier', wholesalePrice: 319, imageUrl: '' },
    { id: 127, name: 'Paradise Garden', brand: 'Jean Paul Gaultier', wholesalePrice: 404, imageUrl: '' },
    { id: 128, name: 'Paradise Garden 75ML', brand: 'Jean Paul Gaultier', wholesalePrice: 301, imageUrl: '' },
    { id: 129, name: 'Flower Edition', brand: 'Jean Paul Gaultier', wholesalePrice: 404, imageUrl: '' },
    { id: 130, name: 'Le Male Elixir Absolu', brand: 'Jean Paul Gaultier', wholesalePrice: 404, imageUrl: '' },
    { id: 131, name: 'Scandal EDT', brand: 'Jean Paul Gaultier', wholesalePrice: 255, imageUrl: '' },
    { id: 132, name: 'Scandal EDT Tester', brand: 'Jean Paul Gaultier', wholesalePrice: 238, imageUrl: '' },
    { id: 133, name: 'Scandal Absolu', brand: 'Jean Paul Gaultier', wholesalePrice: 324, imageUrl: '' },
    { id: 134, name: 'Set Scandal Absolu', brand: 'Jean Paul Gaultier', wholesalePrice: 394, imageUrl: '' },
    { id: 135, name: 'Scandal Le Parfum', brand: 'Jean Paul Gaultier', wholesalePrice: 305, imageUrl: '' },
    { id: 136, name: 'Scandal Le Parfum Tester', brand: 'Jean Paul Gaultier', wholesalePrice: 255, imageUrl: '' },
    { id: 137, name: 'Scandal Intense', brand: 'Jean Paul Gaultier', wholesalePrice: 324, imageUrl: '' },
    { id: 138, name: 'Scandal Intense Tester', brand: 'Jean Paul Gaultier', wholesalePrice: 319, imageUrl: '' },
    { id: 139, name: 'Divine', brand: 'Jean Paul Gaultier', wholesalePrice: 319, imageUrl: '' },

    // ═══════════════════════════════════════
    // YVES SAINT LAURENT
    // ═══════════════════════════════════════
    { id: 140, name: 'Y YSL EDP', brand: 'Yves Saint Laurent', wholesalePrice: 369, imageUrl: '' },

    // ═══════════════════════════════════════
    // VERSACE - Eros
    // ═══════════════════════════════════════
    { id: 141, name: 'Eros EDT', brand: 'Versace', wholesalePrice: 228, imageUrl: '' },
    { id: 142, name: 'Eros EDP', brand: 'Versace', wholesalePrice: 234, imageUrl: '' },
    { id: 143, name: 'Eros EDP Tester', brand: 'Versace', wholesalePrice: 201, imageUrl: '' },
    { id: 144, name: 'Eros Flame', brand: 'Versace', wholesalePrice: 234, imageUrl: '' },
    { id: 145, name: 'Eros Flame Tester', brand: 'Versace', wholesalePrice: 191, imageUrl: '' },
    { id: 146, name: 'Eros Energy', brand: 'Versace', wholesalePrice: 265, imageUrl: '' },
    { id: 147, name: 'Eros Energy Tester', brand: 'Versace', wholesalePrice: 231, imageUrl: '' },
    { id: 148, name: 'Eros Najim', brand: 'Versace', wholesalePrice: 339, imageUrl: '' },

    // ═══════════════════════════════════════
    // VALENTINO
    // ═══════════════════════════════════════
    { id: 149, name: 'Born in Roma Intense', brand: 'Valentino', wholesalePrice: 372, imageUrl: '' },
    { id: 150, name: 'Born in Roma Intense Tester', brand: 'Valentino', wholesalePrice: 269, imageUrl: '' },
    { id: 151, name: 'Born in Roma EDT', brand: 'Valentino', wholesalePrice: 322, imageUrl: '' },
    { id: 152, name: 'Born in Roma EDT Tester', brand: 'Valentino', wholesalePrice: 295, imageUrl: '' },
    { id: 153, name: 'Born in Roma Coral Fantasy', brand: 'Valentino', wholesalePrice: 324, imageUrl: '' },
    { id: 154, name: 'Born in Roma Coral Fantasy Tester', brand: 'Valentino', wholesalePrice: 263, imageUrl: '' },
    { id: 155, name: 'Born in Roma Yellow Dream', brand: 'Valentino', wholesalePrice: 290, imageUrl: '' },
    { id: 156, name: 'Donna Intense', brand: 'Valentino', wholesalePrice: 367, imageUrl: '' },

    // ═══════════════════════════════════════
    // AZZARO
    // ═══════════════════════════════════════
    { id: 157, name: 'Azzaro EDP Intense', brand: 'Azzaro', wholesalePrice: 243, imageUrl: '' },
    { id: 158, name: 'Azzaro EDP Intense Tester', brand: 'Azzaro', wholesalePrice: 207, imageUrl: '' },
    { id: 159, name: 'Azzaro Elixir', brand: 'Azzaro', wholesalePrice: 331, imageUrl: '' },
    { id: 160, name: 'Azzaro EDT', brand: 'Azzaro', wholesalePrice: 201, imageUrl: '' },
    { id: 161, name: 'Azzaro EDP', brand: 'Azzaro', wholesalePrice: 192, imageUrl: '' },
    { id: 162, name: 'Azzaro Parfum', brand: 'Azzaro', wholesalePrice: 262, imageUrl: '' },

    // ═══════════════════════════════════════
    // PACO RABANNE
    // ═══════════════════════════════════════
    { id: 163, name: 'Phantom EDT', brand: 'Paco Rabanne', wholesalePrice: 258, imageUrl: '' },
    { id: 164, name: 'Set Phantom EDT', brand: 'Paco Rabanne', wholesalePrice: 304, imageUrl: '' },
    { id: 165, name: 'Phantom Parfum', brand: 'Paco Rabanne', wholesalePrice: 297, imageUrl: '' },
    { id: 166, name: 'Phantom Intense', brand: 'Paco Rabanne', wholesalePrice: 299, imageUrl: '' },
    { id: 167, name: 'Phantom Elixir', brand: 'Paco Rabanne', wholesalePrice: 368, imageUrl: '' },
    { id: 168, name: 'Phantom Elixir Tester', brand: 'Paco Rabanne', wholesalePrice: 284, imageUrl: '' },
    { id: 169, name: 'One Million Parfum', brand: 'Paco Rabanne', wholesalePrice: 317, imageUrl: '' },
    { id: 170, name: 'One Million Parfum Tester', brand: 'Paco Rabanne', wholesalePrice: 267, imageUrl: '' },
    { id: 171, name: 'One Million Elixir', brand: 'Paco Rabanne', wholesalePrice: 304, imageUrl: '' },
    { id: 172, name: 'One Million Elixir Tester', brand: 'Paco Rabanne', wholesalePrice: 267, imageUrl: '' },
    { id: 173, name: 'One Million Royal Tester', brand: 'Paco Rabanne', wholesalePrice: 243, imageUrl: '' },
    { id: 174, name: 'One Million Lucky', brand: 'Paco Rabanne', wholesalePrice: 334, imageUrl: '' },
    { id: 175, name: 'Invictus Victory', brand: 'Paco Rabanne', wholesalePrice: 280, imageUrl: '' },
    { id: 176, name: 'Invictus Victory Elixir', brand: 'Paco Rabanne', wholesalePrice: 319, imageUrl: '' },
    { id: 177, name: 'Invictus Victory Elixir Tester', brand: 'Paco Rabanne', wholesalePrice: 297, imageUrl: '' },
    { id: 178, name: 'Invictus Absolu', brand: 'Paco Rabanne', wholesalePrice: 401, imageUrl: '' },

    // ═══════════════════════════════════════
    // DIOR
    // ═══════════════════════════════════════
    { id: 179, name: 'Sauvage EDT', brand: 'Dior', wholesalePrice: 391, imageUrl: '' },
    { id: 180, name: 'Sauvage EDP', brand: 'Dior', wholesalePrice: 454, imageUrl: '' },
    { id: 181, name: 'Sauvage Elixir', brand: 'Dior', wholesalePrice: 658, imageUrl: '' },
    { id: 182, name: 'Miss Dior EDT', brand: 'Dior', wholesalePrice: 351, imageUrl: '' },
    { id: 183, name: 'Miss Dior EDP', brand: 'Dior', wholesalePrice: 351, imageUrl: '' },
    { id: 184, name: 'Miss Dior Blooming Bouquet', brand: 'Dior', wholesalePrice: 341, imageUrl: '' },

    // ═══════════════════════════════════════
    // XERJOFF
    // ═══════════════════════════════════════
    { id: 185, name: 'Erba Pura', brand: 'Xerjoff', wholesalePrice: 608, imageUrl: '' },
    { id: 186, name: 'Erba Pura Tester', brand: 'Xerjoff', wholesalePrice: 566, imageUrl: '' },
    { id: 187, name: 'Naxos', brand: 'Xerjoff', wholesalePrice: 641, imageUrl: '' },
    { id: 188, name: 'Naxos Tester', brand: 'Xerjoff', wholesalePrice: 566, imageUrl: '' },
    { id: 189, name: 'Erba Gold', brand: 'Xerjoff', wholesalePrice: 641, imageUrl: '' },
    { id: 190, name: 'Erba Gold Tester', brand: 'Xerjoff', wholesalePrice: 591, imageUrl: '' },
    { id: 191, name: 'Torino 21 Tester', brand: 'Xerjoff', wholesalePrice: 642, imageUrl: '' },
    { id: 192, name: '40 Knots', brand: 'Xerjoff', wholesalePrice: 591, imageUrl: '' },

    // ═══════════════════════════════════════
    // PARFUMS DE MARLY
    // ═══════════════════════════════════════
    { id: 193, name: 'Layton', brand: 'Parfums de Marly', wholesalePrice: 641, imageUrl: '' },
    { id: 194, name: 'Layton Tester', brand: 'Parfums de Marly', wholesalePrice: 624, imageUrl: '' },
    { id: 195, name: 'Althair', brand: 'Parfums de Marly', wholesalePrice: 792, imageUrl: '' },
    { id: 196, name: 'Althair Tester', brand: 'Parfums de Marly', wholesalePrice: 671, imageUrl: '' },
    { id: 197, name: 'Layton Exclusif Tester', brand: 'Parfums de Marly', wholesalePrice: 671, imageUrl: '' },

    // ═══════════════════════════════════════
    // CREED
    // ═══════════════════════════════════════
    { id: 198, name: 'Creed Aventus', brand: 'Creed', wholesalePrice: 860, imageUrl: '' },
    { id: 199, name: 'Creed Aventus Tester', brand: 'Creed', wholesalePrice: 776, imageUrl: '' },

    // ═══════════════════════════════════════
    // TOM FORD
    // ═══════════════════════════════════════
    { id: 200, name: 'Lost Cherry', brand: 'Tom Ford', wholesalePrice: 759, imageUrl: '' },

    // ═══════════════════════════════════════
    // NICHE
    // ═══════════════════════════════════════
    { id: 201, name: 'God of Fire', brand: 'Stéphane Humbert Lucas', wholesalePrice: 793, imageUrl: '' },
    { id: 202, name: 'Summer Hammer', brand: 'Lorenzo Pazzaglia', wholesalePrice: 571, imageUrl: '' },
    { id: 203, name: 'Summer Hammer Tester', brand: 'Lorenzo Pazzaglia', wholesalePrice: 503, imageUrl: '' },

    // ═══════════════════════════════════════
    // MANCERA
    // ═══════════════════════════════════════
    { id: 204, name: 'Mancera French Riviera', brand: 'Mancera', wholesalePrice: 311, imageUrl: '' },
    { id: 205, name: 'Mancera Tonka Cola', brand: 'Mancera', wholesalePrice: 264, imageUrl: '' },
    { id: 206, name: 'Mancera Coco Vanille', brand: 'Mancera', wholesalePrice: 257, imageUrl: '' },

    // ═══════════════════════════════════════
    // LOUIS VUITTON
    // ═══════════════════════════════════════
    { id: 207, name: 'Pacific Chill', brand: 'Louis Vuitton', wholesalePrice: 1748, imageUrl: '' },
    { id: 208, name: 'Imagination', brand: 'Louis Vuitton', wholesalePrice: 1748, imageUrl: '' },
    { id: 209, name: "L'Immensité", brand: 'Louis Vuitton', wholesalePrice: 1748, imageUrl: '' },
    { id: 210, name: 'Ombre Nomade', brand: 'Louis Vuitton', wholesalePrice: 2179, imageUrl: '' },
    { id: 211, name: 'Symphony', brand: 'Louis Vuitton', wholesalePrice: 2940, imageUrl: '' },
    { id: 212, name: 'California Dream', brand: 'Louis Vuitton', wholesalePrice: 1748, imageUrl: '' },
    { id: 213, name: 'New Imagination', brand: 'Louis Vuitton', wholesalePrice: 1748, imageUrl: '' },

    // ═══════════════════════════════════════
    // SETS
    // ═══════════════════════════════════════
    { id: 214, name: 'Set Jo Milano', brand: 'Jo Milano', wholesalePrice: 240, imageUrl: '' },
    { id: 215, name: 'Set Sublime', brand: 'Lattafa', wholesalePrice: 118, imageUrl: '' },
    { id: 216, name: 'Set Khamrah', brand: 'Lattafa', wholesalePrice: 118, imageUrl: '' },
    { id: 217, name: 'Set Yara Pink', brand: 'Lattafa', wholesalePrice: 118, imageUrl: '' },
    { id: 218, name: 'Set 3 Jo Milano', brand: 'Jo Milano', wholesalePrice: 252, imageUrl: '' },
    { id: 219, name: 'Set 8 Jo Milano', brand: 'Jo Milano', wholesalePrice: 330, imageUrl: '' },
    { id: 220, name: 'Set Xerjoff', brand: 'Xerjoff', wholesalePrice: 217, imageUrl: '' },
  ];

  // Wholesale search & pagination
  wholesaleSearch = signal('');
  wholesalePage = signal(1);
  wholesaleItemsPerPage = 15;

  // Get unique brands for filter
  wholesaleBrands = computed(() => {
    const brands = [...new Set(this.wholesaleProducts.map(p => p.brand))];
    return ['Todos', ...brands.sort()];
  });
  wholesaleBrandFilter = signal('Todos');

  filteredWholesaleProducts = computed(() => {
    let products = [...this.wholesaleProducts];
    const query = this.wholesaleSearch().toLowerCase().trim();
    const brand = this.wholesaleBrandFilter();

    if (query) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query)
      );
    }

    if (brand !== 'Todos') {
      products = products.filter(p => p.brand === brand);
    }

    return products;
  });

  wholesaleTotalPages = computed(() =>
    Math.ceil(this.filteredWholesaleProducts().length / this.wholesaleItemsPerPage)
  );

  paginatedWholesaleProducts = computed(() => {
    const start = (this.wholesalePage() - 1) * this.wholesaleItemsPerPage;
    return this.filteredWholesaleProducts().slice(start, start + this.wholesaleItemsPerPage);
  });

  wholesaleResultsCount = computed(() => this.filteredWholesaleProducts().length);

  // Reset page when search or brand filter changes
  private searchEffect = effect(() => {
    this.wholesaleSearch();
    this.wholesaleBrandFilter();
    this.wholesalePage.set(1);
  });

  onWholesaleSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.wholesaleSearch.set(input.value);
  }

  onWholesaleBrandChange(brand: string): void {
    this.wholesaleBrandFilter.set(brand);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.wholesaleTotalPages()) {
      this.wholesalePage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const total = this.wholesaleTotalPages();
    const current = this.wholesalePage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1); // ellipsis
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push(-1); // ellipsis
      pages.push(total);
    }
    return pages;
  }

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
