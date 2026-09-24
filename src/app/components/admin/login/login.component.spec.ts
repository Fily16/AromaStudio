import { describe, expect, it } from 'vitest';
import { isLocalCallback } from './login.component';

/**
 * Al conectar la app local de Claude, el panel devuelve un permiso a una dirección de ESTA PC.
 * Solo se acepta localhost/127.0.0.1: si no, cualquier web podría llevarse el permiso.
 */
describe('isLocalCallback', () => {
  it('acepta solo direcciones de esta computadora', () => {
    expect(isLocalCallback('http://127.0.0.1:52341/cb')).toBe(true);
    expect(isLocalCallback('http://localhost:4000/cb')).toBe(true);
  });

  it('rechaza cualquier sitio externo', () => {
    expect(isLocalCallback('https://sitio-malo.com/cb')).toBe(false);
    expect(isLocalCallback('http://192.168.1.50/cb')).toBe(false);
    expect(isLocalCallback('http://127.0.0.1.malo.com/cb')).toBe(false);
    expect(isLocalCallback('https://127.0.0.1/cb')).toBe(false); // https local: no lo usa el MCP
  });

  it('rechaza lo vacío o inválido', () => {
    expect(isLocalCallback(null)).toBe(false);
    expect(isLocalCallback('')).toBe(false);
    expect(isLocalCallback('no-es-url')).toBe(false);
    expect(isLocalCallback('javascript:alert(1)')).toBe(false);
  });
});
