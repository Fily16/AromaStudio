/**
 * Catálogo canónico de notas olfativas (espejo de tools/note_meta.json).
 * - NOTE_META: slug -> { es (etiqueta), family }
 * - NOTE_ICON: slug -> ícono concreto (cuando la nota tiene forma visual real)
 * - FAMILY_META: familia -> { es, color, icon } (el ícono de familia se usa como
 *   fallback para notas abstractas: almizcle, ámbar, resinas, cuero…)
 * - ICONS: markup SVG por clave de ícono (estilo monoline, hereda `currentColor`)
 *
 * Las notas se guardan en el backend como slugs en inglés unidos por coma; aquí
 * viven la traducción y el ícono. Ocasión/estación son derivadas (etiquetadas
 * "sugerido" en la UI).
 */

export type FamilyCode =
  | 'citrico' | 'floral' | 'dulce' | 'especiado' | 'amaderado'
  | 'ambar' | 'aromatico' | 'frutal' | 'almizcle' | 'cuero';

export type IconKey =
  | 'citrus' | 'rose' | 'flower' | 'herb' | 'wave' | 'wood' | 'cinnamon'
  | 'spice' | 'coffee' | 'vanilla' | 'sugar' | 'nut' | 'date' | 'fruit'
  | 'berry' | 'coconut' | 'droplet' | 'aura' | 'leather';

export interface FamilyInfo { es: string; color: string; icon: IconKey; }

/** Orden y metadatos de las familias (para filtros y chips). */
export const FAMILY_META: Record<FamilyCode, FamilyInfo> = {
  citrico:   { es: 'Cítrico',   color: '#c8a415', icon: 'citrus' },
  floral:    { es: 'Floral',    color: '#c25b86', icon: 'flower' },
  dulce:     { es: 'Dulce',     color: '#a9743f', icon: 'sugar' },
  especiado: { es: 'Especiado', color: '#b4532a', icon: 'spice' },
  amaderado: { es: 'Amaderado', color: '#7a5733', icon: 'wood' },
  ambar:     { es: 'Ámbar',     color: '#c0871e', icon: 'droplet' },
  aromatico: { es: 'Aromático', color: '#4f8a5b', icon: 'herb' },
  frutal:    { es: 'Frutal',    color: '#c0476a', icon: 'fruit' },
  almizcle:  { es: 'Almizcle',  color: '#8b86a6', icon: 'aura' },
  cuero:     { es: 'Cuero',     color: '#6b4a39', icon: 'leather' },
};

export const FAMILY_ORDER: FamilyCode[] = [
  'citrico', 'floral', 'frutal', 'aromatico', 'especiado',
  'dulce', 'amaderado', 'ambar', 'almizcle', 'cuero',
];

export const OCCASION_LABEL: Record<string, string> = {
  dia: 'Día', noche: 'Noche', versatil: 'Versátil',
};

export const SEASON_LABEL: Record<string, string> = {
  primavera: 'Primavera', verano: 'Verano', otono: 'Otoño', invierno: 'Invierno',
};
export const SEASON_ORDER = ['primavera', 'verano', 'otono', 'invierno'];

