import { Component, ElementRef, ViewChild, signal, AfterViewInit } from '@angular/core';

/**
 * Carrusel horizontal con botones de avance (‹ ›). Estilo sobrio (blanco/gris).
 * Uso: <as-scroller> ...tarjetas... </as-scroller>
 * Las flechas se ocultan en los extremos y en dispositivos táctiles (se hace swipe).
 */
@Component({
  selector: 'as-scroller',
  standalone: true,
  template: `
    <div class="sc-wrap">
      <button class="sc-arrow sc-left" [class.hidden]="!canLeft()" (click)="nudge(-1)"
              type="button" aria-label="Anterior">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="as-scroller" #track (scroll)="onScroll()"><ng-content /></div>
      <button class="sc-arrow sc-right" [class.hidden]="!canRight()" (click)="nudge(1)"
              type="button" aria-label="Siguiente">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `,
  styles: [`
    .sc-wrap { position: relative; }
    .sc-arrow {
      position: absolute; top: 50%; transform: translateY(-50%); z-index: 6;
      width: 40px; height: 40px; border-radius: 999px;
      background: #fff; border: 1px solid var(--line-strong); color: #444;
      display: grid; place-items: center;
      box-shadow: 0 2px 10px rgba(0,0,0,.10); cursor: pointer;
      transition: opacity .2s ease, background .15s ease, box-shadow .15s ease;
    }
    .sc-arrow:hover { background: #f4f4f4; box-shadow: 0 3px 14px rgba(0,0,0,.16); }
    .sc-left { left: 2px; }
    .sc-right { right: 2px; }
    .sc-arrow.hidden { opacity: 0; pointer-events: none; }
    /* En táctil se desliza con el dedo: no hacen falta flechas */
    @media (hover: none) { .sc-arrow { display: none; } }
  `]
})
export class ScrollerComponent implements AfterViewInit {
  @ViewChild('track') track!: ElementRef<HTMLElement>;
  canLeft = signal(false);
  canRight = signal(false);

  ngAfterViewInit() {
    setTimeout(() => this.onScroll(), 50);
    // Recalcula cuando cambia el tamaño del contenedor
    try {
      new ResizeObserver(() => this.onScroll()).observe(this.track.nativeElement);
    } catch {}
  }

  onScroll() {
    const el = this.track?.nativeElement;
    if (!el) return;
    this.canLeft.set(el.scrollLeft > 4);
    this.canRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  nudge(dir: number) {
    const el = this.track.nativeElement;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  }
}
