import { Component, input } from '@angular/core';
import { Perfume } from '../../models/perfume.model';
import { DecimalPipe, NgClass } from '@angular/common';

@Component({
  selector: 'app-perfume-card',
  standalone: true,
  imports: [DecimalPipe, NgClass],
  templateUrl: './perfume-card.component.html',
  styleUrl: './perfume-card.component.css'
})
export class PerfumeCardComponent {
  perfume = input.required<Perfume>();

  private readonly whatsappNumber = '51981587009';

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'men': 'Hombre',
      'women': 'Mujer',
      'unisex': 'Unisex'
    };
    return labels[category] || category;
  }

  getCategoryClass(category: string): string {
    return `category-${category}`;
  }

  consultarWhatsApp(): void {
    const p = this.perfume();
    const mensaje = this.generarMensaje(p);
    const url = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  private generarMensaje(p: Perfume): string {
    return `¡Hola! 👋

Estoy interesado/a en el siguiente perfume:

🌸 *${p.brand} - ${p.name}*
📦 Presentación: ${p.size}
💰 Precio: S/ ${p.price.toFixed(2)}

${p.description}

¿Tienen disponibilidad? ¿Cuál es el proceso para realizar la compra?

¡Gracias! 🙏`;
  }
}