/** SVG monoline (24x24, hereda color). */
export const ICONS: Record<IconKey, string> = {
  citrus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18"/></svg>`,
  rose: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.6"/><path d="M12 9.4c2.4-1.6 5.2.3 4.4 3.1M12 9.4c-2.4-1.6-5.2.3-4.4 3.1"/><path d="M12 4.5c4.6 0 7.5 3.3 7.5 7.5S16.6 19.5 12 19.5 4.5 16.2 4.5 12"/></svg>`,
  flower: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.3"/><circle cx="12" cy="6" r="2.3"/><circle cx="12" cy="18" r="2.3"/><circle cx="6.8" cy="9" r="2.3"/><circle cx="17.2" cy="9" r="2.3"/><circle cx="6.8" cy="15" r="2.3"/><circle cx="17.2" cy="15" r="2.3"/></svg>`,
  herb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19C5 11 9 5 19 5c0 8-4 14-14 14Z"/><path d="M5 19C9 15 13 11 17 7"/></svg>`,
  wave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9c2-2 4 2 6 0s4-2 6 0 4 2 6 0M3 15c2-2 4 2 6 0s4-2 6 0 4 2 6 0"/></svg>`,
  wood: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 4v16M12 4v16M16 4v16"/></svg>`,
  cinnamon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9.5" width="16" height="5" rx="2.5"/><path d="M8.5 9.5v5M11.5 9.5v5"/></svg>`,
  spice: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="8" cy="8" r="1.7"/><circle cx="14.5" cy="7" r="1.7"/><circle cx="16" cy="13" r="1.7"/><circle cx="9.5" cy="13.5" r="1.7"/><circle cx="13" cy="17" r="1.7"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="6" ry="8.5"/><path d="M12 4c-2 3-2 13 0 16"/></svg>`,
  vanilla: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c2 0 3 2 3 5v8c0 3-1 5-3 5s-3-2-3-5V8c0-3 1-5 3-5Z"/><path d="M12 4v16"/></svg>`,
  sugar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l7-3 7 3-7 3-7-3Z"/><path d="M5 8v8l7 3 7-3V8M12 11v8"/></svg>`,
  nut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c5 3 5 15 0 18-5-3-5-15 0-18Z"/></svg>`,
  date: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13.5" rx="4.8" ry="7"/><path d="M12 6.5V3"/></svg>`,
  fruit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7"/><path d="M12 6.5c0-2 1-3.2 3-3.5"/></svg>`,
  berry: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="14.5" r="3.3"/><circle cx="15" cy="14.5" r="3.3"/><circle cx="12" cy="9" r="3.3"/></svg>`,
  coconut: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="9.2" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14.8" cy="11" r="1" fill="currentColor" stroke="none"/><path d="M9 15c1.2 1.4 4.8 1.4 6 0"/></svg>`,
  droplet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12Z"/></svg>`,
  aura: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M6.5 12a5.5 5.5 0 0 1 11 0M4 12a8 8 0 0 1 16 0"/></svg>`,
  leather: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6c3-2 11-2 14 0 1 4 1 8 0 12-3 2-11 2-14 0-1-4-1-8 0-12Z"/></svg>`,
};

