import { Component, signal, computed, Output, EventEmitter, OnDestroy, input, effect } from '@angular/core';

interface TextLine {
  text: string;
  icon?: string;
  highlight?: boolean;
}

interface OnboardingStep {
  id: string;
  title: string;
  greeting: string;
  lines: TextLine[];
  mascotMood: 'wave' | 'talk' | 'excited' | 'wink';
}

const SECTION_MESSAGES: Record<string, OnboardingStep> = {
  intro: {
    id: 'intro',
    title: 'Bienvenido a Aroma Studio',
    greeting: 'Hola!',
    lines: [
      { text: 'Somos Aroma Studio, tu destino para los mejores perfumes importados.' },
      { text: 'Tenemos 3 secciones especiales para ti:' },
      { text: 'Tienda - Compra cualquier perfume por unidad', icon: '🛍️', highlight: true },
      { text: 'Por Mayor - Los mejores precios desde 3 unidades', icon: '📦', highlight: true },
      { text: 'Consolidado - Precios de importacion exclusivos VIP', icon: '⭐', highlight: true },
      { text: 'Explora cada seccion y encuentra tu fragancia ideal!' },
    ],
    mascotMood: 'wave',
  },
  retail: {
    id: 'retail',
    title: 'Bienvenido a la Tienda',
    greeting: 'Hola!',
    lines: [
      { text: 'Aqui puedes comprar cualquier perfume por unidad.' },
      { text: 'Encuentra fragancias de las mejores marcas a precios increibles.' },
      { text: 'Usa los filtros para buscar por categoria, marca o precio.', icon: '🔍' },
      { text: 'Tu pedido se coordina directamente por WhatsApp!', icon: '💬' },
    ],
    mascotMood: 'wave',
  },
  mayor: {
    id: 'mayor',
    title: 'Seccion Por Mayor',
    greeting: 'Bienvenido!',
    lines: [
      { text: 'Esta es la seccion de compras al por mayor.' },
      { text: 'El pedido minimo es de 3 unidades.', icon: '📦', highlight: true },
      { text: 'Ideal para emprendedores y revendedores que buscan los mejores margenes.' },
      { text: 'Los pedidos se coordinan directamente por WhatsApp.', icon: '💬' },
      { text: 'Mientras mas unidades, mejor precio!' },
    ],
    mascotMood: 'excited',
  },
  wholesale: {
    id: 'wholesale',
    title: 'Seccion Consolidado',
    greeting: 'Bienvenido!',
    lines: [
      { text: 'Aqui encontraras los mejores precios de importacion.' },
      { text: 'El pedido minimo es de 3 unidades.', icon: '📦', highlight: true },
      { text: 'Para acceder a estos precios exclusivos debes ser parte de nuestra comunidad VIP.', icon: '⭐', highlight: true },
      { text: 'Que es un consolidado? Es una compra grupal donde juntamos pedidos para importar directamente del proveedor.' },
      { text: 'Asi conseguimos el mejor precio posible para todos!' },
      { text: 'Unete a la comunidad y accede a precios de importacion.', icon: '🚀' },
    ],
    mascotMood: 'wink',
  },
};

@Component({
  selector: 'app-onboarding',
  standalone: true,
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent implements OnDestroy {
  section = input<string>('intro');

  @Output() dismissed = new EventEmitter<void>();

  visible = signal(false);
  typedLines = signal<TextLine[]>([]);
  typingDone = signal(false);
  entering = signal(true);
  leaving = signal(false);

  private typingInterval: any = null;
  private showTimeout: any = null;
  private lastSection = '';

  step = computed<OnboardingStep>(() => {
    const sec = this.section();
    return SECTION_MESSAGES[sec] || SECTION_MESSAGES['intro'];
  });

  constructor() {
    effect(() => {
      const sec = this.section();
      if (sec && sec !== this.lastSection) {
        this.lastSection = sec;
        this.tryShow(sec);
      }
    });
  }

  private tryShow(sec: string): void {
    this.cleanup();
    this.visible.set(false);
    this.leaving.set(false);

    const key = `aroma_onboarding_${sec}`;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(key) === 'done') {
      return;
    }

    this.showTimeout = setTimeout(() => {
      this.visible.set(true);
      this.entering.set(true);
      setTimeout(() => this.entering.set(false), 700);
      // Mostrar todo el texto de inmediato
      this.typedLines.set([...SECTION_MESSAGES[sec]?.lines || this.step().lines]);
      this.typingDone.set(true);
    }, 500);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.typingInterval) { clearInterval(this.typingInterval); this.typingInterval = null; }
    if (this.showTimeout) { clearTimeout(this.showTimeout); this.showTimeout = null; }
  }

  private startTypingLines(): void {
    const allLines = this.step().lines;
    this.typedLines.set([]);
    this.typingDone.set(false);

    let lineIdx = 0;
    let charIdx = 0;
    const current: TextLine[] = [];

    this.typingInterval = setInterval(() => {
      if (lineIdx >= allLines.length) {
        clearInterval(this.typingInterval);
        this.typingInterval = null;
        this.typingDone.set(true);
        return;
      }

      const srcLine = allLines[lineIdx];
      if (charIdx === 0) {
        current.push({ text: '', icon: srcLine.icon, highlight: srcLine.highlight });
      }

      if (charIdx < srcLine.text.length) {
        current[current.length - 1] = {
          ...current[current.length - 1],
          text: srcLine.text.slice(0, charIdx + 1),
        };
        this.typedLines.set([...current]);
        charIdx++;
      } else {
        lineIdx++;
        charIdx = 0;
      }
    }, 18);
  }

  skipTyping(): void {
    this.cleanup();
    this.typedLines.set([...this.step().lines]);
    this.typingDone.set(true);
  }

  dismiss(): void {
    const key = `aroma_onboarding_${this.section()}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, 'done');
    }
    this.leaving.set(true);
    setTimeout(() => {
      this.visible.set(false);
      this.dismissed.emit();
    }, 450);
  }
}
