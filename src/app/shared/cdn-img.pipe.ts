import { Pipe, PipeTransform } from '@angular/core';
import { cdnImage } from './img.util';

/**
 * Uso: [src]="product.imageUrl | cdnImg:400"
 * Optimiza imágenes remotas (resize + WebP + CDN + caché). Deja igual data: y rutas locales.
 */
@Pipe({ name: 'cdnImg', standalone: true })
export class CdnImgPipe implements PipeTransform {
  transform(url: string | null | undefined, width = 500): string {
    return cdnImage(url, width);
  }
}