export const NOTE_META: Record<string, { es: string; family: FamilyCode }> = {
  bergamot: { es: 'Bergamota', family: 'citrico' },
  lemon: { es: 'Limón', family: 'citrico' },
  lime: { es: 'Lima', family: 'citrico' },
  orange: { es: 'Naranja', family: 'citrico' },
  blood_orange: { es: 'Naranja sanguina', family: 'citrico' },
  mandarin: { es: 'Mandarina', family: 'citrico' },
  grapefruit: { es: 'Pomelo', family: 'citrico' },
  neroli: { es: 'Neroli', family: 'citrico' },
  petitgrain: { es: 'Petitgrain', family: 'citrico' },
  citron: { es: 'Cidra', family: 'citrico' },
  bitter_orange: { es: 'Naranja amarga', family: 'citrico' },
  rose: { es: 'Rosa', family: 'floral' },
  jasmine: { es: 'Jazmín', family: 'floral' },
  tuberose: { es: 'Nardo', family: 'floral' },
  iris: { es: 'Iris', family: 'floral' },
  violet: { es: 'Violeta', family: 'floral' },
  ylang: { es: 'Ylang-ylang', family: 'floral' },
  geranium: { es: 'Geranio', family: 'floral' },
  peony: { es: 'Peonía', family: 'floral' },
  lily: { es: 'Lirio', family: 'floral' },
  lily_valley: { es: 'Muguete', family: 'floral' },
  orange_blossom: { es: 'Flor de azahar', family: 'floral' },
  freesia: { es: 'Fresia', family: 'floral' },
  magnolia: { es: 'Magnolia', family: 'floral' },
  gardenia: { es: 'Gardenia', family: 'floral' },
  orchid: { es: 'Orquídea', family: 'floral' },
  heliotrope: { es: 'Heliotropo', family: 'floral' },
  carnation: { es: 'Clavel', family: 'floral' },
  lotus: { es: 'Loto', family: 'floral' },
  mimosa: { es: 'Mimosa', family: 'floral' },
  osmanthus: { es: 'Osmanto', family: 'floral' },
  white_flowers: { es: 'Flores blancas', family: 'floral' },
  honeysuckle: { es: 'Madreselva', family: 'floral' },
  vanilla: { es: 'Vainilla', family: 'dulce' },
  praline: { es: 'Praliné', family: 'dulce' },
  caramel: { es: 'Caramelo', family: 'dulce' },
  honey: { es: 'Miel', family: 'dulce' },
  chocolate: { es: 'Chocolate', family: 'dulce' },
  cocoa: { es: 'Cacao', family: 'dulce' },
  coffee: { es: 'Café', family: 'dulce' },
  tonka_bean: { es: 'Haba tonka', family: 'dulce' },
  dates: { es: 'Dátiles', family: 'dulce' },
  sugar: { es: 'Azúcar', family: 'dulce' },
  toffee: { es: 'Toffee', family: 'dulce' },
  marshmallow: { es: 'Malvavisco', family: 'dulce' },
  milk: { es: 'Leche', family: 'dulce' },
  almond: { es: 'Almendra', family: 'dulce' },
  hazelnut: { es: 'Avellana', family: 'dulce' },
  cream: { es: 'Crema', family: 'dulce' },
  cotton_candy: { es: 'Algodón de azúcar', family: 'dulce' },
  rum: { es: 'Ron', family: 'dulce' },
  cinnamon: { es: 'Canela', family: 'especiado' },
  nutmeg: { es: 'Nuez moscada', family: 'especiado' },
  cardamom: { es: 'Cardamomo', family: 'especiado' },
  saffron: { es: 'Azafrán', family: 'especiado' },
  pepper: { es: 'Pimienta', family: 'especiado' },
  pink_pepper: { es: 'Pimienta rosa', family: 'especiado' },
  clove: { es: 'Clavo de olor', family: 'especiado' },
  ginger: { es: 'Jengibre', family: 'especiado' },
  cumin: { es: 'Comino', family: 'especiado' },
  coriander: { es: 'Cilantro', family: 'especiado' },
  anise: { es: 'Anís', family: 'especiado' },
  mace: { es: 'Macis', family: 'especiado' },
  spices: { es: 'Especias', family: 'especiado' },
  sandalwood: { es: 'Sándalo', family: 'amaderado' },
  cedar: { es: 'Cedro', family: 'amaderado' },
  patchouli: { es: 'Pachulí', family: 'amaderado' },
  vetiver: { es: 'Vetiver', family: 'amaderado' },
  oud: { es: 'Oud', family: 'amaderado' },
  guaiac: { es: 'Madera de guayaco', family: 'amaderado' },
  akigalawood: { es: 'Akigalawood', family: 'amaderado' },
  oakmoss: { es: 'Musgo de roble', family: 'amaderado' },
  cypress: { es: 'Ciprés', family: 'amaderado' },
  pine: { es: 'Pino', family: 'amaderado' },
  birch: { es: 'Abedul', family: 'amaderado' },
  dreamwood: { es: 'Dreamwood', family: 'amaderado' },
  woody_notes: { es: 'Notas amaderadas', family: 'amaderado' },
  bamboo: { es: 'Bambú', family: 'amaderado' },
  amber: { es: 'Ámbar', family: 'ambar' },
  ambergris: { es: 'Ámbar gris', family: 'ambar' },
  ambroxan: { es: 'Ambroxan', family: 'ambar' },
  labdanum: { es: 'Ládano', family: 'ambar' },
  benzoin: { es: 'Benjuí', family: 'ambar' },
  myrrh: { es: 'Mirra', family: 'ambar' },
  frankincense: { es: 'Incienso', family: 'ambar' },
  opoponax: { es: 'Opopónaco', family: 'ambar' },
  balsam: { es: 'Bálsamo', family: 'ambar' },
  styrax: { es: 'Estoraque', family: 'ambar' },
  resins: { es: 'Resinas', family: 'ambar' },
  lavender: { es: 'Lavanda', family: 'aromatico' },
  sage: { es: 'Salvia', family: 'aromatico' },
  rosemary: { es: 'Romero', family: 'aromatico' },
  thyme: { es: 'Tomillo', family: 'aromatico' },
  basil: { es: 'Albahaca', family: 'aromatico' },
  mint: { es: 'Menta', family: 'aromatico' },
  eucalyptus: { es: 'Eucalipto', family: 'aromatico' },
  green_notes: { es: 'Notas verdes', family: 'aromatico' },
  tea: { es: 'Té', family: 'aromatico' },
  grass: { es: 'Hierba', family: 'aromatico' },
  fig_leaf: { es: 'Hoja de higuera', family: 'aromatico' },
  galbanum: { es: 'Gálbano', family: 'aromatico' },
  juniper: { es: 'Enebro', family: 'aromatico' },
  marine: { es: 'Notas marinas', family: 'aromatico' },
  violet_leaf: { es: 'Hoja de violeta', family: 'aromatico' },
  apple: { es: 'Manzana', family: 'frutal' },
  peach: { es: 'Durazno', family: 'frutal' },
  raspberry: { es: 'Frambuesa', family: 'frutal' },
  strawberry: { es: 'Fresa', family: 'frutal' },
  plum: { es: 'Ciruela', family: 'frutal' },
  pineapple: { es: 'Piña', family: 'frutal' },
  coconut: { es: 'Coco', family: 'frutal' },
  fig: { es: 'Higo', family: 'frutal' },
  blackcurrant: { es: 'Grosella negra', family: 'frutal' },
  cherry: { es: 'Cereza', family: 'frutal' },
  lychee: { es: 'Lichi', family: 'frutal' },
  melon: { es: 'Melón', family: 'frutal' },
  pear: { es: 'Pera', family: 'frutal' },
  mango: { es: 'Mango', family: 'frutal' },
  blueberry: { es: 'Arándano', family: 'frutal' },
  passionfruit: { es: 'Maracuyá', family: 'frutal' },
  apricot: { es: 'Albaricoque', family: 'frutal' },
  blackberry: { es: 'Mora', family: 'frutal' },
  watermelon: { es: 'Sandía', family: 'frutal' },
  banana: { es: 'Plátano', family: 'frutal' },
  grape: { es: 'Uva', family: 'frutal' },
  pomegranate: { es: 'Granada', family: 'frutal' },
  red_berries: { es: 'Frutos rojos', family: 'frutal' },
  tropical_fruits: { es: 'Frutas tropicales', family: 'frutal' },
  musk: { es: 'Almizcle', family: 'almizcle' },
  white_musk: { es: 'Almizcle blanco', family: 'almizcle' },
  aldehydes: { es: 'Aldehídos', family: 'almizcle' },
  powdery: { es: 'Notas empolvadas', family: 'almizcle' },
  cashmeran: { es: 'Cashmeran', family: 'almizcle' },
  ambrette: { es: 'Ambreta', family: 'almizcle' },
  civet: { es: 'Civeta', family: 'almizcle' },
  leather: { es: 'Cuero', family: 'cuero' },
  suede: { es: 'Ante', family: 'cuero' },
  tobacco: { es: 'Tabaco', family: 'cuero' },
  smoke: { es: 'Humo', family: 'cuero' },
};

