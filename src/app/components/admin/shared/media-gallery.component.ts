import { Component, Input, OnInit, computed, inject, output, signal } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { MediaSummary } from '../../../models/api.models';
import { compressImage, humanSize } from '../../../shared/img-compress.util';

/**
 * Galería de imágenes reutilizable (banners/flyers de consolidados).
 * Las imágenes se comprimen en el navegador y viven en la BD, así que se
 * reutilizan entre consolidados en vez de re-subir la misma una y otra vez.
 */
@Component({
  selector: 'admin-media-gallery',
  standalone: true,
  template: `
    <div class="mg">
      <div class="mg-head">
        <label class="mg-upload">
          {{ uploading() ? 'Subiendo…' : '+ Subir imagen' }}
          <input type="file" accept="image/*" hidden (change)="onFile($event)" [disabled]="uploading()">
        </label>
        @if (selectMode) {
          <button type="button" class="mg-none" [class.on]="selectedId === null" (click)="pick(null)">
            Sin imagen
          </button>
        }
        @if (msg()) { <span class="mg-msg">{{ msg() }}</span> }
        @if (err()) { <span class="mg-err">{{ err() }}</span> }
      </div>

      @if (loading()) {
        <p class="mg-empty">Cargando galería…</p>
      } @else if (images().length === 0) {
        <p class="mg-empty">Aún no hay imágenes. Sube la primera: quedará guardada para reutilizarla en próximos consolidados.</p>
      } @else {
        <div class="mg-grid">
          @for (img of images(); track img.id) {
            <div class="mg-item" [class.on]="selectMode && selectedId === img.id" [class.pick]="selectMode"
                 (click)="selectMode ? pick(img.id) : null">
              <img [src]="api.mediaUrl(img.id)" [alt]="img.name" loading="lazy">
              <div class="mg-meta">
                <span class="mg-name" [title]="img.name">{{ img.name }}</span>
                <span class="mg-size">{{ size(img.sizeBytes) }}</span>
              </div>
              @if (selectMode && selectedId === img.id) { <span class="mg-check">✓</span> }
              <button type="button" class="mg-del" title="Eliminar" (click)="remove(img, $event)">🗑</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .mg-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
    .mg-upload {
      display: inline-block; cursor: pointer; background: var(--a-accent); color: #fff;
      border-radius: var(--a-r-sm); padding: 7px 14px; font-size: .82rem; font-weight: 600;
    }
    .mg-none {
      border: 1px solid var(--a-line); background: var(--a-surface); border-radius: var(--a-r-sm);
      padding: 7px 14px; font-size: .82rem; cursor: pointer;
    }
    .mg-none.on { border-color: var(--a-accent); color: var(--a-accent); font-weight: 700; }
    .mg-msg { color: var(--a-ok); font-size: .8rem; font-weight: 600; }
    .mg-err { color: #e15252; font-size: .8rem; font-weight: 600; }
    .mg-empty { color: var(--a-muted); font-size: .84rem; margin: 8px 0; }
    .mg-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px; max-height: 320px; overflow-y: auto; padding: 2px;
    }
    .mg-item {
      position: relative; border: 2px solid var(--a-line); border-radius: var(--a-r-sm);
      overflow: hidden; background: var(--a-surface-2);
    }
    .mg-item.pick { cursor: pointer; }
    .mg-item.pick:hover { border-color: var(--a-accent); }
    .mg-item.on { border-color: var(--a-accent); box-shadow: 0 0 0 2px rgba(91,26,107,.18); }
    .mg-item img { width: 100%; height: 86px; object-fit: cover; display: block; }
    .mg-meta { padding: 5px 7px; display: flex; flex-direction: column; gap: 1px; }
    .mg-name {
      font-size: .68rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mg-size { font-size: .62rem; color: var(--a-muted); }
    .mg-check {
      position: absolute; top: 5px; left: 5px; background: var(--a-accent); color: #fff;
      width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: .7rem;
    }
    .mg-del {
      position: absolute; top: 4px; right: 4px; border: none; cursor: pointer;
      background: rgba(255,255,255,.9); border-radius: 6px; padding: 2px 5px; font-size: .72rem;
      opacity: 0; transition: opacity .15s;
    }
    .mg-item:hover .mg-del { opacity: 1; }
  `]
})
export class MediaGalleryComponent implements OnInit {
  /** Modo selección: click elige la imagen y emite el id (o null para "sin imagen"). */
  @Input() selectMode = false;
  @Input() selectedId: number | null = null;
  picked = output<number | null>();

  api = inject(ApiService);
  images = signal<MediaSummary[]>([]);
  loading = signal(false);
  uploading = signal(false);
  msg = signal('');
  err = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.listMedia().subscribe({
      next: (list) => { this.loading.set(false); this.images.set(list); },
      error: () => { this.loading.set(false); this.err.set('No se pudo cargar la galería.'); }
    });
  }

  size(bytes: number) { return humanSize(bytes || 0); }

  pick(id: number | null) {
    this.selectedId = id;
    this.picked.emit(id);
  }

  async onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.err.set(''); this.msg.set('');
    this.uploading.set(true);
    try {
      // La compresión ocurre aquí: al backend nunca le llega la foto original.
      const { dataUrl, sizeBytes } = await compressImage(file);
      this.api.uploadMedia({ name: file.name, dataUrl }).subscribe({
        next: (created) => {
          this.uploading.set(false);
          this.msg.set(`✓ Subida (${humanSize(sizeBytes)})`);
          this.load();
          if (this.selectMode) this.pick(created.id);
        },
        error: (e) => {
          this.uploading.set(false);
          this.err.set(e.error?.message || 'No se pudo subir la imagen.');
        }
      });
    } catch {
      this.uploading.set(false);
      this.err.set('No se pudo procesar la imagen.');
    }
    input.value = '';
  }

  remove(img: MediaSummary, ev: Event) {
    ev.stopPropagation();
    if (!confirm(`Eliminar "${img.name}" de la galería. ¿Continuar?`)) return;
    this.err.set(''); this.msg.set('');
    this.api.deleteMedia(img.id).subscribe({
      next: () => {
        this.msg.set('✓ Imagen eliminada.');
        if (this.selectedId === img.id) this.pick(null);
        this.load();
      },
      // 409 = la imagen está en uso por un consolidado (no se dejan referencias huérfanas)
      error: (e) => this.err.set(e.error?.message || 'No se pudo eliminar.')
    });
  }
}
