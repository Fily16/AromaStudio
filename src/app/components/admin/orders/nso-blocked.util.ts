import { NsoBlockedItem } from '../../../models/api.models';

/**
 * Grupo «No se puede importar» de «Ver qué comprar»: perfumes pedidos que no tienen NSO confirmado.
 * PURO (se testea con Vitest). El texto de WhatsApp va al CLIENTE: es neutral y nunca nombra el NSO.
 */

export interface NotifyLine {
  label: string;
  qty: number;
}

/** Lo mínimo de una entrada de buildUnavailableReport que necesita el mensaje. */
export interface NsoNotifyEntry {
  order: { clientName: string | null; orderCode: string | null };
  unavailable: NotifyLine[];
  available: NotifyLine[];
}

/** Ids bloqueados de la respuesta (lista vacía o ausente = ninguno). */
export function nsoBlockedIdSet(list: NsoBlockedItem[] | null | undefined): Set<number> {
  return new Set((list ?? []).map((b) => b.productId));
}

/** Perfumes distintos y unidades pedidas del grupo. */
export function nsoBlockedSummary(list: NsoBlockedItem[] | null | undefined): {
  perfumes: number;
  units: number;
} {
  const items = list ?? [];
  return { perfumes: items.length, units: items.reduce((u, b) => u + (b.quantity || 0), 0) };
}

/** «Marca Nombre · 100ml» para la tarjeta del admin. */
export function nsoBlockedLabel(b: Pick<NsoBlockedItem, 'brand' | 'name' | 'ml'>): string {
  const base = `${b.brand ?? ''} ${b.name ?? ''}`.trim();
  return b.ml ? `${base} · ${b.ml}ml` : base;
}

/**
 * Mensaje de WhatsApp para un cliente con perfumes que no se pueden importar.
 * Dice «no está disponible para importación» y ofrece devolver lo separado o cambiarlo.
 */
export function nsoBlockedWhatsappText(e: NsoNotifyEntry): string {
  const name = (e.order.clientName ?? '').trim();
  const code = (e.order.orderCode ?? '').trim();
  const many = e.unavailable.length > 1;
  const noHay = e.unavailable.map((i) => `• ${i.label} (x${i.qty})`).join('\n');
  const siHay = e.available.length
    ? e.available.map((i) => `• ${i.label} (x${i.qty})`).join('\n')
    : '';

  const lines: string[] = [];
  lines.push(`Hola${name ? ' ' + name : ''} 👋${code ? ` (pedido ${code})` : ''}`);
  lines.push('');
  lines.push(
    many
      ? 'Te escribimos por tu pedido: estos perfumes no están disponibles para importación, así que no podremos traerlos en este lote.'
      : 'Te escribimos por tu pedido: este perfume no está disponible para importación, así que no podremos traerlo en este lote.',
  );
  lines.push('');
  lines.push(many ? '❌ No disponibles para importación:' : '❌ No disponible para importación:');
  lines.push(noHay);
  if (siHay) {
    lines.push('');
    lines.push('✅ Siguen en tu pedido:');
    lines.push(siHay);
  }
  lines.push('');
  lines.push(
    many
      ? 'Podemos devolverte lo que separaste por ellos o cambiarlos por otros perfumes del catálogo. Cuéntanos qué prefieres.'
      : 'Podemos devolverte lo que separaste por él o cambiarlo por otro perfume del catálogo. Cuéntanos qué prefieres.',
  );
  lines.push('');
  lines.push('Disculpa las molestias y gracias por tu comprensión. 🙏');
  return lines.join('\n');
}