const NOTE_ICON: Record<string, IconKey> = {
  bergamot: 'citrus',
  lemon: 'citrus',
  lime: 'citrus',
  orange: 'citrus',
  blood_orange: 'citrus',
  mandarin: 'citrus',
  grapefruit: 'citrus',
  neroli: 'citrus',
  petitgrain: 'citrus',
  citron: 'citrus',
  bitter_orange: 'citrus',
  rose: 'rose',
  jasmine: 'flower',
  tuberose: 'flower',
  iris: 'flower',
  violet: 'flower',
  ylang: 'flower',
  geranium: 'flower',
  peony: 'flower',
  lily: 'flower',
  lily_valley: 'flower',
  orange_blossom: 'flower',
  freesia: 'flower',
  magnolia: 'flower',
  gardenia: 'flower',
  orchid: 'flower',
  heliotrope: 'flower',
  carnation: 'flower',
  lotus: 'flower',
  mimosa: 'flower',
  osmanthus: 'flower',
  white_flowers: 'flower',
  honeysuckle: 'flower',
  vanilla: 'vanilla',
  praline: 'sugar',
  caramel: 'sugar',
  honey: 'sugar',
  chocolate: 'coffee',
  cocoa: 'coffee',
  coffee: 'coffee',
  tonka_bean: 'vanilla',
  dates: 'date',
  sugar: 'sugar',
  toffee: 'sugar',
  marshmallow: 'sugar',
  milk: 'sugar',
  almond: 'nut',
  hazelnut: 'nut',
  cream: 'sugar',
  cotton_candy: 'sugar',
  rum: 'sugar',
  cinnamon: 'cinnamon',
  nutmeg: 'spice',
  cardamom: 'spice',
  saffron: 'spice',
  pepper: 'spice',
  pink_pepper: 'spice',
  clove: 'spice',
  ginger: 'spice',
  cumin: 'spice',
  coriander: 'spice',
  anise: 'spice',
  mace: 'spice',
  spices: 'spice',
  sandalwood: 'wood',
  cedar: 'wood',
  patchouli: 'wood',
  vetiver: 'wood',
  oud: 'wood',
  guaiac: 'wood',
  akigalawood: 'wood',
  oakmoss: 'wood',
  cypress: 'wood',
  pine: 'wood',
  birch: 'wood',
  dreamwood: 'wood',
  woody_notes: 'wood',
  bamboo: 'wood',
  lavender: 'herb',
  sage: 'herb',
  rosemary: 'herb',
  thyme: 'herb',
  basil: 'herb',
  mint: 'herb',
  eucalyptus: 'herb',
  green_notes: 'herb',
  tea: 'herb',
  grass: 'herb',
  fig_leaf: 'herb',
  galbanum: 'herb',
  juniper: 'herb',
  marine: 'wave',
  violet_leaf: 'herb',
  apple: 'fruit',
  peach: 'fruit',
  raspberry: 'berry',
  strawberry: 'berry',
  plum: 'fruit',
  pineapple: 'fruit',
  coconut: 'coconut',
  fig: 'fruit',
  blackcurrant: 'berry',
  cherry: 'berry',
  lychee: 'fruit',
  melon: 'fruit',
  pear: 'fruit',
  mango: 'fruit',
  blueberry: 'berry',
  passionfruit: 'fruit',
  apricot: 'fruit',
  blackberry: 'berry',
  watermelon: 'fruit',
  banana: 'fruit',
  grape: 'fruit',
  pomegranate: 'fruit',
  red_berries: 'berry',
  tropical_fruits: 'fruit',
};

