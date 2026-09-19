import { NsoBlockedItem } from '../../../models/api.models';
import {
  nsoBlockedIdSet,
  nsoBlockedLabel,
  nsoBlockedSummary,
  nsoBlockedWhatsappText,
} from './nso-blocked.util';

function blocked(productId: number, quantity: number, ml: number | null = 100): NsoBlockedItem {
  return { productId, brand: 'Lattafa', name: `Perfume ${productId}`, ml, quantity, status: 'SIN_NSO' };
}

const NSO_WORD = /\bnso\b/i;

describe('nso-blocked.util', () => {
  it('ids bloqueados como Set (null/undefined = vacío)', () => {
    expect([...nsoBlockedIdSet([blocked(3, 1), blocked(8, 2)])]).toEqual([3, 8]);
    expect(nsoBlockedIdSet(undefined).size).toBe(0);
    expect(nsoBlockedIdSet(null).size).toBe(0);
  });

  it('resumen: perfumes distintos y unidades pedidas', () => {
    expect(nsoBlockedSummary([blocked(1, 2), blocked(2, 5)])).toEqual({ perfumes: 2, units: 7 });
    expect(nsoBlockedSummary(undefined)).toEqual({ perfumes: 0, units: 0 });
  });

  it('etiqueta con ml solo si lo tiene', () => {
    expect(nsoBlockedLabel(blocked(1, 1, 100))).toBe('Lattafa Perfume 1 · 100ml');
    expect(nsoBlockedLabel(blocked(1, 1, null))).toBe('Lattafa Perfume 1');
  });

  describe('texto de WhatsApp al cliente', () => {
    const one = {
      order: { clientName: 'Ana', orderCode: 'AS-0012' },
      unavailable: [{ label: 'Lattafa Yara', qty: 2 }],
      available: [{ label: 'Afnan 9pm', qty: 1 }],
    };

    it('es neutral: dice «no está disponible para importación» y nunca nombra el NSO', () => {
      const text = nsoBlockedWhatsappText(one);
      expect(text).toContain('no está disponible para importación');
      expect(NSO_WORD.test(text)).toBe(false);
      expect(text.toLowerCase()).not.toContain('notificación sanitaria');
      expect(text.toLowerCase()).not.toContain('digemid');
    });

    it('saluda al cliente con su código y lista lo que no se puede traer y lo que sigue', () => {
      const text = nsoBlockedWhatsappText(one);
      expect(text.startsWith('Hola Ana 👋 (pedido AS-0012)')).toBe(true);
      expect(text).toContain('• Lattafa Yara (x2)');
      expect(text).toContain('✅ Siguen en tu pedido:');
      expect(text).toContain('• Afnan 9pm (x1)');
    });

    it('en plural cuando hay varios perfumes y sin bloque «siguen» si no queda nada', () => {
      const text = nsoBlockedWhatsappText({
        order: { clientName: 'Luis', orderCode: 'AS-0020' },
        unavailable: [
          { label: 'A', qty: 1 },
          { label: 'B', qty: 3 },
        ],
        available: [],
      });
      expect(text).toContain('no están disponibles para importación');
      expect(text).toContain('❌ No disponibles para importación:');
      expect(text).not.toContain('Siguen en tu pedido');
      expect(NSO_WORD.test(text)).toBe(false);
    });

    it('tolera cliente o código vacíos', () => {
      const text = nsoBlockedWhatsappText({
        order: { clientName: null, orderCode: null },
        unavailable: [{ label: 'A', qty: 1 }],
        available: [],
      });
      expect(text.startsWith('Hola 👋')).toBe(true);
      expect(text).not.toContain('(pedido');
    });
  });
});
