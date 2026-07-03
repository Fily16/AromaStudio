import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { noteIconSvg, noteColor, familyIconSvg, familyColor } from './note-catalog';

/**
 * Ícono SVG de una nota olfativa (o de una familia), tintado con el color de su familia.
 * Uso: <as-note-icon [slug]="'cinnamon'" /> o <as-note-icon [family]="'amaderado'" />
 */
@Component({
  selector: 'as-note-icon',
  standalone: true,
  template: `<span class="ni" [style.color]="color" [style.width.px]="size" [style.height.px]="size" [innerHTML]="svg"></span>`,
  styles: [`
    .ni { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }
    .ni ::ng-deep svg { width: 100%; height: 100%; display: block; }
  `]
})
export class NoteIconComponent {
  private sanitizer = inject(DomSanitizer);

  @Input() slug?: string;
  @Input() family?: string;
  @Input() size = 18;

  get color(): string {
    return this.family ? familyColor(this.family) : noteColor(this.slug || '');
  }

  get svg(): SafeHtml {
    const raw = this.family ? familyIconSvg(this.family) : noteIconSvg(this.slug || '');
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}