// ---------- Helpers ----------

/** Convierte "bergamot,rose" -> ['bergamot','rose'] (vacío si null). */
export function parseNotes(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv.split(',').map(s => s.trim()).filter(Boolean);
}

export function noteLabel(slug: string): string {
  return NOTE_META[slug]?.es ?? prettifySlug(slug);
}

export function noteFamily(slug: string): FamilyCode | null {
  return NOTE_META[slug]?.family ?? null;
}

/** Ícono de la nota: concreto si existe, si no el de su familia. */
export function noteIconKey(slug: string): IconKey {
  const concrete = NOTE_ICON[slug];
  if (concrete) return concrete;
  const fam = NOTE_META[slug]?.family;
  return fam ? FAMILY_META[fam].icon : 'droplet';
}

export function noteIconSvg(slug: string): string {
  return ICONS[noteIconKey(slug)];
}

/** Color (de familia) asociado a la nota, para tintar el ícono/chip. */
export function noteColor(slug: string): string {
  const fam = NOTE_META[slug]?.family;
  return fam ? FAMILY_META[fam].color : '#8b86a6';
}

export function familyLabel(code: string): string {
  return FAMILY_META[code as FamilyCode]?.es ?? code;
}

export function familyColor(code: string): string {
  return FAMILY_META[code as FamilyCode]?.color ?? '#8b86a6';
}

export function familyIconSvg(code: string): string {
  const f = FAMILY_META[code as FamilyCode];
  return f ? ICONS[f.icon] : ICONS.droplet;
}

function prettifySlug(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
